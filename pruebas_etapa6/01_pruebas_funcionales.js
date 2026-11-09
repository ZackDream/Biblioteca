/**
 * ============================================================================
 * PRUEBAS FUNCIONALES - ETAPA 6: INTEGRACIÓN Y PRUEBAS
 * Asignatura: Seminario de Programación en Internet II
 * Carrera: Informática
 * Objetivo: Verificar exhaustivamente que cada módulo y regla de negocio cumpla su función
 * ============================================================================
 */

const { TestSuite, assert, assertEqual, assertStrictEqual, request } = require('./test_helper');
const { app, initDatabase } = require('../server');

async function runFunctionalTests() {
  const suite = new TestSuite('Pruebas Funcionales de Integración (Frontend / Backend / DB)');

  // Reiniciar la base de datos a un estado limpio conocido antes de las pruebas
  await initDatabase(true);

  // --------------------------------------------------------------------------
  // MÓDULO 0: ARQUITECTURA E INTEGRACIÓN
  // --------------------------------------------------------------------------
  await suite.test('[M0-01] Integración Backend: Healthcheck y diagnóstico de persistencia relacional', async () => {
    const res = await request(app, 'GET', '/api/health');
    assertStrictEqual(res.status, 200, 'El endpoint de salud debe responder 200');
    assertEqual(res.body.status, 'ok', 'El estado del backend debe ser ok');
    assert(res.body.counts.libros > 0, 'Debe haber libros cargados en el inventario');
    assert(res.body.counts.usuarios > 0, 'Debe haber usuarios registrados');
  });

  // --------------------------------------------------------------------------
  // MÓDULO 1: AUTENTICACIÓN Y CONTROL DE ACCESO
  // --------------------------------------------------------------------------
  await suite.test('[M1-01] Autenticación: Login de Administrador con credenciales válidas', async () => {
    const res = await request(app, 'POST', '/api/auth/login', {
      role: 'admin',
      username: 'admin',
      password: 'admin'
    });
    assertStrictEqual(res.status, 200, 'Login admin debe responder 200');
    assert(res.body.success, 'La respuesta debe ser exitosa');
    assertEqual(res.body.user.tipo, 'admin', 'El rol de usuario debe ser admin');
    assertEqual(res.body.user.rol, 'Administrativo', 'El rol debe ser Administrativo');
  });

  await suite.test('[M1-02] Autenticación: Rechazo de login administrativo con contraseña inválida', async () => {
    const res = await request(app, 'POST', '/api/auth/login', {
      role: 'admin',
      username: 'admin',
      password: 'wrong_password_123'
    });
    assertStrictEqual(res.status, 401, 'Debe rechazar credenciales inválidas con 401');
    assert(res.body.error, 'Debe retornar mensaje de error descriptivo');
  });

  await suite.test('[M1-03] Autenticación: Login de Estudiante por matrícula válida (EST101)', async () => {
    const res = await request(app, 'POST', '/api/auth/login', {
      role: 'user',
      matricula: 'EST101'
    });
    assertStrictEqual(res.status, 200, 'Login estudiante debe responder 200');
    assertEqual(res.body.user.nombre, 'Sofía Ruiz', 'Debe coincidir el nombre del usuario');
    assertEqual(res.body.user.tipo_usuario, 'Estudiante', 'El tipo debe ser Estudiante');
  });

  await suite.test('[M1-04] Autenticación: Rechazo de matrícula inexistente (EST999)', async () => {
    const res = await request(app, 'POST', '/api/auth/login', {
      role: 'user',
      matricula: 'EST999'
    });
    assertStrictEqual(res.status, 404, 'Matrícula no registrada debe responder 404');
    assert(res.body.error, 'Debe informar que la matrícula no existe');
  });

  // --------------------------------------------------------------------------
  // MÓDULO 2: CATÁLOGO E INVENTARIO DE LIBROS
  // --------------------------------------------------------------------------
  await suite.test('[M2-01] Catálogo: Consulta general y validación de atributos del modelo', async () => {
    const res = await request(app, 'GET', '/api/libros');
    assertStrictEqual(res.status, 200);
    assert(Array.isArray(res.body), 'Debe retornar un array de libros');
    assert(res.body.length >= 6, 'Debe tener al menos 6 libros en catálogo');

    // Validar atributos de cada libro
    for (const libro of res.body) {
      assert(libro.id_libro > 0, 'id_libro debe ser válido');
      assert(libro.titulo && libro.titulo.length > 0, 'Debe tener título');
      assert(libro.autor && libro.autor.length > 0, 'Debe tener autor');
      assert(libro.copias_totales >= 1, 'copias_totales debe ser al menos 1');
      assert(libro.copias_disponibles <= libro.copias_totales, 'copias_disponibles no puede superar copias_totales');
      assert(['Disponible', 'Prestado'].includes(libro.estado), 'Estado del libro debe ser coherente');
    }
  });

  // --------------------------------------------------------------------------
  // MÓDULO 3: PRÉSTAMOS Y REGLAS DE NEGOCIO (ACID)
  // --------------------------------------------------------------------------
  await suite.test('[M3-01] Regla de Negocio: Rechazar préstamo si fecha límite es anterior a fecha de préstamo', async () => {
    const res = await request(app, 'POST', '/api/prestamos/registrar', {
      id_usuario: 1,
      id_libro: 4,
      fecha_prestamo: '2026-10-29',
      fecha_limite: '2026-10-20' // Fecha anterior
    });
    assertStrictEqual(res.status, 400, 'Debe rechazar fecha límite inválida con 400');
    assert(res.body.error.includes('fecha límite'), 'El mensaje debe indicar error en la fecha límite');
  });

  await suite.test('[M3-02] Regla de Negocio: Bloquear préstamo a usuario con multa pendiente (Mateo Pérez)', async () => {
    // Mateo Pérez (id_usuario: 2) tiene un adeudo pendiente en la base inicial
    const res = await request(app, 'POST', '/api/prestamos/registrar', {
      id_usuario: 2,
      id_libro: 4,
      fecha_prestamo: '2026-10-29',
      fecha_limite: '2026-11-05'
    });
    assertStrictEqual(res.status, 409, 'Debe rechazar con 409 Conflict si el usuario tiene multas');
    assert(res.body.error.includes('multas pendientes'), 'Mensaje debe advertir sobre la multa');
  });

  await suite.test('[M3-03] Transacción ACID: Registrar préstamo exitoso y descontar inventario atómicamente', async () => {
    // Libro 4: "Cálculo Trascendentes Tempranas" tiene 4 copias disponibles
    const bookBefore = (await request(app, 'GET', '/api/libros')).body.find(b => b.id_libro === 4);
    const copiasAntes = bookBefore.copias_disponibles;

    const res = await request(app, 'POST', '/api/prestamos/registrar', {
      id_usuario: 1, // Sofía Ruiz (sin multas)
      id_libro: 4,
      fecha_prestamo: '2026-10-29',
      fecha_limite: '2026-11-05'
    });

    assertStrictEqual(res.status, 201, 'Préstamo exitoso debe retornar 201 Created');
    assert(res.body.id_prestamo > 0, 'Debe generar un id_prestamo válido');
    assertEqual(res.body.usuario_nombre, 'Sofía Ruiz');
    assertEqual(res.body.libro_titulo, 'Cálculo Trascendentes Tempranas');

    // Verificar decremento atómico del inventario
    const bookAfter = (await request(app, 'GET', '/api/libros')).body.find(b => b.id_libro === 4);
    assertEqual(bookAfter.copias_disponibles, copiasAntes - 1, 'Debe decrementar exactamente 1 copia');
  });

  await suite.test('[M3-04] Regla de Negocio: Bloquear préstamo si el libro no tiene copias disponibles (copias_disponibles = 0)', async () => {
    // Libro 3: "El Principito" tiene 1 copia disponible inicial. Hacemos un préstamo para agotarlo.
    const loan1 = await request(app, 'POST', '/api/prestamos/registrar', {
      id_usuario: 4, // Elena Torres
      id_libro: 3,
      fecha_prestamo: '2026-10-29',
      fecha_limite: '2026-11-05'
    });
    assertStrictEqual(loan1.status, 201);

    // Intentar prestarlo nuevamente ahora que tiene 0 copias disponibles
    const loan2 = await request(app, 'POST', '/api/prestamos/registrar', {
      id_usuario: 5, // Javier Marín
      id_libro: 3,
      fecha_prestamo: '2026-10-29',
      fecha_limite: '2026-11-05'
    });

    assertStrictEqual(loan2.status, 409, 'Debe rechazar con 409 si copias_disponibles <= 0');
    assert(loan2.body.error.includes('No hay copias disponibles'), 'Mensaje debe indicar falta de copias');

    // Verificar que el estado cambió a 'Prestado'
    const book3 = (await request(app, 'GET', '/api/libros')).body.find(b => b.id_libro === 3);
    assertEqual(book3.copias_disponibles, 0);
    assertEqual(book3.estado, 'Prestado', 'El estado debe actualizarse automáticamente a Prestado');
  });

  // --------------------------------------------------------------------------
  // MÓDULO 4: DEVOLUCIONES Y CÁLCULO DE MULTAS AUTOMÁTICAS
  // --------------------------------------------------------------------------
  await suite.test('[M4-01] Devolución a Tiempo: Sin multa generada y restauración de inventario', async () => {
    // Prestamos inicial Carlos Gómez (id_prestamo: 2, límite en +2 días)
    const res = await request(app, 'POST', '/api/prestamos/devolver', {
      id_prestamo: 2,
      fecha_devolucion: '2026-10-29' // Devuelto a tiempo
    });

    assertStrictEqual(res.status, 200, 'Devolución debe responder 200');
    assertEqual(res.body.dias_retraso, 0, 'Días de retraso deben ser 0');
    assertEqual(res.body.multa_generada, 0, 'No debe generarse multa');

    // Verificar que el libro asociado incrementó su stock
    const book3 = (await request(app, 'GET', '/api/libros')).body.find(b => b.id_libro === 3);
    assert(book3.copias_disponibles >= 1, 'Debe reincorporarse al inventario');
    assertEqual(book3.estado, 'Disponible', 'Debe regresar a estado Disponible');
  });

  await suite.test('[M4-02] Devolución Tardía: Cálculo exacto de días de mora ($10 MXN/día) y registro de adeudo', async () => {
    // Crear un préstamo con fecha límite en el pasado
    const prestamoTest = await request(app, 'POST', '/api/prestamos/registrar', {
      id_usuario: 6, // Laura Ortiz
      id_libro: 5,   // Física Universitaria
      fecha_prestamo: '2026-10-01',
      fecha_limite: '2026-10-10' // Límite hace 15 días
    });
    assertStrictEqual(prestamoTest.status, 201);
    const loanId = prestamoTest.body.id_prestamo;

    // Registrar devolución el 2026-10-14 (4 días de retraso)
    const resDev = await request(app, 'POST', '/api/prestamos/devolver', {
      id_prestamo: loanId,
      fecha_devolucion: '2026-10-14'
    });

    assertStrictEqual(resDev.status, 200);
    assertEqual(resDev.body.dias_retraso, 4, 'Deben calcularse exactamente 4 días de retraso');
    assertEqual(resDev.body.multa_generada, 40.0, 'Multa debe ser 4 * $10 = $40.00 MXN');

    // Verificar en la tabla adeudos
    const adeudos = (await request(app, 'GET', '/api/adeudos')).body;
    const nuevoAdeudo = adeudos.find(a => a.id_prestamo === loanId);
    assert(nuevoAdeudo !== undefined, 'Debe haberse insertado el adeudo en la BD');
    assertEqual(nuevoAdeudo.estado, 'Pendiente');
    assertEqual(nuevoAdeudo.monto_total, 40.0);
  });

  // --------------------------------------------------------------------------
  // MÓDULO 5: REGISTRO Y VALIDACIÓN DE PAGOS
  // --------------------------------------------------------------------------
  await suite.test('[M5-01] Pagos: Rechazo si el monto pagado no coincide exactamente con el adeudo', async () => {
    // Adeudo 1 es de $30.00 MXN
    const res = await request(app, 'POST', '/api/pagos/registrar', {
      id_adeudo: 1,
      monto: 25.0, // Monto incorrecto
      fecha_pago: '2026-10-29',
      tipo_pago: 'Presencial'
    });
    assertStrictEqual(res.status, 400, 'Debe rechazar monto discordante con 400');
    assert(res.body.error.includes('no coincide'), 'Debe advertir sobre la discordancia del monto');
  });

  await suite.test('[M5-02] Pago Presencial: Validación inmediata, cambio a "Pagado" y emisión de folio digital', async () => {
    // Liquidar Adeudo 1 ($30.00 MXN)
    const res = await request(app, 'POST', '/api/pagos/registrar', {
      id_adeudo: 1,
      monto: 30.0,
      fecha_pago: '2026-10-29',
      tipo_pago: 'Presencial',
      id_admin: 1
    });

    assertStrictEqual(res.status, 201, 'Pago presencial debe responder 201');
    assertEqual(res.body.estado_adeudo, 'Pagado');
    assert(res.body.folio.startsWith('F-20261029-'), 'El folio debe tener el formato F-YYYYMMDD-XXXX');

    // Verificar que el comprobante fue persistido
    const comprobantes = (await request(app, 'GET', '/api/comprobantes')).body;
    const comp = comprobantes.find(c => c.folio === res.body.folio);
    assert(comp !== undefined, 'El comprobante debe existir en la base de datos');
    assertEqual(comp.id_pago, res.body.id_pago);
  });

  await suite.test('[M5-03] Pago por Transferencia: Estado "Validacion_Pendiente" y posterior aprobación administrativa', async () => {
    // Tomar el adeudo generado en M4-02 ($40.00 MXN)
    const adeudos = (await request(app, 'GET', '/api/adeudos')).body;
    const adeudoTransfer = adeudos.find(a => a.estado === 'Pendiente' && a.monto_total === 40.0);
    assert(adeudoTransfer !== undefined, 'Debe existir un adeudo pendiente para la prueba');

    // Paso 1: Estudiante registra el pago por transferencia bancaria
    const resPago = await request(app, 'POST', '/api/pagos/registrar', {
      id_adeudo: adeudoTransfer.id_adeudo,
      monto: 40.0,
      fecha_pago: '2026-10-29',
      tipo_pago: 'Transferencia'
    });

    assertStrictEqual(resPago.status, 201);
    assertEqual(resPago.body.estado_adeudo, 'Validacion_Pendiente', 'Debe quedar en espera de validación administrativa');
    const idPago = resPago.body.id_pago;

    // Paso 2: Administrativo valida el pago en ventanilla/sistema
    const resVal = await request(app, 'PUT', `/api/pagos/${idPago}/validar`, {
      id_admin: 1
    });

    assertStrictEqual(resVal.status, 200, 'Validación debe retornar 200');
    assert(resVal.body.folio.startsWith('F-'), 'Debe generar el folio oficial tras la validación');

    // Paso 3: Verificar que el adeudo ahora sí está en 'Pagado'
    const adeudoFinal = (await request(app, 'GET', '/api/adeudos')).body.find(a => a.id_adeudo === adeudoTransfer.id_adeudo);
    assertEqual(adeudoFinal.estado, 'Pagado');
  });

  // --------------------------------------------------------------------------
  // MÓDULO 6: SOLICITUDES DE PRÉSTAMO Y INTEGRIDAD REFERENCIAL
  // --------------------------------------------------------------------------
  await suite.test('[M6-01] Solicitudes: Creación de solicitud por estudiante en línea', async () => {
    const res = await request(app, 'POST', '/api/solicitudes/crear', {
      id_usuario: 7, // Daniel Castro
      id_libro: 1,   // Cien años de soledad
      fecha_solicitud: '2026-10-29'
    });

    assertStrictEqual(res.status, 201);
    assert(res.body.id_solicitud > 0);

    const solicitudes = (await request(app, 'GET', '/api/solicitudes')).body;
    const sol = solicitudes.find(s => s.id_solicitud === res.body.id_solicitud);
    assertEqual(sol.estado, 'Pendiente');
  });

  await suite.test('[M7-01] Integridad Referencial: Rechazo de inserción con clave foránea inexistente', async () => {
    // Intentar prestar a usuario inexistente 99999
    const res = await request(app, 'POST', '/api/prestamos/registrar', {
      id_usuario: 99999, // Usuario que no existe
      id_libro: 1,
      fecha_prestamo: '2026-10-29',
      fecha_limite: '2026-11-05'
    });

    // SQLite con PRAGMA foreign_keys = ON o la verificación previa rechazan la operación
    assert([404, 500].includes(res.status), 'No debe permitir claves foráneas rotas');
  });

  // Ejecución y retorno de reporte
  return await suite.run();
}

if (require.main === module) {
  runFunctionalTests()
    .then(report => {
      process.exit(report.failed > 0 ? 1 : 0);
    })
    .catch(err => {
      console.error('Error fatal al ejecutar pruebas funcionales:', err);
      process.exit(1);
    });
}

module.exports = { runFunctionalTests };

/**
 * ============================================================================
 * SERVIDOR PRINCIPAL DE INTEGRACIÓN - SISTEMA DE BIBLIOTECA
 * Arquitectura: Node.js + Express + Base de Datos Relacional (SQLite / MySQL)
 * Unificación: Frontend SPA + Backend REST API + Persistencia Transaccional (ACID)
 * Puerto por defecto: 3001 (configurable via PORT)
 * ============================================================================
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3001;
const DB_FILE = path.join(__dirname, 'biblioteca.db');

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend desde la raíz del proyecto
app.use(express.static(__dirname));

// Instancia de base de datos relacional SQLite con soporte transaccional ACID
const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error('❌ Error al conectar a la base de datos SQLite:', err.message);
  } else {
    console.log('✅ Base de datos relacional SQLite conectada:', DB_FILE);
    db.run('PRAGMA foreign_keys = ON;'); // Garantizar integridad referencial
  }
});

// Promisify SQLite queries
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Mutex secuencial para garantizar aislamiento transaccional estricto (ACID Isolation)
let transactionQueue = Promise.resolve();

function withTransactionLock(operationFn) {
  const currentOp = transactionQueue.then(async () => {
    return await operationFn();
  });
  transactionQueue = currentOp.catch(() => {});
  return currentOp;
}

// Inicialización de esquemas según Modelo Relacional
async function initDatabase(forceReset = false) {
  if (forceReset) {
    await dbRun(`DROP TABLE IF EXISTS cola_espera;`);
    await dbRun(`DROP TABLE IF EXISTS comprobantes;`);
    await dbRun(`DROP TABLE IF EXISTS pagos;`);
    await dbRun(`DROP TABLE IF EXISTS adeudos;`);
    await dbRun(`DROP TABLE IF EXISTS solicitudes;`);
    await dbRun(`DROP TABLE IF EXISTS prestamos;`);
    await dbRun(`DROP TABLE IF EXISTS libros;`);
    await dbRun(`DROP TABLE IF EXISTS usuarios;`);
    await dbRun(`DROP TABLE IF EXISTS administradores;`);
  }

  // 1. Administradores
  await dbRun(`
    CREATE TABLE IF NOT EXISTS administradores (
      id_admin INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      rol TEXT NOT NULL,
      contrasena TEXT NOT NULL
    );
  `);

  // 2. Usuarios
  await dbRun(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      matricula TEXT UNIQUE NOT NULL,
      correo TEXT NOT NULL,
      tipo_usuario TEXT CHECK(tipo_usuario IN ('Estudiante', 'Docente')) NOT NULL
    );
  `);

  // 3. Libros (Con estante / ubicación física)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS libros (
      id_libro INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      autor TEXT NOT NULL,
      editorial TEXT NOT NULL,
      estado TEXT DEFAULT 'Disponible',
      categoria TEXT NOT NULL,
      copias_totales INTEGER NOT NULL DEFAULT 1,
      copias_disponibles INTEGER NOT NULL DEFAULT 1,
      imagen TEXT,
      estante TEXT DEFAULT 'Estante A-1 (General)'
    );
  `);

  // 4. Préstamos
  await dbRun(`
    CREATE TABLE IF NOT EXISTS prestamos (
      id_prestamo INTEGER PRIMARY KEY AUTOINCREMENT,
      id_usuario INTEGER NOT NULL,
      id_libro INTEGER NOT NULL,
      fecha_prestamo TEXT NOT NULL,
      fecha_limite TEXT NOT NULL,
      fecha_devolucion TEXT,
      FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
      FOREIGN KEY (id_libro) REFERENCES libros(id_libro) ON DELETE RESTRICT
    );
  `);

  // 5. Solicitudes de préstamo
  await dbRun(`
    CREATE TABLE IF NOT EXISTS solicitudes (
      id_solicitud INTEGER PRIMARY KEY AUTOINCREMENT,
      id_usuario INTEGER NOT NULL,
      id_libro INTEGER NOT NULL,
      fecha_solicitud TEXT NOT NULL,
      estado TEXT DEFAULT 'Pendiente',
      fecha_autorizacion TEXT,
      id_prestamo INTEGER,
      FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
      FOREIGN KEY (id_libro) REFERENCES libros(id_libro) ON DELETE CASCADE
    );
  `);

  // 6. Adeudos (Con soporte para multas por daños y concepto)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS adeudos (
      id_adeudo INTEGER PRIMARY KEY AUTOINCREMENT,
      id_prestamo INTEGER NOT NULL,
      estado TEXT CHECK(estado IN ('Pendiente', 'Pagado', 'Validacion_Pendiente')) DEFAULT 'Pendiente',
      dias_retraso INTEGER NOT NULL DEFAULT 0,
      monto_total REAL NOT NULL DEFAULT 0.0,
      monto_dano REAL NOT NULL DEFAULT 0.0,
      motivo TEXT,
      FOREIGN KEY (id_prestamo) REFERENCES prestamos(id_prestamo) ON DELETE RESTRICT
    );
  `);

  // 7. Pagos
  await dbRun(`
    CREATE TABLE IF NOT EXISTS pagos (
      id_pago INTEGER PRIMARY KEY AUTOINCREMENT,
      id_adeudo INTEGER NOT NULL,
      monto REAL NOT NULL,
      fecha_pago TEXT NOT NULL,
      tipo_pago TEXT CHECK(tipo_pago IN ('Presencial', 'Transferencia')) NOT NULL,
      validado INTEGER DEFAULT 0,
      id_admin INTEGER,
      FOREIGN KEY (id_adeudo) REFERENCES adeudos(id_adeudo) ON DELETE RESTRICT,
      FOREIGN KEY (id_admin) REFERENCES administradores(id_admin) ON DELETE SET NULL
    );
  `);

  // 8. Comprobantes
  await dbRun(`
    CREATE TABLE IF NOT EXISTS comprobantes (
      id_comprobante INTEGER PRIMARY KEY AUTOINCREMENT,
      id_pago INTEGER NOT NULL,
      folio TEXT UNIQUE NOT NULL,
      fecha TEXT NOT NULL,
      FOREIGN KEY (id_pago) REFERENCES pagos(id_pago) ON DELETE CASCADE
    );
  `);

  // 9. Cola de Espera / Reservas cuando no hay copias disponibles
  await dbRun(`
    CREATE TABLE IF NOT EXISTS cola_espera (
      id_reserva INTEGER PRIMARY KEY AUTOINCREMENT,
      id_usuario INTEGER NOT NULL,
      id_libro INTEGER NOT NULL,
      fecha_reserva TEXT NOT NULL,
      estado TEXT CHECK(estado IN ('En_Espera', 'Disponible_Para_Retirar', 'Completada', 'Cancelada')) DEFAULT 'En_Espera',
      fecha_disponible TEXT,
      FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
      FOREIGN KEY (id_libro) REFERENCES libros(id_libro) ON DELETE CASCADE
    );
  `);

  // Migraciones automáticas seguras para bases de datos SQLite preexistentes
  try { await dbRun("ALTER TABLE libros ADD COLUMN estante TEXT DEFAULT 'Estante A-1 (General)';"); } catch (_) {}
  try { await dbRun("ALTER TABLE adeudos ADD COLUMN monto_dano REAL NOT NULL DEFAULT 0.0;"); } catch (_) {}
  try { await dbRun("ALTER TABLE adeudos ADD COLUMN motivo TEXT;"); } catch (_) {}

  // Semilla de datos si la base está vacía
  const userCount = await dbGet('SELECT COUNT(*) as count FROM usuarios');
  if (userCount.count === 0) {
    await seedDatabaseInitial();
  }
}

// Carga de datos iniciales idénticos a los del Frontend (DEFAULT_DB)
async function seedDatabaseInitial() {
  console.log('🌱 Poblando base de datos con registros iniciales...');

  // Admin
  await dbRun(`INSERT INTO administradores (nombre, rol, contrasena) VALUES (?, ?, ?)`,
    ['Admin Principal', 'Administrativo', 'admin']);

  // Usuarios
  const usuarios = [
    [1, "Sofía Ruiz", "EST101", "sofia.ruiz@escuela.edu.mx", "Estudiante"],
    [2, "Mateo Pérez", "EST102", "mateo.perez@escuela.edu.mx", "Estudiante"],
    [3, "Carlos Gómez", "DOC201", "carlos.gomez@escuela.edu.mx", "Docente"],
    [4, "Elena Torres", "EST103", "elena.torres@escuela.edu.mx", "Estudiante"],
    [5, "Javier Marín", "EST104", "javier.marin@escuela.edu.mx", "Estudiante"],
    [6, "Laura Ortiz", "EST105", "laura.ortiz@escuela.edu.mx", "Estudiante"],
    [7, "Daniel Castro", "EST106", "daniel.castro@escuela.edu.mx", "Estudiante"]
  ];
  for (const u of usuarios) {
    await dbRun(`INSERT INTO usuarios (id_usuario, nombre, matricula, correo, tipo_usuario) VALUES (?, ?, ?, ?, ?)`, u);
  }

  // Libros con su estante / ubicación física asignada
  const libros = [
    [1, "Cien años de soledad", "Gabriel García Márquez", "Editorial Sudamericana", "Disponible", "Literatura", 3, 2, "https://covers.openlibrary.org/b/isbn/9780307474728-L.jpg", "Estante A-1 (Literatura)"],
    [2, "Don Quijote de la Mancha", "Miguel de Cervantes", "Editorial Porrúa", "Disponible", "Literatura", 2, 2, "https://covers.openlibrary.org/b/isbn/9788467016901-L.jpg", "Estante A-2 (Literatura Clásica)"],
    [3, "El Principito", "Antoine de Saint-Exupéry", "Salamandra", "Disponible", "Infantil", 2, 1, "https://covers.openlibrary.org/b/isbn/9780156013987-L.jpg", "Estante B-1 (Infantil y Juvenil)"],
    [4, "Cálculo Trascendentes Tempranas", "James Stewart", "Cengage Learning", "Disponible", "Ciencias", 4, 4, "https://covers.openlibrary.org/b/isbn/9781285741550-L.jpg", "Estante C-1 (Ciencias Exactas)"],
    [5, "Física Universitaria", "Sears & Zemansky", "Addison-Wesley", "Disponible", "Ciencias", 3, 3, "https://covers.openlibrary.org/b/isbn/9780321733603-L.jpg", "Estante C-2 (Ciencias Físicas)"],
    [6, "Pedro Páramo", "Juan Rulfo", "Editorial RM", "Disponible", "Literatura", 4, 3, "https://covers.openlibrary.org/b/isbn/9780802133908-L.jpg", "Estante A-3 (Literatura Mexicana)"]
  ];
  for (const b of libros) {
    await dbRun(`INSERT INTO libros (id_libro, titulo, autor, editorial, estado, categoria, copias_totales, copias_disponibles, imagen, estante) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, b);
  }

  // Préstamos
  const getRelativeDateStr = (offsetDays) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  };

  await dbRun(`INSERT INTO prestamos (id_prestamo, id_usuario, id_libro, fecha_prestamo, fecha_limite, fecha_devolucion) VALUES (?, ?, ?, ?, ?, ?)`,
    [1, 2, 1, getRelativeDateStr(-10), getRelativeDateStr(-3), null]); // Vencido Mateo Pérez
  await dbRun(`INSERT INTO prestamos (id_prestamo, id_usuario, id_libro, fecha_prestamo, fecha_limite, fecha_devolucion) VALUES (?, ?, ?, ?, ?, ?)`,
    [2, 3, 3, getRelativeDateStr(-5), getRelativeDateStr(2), null]);  // Activo Carlos Gómez

  // Adeudo
  await dbRun(`INSERT INTO adeudos (id_adeudo, id_prestamo, estado, dias_retraso, monto_total) VALUES (?, ?, ?, ?, ?)`,
    [1, 1, 'Pendiente', 3, 30.0]);

  // Solicitud de prueba
  await dbRun(`INSERT INTO solicitudes (id_solicitud, id_usuario, id_libro, fecha_solicitud, estado) VALUES (?, ?, ?, ?, ?)`,
    [1, 1, 2, getRelativeDateStr(0), 'Pendiente']);

  console.log('✅ Base de datos inicializada con éxito.');
}

// ============================================================================
// RUTAS DE LA API REST (Integración Backend-Frontend)
// ============================================================================

// 1. Healthcheck y Diagnóstico de Integración
app.get('/api/health', async (req, res) => {
  try {
    const tableCounts = {};
    const tables = ['administradores', 'usuarios', 'libros', 'prestamos', 'adeudos', 'pagos', 'comprobantes', 'solicitudes', 'cola_espera'];
    for (const t of tables) {
      const row = await dbGet(`SELECT COUNT(*) as count FROM ${t}`);
      tableCounts[t] = row ? row.count : 0;
    }

    res.json({
      status: 'ok',
      engine: 'SQLite3 (ACID Relational Database)',
      architecture: 'Client-Server REST Integration',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      counts: tableCounts
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// 2. Consulta Genérica de Tablas
app.get('/api/:table', async (req, res) => {
  const { table } = req.params;
  const validTables = ['administradores', 'usuarios', 'libros', 'prestamos', 'adeudos', 'pagos', 'comprobantes', 'solicitudes', 'cola_espera'];

  if (!validTables.includes(table)) {
    return res.status(400).json({ error: 'Tabla no válida en el esquema del sistema' });
  }

  try {
    const rows = await dbAll(`SELECT * FROM ${table}`);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Autenticación Integrada
app.post('/api/auth/login', async (req, res) => {
  const { role, username, password, matricula } = req.body;

  try {
    if (role === 'admin') {
      const admin = await dbGet(`SELECT * FROM administradores WHERE (nombre LIKE ? OR 'admin' = ?) AND contrasena = ?`,
        [`%${username}%`, username, password]);
      if (admin) {
        return res.json({
          success: true,
          user: { tipo: 'admin', id: admin.id_admin, nombre: admin.nombre, rol: admin.rol }
        });
      }
      return res.status(401).json({ error: 'Credenciales administrativas inválidas' });
    } else {
      const user = await dbGet(`SELECT * FROM usuarios WHERE matricula = ?`, [matricula ? matricula.trim().toUpperCase() : '']);
      if (user) {
        return res.json({
          success: true,
          user: { tipo: 'user', id: user.id_usuario, nombre: user.nombre, matricula: user.matricula, tipo_usuario: user.tipo_usuario }
        });
      }
      return res.status(404).json({ error: 'Matrícula no encontrada en el padrón escolar' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. REGISTRAR PRÉSTAMO (Transacción ACID)
app.post('/api/prestamos/registrar', async (req, res) => {
  const { id_usuario, id_libro, fecha_prestamo, fecha_limite } = req.body;

  if (!id_usuario || !id_libro || !fecha_prestamo || !fecha_limite) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos para el préstamo' });
  }

  if (fecha_limite < fecha_prestamo) {
    return res.status(400).json({ error: 'La fecha límite debe ser igual o posterior a la fecha de préstamo' });
  }

  return withTransactionLock(async () => {
    try {
      await dbRun('BEGIN IMMEDIATE TRANSACTION;');

      // Verificar libro
      const book = await dbGet('SELECT * FROM libros WHERE id_libro = ?', [id_libro]);
      if (!book) {
        await dbRun('ROLLBACK;');
        return res.status(404).json({ error: 'Libro no encontrado en el catálogo' });
      }

      if (book.copias_disponibles <= 0) {
        await dbRun('ROLLBACK;');
        return res.status(409).json({ error: 'No hay copias disponibles de este libro' });
      }

      // Regla de Negocio: Verificar que el usuario no tenga adeudos pendientes
      const debts = await dbGet(`
        SELECT COUNT(*) as pending_debts FROM adeudos a
        JOIN prestamos p ON a.id_prestamo = p.id_prestamo
        WHERE p.id_usuario = ? AND a.estado != 'Pagado'
      `, [id_usuario]);

      if (debts && debts.pending_debts > 0) {
        await dbRun('ROLLBACK;');
        return res.status(409).json({ error: 'El usuario tiene multas pendientes de pago y no puede solicitar préstamos' });
      }

      // Paso 1: Registrar préstamo
      const loanResult = await dbRun(
        `INSERT INTO prestamos (id_usuario, id_libro, fecha_prestamo, fecha_limite, fecha_devolucion) VALUES (?, ?, ?, ?, NULL)`,
        [id_usuario, id_libro, fecha_prestamo, fecha_limite]
      );
      const loanId = loanResult.lastID;

      // Paso 2: Decrementar inventario de copias disponibles
      const nuevasCopias = book.copias_disponibles - 1;
      const nuevoEstado = nuevasCopias === 0 ? 'Prestado' : 'Disponible';
      await dbRun(
        `UPDATE libros SET copias_disponibles = ?, estado = ? WHERE id_libro = ?`,
        [nuevasCopias, nuevoEstado, id_libro]
      );

      // Paso 3: Auto-resolver solicitud pendiente si existe
      await dbRun(
        `UPDATE solicitudes SET estado = 'Autorizada', fecha_autorizacion = ?, id_prestamo = ?
         WHERE id_usuario = ? AND id_libro = ? AND estado = 'Pendiente'`,
        [fecha_prestamo, loanId, id_usuario, id_libro]
      );

      // Paso 4: Auto-completar registro en cola de espera si el usuario estaba en espera
      await dbRun(
        `UPDATE cola_espera SET estado = 'Completada'
         WHERE id_usuario = ? AND id_libro = ? AND estado IN ('En_Espera', 'Disponible_Para_Retirar')`,
        [id_usuario, id_libro]
      );

      await dbRun('COMMIT;');

      const newLoan = await dbGet(`
        SELECT p.*, u.nombre as usuario_nombre, u.matricula, l.titulo as libro_titulo
        FROM prestamos p
        JOIN usuarios u ON p.id_usuario = u.id_usuario
        JOIN libros l ON p.id_libro = l.id_libro
        WHERE p.id_prestamo = ?
      `, [loanId]);

      return res.status(201).json(newLoan);
    } catch (error) {
      try { await dbRun('ROLLBACK;'); } catch (_) {}
      if (process.env.NODE_ENV !== 'test') console.error('Error en transacción de préstamo:', error);
      return res.status(500).json({ error: 'Error interno al registrar el préstamo', details: error.message });
    }
  });
});

// 5. REGISTRAR DEVOLUCIÓN, CÁLCULO DE MULTAS POR MORA Y DAÑOS (Transacción ACID)
app.post('/api/prestamos/devolver', async (req, res) => {
  const { id_prestamo, fecha_devolucion, multa_dano, motivo_dano } = req.body;

  if (!id_prestamo || !fecha_devolucion) {
    return res.status(400).json({ error: 'id_prestamo y fecha_devolucion son requeridos' });
  }

  return withTransactionLock(async () => {
    try {
      await dbRun('BEGIN IMMEDIATE TRANSACTION;');

      const loan = await dbGet(
        `SELECT p.*, l.copias_totales, l.copias_disponibles, l.id_libro, l.titulo as libro_titulo
         FROM prestamos p
         JOIN libros l ON p.id_libro = l.id_libro
         WHERE p.id_prestamo = ? AND p.fecha_devolucion IS NULL`,
        [id_prestamo]
      );

      if (!loan) {
        await dbRun('ROLLBACK;');
        return res.status(404).json({ error: 'Préstamo no encontrado o ya fue devuelto previamente' });
      }

      // Paso 1: Actualizar fecha de devolución
      await dbRun(`UPDATE prestamos SET fecha_devolucion = ? WHERE id_prestamo = ?`, [fecha_devolucion, id_prestamo]);

      // Paso 2: Cálculo preciso de días de mora y multa por retraso ($10 MXN/día)
      const pLimite = loan.fecha_limite.split('-').map(Number);
      const pDev = fecha_devolucion.split('-').map(Number);
      const dLimite = new Date(pLimite[0], pLimite[1] - 1, pLimite[2]);
      const dDev = new Date(pDev[0], pDev[1] - 1, pDev[2]);

      let diasRetraso = 0;
      let montoRetraso = 0;

      if (dDev > dLimite) {
        const diffMs = dDev.getTime() - dLimite.getTime();
        diasRetraso = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        montoRetraso = diasRetraso * 10.0;
      }

      // Paso 3: Multa adicional opcional por daños físicos decidida por el administrador
      const montoDano = (multa_dano !== undefined && multa_dano !== null && !isNaN(parseFloat(multa_dano)))
        ? Math.max(0, parseFloat(multa_dano))
        : 0.0;
      const motivoDanoStr = motivo_dano ? String(motivo_dano).trim() : '';

      const montoTotal = montoRetraso + montoDano;

      let motivoCompleto = null;
      if (diasRetraso > 0 && montoDano > 0) {
        motivoCompleto = `Retraso (${diasRetraso} d: $${montoRetraso.toFixed(2)}) + Daños físicos ($${montoDano.toFixed(2)}): ${motivoDanoStr || 'Daños en el ejemplar'}`;
      } else if (montoDano > 0) {
        motivoCompleto = `Daños físicos ($${montoDano.toFixed(2)}): ${motivoDanoStr || 'Daños en el ejemplar'}`;
      } else if (diasRetraso > 0) {
        motivoCompleto = `Retraso de entrega (${diasRetraso} días)`;
      }

      let idAdeudo = null;
      if (montoTotal > 0) {
        const debtRes = await dbRun(
          `INSERT INTO adeudos (id_prestamo, estado, dias_retraso, monto_total, monto_dano, motivo) VALUES (?, 'Pendiente', ?, ?, ?, ?)`,
          [id_prestamo, diasRetraso, montoTotal, montoDano, motivoCompleto]
        );
        idAdeudo = debtRes.lastID;
      }

      // Paso 4: Incrementar inventario de copias disponibles
      const nuevasCopias = Math.min(loan.copias_totales, loan.copias_disponibles + 1);
      await dbRun(
        `UPDATE libros SET copias_disponibles = ?, estado = 'Disponible' WHERE id_libro = ?`,
        [nuevasCopias, loan.id_libro]
      );

      // Paso 5: Avisar a la cola de espera si hay lectores formados para este libro
      let waitlistNotified = null;
      const nextInWaitlist = await dbGet(
        `SELECT c.*, u.nombre as usuario_nombre, u.matricula
         FROM cola_espera c
         JOIN usuarios u ON c.id_usuario = u.id_usuario
         WHERE c.id_libro = ? AND c.estado = 'En_Espera'
         ORDER BY c.id_reserva ASC LIMIT 1`,
        [loan.id_libro]
      );

      if (nextInWaitlist) {
        await dbRun(
          `UPDATE cola_espera SET estado = 'Disponible_Para_Retirar', fecha_disponible = ? WHERE id_reserva = ?`,
          [fecha_devolucion, nextInWaitlist.id_reserva]
        );
        waitlistNotified = {
          id_reserva: nextInWaitlist.id_reserva,
          id_usuario: nextInWaitlist.id_usuario,
          nombre: nextInWaitlist.usuario_nombre,
          matricula: nextInWaitlist.matricula
        };
      }

      await dbRun('COMMIT;');

      return res.json({
        success: true,
        id_prestamo,
        dias_retraso: diasRetraso,
        multa_retraso: montoRetraso,
        multa_dano: montoDano,
        multa_generada: montoTotal,
        motivo: motivoCompleto,
        id_adeudo: idAdeudo,
        usuario_cola_notificado: waitlistNotified
      });
    } catch (error) {
      try { await dbRun('ROLLBACK;'); } catch (_) {}
      if (process.env.NODE_ENV !== 'test') console.error('Error en transacción de devolución:', error);
      return res.status(500).json({ error: 'Error al registrar la devolución', details: error.message });
    }
  });
});

// 6. REGISTRAR PAGO (Transacción ACID)
app.post('/api/pagos/registrar', async (req, res) => {
  const { id_adeudo, monto, fecha_pago, tipo_pago, id_admin } = req.body;

  if (!id_adeudo || monto === undefined || !fecha_pago || !tipo_pago) {
    return res.status(400).json({ error: 'Parámetros incompletos para el registro de pago' });
  }

  return withTransactionLock(async () => {
    try {
      await dbRun('BEGIN IMMEDIATE TRANSACTION;');

      const adeudo = await dbGet(`SELECT * FROM adeudos WHERE id_adeudo = ? AND estado = 'Pendiente'`, [id_adeudo]);
      if (!adeudo) {
        await dbRun('ROLLBACK;');
        return res.status(404).json({ error: 'Adeudo no encontrado o ya liquidado' });
      }

      if (parseFloat(monto) !== parseFloat(adeudo.monto_total)) {
        await dbRun('ROLLBACK;');
        return res.status(400).json({ error: `El monto ingresado ($${monto}) no coincide con el total del adeudo ($${adeudo.monto_total})` });
      }

      const esPresencial = tipo_pago === 'Presencial';
      const validado = esPresencial ? 1 : 0;
      const adminAsignado = esPresencial ? (id_admin || 1) : null;

      // Paso 1: Insertar pago
      const pagoResult = await dbRun(
        `INSERT INTO pagos (id_adeudo, monto, fecha_pago, tipo_pago, validado, id_admin) VALUES (?, ?, ?, ?, ?, ?)`,
        [id_adeudo, monto, fecha_pago, tipo_pago, validado, adminAsignado]
      );
      const idPago = pagoResult.lastID;

      // Paso 2: Actualizar estado del adeudo
      const nuevoEstado = esPresencial ? 'Pagado' : 'Validacion_Pendiente';
      await dbRun(`UPDATE adeudos SET estado = ? WHERE id_adeudo = ?`, [nuevoEstado, id_adeudo]);

      // Paso 3: Emisión de folio y comprobante si el pago es validado
      let folioGenerado = null;
      if (esPresencial) {
        const fechaLimpia = fecha_pago.replace(/-/g, '');
        folioGenerado = `F-${fechaLimpia}-${idPago.toString().padStart(4, '0')}`;
        await dbRun(
          `INSERT INTO comprobantes (id_pago, folio, fecha) VALUES (?, ?, ?)`,
          [idPago, folioGenerado, fecha_pago]
        );
      }

      await dbRun('COMMIT;');

      return res.status(201).json({
        success: true,
        id_pago: idPago,
        estado_adeudo: nuevoEstado,
        folio: folioGenerado
      });
    } catch (error) {
      try { await dbRun('ROLLBACK;'); } catch (_) {}
      if (process.env.NODE_ENV !== 'test') console.error('Error en transacción de pago:', error);
      return res.status(500).json({ error: 'Error al registrar el pago', details: error.message });
    }
  });
});

// 7. VALIDAR PAGO POR TRANSFERENCIA (Transacción ACID)
app.put('/api/pagos/:id_pago/validar', async (req, res) => {
  const { id_pago } = req.params;
  const { id_admin } = req.body;

  return withTransactionLock(async () => {
    try {
      await dbRun('BEGIN IMMEDIATE TRANSACTION;');

      const payment = await dbGet(`SELECT * FROM pagos WHERE id_pago = ? AND validado = 0`, [id_pago]);
      if (!payment) {
        await dbRun('ROLLBACK;');
        return res.status(404).json({ error: 'Pago no encontrado o ya fue validado previamente' });
      }

      // Paso 1: Validar el pago
      await dbRun(
        `UPDATE pagos SET validado = 1, id_admin = ? WHERE id_pago = ?`,
        [id_admin || 1, id_pago]
      );

      // Paso 2: Marcar adeudo como Pagado
      await dbRun(`UPDATE adeudos SET estado = 'Pagado' WHERE id_adeudo = ?`, [payment.id_adeudo]);

      // Paso 3: Generar comprobante con folio oficial
      const today = new Date().toISOString().split('T')[0];
      const fechaLimpia = today.replace(/-/g, '');
      const folio = `F-${fechaLimpia}-${id_pago.toString().padStart(4, '0')}`;

      await dbRun(
        `INSERT INTO comprobantes (id_pago, folio, fecha) VALUES (?, ?, ?)`,
        [id_pago, folio, today]
      );

      await dbRun('COMMIT;');

      return res.json({
        success: true,
        id_pago,
        folio,
        mensaje: 'Pago en línea validado y comprobante generado con éxito'
      });
    } catch (error) {
      try { await dbRun('ROLLBACK;'); } catch (_) {}
      if (process.env.NODE_ENV !== 'test') console.error('Error en validación de pago:', error);
      return res.status(500).json({ error: 'Error al validar el pago', details: error.message });
    }
  });
});

// 8. SOLICITUDES DE PRÉSTAMO (Portal Estudiante)
app.post('/api/solicitudes/crear', async (req, res) => {
  const { id_usuario, id_libro, fecha_solicitud } = req.body;
  if (!id_usuario || !id_libro) {
    return res.status(400).json({ error: 'id_usuario e id_libro requeridos' });
  }

  try {
    const today = fecha_solicitud || new Date().toISOString().split('T')[0];
    const result = await dbRun(
      `INSERT INTO solicitudes (id_usuario, id_libro, fecha_solicitud, estado) VALUES (?, ?, ?, 'Pendiente')`,
      [id_usuario, id_libro, today]
    );
    res.status(201).json({ success: true, id_solicitud: result.lastID });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 9. ACTUALIZAR ESTANTE / UBICACIÓN FÍSICA DE UN LIBRO (Administrador)
app.put('/api/libros/:id_libro/estante', async (req, res) => {
  const { id_libro } = req.params;
  const { estante } = req.body;

  if (!estante || !estante.trim()) {
    return res.status(400).json({ error: 'La ubicación o estante físico es obligatorio' });
  }

  try {
    const book = await dbGet('SELECT * FROM libros WHERE id_libro = ?', [id_libro]);
    if (!book) {
      return res.status(404).json({ error: 'Libro no encontrado en el inventario' });
    }

    const nuevoEstante = estante.trim();
    await dbRun('UPDATE libros SET estante = ? WHERE id_libro = ?', [nuevoEstante, id_libro]);

    res.json({
      success: true,
      id_libro: parseInt(id_libro),
      estante: nuevoEstante,
      message: `Ubicación física actualizada a "${nuevoEstante}"`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 10. REGISTRAR NUEVO LIBRO (Administrador)
app.post('/api/libros/crear', async (req, res) => {
  const { titulo, autor, editorial, categoria, copias_totales, imagen, estante } = req.body;

  if (!titulo || !autor || !editorial || !categoria) {
    return res.status(400).json({ error: 'Título, autor, editorial y categoría son obligatorios' });
  }

  const copias = parseInt(copias_totales) || 1;
  const estanteVal = (estante && estante.trim()) ? estante.trim() : 'Estante General';

  try {
    const result = await dbRun(
      `INSERT INTO libros (titulo, autor, editorial, estado, categoria, copias_totales, copias_disponibles, imagen, estante)
       VALUES (?, ?, ?, 'Disponible', ?, ?, ?, ?, ?)`,
      [titulo.trim(), autor.trim(), editorial.trim(), categoria.trim(), copias, copias, imagen ? imagen.trim() : null, estanteVal]
    );

    res.status(201).json({
      success: true,
      id_libro: result.lastID,
      titulo: titulo.trim(),
      estante: estanteVal,
      copias_totales: copias,
      copias_disponibles: copias
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 11. UNIRSE A LA COLA DE ESPERA (Usuario cuando un libro está sin copias)
app.post('/api/cola-espera/unirse', async (req, res) => {
  const { id_usuario, id_libro } = req.body;

  if (!id_usuario || !id_libro) {
    return res.status(400).json({ error: 'id_usuario e id_libro son requeridos' });
  }

  try {
    const book = await dbGet('SELECT * FROM libros WHERE id_libro = ?', [id_libro]);
    if (!book) {
      return res.status(404).json({ error: 'Libro no encontrado en el catálogo' });
    }

    // Verificar si el usuario ya tiene un préstamo activo de este libro
    const activeLoan = await dbGet(
      `SELECT * FROM prestamos WHERE id_usuario = ? AND id_libro = ? AND fecha_devolucion IS NULL`,
      [id_usuario, id_libro]
    );
    if (activeLoan) {
      return res.status(409).json({ error: 'Ya tienes este libro en préstamo activo' });
    }

    // Verificar si ya está en la cola de espera activo o con ejemplar disponible
    const existing = await dbGet(
      `SELECT * FROM cola_espera WHERE id_usuario = ? AND id_libro = ? AND estado IN ('En_Espera', 'Disponible_Para_Retirar')`,
      [id_usuario, id_libro]
    );
    if (existing) {
      return res.status(409).json({
        error: 'Ya te encuentras registrado en la cola de espera para este libro',
        reserva: existing
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const result = await dbRun(
      `INSERT INTO cola_espera (id_usuario, id_libro, fecha_reserva, estado) VALUES (?, ?, ?, 'En_Espera')`,
      [id_usuario, id_libro, today]
    );

    // Obtener turno en la cola
    const countPos = await dbGet(
      `SELECT COUNT(*) as pos FROM cola_espera WHERE id_libro = ? AND estado = 'En_Espera' AND id_reserva <= ?`,
      [id_libro, result.lastID]
    );

    res.status(201).json({
      success: true,
      id_reserva: result.lastID,
      id_libro: parseInt(id_libro),
      posicion: countPos ? countPos.pos : 1,
      mensaje: `Registrado en la cola de espera con éxito (Turno #${countPos ? countPos.pos : 1})`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 12. CANCELAR RESERVA DE COLA DE ESPERA
app.post('/api/cola-espera/cancelar', async (req, res) => {
  const { id_reserva, id_usuario, id_libro } = req.body;

  try {
    if (id_reserva) {
      await dbRun(`UPDATE cola_espera SET estado = 'Cancelada' WHERE id_reserva = ?`, [id_reserva]);
    } else if (id_usuario && id_libro) {
      await dbRun(
        `UPDATE cola_espera SET estado = 'Cancelada' WHERE id_usuario = ? AND id_libro = ? AND estado IN ('En_Espera', 'Disponible_Para_Retirar')`,
        [id_usuario, id_libro]
      );
    } else {
      return res.status(400).json({ error: 'Se requiere id_reserva o id_usuario + id_libro' });
    }
    res.json({ success: true, message: 'Reserva cancelada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 13. CONSULTAR ESTADO DE COLA DE UN LIBRO
app.get('/api/cola-espera/libro/:id_libro', async (req, res) => {
  const { id_libro } = req.params;
  try {
    const list = await dbAll(
      `SELECT c.*, u.nombre as usuario_nombre, u.matricula
       FROM cola_espera c
       JOIN usuarios u ON c.id_usuario = u.id_usuario
       WHERE c.id_libro = ? AND c.estado IN ('En_Espera', 'Disponible_Para_Retirar')
       ORDER BY c.id_reserva ASC`,
      [id_libro]
    );
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 14. REINICIO DE BASE DE DATOS (Para Pruebas Automatizadas)
app.post('/api/reset-db', async (req, res) => {
  try {
    await initDatabase(true);
    res.json({ success: true, message: 'Base de datos reiniciada a estado original' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Inicializar DB e Iniciar Servidor
async function start() {
  await initDatabase(false);
  app.listen(PORT, () => {
    console.log(`========================================================`);
    console.log(`🚀 SERVIDOR UNIFICADO DE BIBLIOTECA INICIADO`);
    console.log(`📡 URL Principal: http://localhost:${PORT}`);
    console.log(`📦 API REST:      http://localhost:${PORT}/api/health`);
    console.log(`📁 Pruebas E6:    http://localhost:${PORT}/pruebas_etapa6/`);
    console.log(`========================================================`);
  });
}

// Exportar para pruebas de supertest / testing
module.exports = { app, db, dbRun, dbGet, dbAll, initDatabase };

if (require.main === module) {
  start();
}

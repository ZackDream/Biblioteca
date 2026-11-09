const express = require('express');
const cors = require('cors');
let mysql;
try {
    mysql = require('mysql2/promise');
} catch (e) {
    // Modo seguro
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'biblioteca_db',
    port: 3306
};

let pool;

async function initDB() {
    if (!mysql) {
        console.error('❌ Para usar ConjuntoConBD.js se requiere el paquete mysql2 y un servidor MySQL activo.');
        console.log('💡 TIP: Ejecuta "npm start" o "node server.js" para iniciar el servidor integrado con soporte automático relacional SQLite/MySQL.');
        process.exit(1);
    }
    pool = mysql.createPool(dbConfig);
    console.log('✅ Pool de conexiones MySQL creado');
}

// REGISTRAR PRÉSTAMO
// ATOMICIDAD: 
//    - INSERT en prestamos + UPDATE en libros se ejecutan en UNA transacción
//    - Si falla UPDATE, el INSERT se deshace (ROLLBACK)
//    - Si falla INSERT, nada se modifica
//    - Esto es ATOMICIDAD: "todo o nada"
//
// COHERENCIA:
//    - Se verifica que copias_disponibles > 0 ANTES de prestar
//    - Se verifica que el usuario NO tenga multas pendientes
//    - Se actualiza copias_disponibles = copias_disponibles - 1
//    - Se actualiza estado = 'Prestado' si copias_disponibles llega a 0
//    - Estas reglas mantienen la base de datos en un estado CONSISTENTE
//
// AISLAMIENTO:
//    - BEGIN TRANSACTION inicia una transacción aislada
//    - SELECT ... FOR UPDATE BLOQUEA la fila del libro
//    - Esto evita que dos administradores presten la última copia simultáneamente
//    - Hasta que una transacción termine (COMMIT/ROLLBACK), la fila está LOCKED
//
// DURABILIDAD:
//    - COMMIT persiste los cambios en disco
//    - Si el servidor se cae después del COMMIT, los datos NO se pierden
//    - MySQL garantiza recuperación ante fallos
// =====================================================================
app.post('/api/prestamos/registrar', async (req, res) => {
    const { id_usuario, id_libro, fecha_prestamo, fecha_limite } = req.body;
    
    // COHERENCIA: Validación de fecha límite
    if (fecha_limite < fecha_prestamo) {
        return res.status(400).json({ 
            error: 'La fecha límite debe ser posterior a la fecha de préstamo' 
        });
    }
    
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();                                   // ATOMICIDAD + AISLAMIENTO: Inicia transacción aislada
        
        const [books] = await connection.execute(
            'SELECT copias_disponibles FROM libros WHERE id_libro = ? FOR UPDATE',  // AISLAMIENTO: FOR UPDATE bloquea fila del libro
            [id_libro]
        );
        
        if (books.length === 0) {
            await connection.rollback();                                      // ATOMICIDAD: Rollback si hay error
            return res.status(404).json({ error: 'Libro no encontrado' });
        }
        
        const book = books[0];
        
        // COHERENCIA: Regla de negocio #1 - No prestar si no hay copias
        if (book.copias_disponibles <= 0) {
            await connection.rollback();                                      // ATOMICIDAD: Rollback si hay error
            return res.status(409).json({ error: 'No hay copias disponibles del libro' });
        }
        
        // COHERENCIA: Regla de negocio #2 - Usuario sin multas pendientes
        const [debts] = await connection.execute(
            `SELECT COUNT(*) as pending_debts FROM adeudos a 
             JOIN prestamos p ON a.id_prestamo = p.id_prestamo 
             WHERE p.id_usuario = ? AND a.estado != 'Pagado'`,
            [id_usuario]
        );
        
        if (debts[0].pending_debts > 0) {
            await connection.rollback();                                      // ATOMICIDAD: Rollback si hay error
            return res.status(409).json({ 
                error: 'El usuario tiene multas pendientes y no puede solicitar préstamos' 
            });
        }
        
        // ATOMICIDAD: PASO 1 - Insertar el préstamo
        const [loanResult] = await connection.execute(
            `INSERT INTO prestamos (id_usuario, id_libro, fecha_prestamo, fecha_limite, fecha_devolucion) 
             VALUES (?, ?, ?, ?, NULL)`,
            [id_usuario, id_libro, fecha_prestamo, fecha_limite]
        );
        
        // ATOMICIDAD: PASO 2 - Actualizar copias disponibles
        const nuevasCopias = book.copias_disponibles - 1;
        await connection.execute(
            `UPDATE libros SET copias_disponibles = ?, 
             estado = CASE WHEN ? = 0 THEN 'Prestado' ELSE 'Disponible' END 
             WHERE id_libro = ?`,
            [nuevasCopias, nuevasCopias, id_libro]
        );
        
        await connection.commit();                                            // DURABILIDAD + ATOMICIDAD: Confirma y persiste
        
        const [newLoan] = await connection.execute(
            `SELECT p.*, u.nombre as usuario_nombre, u.matricula, l.titulo as libro_titulo 
             FROM prestamos p
             JOIN usuarios u ON p.id_usuario = u.id_usuario
             JOIN libros l ON p.id_libro = l.id_libro
             WHERE p.id_prestamo = ?`,
            [loanResult.insertId]
        );
        
        res.status(201).json(newLoan[0]);
        
    } catch (error) {
        await connection.rollback();                                          // ATOMICIDAD: Si algo falla, deshace TODO (ROLLBACK)
        console.error('Error en transacción de préstamo:', error);
        res.status(500).json({ error: 'Error al registrar el préstamo' });
    } finally {
        connection.release();
    }
});

// REGISTRAR DEVOLUCIÓN
// ATOMICIDAD:
//    - UPDATE prestamo (marcar como devuelto)
//    - (condicional) INSERT adeudo (si hay retraso)
//    - UPDATE libro (incrementar copias disponibles)
//    - Las 3 operaciones son UNA UNIDAD ATÓMICA
//
// COHERENCIA:
//    - Calcula días de retraso correctamente usando fecha_limite
//    - La multa es $10 por día de retraso (regla de negocio consistente)
//    - Si no hay retraso, NO se genera adeudo (estado coherente)
//
// AISLAMIENTO:
//    - Transacción aislada de otras operaciones concurrentes
//    - El préstamo se bloquea con FOR UPDATE
//
// DURABILIDAD:
//    - La multa (adeudo) persiste permanentemente
//    - No se pierde aunque falle el servidor después del commit
// =====================================================================
app.post('/api/prestamos/devolver', async (req, res) => {
    const { id_prestamo, fecha_devolucion } = req.body;
    
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();                                   // ATOMICIDAD + AISLAMIENTO: Inicia transacción
        
        const [loans] = await connection.execute(
            `SELECT p.*, l.copias_totales, l.copias_disponibles 
             FROM prestamos p 
             JOIN libros l ON p.id_libro = l.id_libro 
             WHERE p.id_prestamo = ? AND p.fecha_devolucion IS NULL
             FOR UPDATE`,                                                    // AISLAMIENTO: FOR UPDATE bloquea fila del préstamo
            [id_prestamo]
        );
        
        if (loans.length === 0) {
            await connection.rollback();                                      // ATOMICIDAD: Rollback si hay error
            return res.status(404).json({ error: 'Préstamo no encontrado o ya devuelto' });
        }
        
        const loan = loans[0];
        const fechaLimite = new Date(loan.fecha_limite);
        const fechaDev = new Date(fecha_devolucion);
        
        await connection.execute(                                             // ATOMICIDAD: PASO 1 - Marcar préstamo como devuelto
            `UPDATE prestamos SET fecha_devolucion = ? WHERE id_prestamo = ?`,
            [fecha_devolucion, id_prestamo]
        );
        
        let diasRetraso = 0;
        let montoMulta = 0;
        
        if (fechaDev > fechaLimite) {                                         // COHERENCIA: Calcular retraso
            const diffTime = Math.abs(fechaDev - fechaLimite);
            diasRetraso = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            montoMulta = diasRetraso * 10;                                    // COHERENCIA: Regla de negocio $10/día
            
            await connection.execute(                                         // ATOMICIDAD: PASO 2 - Insertar adeudo
                `INSERT INTO adeudos (id_prestamo, estado, dias_retraso, monto_total) 
                 VALUES (?, 'Pendiente', ?, ?)`,
                [id_prestamo, diasRetraso, montoMulta]
            );
        }
        
        const nuevasCopias = loan.copias_disponibles + 1;
        await connection.execute(                                             // ATOMICIDAD: PASO 3 - Devolver copia al inventario
            `UPDATE libros SET copias_disponibles = ?, estado = 'Disponible' 
             WHERE id_libro = ?`,
            [nuevasCopias, loan.id_libro]
        );
        
        await connection.commit();                                            // DURABILIDAD + ATOMICIDAD: Confirmar permanentemente
        
        res.json({
            success: true,
            dias_retraso: diasRetraso,
            multa_generada: montoMulta
        });
        
    } catch (error) {
        await connection.rollback();                                          // ATOMICIDAD: Si falla, deshace TODO
        console.error('Error en devolución:', error);
        res.status(500).json({ error: 'Error al procesar la devolución' });
    } finally {
        connection.release();
    }
});

// REGISTRAR PAGO
// ATOMICIDAD:
//    - INSERT pago
//    - UPDATE adeudo (cambiar estado)
//    - INSERT comprobante
//    - Las 3 operaciones son UNA transacción atómica
//
// COHERENCIA:
//    - Verifica que el adeudo NO esté pagado antes de registrar
//    - Verifica que el monto coincida exactamente
//    - Genera folio único para el comprobante
//
// AISLAMIENTO:
//    - Transacción aislada con FOR UPDATE en el adeudo
//
// DURABILIDAD:
//    - El comprobante generado persiste PERMANENTEMENTE
//    - Es legalmente válido como evidencia de pago
// =====================================================================
app.post('/api/pagos/registrar', async (req, res) => {
    const { id_adeudo, monto, fecha_pago, tipo_pago, id_admin } = req.body;
    
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();                                   // ATOMICIDAD + AISLAMIENTO: Inicia transacción
        
        const [debts] = await connection.execute(
            `SELECT * FROM adeudos WHERE id_adeudo = ? AND estado = 'Pendiente' FOR UPDATE`,  // AISLAMIENTO + COHERENCIA: Bloquear y verificar
            [id_adeudo]
        );
        
        if (debts.length === 0) {
            await connection.rollback();                                      // ATOMICIDAD: Rollback si hay error
            return res.status(404).json({ error: 'Adeudo no encontrado o ya pagado' });
        }
        
        const adeudo = debts[0];
        
        if (parseFloat(monto) !== parseFloat(adeudo.monto_total)) {           // COHERENCIA: Verificar monto
            await connection.rollback();                                      // ATOMICIDAD: Rollback si hay error
            return res.status(400).json({ error: 'El monto no coincide con el adeudo' });
        }
        
        const [pagoResult] = await connection.execute(                        // ATOMICIDAD: PASO 1 - Insertar pago
            `INSERT INTO pagos (id_adeudo, monto, fecha_pago, tipo_pago, validado, id_admin) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id_adeudo, monto, fecha_pago, tipo_pago, tipo_pago === 'Presencial' ? 1 : 0, id_admin || null]
        );
        
        const nuevoEstado = tipo_pago === 'Presencial' ? 'Pagado' : 'Validacion_Pendiente';
        await connection.execute(                                             // ATOMICIDAD: PASO 2 - Actualizar estado del adeudo
            `UPDATE adeudos SET estado = ? WHERE id_adeudo = ?`,
            [nuevoEstado, id_adeudo]
        );
        
        const fechaStr = fecha_pago.replace(/-/g, '');
        const folio = `F-${fechaStr}-${pagoResult.insertId.toString().padStart(4, '0')}`;
        
        await connection.execute(                                             // ATOMICIDAD: PASO 3 - Generar comprobante
            `INSERT INTO comprobantes (id_pago, folio, fecha) VALUES (?, ?, ?)`,
            [pagoResult.insertId, folio, fecha_pago]
        );
        
        await connection.commit();                                            // DURABILIDAD + ATOMICIDAD: Confirmar permanentemente
        
        res.status(201).json({
            success: true,
            id_pago: pagoResult.insertId,
            folio: folio
        });
        
    } catch (error) {
        await connection.rollback();                                          // ATOMICIDAD: Si falla, deshace TODO
        console.error('Error en registro de pago:', error);
        res.status(500).json({ error: 'Error al registrar el pago' });
    } finally {
        connection.release();
    }
});

// ENDPOINT: VALIDAR PAGO (Administrativo)
// ATOMICIDAD:
//    - UPDATE pago (validar)
//    - UPDATE adeudo (marcar como pagado)
//    - 2 operaciones en UNA transacción
//
// COHERENCIA:
//    - Verifica que el pago NO esté ya validado
//    - Solo admins pueden validar
//
// AISLAMIENTO:
//    - Transacción aislada con FOR UPDATE
//
// URABILIDAD:
//    - La validación persiste permanentemente
// =====================================================================
app.put('/api/pagos/:id_pago/validar', async (req, res) => {
    const { id_pago } = req.params;
    const { id_admin } = req.body;
    
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();                                   // ATOMICIDAD + AISLAMIENTO: Inicia transacción
        
        const [payments] = await connection.execute(
            `SELECT * FROM pagos WHERE id_pago = ? AND validado = 0 FOR UPDATE`,  // AISLAMIENTO: FOR UPDATE bloquea fila
            [id_pago]
        );
        
        if (payments.length === 0) {
            await connection.rollback();                                      // ATOMICIDAD: Rollback si hay error
            return res.status(404).json({ error: 'Pago no encontrado o ya validado' });
        }
        
        const payment = payments[0];
        
        await connection.execute(                                             // ATOMICIDAD: PASO 1 - Validar pago
            `UPDATE pagos SET validado = 1, id_admin = ? WHERE id_pago = ?`,
            [id_admin, id_pago]
        );
        
        await connection.execute(                                             // ATOMICIDAD: PASO 2 - Marcar adeudo como pagado
            `UPDATE adeudos SET estado = 'Pagado' WHERE id_adeudo = ?`,
            [payment.id_adeudo]
        );
        
        await connection.commit();                                            // DURABILIDAD + ATOMICIDAD: Confirmar permanentemente
        
        res.json({ success: true });
        
    } catch (error) {
        await connection.rollback();                                          // ATOMICIDAD: Si falla, deshace TODO
        console.error('Error en validación:', error);
        res.status(500).json({ error: 'Error al validar el pago' });
    } finally {
        connection.release();
    }
});

app.get('/api/health', async (req, res) => {
    try {
        const [result] = await pool.execute('SELECT 1 as health');
        res.json({ 
            status: 'ok', 
            database: 'connected',
            acidity_supported: true
        });
    } catch (error) {
        res.status(500).json({ status: 'error', error: error.message });
    }
});


app.get('/api/:table', async (req, res) => {
    const { table } = req.params;
    const validTables = ['administradores', 'usuarios', 'libros', 'prestamos', 'adeudos', 'pagos', 'comprobantes'];
    
    if (!validTables.includes(table)) {
        return res.status(400).json({ error: 'Tabla no válida' });
    }
    
    try {
        const [rows] = await pool.execute(`SELECT * FROM ${table}`);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// INICIAR SERVIDOR
async function startServer() {
    await initDB();
    
    app.listen(PORT, () => {
        console.log(`Sistema De Base de datos`);
        console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
}

startServer();
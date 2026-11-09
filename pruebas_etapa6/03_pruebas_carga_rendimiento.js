/**
 * ============================================================================
 * PRUEBAS DE CARGA Y RENDIMIENTO - ETAPA 6: INTEGRACIÓN Y PRUEBAS
 * Asignatura: Seminario de Programación en Internet II
 * Carrera: Informática
 * Objetivo: Evaluar velocidad de respuesta, latencia, throughput y capacidad bajo concurrencia
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { TestSuite, assert, assertEqual, request, colors } = require('./test_helper');
const { app, initDatabase } = require('../server');

// Motor de benchmark de concurrencia
async function benchmarkConcurrentRequests(requestFn, totalRequests, concurrency) {
  const latencies = [];
  let successful = 0;
  let failed = 0;

  const startTime = Date.now();
  let completed = 0;

  return new Promise((resolve) => {
    let index = 0;

    function next() {
      if (index >= totalRequests) {
        if (completed === totalRequests) {
          const totalDuration = Date.now() - startTime;
          latencies.sort((a, b) => a - b);

          const min = latencies[0] || 0;
          const max = latencies[latencies.length - 1] || 0;
          const sum = latencies.reduce((acc, v) => acc + v, 0);
          const avg = latencies.length ? sum / latencies.length : 0;
          const p95 = latencies[Math.floor(latencies.length * 0.95)] || max;
          const p99 = latencies[Math.floor(latencies.length * 0.99)] || max;
          const rps = totalDuration > 0 ? (totalRequests / (totalDuration / 1000)) : totalRequests * 1000;

          resolve({
            totalRequests,
            concurrency,
            successful,
            failed,
            totalDurationMs: totalDuration,
            minLatencyMs: min,
            avgLatencyMs: Number(avg.toFixed(2)),
            maxLatencyMs: max,
            p95LatencyMs: p95,
            p99LatencyMs: p99,
            requestsPerSecond: Number(rps.toFixed(2))
          });
        }
        return;
      }

      const currentIdx = index++;
      const reqStart = Date.now();

      requestFn(currentIdx)
        .then((res) => {
          const duration = Date.now() - reqStart;
          latencies.push(duration);
          if (res.status >= 200 && res.status < 400) {
            successful++;
          } else {
            failed++;
          }
        })
        .catch(() => {
          const duration = Date.now() - reqStart;
          latencies.push(duration);
          failed++;
        })
        .finally(() => {
          completed++;
          next();
        });
    }

    // Iniciar trabajadores concurrentes
    for (let i = 0; i < concurrency; i++) {
      next();
    }
  });
}

async function runPerformanceTests() {
  const suite = new TestSuite('Pruebas de Carga, Rendimiento y Capacidad del Servidor');

  await initDatabase(true);

  // --------------------------------------------------------------------------
  // BENCHMARK 1: CARGA LIGERA - 50 PETICIONES CONCURRENTES
  // --------------------------------------------------------------------------
  await suite.test('[LOAD-01] Capacidad Nivel 1: 50 peticiones concurrentes a /api/health (Latencia < 50ms)', async () => {
    const stats = await benchmarkConcurrentRequests(
      () => request(app, 'GET', '/api/health'),
      50,
      10
    );

    assert(stats.successful === 50, 'Todas las 50 peticiones deben completarse exitosamente');
    assert(stats.avgLatencyMs < 50, `Latencia media (${stats.avgLatencyMs}ms) debe ser menor a 50ms`);
    console.log(`    ${colors.gray}Throughput: ${stats.requestsPerSecond} req/s | Avg: ${stats.avgLatencyMs}ms | P95: ${stats.p95LatencyMs}ms | Max: ${stats.maxLatencyMs}ms${colors.reset}`);
  });

  // --------------------------------------------------------------------------
  // BENCHMARK 2: CARGA MEDIA - 100 PETICIONES CONCURRENTES
  // --------------------------------------------------------------------------
  await suite.test('[LOAD-02] Capacidad Nivel 2: 100 peticiones concurrentes a /api/libros y /api/usuarios', async () => {
    const stats = await benchmarkConcurrentRequests(
      (idx) => {
        const route = idx % 2 === 0 ? '/api/libros' : '/api/usuarios';
        return request(app, 'GET', route);
      },
      100,
      20
    );

    assert(stats.successful === 100, 'Todas las 100 peticiones deben responder con éxito');
    assert(stats.avgLatencyMs < 60, `Latencia media (${stats.avgLatencyMs}ms) debe ser menor a 60ms`);
    console.log(`    ${colors.gray}Throughput: ${stats.requestsPerSecond} req/s | Avg: ${stats.avgLatencyMs}ms | P95: ${stats.p95LatencyMs}ms | Max: ${stats.maxLatencyMs}ms${colors.reset}`);
  });

  // --------------------------------------------------------------------------
  // BENCHMARK 3: CARGA ELEVADA - 200 PETICIONES CONCURRENTES
  // --------------------------------------------------------------------------
  await suite.test('[LOAD-03] Capacidad Nivel 3: 200 peticiones concurrentes con concurrencia 25', async () => {
    const stats = await benchmarkConcurrentRequests(
      (idx) => {
        const routes = ['/api/libros', '/api/prestamos', '/api/adeudos', '/api/solicitudes'];
        return request(app, 'GET', routes[idx % routes.length]);
      },
      200,
      25
    );

    assert(stats.successful === 200, 'Las 200 peticiones deben responder exitosamente (100% éxito)');
    console.log(`    ${colors.gray}Throughput: ${stats.requestsPerSecond} req/s | Avg: ${stats.avgLatencyMs}ms | P95: ${stats.p95LatencyMs}ms | Max: ${stats.maxLatencyMs}ms${colors.reset}`);
  });

  // --------------------------------------------------------------------------
  // ESTRÉS TRANSACCIONAL: AISLAMIENTO ACID BAJO CONCURRENCIA (RACE CONDITIONS)
  // --------------------------------------------------------------------------
  await suite.test('[ACID-01] Aislamiento Concurrente: Intentos simultáneos por la última copia de un libro', async () => {
    // Libro 2 (Don Quijote): 2 copias disponibles
    // Hacemos que tenga exactamente 1 copia disponible
    const books = (await request(app, 'GET', '/api/libros')).body;
    const targetBook = books.find(b => b.id_libro === 2);

    // Préstamo 1 para dejar solo 1 copia
    await request(app, 'POST', '/api/prestamos/registrar', {
      id_usuario: 4,
      id_libro: targetBook.id_libro,
      fecha_prestamo: '2026-10-29',
      fecha_limite: '2026-11-05'
    });

    // Ahora intentamos 5 préstamos simultáneos por la única copia restante
    const usuarios = [1, 5, 6, 7, 3]; // Estudiantes y docentes sin adeudos pendientes
    const promises = usuarios.map(uid =>
      request(app, 'POST', '/api/prestamos/registrar', {
        id_usuario: uid,
        id_libro: targetBook.id_libro,
        fecha_prestamo: '2026-10-29',
        fecha_limite: '2026-11-05'
      })
    );

    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.status === 201).length;
    const conflictCount = results.filter(r => r.status === 409).length;

    // Solo 1 debe tener éxito y 4 deben ser rechazados con 409 Conflict
    assertEqual(successCount, 1, 'Exactamente 1 petición debe obtener la última copia (Consistencia e Integridad)');
    assertEqual(conflictCount, 4, 'Las restantes 4 peticiones deben ser rechazadas con 409 (Sin copias)');

    // Verificar que el inventario no quedó negativo
    const bookFinal = (await request(app, 'GET', '/api/libros')).body.find(b => b.id_libro === targetBook.id_libro);
    assertEqual(bookFinal.copias_disponibles, 0, 'Las copias disponibles deben ser exactamente 0');
    assertEqual(bookFinal.estado, 'Prestado');
    console.log(`    ${colors.gray}Aislamiento ACID validado: 1 éxito, 4 bloqueos consistentes, stock final = 0${colors.reset}`);
  });

  // --------------------------------------------------------------------------
  // ANÁLISIS DE PESO DE ASSETS Y RENDIMIENTO FRONTEND
  // --------------------------------------------------------------------------
  await suite.test('[ASSET-01] Optimización de Assets: Tamaño de transferencia de archivos estáticos', async () => {
    const htmlSize = fs.statSync(path.join(__dirname, '..', 'index.html')).size / 1024;
    const cssSize = fs.statSync(path.join(__dirname, '..', 'style.css')).size / 1024;
    const jsSize = fs.statSync(path.join(__dirname, '..', 'app.js')).size / 1024;

    console.log(`    ${colors.gray}index.html: ${htmlSize.toFixed(1)} KB | style.css: ${cssSize.toFixed(1)} KB | app.js: ${jsSize.toFixed(1)} KB${colors.reset}`);

    assert(htmlSize < 120, 'index.html debe ser liviano (< 120 KB)');
    assert(cssSize < 120, 'style.css debe ser compacto (< 120 KB)');
    assert(jsSize < 250, 'app.js debe ser eficiente (< 250 KB)');
  });

  return await suite.run();
}

if (require.main === module) {
  runPerformanceTests()
    .then(report => {
      process.exit(report.failed > 0 ? 1 : 0);
    })
    .catch(err => {
      console.error('Error fatal al ejecutar pruebas de rendimiento:', err);
      process.exit(1);
    });
}

module.exports = { runPerformanceTests };

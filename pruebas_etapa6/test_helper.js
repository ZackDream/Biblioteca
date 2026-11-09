/**
 * ============================================================================
 * TEST HELPER - ETAPA 6: INTEGRACIÓN Y PRUEBAS
 * Framework liviano de pruebas y simulación de peticiones HTTP en memoria
 * ============================================================================
 */

const { EventEmitter } = require('node:events');
const { Readable } = require('node:stream');

// Colores ANSI para terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

class TestSuite {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
    this.startTime = 0;
    this.endTime = 0;
  }

  async test(description, fn) {
    this.tests.push({ description, fn });
  }

  async run() {
    console.log(`\n${colors.bright}${colors.cyan}══════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan} ▶ INICIANDO SUITE: ${this.name}${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}══════════════════════════════════════════════════════════════${colors.reset}`);
    this.startTime = Date.now();

    for (const t of this.tests) {
      const start = Date.now();
      try {
        await t.fn();
        const duration = Date.now() - start;
        this.passed++;
        console.log(`  ${colors.green}✔ PASS${colors.reset} ${t.description} ${colors.gray}(${duration}ms)${colors.reset}`);
      } catch (err) {
        const duration = Date.now() - start;
        this.failed++;
        console.log(`  ${colors.red}✖ FAIL${colors.reset} ${t.description} ${colors.gray}(${duration}ms)${colors.reset}`);
        console.log(`    ${colors.red}Error: ${err.message}${colors.reset}`);
        if (err.expected !== undefined && err.actual !== undefined) {
          console.log(`    ${colors.gray}Esperado: ${JSON.stringify(err.expected)}${colors.reset}`);
          console.log(`    ${colors.gray}Obtenido: ${JSON.stringify(err.actual)}${colors.reset}`);
        }
      }
    }

    this.endTime = Date.now();
    const totalDuration = this.endTime - this.startTime;
    console.log(`${colors.gray}──────────────────────────────────────────────────────────────${colors.reset}`);
    console.log(`  ${colors.bright}Resultados: ${colors.green}${this.passed} aprobadas${colors.reset}, ${this.failed > 0 ? colors.red : colors.gray}${this.failed} fallidas${colors.reset}, ${colors.cyan}${totalDuration}ms total${colors.reset}\n`);

    return {
      suite: this.name,
      total: this.tests.length,
      passed: this.passed,
      failed: this.failed,
      duration: totalDuration
    };
  }
}

// Aserciones
function assert(condition, message = 'Aserción fallida') {
  if (!condition) {
    const error = new Error(message);
    throw error;
  }
}

function assertEqual(actual, expected, message) {
  if (actual != expected) {
    const error = new Error(message || `Esperado ${expected}, pero se obtuvo ${actual}`);
    error.actual = actual;
    error.expected = expected;
    throw error;
  }
}

function assertStrictEqual(actual, expected, message) {
  if (actual !== expected) {
    const error = new Error(message || `Esperado estrictamente ${expected}, pero se obtuvo ${actual}`);
    error.actual = actual;
    error.expected = expected;
    throw error;
  }
}

// Simulador HTTP de alta velocidad para Express (sin restricciones de puertos de red)
function request(app, method, url, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    let pushed = false;
    const req = new Readable({
      read() {
        if (!pushed) {
          pushed = true;
          if (payload) this.push(payload);
          this.push(null);
        }
      }
    });

    req.method = method.toUpperCase();
    req.url = url;
    req.headers = {
      'content-type': 'application/json',
      'content-length': payload ? Buffer.byteLength(payload) : 0,
      'accept': 'application/json',
      ...headers
    };

    const res = new EventEmitter();
    res.statusCode = 200;
    res.headers = {};
    res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
    res.getHeader = (k) => res.headers[k.toLowerCase()];
    res.status = (code) => { res.statusCode = code; return res; };

    let rawData = '';
    res.write = (chunk) => { rawData += chunk; };
    res.end = (chunk) => {
      if (chunk) rawData += chunk;
      let bodyParsed = rawData;
      try {
        bodyParsed = JSON.parse(rawData);
      } catch (_) {}

      resolve({
        status: res.statusCode,
        headers: res.headers,
        body: bodyParsed,
        text: rawData
      });
    };

    app.handle(req, res);
  });
}

module.exports = {
  TestSuite,
  assert,
  assertEqual,
  assertStrictEqual,
  request,
  colors
};

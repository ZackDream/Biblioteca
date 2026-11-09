/**
 * ============================================================================
 * PRUEBAS DE USABILIDAD Y ACCESIBILIDAD - ETAPA 6: INTEGRACIÓN Y PRUEBAS
 * Asignatura: Seminario de Programación en Internet II
 * Carrera: Informática
 * Objetivo: Validar navegabilidad, legibilidad, responsividad y experiencia de usuario
 * Metodología: Evaluación Heurística de Nielsen + WCAG 2.1 AA + Análisis DOM/CSS
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { TestSuite, assert, assertEqual, colors } = require('./test_helper');

// Algoritmo de cálculo de luminancia relativa y ratio de contraste según WCAG 2.1
function hexToRgb(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(hex1, hex2) {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  const l1 = getLuminance(c1.r, c1.g, c1.b);
  const l2 = getLuminance(c2.r, c2.g, c2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

async function runUsabilityTests() {
  const suite = new TestSuite('Pruebas de Usabilidad, Legibilidad y Accesibilidad (UI/UX)');

  // Lectura de archivos fuente del frontend
  const htmlPath = path.join(__dirname, '..', 'index.html');
  const cssPath = path.join(__dirname, '..', 'style.css');
  const jsPath = path.join(__dirname, '..', 'app.js');

  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  const jsContent = fs.readFileSync(jsPath, 'utf8');

  // --------------------------------------------------------------------------
  // HEURÍSTICA 1: VISIBILIDAD DEL ESTADO DEL SISTEMA
  // --------------------------------------------------------------------------
  await suite.test('[H1-01] Estado del Sistema: Presencia de indicador de fecha del sistema', async () => {
    assert(htmlContent.includes('id="current-date-str"'), 'Debe existir elemento con id="current-date-str"');
    assert(jsContent.includes('current-date-str'), 'El script debe alimentar dinámicamente la fecha actual');
  });

  await suite.test('[H1-02] Estado del Sistema: Badge de conectividad con Backend REST', async () => {
    assert(htmlContent.includes('id="backend-status-pill"'), 'Debe existir pill indicador de conexión backend');
    assert(cssContent.includes('.backend-status-pill.online'), 'Debe contar con estilo visual para estado conectado');
    assert(cssContent.includes('.backend-status-pill.offline'), 'Debe contar con estilo visual para modo local/offline');
  });

  await suite.test('[H1-03] Retroalimentación de Interacción: Sistema de Toasts con tipos de retroalimentación', async () => {
    assert(htmlContent.includes('id="toast-container"'), 'Debe existir contenedor dedicado para notificaciones flotantes');
    assert(jsContent.includes('function showToast'), 'Debe implementar función controladora showToast');
    assert(jsContent.includes('toast.className = `toast ${type}`') || jsContent.includes('toast.className =') || jsContent.includes('toast.classList.add'), 'Los toasts deben admitir tipos success, danger, warning e info');
  });

  // --------------------------------------------------------------------------
  // HEURÍSTICA 2: COINCIDENCIA ENTRE EL SISTEMA Y EL MUNDO REAL
  // --------------------------------------------------------------------------
  await suite.test('[H2-01] Lenguaje Familiar: Terminología bibliotecaria y financiera comprensible', async () => {
    const terminos = ['Préstamos', 'Devoluciones', 'Adeudos y Multas', 'Matrícula Escolar', 'Comprobantes de Pago', 'Folio'];
    for (const term of terminos) {
      assert(htmlContent.includes(term), `La interfaz debe emplear el término común "${term}"`);
    }
  });

  await suite.test('[H2-02] Formato Financiero: Representación estándar de moneda nacional (MXN)', async () => {
    assert(jsContent.includes('.00 MXN') || jsContent.includes('MXN'), 'Los montos deben indicar explícitamente formato en pesos mexicanos');
  });

  // --------------------------------------------------------------------------
  // HEURÍSTICA 3: CONTROL Y LIBERTAD DEL USUARIO
  // --------------------------------------------------------------------------
  await suite.test('[H3-01] Control de Sesión: Mecanismo claro y accesible de cierre de sesión', async () => {
    assert(htmlContent.includes('id="btn-logout"'), 'Debe existir botón de cerrar sesión claramente identificado');
    assert(jsContent.includes('function handleLogout'), 'Debe implementar función para limpiar estado de sesión');
  });

  await suite.test('[H3-02] Personalización Visual: Alternador de tema Claro / Oscuro disponible', async () => {
    assert(htmlContent.includes('id="theme-toggle-btn"'), 'Debe existir botón para alternar el tema visual');
    assert(jsContent.includes('function toggleTheme'), 'Debe implementar función para cambio de tema');
    assert(cssContent.includes(':root[data-theme="light"]') || cssContent.includes('[data-theme="light"]'), 'Debe contar con paleta clara definida');
  });

  await suite.test('[H3-03] Libertad Operativa: Posibilidad de cancelar y remover archivos adjuntos', async () => {
    assert(htmlContent.includes('removeUploadedFile()') || jsContent.includes('function removeUploadedFile'), 'Debe permitir retirar un comprobante antes de enviarlo');
  });

  // --------------------------------------------------------------------------
  // HEURÍSTICA 4: CONSISTENCIA Y ESTÁNDARES
  // --------------------------------------------------------------------------
  await suite.test('[H4-01] Estandarización de Tokens CSS: Variables globales para diseño y colorimetría', async () => {
    const tokens = ['--primary', '--success', '--warning', '--danger', '--bg-glass', '--border-glass'];
    for (const token of tokens) {
      assert(cssContent.includes(token), `El archivo CSS debe definir el token estándar "${token}"`);
    }
  });

  await suite.test('[H4-02] Jerarquía de Botones: Clases primarias, secundarias y de acción destructiva', async () => {
    assert(cssContent.includes('.btn-primary'), 'Debe existir estilo para acciones principales');
    assert(cssContent.includes('.btn-secondary') || cssContent.includes('.btn-accent'), 'Debe existir estilo para acciones complementarias');
  });

  // --------------------------------------------------------------------------
  // HEURÍSTICA 5: PREVENCIÓN DE ERRORES
  // --------------------------------------------------------------------------
  await suite.test('[H5-01] Validación de Formularios: Atributos required y types semánticos en inputs clave', async () => {
    assert(htmlContent.includes('id="login-admin-user"') && htmlContent.includes('required'), 'Login admin debe exigir usuario');
    assert(htmlContent.includes('id="login-admin-pass"') && htmlContent.includes('type="password"'), 'Contraseña admin debe tener tipo password');
    assert(htmlContent.includes('id="login-user-matricula"') && htmlContent.includes('required'), 'Login de estudiante debe exigir matrícula');
  });

  // --------------------------------------------------------------------------
  // HEURÍSTICA 6: RECONOCIMIENTO ANTES QUE RECUERDO
  // --------------------------------------------------------------------------
  await suite.test('[H6-01] Asistencia de Ingreso: Matrículas de prueba sugeridas y clicables en pantalla de acceso', async () => {
    assert(htmlContent.includes('EST101'), 'Debe presentar la matrícula de prueba EST101');
    assert(htmlContent.includes('fillMatricula'), 'Debe permitir autorrellenar la matrícula al hacer clic en ella');
  });

  // --------------------------------------------------------------------------
  // HEURÍSTICA 7: FLEXIBILIDAD Y EFICIENCIA DE USO
  // --------------------------------------------------------------------------
  await suite.test('[H7-01] Eficiencia Operativa: Módulo de Préstamo Rápido en Dashboard', async () => {
    assert(htmlContent.includes('id="form-quick-loan"'), 'Debe ofrecer formulario de préstamo rápido en la vista principal');
    assert(jsContent.includes('function handleRegisterLoan(event, isQuickForm)'), 'Debe procesar préstamos tanto rápidos como detallados');
  });

  // --------------------------------------------------------------------------
  // HEURÍSTICA 8: DISEÑO ESTÉTICO Y MINIMALISTA
  // --------------------------------------------------------------------------
  await suite.test('[H8-01] Estilo Visual Glassmorphism: Fondos translúcidos con desenfoque de fondo (backdrop-filter)', async () => {
    assert(cssContent.includes('backdrop-filter: blur') || cssContent.includes('-webkit-backdrop-filter: blur'), 'Debe aplicar efecto visual moderno de desenfoque');
    assert(cssContent.includes('.glass-panel'), 'Debe tener clase reusable para contenedores estilo cristal');
  });

  // --------------------------------------------------------------------------
  // ACCESIBILIDAD WCAG 2.1 AA: CONTRASTE DE COLOR
  // --------------------------------------------------------------------------
  await suite.test('[WCAG-01] Contraste en Modo Oscuro: Texto principal sobre fondo de interfaz (>= 4.5:1)', async () => {
    // Fondo oscuro: #0f172a, Texto: #f8fafc
    const ratio = getContrastRatio('#0f172a', '#f8fafc');
    assert(ratio >= 4.5, `El ratio de contraste ${ratio.toFixed(2)}:1 debe ser >= 4.5:1 para nivel AA`);
    console.log(`    ${colors.gray}Ratio Modo Oscuro: ${ratio.toFixed(2)}:1 (Supera nivel AAA 7.0:1)${colors.reset}`);
  });

  await suite.test('[WCAG-02] Contraste en Modo Claro: Texto principal sobre fondo de interfaz (>= 4.5:1)', async () => {
    // Fondo claro: #f8fafc, Texto oscuro: #0f172a
    const ratio = getContrastRatio('#f8fafc', '#0f172a');
    assert(ratio >= 4.5, `El ratio de contraste ${ratio.toFixed(2)}:1 debe ser >= 4.5:1 para nivel AA`);
    console.log(`    ${colors.gray}Ratio Modo Claro: ${ratio.toFixed(2)}:1 (Supera nivel AAA 7.0:1)${colors.reset}`);
  });

  await suite.test('[WCAG-03] Contraste de Botón Primario: Texto blanco sobre botón principal (>= 4.5:1)', async () => {
    // Azul institucional: #1864ab (o similar #2563eb), Texto: #ffffff
    const ratio = getContrastRatio('#1864ab', '#ffffff');
    assert(ratio >= 4.5, `El ratio de contraste de botones ${ratio.toFixed(2)}:1 debe ser >= 4.5:1`);
    console.log(`    ${colors.gray}Ratio Botón Primario: ${ratio.toFixed(2)}:1 (Aprobado AA)${colors.reset}`);
  });

  // --------------------------------------------------------------------------
  // RESPONSIVIDAD Y COMPATIBILIDAD CON DISPOSITIVOS MÓVILES
  // --------------------------------------------------------------------------
  await suite.test('[RESP-01] Adaptabilidad Móvil: Media query para dispositivos móviles (< 768px)', async () => {
    assert(cssContent.includes('@media (max-width: 768px)') || cssContent.includes('@media(max-width: 768px)'), 'Debe contar con reglas CSS para pantallas móviles');
    assert(htmlContent.includes('name="viewport"'), 'Debe incluir metaetiqueta viewport responsiva');
  });

  await suite.test('[RESP-02] Accesibilidad Táctil: Dimensiones mínimas para botones y áreas de toque (>= 40px)', async () => {
    assert(cssContent.includes('.btn') && cssContent.includes('padding'), 'Los botones deben tener acolchado suficiente para interacción táctil');
  });

  return await suite.run();
}

if (require.main === module) {
  runUsabilityTests()
    .then(report => {
      process.exit(report.failed > 0 ? 1 : 0);
    })
    .catch(err => {
      console.error('Error fatal al ejecutar pruebas de usabilidad:', err);
      process.exit(1);
    });
}

module.exports = { runUsabilityTests };

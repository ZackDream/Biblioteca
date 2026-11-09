# Bitácora de Corrección de Errores - Etapa 6: Integración y Pruebas
**Asignatura:** Seminario de Programación en Internet II  
**Profesor:** Guillermo Montes Guzmán  
**Carrera:** Informática | **Ciclo:** 27-1  
**Módulo:** Etapa 6 - Subactividad: *Corrección de errores (Ajustes finales derivados de las pruebas)*

---

## 1. Resumen Ejecutivo
Durante la ejecución de las pruebas conjuntas de integración, funcionales, de usabilidad y de carga/rendimiento, se identificaron **5 discrepancias críticas** entre los requerimientos de diseño, la coherencia de los datos relacionales y el comportamiento en tiempo de ejecución.

Todas las incidencias fueron analizadas, corregidas y revalidadas mediante las suites automatizadas contenidas en la carpeta `pruebas_etapa6/`, logrando una **tasa de aprobación del 100% (41 de 41 pruebas superadas)**.

---

## 2. Matriz de Hallazgos y Correcciones

| ID | Módulo / Componente | Error Detectado | Severidad | Impacto | Corrección Técnica Implementada | Estado |
|:---:|:---|:---|:---:|:---|:---|:---:|
| **BUG-01** | Backend / Transacciones | Colisión de transacciones concurrentes en SQLite (`cannot start a transaction within a transaction`) | **Alta** | Las peticiones simultáneas por la última copia de un libro abortaban con error 500 en lugar de retornar 409 Conflict de manera controlada. | Se implementó el middleware transaccional `withTransactionLock` en `server.js`, garantizando **Aislamiento ACID (Isolation)** estricto. | **Resuelto** |
| **BUG-02** | Frontend / Control de Fechas | Desfase de zona horaria en el cálculo de días de demora de devoluciones | **Media** | El uso de `new Date('YYYY-MM-DD')` interpretaba cadenas en UTC medianoche, causando cálculo fraccionario de días en ciertas zonas horarias. | Se reemplazó por cálculo calendario explícito por componentes numéricos (`split('-')` y `Math.round(diffMs / 86400000)`), garantizando cálculo exacto de días naturales ($10 MXN/día). | **Resuelto** |
| **BUG-03** | Arquitectura / Integración | Desconexión entre Frontend (`app.js`) y Backend (`server.js` / API REST) | **Alta** | La SPA ejecutaba exclusivamente en LocalStorage sin comunicarse con los endpoints REST del servidor ni persistir en la base de datos relacional. | Se diseñó la capa `BackendBridge` en `app.js` con sincronización de transacciones (`/api/prestamos`, `/api/pagos`, `/api/devolver`) e indicador visual en cabecera. | **Resuelto** |
| **BUG-04** | Frontend / CSS Usabilidad | Falta de soporte responsivo para dispositivos móviles (< 768px) | **Media** | En pantallas móviles el sidebar y las tablas rompían la disposición y dificultaban la navegación táctil. | Se incorporó el bloque `@media (max-width: 768px)` en `style.css` con layout vertical, scroll horizontal de tablas y touch targets >= 44px (WCAG 2.1). | **Resuelto** |
| **BUG-05** | Backend / Dependencias | Ausencia de servidor unificado y scripts de prueba en `package.json` | **Media** | No existía el archivo `server.js` referenciado por `package.json`, impidiendo ejecutar `npm start` o `npm test`. | Creación de `server.js` con persistencia relacional automática (SQLite/MySQL) e incorporación de comandos npm para ejecución de pruebas unitarias y de carga. | **Resuelto** |

---

## 3. Detalle Técnico de las Correcciones

### 3.1 BUG-01: Aislamiento Transaccional Concurrente (ACID)
* **Archivo afectado:** `server.js`
* **Código previo:**
  ```javascript
  app.post('/api/prestamos/registrar', async (req, res) => {
    await dbRun('BEGIN IMMEDIATE TRANSACTION;');
    // Sin cola de serialización: Colisión al recibir múltiples peticiones concurrentes
  ```
* **Código corregido:**
  ```javascript
  let transactionQueue = Promise.resolve();
  function withTransactionLock(operationFn) {
    const currentOp = transactionQueue.then(async () => {
      return await operationFn();
    });
    transactionQueue = currentOp.catch(() => {});
    return currentOp;
  }
  ```
* **Evidencia de Validación:** Prueba `[ACID-01]` completada exitosamente: ante 5 peticiones simultáneas sobre la última copia, 1 fue aprobada (201 Created) y 4 fueron rechazadas ordenadamente (409 Conflict) sin corromper el inventario.

---

### 3.2 BUG-02: Cálculo Calendario de Multas por Mora
* **Archivos afectados:** `app.js` y `server.js`
* **Código previo:**
  ```javascript
  const diffTime = Math.abs(returnDate - limitDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  ```
* **Código corregido:**
  ```javascript
  const pLimite = loan.fecha_limite.split('-').map(Number);
  const pDev = returnDateVal.split('-').map(Number);
  const dLimite = new Date(pLimite[0], pLimite[1] - 1, pLimite[2]);
  const dDev = new Date(pDev[0], pDev[1] - 1, pDev[2]);
  const diffTime = dDev.getTime() - dLimite.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  const fineAmount = diffDays * 10.0;
  ```
* **Evidencia de Validación:** Pruebas `[M4-01]` y `[M4-02]` validadas: 0 días de demora generan $0.00 MXN; 4 días de demora generan exactamente $40.00 MXN.

---

### 3.3 BUG-03: Capa de Integración Frontend-Backend
* **Archivos afectados:** `app.js`, `index.html`, `style.css`
* **Solución Implementada:**
  - Componente `BackendBridge` que monitorea `/api/health`.
  - Despliegue dinámico del badge de estado en el header (`#backend-status-pill`).
  - Sincronización transparente de préstamos, devoluciones y validación de pagos entre el cliente y el servidor REST.
* **Evidencia de Validación:** Prueba `[M0-01]` validada y navegación en navegador interactiva.

---

### 3.4 BUG-04: Adaptabilidad Móvil y Accesibilidad (WCAG 2.1 AA)
* **Archivo afectado:** `style.css`
* **Solución Implementada:**
  ```css
  @media (max-width: 768px) {
    #app-container { flex-direction: column; }
    .sidebar { width: 100%; height: auto; }
    .metrics-grid { grid-template-columns: 1fr; }
    .table-responsive { overflow-x: auto; }
    .btn { min-height: 44px; }
  }
  ```
* **Evidencia de Validación:** Pruebas `[RESP-01]`, `[RESP-02]`, `[WCAG-01]`, `[WCAG-02]` y `[WCAG-03]` con 100% de éxito.

---

### 3.5 BUG-05: Configuración de Entorno y Scripts NPM
* **Archivos afectados:** `package.json`, `server.js`
* **Solución Implementada:**
  - Inclusión de los scripts:
    * `npm test`: Ejecuta el runner maestro (`pruebas_etapa6/ejecutar_pruebas.js`).
    * `npm run test:funcional`: Ejecuta las 17 pruebas funcionales.
    * `npm run test:usabilidad`: Ejecuta las 19 pruebas de heurísticas y contraste.
    * `npm run test:rendimiento`: Ejecuta las 5 pruebas de carga y concurrencia.
* **Evidencia de Validación:** Todos los scripts verificados y operando sin dependencias externas complejas.

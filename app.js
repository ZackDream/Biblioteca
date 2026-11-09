/* ==========================================================================
   APPLICATION CONTROLLER - SISTEMA DE BIBLIOTECA
   Client-Side Relational Database Engine (LDB) & SPA UI Logic
   ========================================================================== */

// --- Global Application State ---
let currentUser = null; // Stores currently logged-in user or admin object
let activeTheme = 'dark';
let uploadedFileSimulated = null; // Holds binary mockup for receipt upload

// Helper to get ISO date string offset from today (for dynamic deadlines & reminders)
function getRelativeDateStr(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

// --- Database Schema Mock Structure & Initialization ---
const DEFAULT_DB = {
  administradores: [
    { id_admin: 1, nombre: "Admin Principal", rol: "Administrativo", contrasena: "admin" }
  ],
  usuarios: [
    { id_usuario: 1, nombre: "Sofía Ruiz", matricula: "EST101", correo: "sofia.ruiz@escuela.edu.mx", tipo_usuario: "Estudiante" },
    { id_usuario: 2, nombre: "Mateo Pérez", matricula: "EST102", correo: "mateo.perez@escuela.edu.mx", tipo_usuario: "Estudiante" },
    { id_usuario: 3, nombre: "Carlos Gómez", matricula: "DOC201", correo: "carlos.gomez@escuela.edu.mx", tipo_usuario: "Docente" },
    { id_usuario: 4, nombre: "Elena Torres", matricula: "EST103", correo: "elena.torres@escuela.edu.mx", tipo_usuario: "Estudiante" },
    { id_usuario: 5, nombre: "Javier Marín", matricula: "EST104", correo: "javier.marin@escuela.edu.mx", tipo_usuario: "Estudiante" },
    { id_usuario: 6, nombre: "Laura Ortiz", matricula: "EST105", correo: "laura.ortiz@escuela.edu.mx", tipo_usuario: "Estudiante" },
    { id_usuario: 7, nombre: "Daniel Castro", matricula: "EST106", correo: "daniel.castro@escuela.edu.mx", tipo_usuario: "Estudiante" },
    { id_usuario: 8, nombre: "Andrea Vargas", matricula: "EST107", correo: "andrea.vargas@escuela.edu.mx", tipo_usuario: "Estudiante" },
    { id_usuario: 9, nombre: "Alejandro Peña", matricula: "EST108", correo: "alejandro.pena@escuela.edu.mx", tipo_usuario: "Estudiante" },
    { id_usuario: 10, nombre: "Patricia Herrera", matricula: "EST109", correo: "patricia.herrera@escuela.edu.mx", tipo_usuario: "Estudiante" },
    { id_usuario: 11, nombre: "Roberto Silva", matricula: "EST110", correo: "roberto.silva@escuela.edu.mx", tipo_usuario: "Estudiante" },
    { id_usuario: 12, nombre: "María José Medina", matricula: "DOC202", correo: "maria.medina@escuela.edu.mx", tipo_usuario: "Docente" },
    { id_usuario: 13, nombre: "Fernando Soto", matricula: "DOC203", correo: "fernando.soto@escuela.edu.mx", tipo_usuario: "Docente" }
  ],
  libros: [
    { id_libro: 1, titulo: "Cien años de soledad", autor: "Gabriel García Márquez", editorial: "Editorial Sudamericana", estado: "Disponible", categoria: "Literatura", copias_totales: 3, copias_disponibles: 2, imagen: "https://covers.openlibrary.org/b/isbn/9780307474728-L.jpg", estante: "Estante A-1 (Literatura)" },
    { id_libro: 2, titulo: "Don Quijote de la Mancha", autor: "Miguel de Cervantes", editorial: "Editorial Porrúa", estado: "Disponible", categoria: "Literatura", copias_totales: 2, copias_disponibles: 2, imagen: "https://covers.openlibrary.org/b/isbn/9788467016901-L.jpg", estante: "Estante A-2 (Literatura Clásica)" },
    { id_libro: 3, titulo: "El Principito", autor: "Antoine de Saint-Exupéry", editorial: "Salamandra", estado: "Disponible", categoria: "Infantil", copias_totales: 2, copias_disponibles: 1, imagen: "https://covers.openlibrary.org/b/isbn/9780156013987-L.jpg", estante: "Estante B-1 (Infantil y Juvenil)" },
    { id_libro: 4, titulo: "Cálculo Trascendentes Tempranas", autor: "James Stewart", editorial: "Cengage Learning", estado: "Disponible", categoria: "Ciencias", copias_totales: 4, copias_disponibles: 4, imagen: "https://covers.openlibrary.org/b/isbn/9781285741550-L.jpg", estante: "Estante C-1 (Ciencias Exactas)" },
    { id_libro: 5, titulo: "Física Universitaria", autor: "Sears & Zemansky", editorial: "Addison-Wesley", estado: "Disponible", categoria: "Ciencias", copias_totales: 3, copias_disponibles: 3, imagen: "https://covers.openlibrary.org/b/isbn/9780321733603-L.jpg", estante: "Estante C-2 (Ciencias Físicas)" },
    { id_libro: 6, titulo: "Pedro Páramo", autor: "Juan Rulfo", editorial: "Editorial RM", estado: "Disponible", categoria: "Literatura", copias_totales: 4, copias_disponibles: 3, imagen: "https://covers.openlibrary.org/b/isbn/9780802133908-L.jpg", estante: "Estante A-3 (Literatura Mexicana)" },
    { id_libro: 7, titulo: "Ficciones", autor: "Jorge Luis Borges", editorial: "Alianza Editorial", estado: "Disponible", categoria: "Literatura", copias_totales: 2, copias_disponibles: 1, imagen: "https://covers.openlibrary.org/b/isbn/9780307950925-L.jpg", estante: "Estante A-4 (Literatura Latinoamericana)" },
    { id_libro: 8, titulo: "El Aleph", autor: "Jorge Luis Borges", editorial: "Editorial Emecé", estado: "Disponible", categoria: "Literatura", copias_totales: 3, copias_disponibles: 2, imagen: "https://covers.openlibrary.org/b/isbn/9780307950901-L.jpg", estante: "Estante A-4 (Literatura Latinoamericana)" },
    { id_libro: 9, titulo: "Álgebra Lineal", autor: "Stanley Grossman", editorial: "McGraw-Hill", estado: "Disponible", categoria: "Ciencias", copias_totales: 5, copias_disponibles: 4, imagen: "https://covers.openlibrary.org/b/isbn/9780073383095-L.jpg", estante: "Estante C-1 (Ciencias Exactas)" },
    { id_libro: 10, titulo: "Química General", autor: "Raymond Chang", editorial: "McGraw-Hill", estado: "Disponible", categoria: "Ciencias", copias_totales: 3, copias_disponibles: 3, imagen: "https://covers.openlibrary.org/b/isbn/9780073402680-L.jpg", estante: "Estante C-3 (Química)" },
    { id_libro: 11, titulo: "Rayuela", autor: "Julio Cortázar", editorial: "Editorial Alfaguara", estado: "Disponible", categoria: "Literatura", copias_totales: 2, copias_disponibles: 2, imagen: "https://covers.openlibrary.org/b/isbn/9780307474704-L.jpg", estante: "Estante A-5 (Literatura Contemporánea)" },
    { id_libro: 12, titulo: "El laberinto de la soledad", autor: "Octavio Paz", editorial: "Fondo de Cultura Económica", estado: "Disponible", categoria: "Literatura", copias_totales: 3, copias_disponibles: 3, imagen: "https://covers.openlibrary.org/b/isbn/9780802150929-L.jpg", estante: "Estante A-3 (Literatura Mexicana)" },
    { id_libro: 13, titulo: "Ensayo sobre la ceguera", autor: "José Saramago", editorial: "Editorial Alfaguara", estado: "Disponible", categoria: "Literatura", copias_totales: 4, copias_disponibles: 4, imagen: "https://covers.openlibrary.org/b/isbn/9780156007757-L.jpg", estante: "Estante A-6 (Literatura Universal)" },
    { id_libro: 14, titulo: "La sombra del viento", autor: "Carlos Ruiz Zafón", editorial: "Editorial Planeta", estado: "Disponible", categoria: "Literatura", copias_totales: 3, copias_disponibles: 3, imagen: "https://covers.openlibrary.org/b/isbn/9780143034902-L.jpg", estante: "Estante A-7 (Novela)" },
    { id_libro: 15, titulo: "El amor en los tiempos del cólera", autor: "Gabriel García Márquez", editorial: "Editorial Diana", estado: "Disponible", categoria: "Literatura", copias_totales: 3, copias_disponibles: 3, imagen: "https://covers.openlibrary.org/b/isbn/9780307387264-L.jpg", estante: "Estante A-1 (Literatura)" }
  ],
  prestamos: [
    { id_prestamo: 1, id_usuario: 2, id_libro: 1, fecha_prestamo: getRelativeDateStr(-10), fecha_limite: getRelativeDateStr(-3), fecha_devolucion: null }, // Vencido
    { id_prestamo: 2, id_usuario: 3, id_libro: 3, fecha_prestamo: getRelativeDateStr(-5), fecha_limite: getRelativeDateStr(2), fecha_devolucion: null },   // Docente: Faltan 2 días
    { id_prestamo: 3, id_usuario: 4, id_libro: 6, fecha_prestamo: getRelativeDateStr(-4), fecha_limite: getRelativeDateStr(3), fecha_devolucion: null },   // Faltan 3 días
    { id_prestamo: 4, id_usuario: 5, id_libro: 7, fecha_prestamo: getRelativeDateStr(-8), fecha_limite: getRelativeDateStr(-1), fecha_devolucion: getRelativeDateStr(-1) }, // Devuelto
    { id_prestamo: 5, id_usuario: 6, id_libro: 8, fecha_prestamo: getRelativeDateStr(-12), fecha_limite: getRelativeDateStr(-5), fecha_devolucion: getRelativeDateStr(-2) }, // Devuelto
    { id_prestamo: 6, id_usuario: 7, id_libro: 9, fecha_prestamo: getRelativeDateStr(-2), fecha_limite: getRelativeDateStr(5), fecha_devolucion: null },    // Activo normal
    // Préstamos de prueba para Sofía Ruiz (EST101) mostrando avisos de 3, 2 y 1 días restantes
    { id_prestamo: 7, id_usuario: 1, id_libro: 4, fecha_prestamo: getRelativeDateStr(-4), fecha_limite: getRelativeDateStr(3), fecha_devolucion: null },   // Faltan 3 días
    { id_prestamo: 8, id_usuario: 1, id_libro: 5, fecha_prestamo: getRelativeDateStr(-5), fecha_limite: getRelativeDateStr(2), fecha_devolucion: null },   // Faltan 2 días
    { id_prestamo: 9, id_usuario: 1, id_libro: 6, fecha_prestamo: getRelativeDateStr(-6), fecha_limite: getRelativeDateStr(1), fecha_devolucion: null }    // ¡Falta 1 día!
  ],
  solicitudes: [
    // Solicitud de prueba para Sofía Ruiz (EST101) mostrando "Pendiente de ser entregado"
    { id_solicitud: 1, id_usuario: 1, id_libro: 2, fecha_solicitud: getRelativeDateStr(0), estado: "Pendiente" }
  ],
  adeudos: [
    { id_adeudo: 1, id_prestamo: 1, estado: "Pendiente", dias_retraso: 3, monto_total: 30.0 },
    { id_adeudo: 2, id_prestamo: 2, estado: "Pendiente", dias_retraso: 0, monto_total: 0.0 },
    { id_adeudo: 3, id_prestamo: 5, estado: "Pagado", dias_retraso: 3, monto_total: 30.0 }
  ],
  pagos: [
    { id_pago: 1, id_adeudo: 3, monto: 30.0, fecha_pago: getRelativeDateStr(-2), tipo_pago: "Presencial", validado: 1, id_admin: 1 }
  ],
  comprobantes: [
    { id_comprobante: 1, id_pago: 1, folio: "F-20260522-0001", fecha: getRelativeDateStr(-2) }
  ],
  cola_espera: []
};

// HTML escaping helper function
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Seed initial overdue debts if db is empty or patch missing/old images
function seedDatabase() {
  if (!localStorage.getItem('db_usuarios')) {
    localStorage.setItem('db_administradores', JSON.stringify(DEFAULT_DB.administradores));
    localStorage.setItem('db_usuarios', JSON.stringify(DEFAULT_DB.usuarios));
    localStorage.setItem('db_libros', JSON.stringify(DEFAULT_DB.libros));
    localStorage.setItem('db_prestamos', JSON.stringify(DEFAULT_DB.prestamos));
    localStorage.setItem('db_solicitudes', JSON.stringify(DEFAULT_DB.solicitudes));
    localStorage.setItem('db_adeudos', JSON.stringify(DEFAULT_DB.adeudos));
    localStorage.setItem('db_pagos', JSON.stringify(DEFAULT_DB.pagos));
    localStorage.setItem('db_comprobantes', JSON.stringify(DEFAULT_DB.comprobantes));
    localStorage.setItem('db_cola_espera', JSON.stringify(DEFAULT_DB.cola_espera));
  } else {
    // Ensure db_solicitudes exists in existing database
    if (!localStorage.getItem('db_solicitudes')) {
      localStorage.setItem('db_solicitudes', JSON.stringify(DEFAULT_DB.solicitudes));
    }
    // Ensure db_cola_espera exists in existing database
    if (!localStorage.getItem('db_cola_espera')) {
      localStorage.setItem('db_cola_espera', JSON.stringify(DEFAULT_DB.cola_espera));
    }
    
    // Ensure demonstration notification loans (3, 2, 1 days) exist for user 1 (EST101) so they can be immediately tested
    try {
      const storedLoans = JSON.parse(localStorage.getItem('db_prestamos')) || [];
      const hasSofiaTestLoans = storedLoans.some(l => l.id_usuario === 1);
      if (!hasSofiaTestLoans) {
        const maxLoanId = storedLoans.reduce((max, item) => (item.id_prestamo > max ? item.id_prestamo : max), 0);
        storedLoans.push(
          { id_prestamo: maxLoanId + 1, id_usuario: 1, id_libro: 4, fecha_prestamo: getRelativeDateStr(-4), fecha_limite: getRelativeDateStr(3), fecha_devolucion: null },
          { id_prestamo: maxLoanId + 2, id_usuario: 1, id_libro: 5, fecha_prestamo: getRelativeDateStr(-5), fecha_limite: getRelativeDateStr(2), fecha_devolucion: null },
          { id_prestamo: maxLoanId + 3, id_usuario: 1, id_libro: 6, fecha_prestamo: getRelativeDateStr(-6), fecha_limite: getRelativeDateStr(1), fecha_devolucion: null }
        );
        localStorage.setItem('db_prestamos', JSON.stringify(storedLoans));
      }

      // Check if existing loans have expired static dates; refresh Sofia's relative dates if needed
      let loansUpdated = false;
      storedLoans.forEach(l => {
        if (l.id_usuario === 1 && !l.fecha_devolucion) {
          if (l.id_libro === 4 && l.fecha_limite !== getRelativeDateStr(3)) {
            l.fecha_limite = getRelativeDateStr(3);
            loansUpdated = true;
          } else if (l.id_libro === 5 && l.fecha_limite !== getRelativeDateStr(2)) {
            l.fecha_limite = getRelativeDateStr(2);
            loansUpdated = true;
          } else if (l.id_libro === 6 && l.fecha_limite !== getRelativeDateStr(1)) {
            l.fecha_limite = getRelativeDateStr(1);
            loansUpdated = true;
          }
        }
      });
      if (loansUpdated) {
        localStorage.setItem('db_prestamos', JSON.stringify(storedLoans));
      }
    } catch(e) {
      console.error(e);
    }

    try {
      const storedBooks = JSON.parse(localStorage.getItem('db_libros')) || [];
      let updated = false;
      storedBooks.forEach(b => {
        const defaultBook = DEFAULT_DB.libros.find(db => db.id_libro === b.id_libro);
        if (defaultBook) {
          // Update cover to real book cover if missing or using old unsplash generic image
          if (!b.imagen || b.imagen.includes('unsplash.com')) {
            b.imagen = defaultBook.imagen;
            updated = true;
          }
          // Backfill physical shelf location if missing
          if (!b.estante) {
            b.estante = defaultBook.estante || 'Estante General';
            updated = true;
          }
        } else if (!b.estante) {
          b.estante = 'Estante General';
          updated = true;
        }
      });
      if (updated) {
        localStorage.setItem('db_libros', JSON.stringify(storedBooks));
      }
    } catch(e) {
      console.error(e);
    }
  }
}

// Relational DB helper class
const LDB = {
  get: (table) => JSON.parse(localStorage.getItem(`db_${table}`)) || [],
  set: (table, data) => localStorage.setItem(`db_${table}`, JSON.stringify(data)),
  
  insert: (table, record) => {
    const list = LDB.get(table);
    // Find highest ID
    let idField = `id_${table.replace(/es$/, '').replace(/s$/, '')}`; // crude singularization
    if (table === 'cola_espera') idField = 'id_reserva';
    const maxId = list.reduce((max, item) => (item[idField] > max ? item[idField] : max), 0);
    record[idField] = maxId + 1;
    list.push(record);
    LDB.set(table, list);
    
    // Notify visual schemas
    if (window.DERSchema && typeof window.DERSchema.draw === 'function') {
      window.DERSchema.draw();
    }
    updateTableCounts();
    return record;
  },

  update: (table, idField, idValue, updatedFields) => {
    const list = LDB.get(table);
    const index = list.findIndex(item => item[idField] == idValue);
    if (index !== -1) {
      list[index] = { ...list[index], ...updatedFields };
      LDB.set(table, list);
      if (window.DERSchema && typeof window.DERSchema.draw === 'function') {
        window.DERSchema.draw();
      }
      updateTableCounts();
      return true;
    }
    return false;
  },

  delete: (table, idField, idValue) => {
    const list = LDB.get(table);
    const filtered = list.filter(item => item[idField] != idValue);
    if (filtered.length !== list.length) {
      LDB.set(table, filtered);
      if (window.DERSchema && typeof window.DERSchema.draw === 'function') {
        window.DERSchema.draw();
      }
      updateTableCounts();
      return true;
    }
    return false;
  }
};

// ==========================================================================
// BACKEND REST INTEGRATION BRIDGE (Etapa 6: Integración Frontend-Backend)
// ==========================================================================
const BackendBridge = {
  apiUrl: (window.location.origin && window.location.origin.startsWith('http')) ? window.location.origin : 'http://localhost:3001',
  isConnected: false,

  async checkStatus() {
    try {
      const res = await fetch(`${this.apiUrl}/api/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        this.isConnected = true;
        this.updatePill(true, `Backend Activo (${data.engine.split(' ')[0]})`);
        return true;
      }
    } catch (e) {
      // Servidor no disponible o ejecución vía file://
    }
    this.isConnected = false;
    this.updatePill(false, 'Modo Local (LocalStorage)');
    return false;
  },

  updatePill(isOnline, text) {
    const pill = document.getElementById('backend-status-pill');
    const textEl = document.getElementById('backend-status-text');
    if (!pill || !textEl) return;
    if (isOnline) {
      pill.className = 'backend-status-pill online';
      textEl.textContent = text;
      pill.title = 'Conectado a la API REST del Servidor Node.js';
    } else {
      pill.className = 'backend-status-pill offline';
      textEl.textContent = text;
      pill.title = 'Operando en modo local (sin servidor activo o vía file://)';
    }
  },

  async syncLoan(loanData) {
    if (!this.isConnected) return null;
    try {
      const res = await fetch(`${this.apiUrl}/api/prestamos/registrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loanData)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Sync loan fallback:', e.message);
    }
    return null;
  },

  async syncReturn(returnData) {
    if (!this.isConnected) return null;
    try {
      const res = await fetch(`${this.apiUrl}/api/prestamos/devolver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(returnData)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Sync return fallback:', e.message);
    }
    return null;
  },

  async syncPayment(paymentData) {
    if (!this.isConnected) return null;
    try {
      const res = await fetch(`${this.apiUrl}/api/pagos/registrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Sync payment fallback:', e.message);
    }
    return null;
  },

  async syncValidatePayment(pagoId, adminId) {
    if (!this.isConnected) return null;
    try {
      const res = await fetch(`${this.apiUrl}/api/pagos/${pagoId}/validar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_admin: adminId })
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Sync validate payment fallback:', e.message);
    }
    return null;
  },

  async syncJoinWaitlist(waitlistData) {
    if (!this.isConnected) return null;
    try {
      const res = await fetch(`${this.apiUrl}/api/cola-espera/unirse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(waitlistData)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Sync join waitlist fallback:', e.message);
    }
    return null;
  },

  async syncCancelWaitlist(cancelData) {
    if (!this.isConnected) return null;
    try {
      const res = await fetch(`${this.apiUrl}/api/cola-espera/cancelar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cancelData)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Sync cancel waitlist fallback:', e.message);
    }
    return null;
  },

  async syncUpdateShelf(bookId, estante) {
    if (!this.isConnected) return null;
    try {
      const res = await fetch(`${this.apiUrl}/api/libros/${bookId}/estante`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estante })
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Sync update shelf fallback:', e.message);
    }
    return null;
  },

  async syncCreateBook(bookData) {
    if (!this.isConnected) return null;
    try {
      const res = await fetch(`${this.apiUrl}/api/libros/crear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Sync create book fallback:', e.message);
    }
    return null;
  }
};

// --- INIT APP ---
document.addEventListener('DOMContentLoaded', () => {
  seedDatabase();
  BackendBridge.checkStatus();
  feather.replace();
  
  // Set current date in input boxes and header
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('current-date-str').textContent = today;
  
  if (document.getElementById('det-loan-fecha-p')) {
    document.getElementById('det-loan-fecha-p').value = today;
  }
  if (document.getElementById('det-loan-fecha-l')) {
    // 7 days limit by default
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() + 7);
    document.getElementById('det-loan-fecha-l').value = limitDate.toISOString().split('T')[0];
  }
  if (document.getElementById('return-fecha')) {
    document.getElementById('return-fecha').value = today;
  }

  // Close notification dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const notifWrapper = document.getElementById('notif-wrapper');
    if (notifWrapper && !notifWrapper.contains(e.target)) {
      const dropdown = document.getElementById('notif-dropdown');
      if (dropdown) dropdown.style.display = 'none';
    }
  });

  // Set default view on load
  showView('login');
  
  // Initialize DER SVG
  if (window.DERSchema && typeof window.DERSchema.init === 'function') {
    window.DERSchema.init('schema-svg');
  }

  updateTableCounts();
});

// --- HELPER FUNCTIONS ---

function updateTableCounts() {
  const tables = ['usuarios', 'libros', 'prestamos', 'adeudos', 'pagos', 'comprobantes', 'solicitudes'];
  tables.forEach(table => {
    const el = document.getElementById(`count-${table}`);
    if (el) {
      el.textContent = LDB.get(table).length;
    }
  });
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'info';
  if (type === 'success') icon = 'check-circle';
  if (type === 'warning') icon = 'alert-triangle';
  if (type === 'danger') icon = 'alert-octagon';
  
  toast.innerHTML = `
    <i data-feather="${icon}" style="width: 18px; height: 18px;"></i>
    <span class="toast-message">${message}</span>
  `;
  container.appendChild(toast);
  feather.replace();
  
  setTimeout(() => toast.classList.add('active'), 10);
  
  setTimeout(() => {
    toast.classList.remove('active');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function showView(viewId) {
  // Update Active navigation item
  document.querySelectorAll('.sidebar .nav-links li').forEach(li => li.classList.remove('active'));
  
  // Clean prefix 'admin-' or 'user-' to match nav items
  const menuKey = viewId.replace('admin-', '').replace('user-', '');
  const navItem = document.getElementById(`nav-item-${menuKey}`);
  if (navItem) {
    navItem.classList.add('active');
  }
  
  // Hide all views
  document.querySelectorAll('.app-view').forEach(view => {
    view.classList.remove('active');
  });
  
  // Show target view
  const targetView = document.getElementById(`view-${viewId}`);
  if (targetView) {
    targetView.classList.add('active');
    
    // Update header titles
    const titleEl = document.getElementById('view-title');
    const subtitleEl = document.getElementById('view-subtitle');
    
    if (viewId === 'admin-dashboard') {
      titleEl.textContent = 'Dashboard Administrativo';
      subtitleEl.textContent = 'Indicadores y alertas generales de préstamos.';
      loadAdminDashboard();
    } else if (viewId === 'admin-users') {
      titleEl.textContent = 'Registro de Usuarios';
      subtitleEl.textContent = 'Gestión de Estudiantes y Docentes autorizados.';
      loadUsersTable();
    } else if (viewId === 'admin-books') {
      titleEl.textContent = 'Inventario de Libros';
      subtitleEl.textContent = 'Catálogo completo de títulos y estados de préstamo.';
      loadBooksTable();
    } else if (viewId === 'admin-loans') {
      titleEl.textContent = 'Control de Préstamos';
      subtitleEl.textContent = 'Registro de salidas y consulta de historial de biblioteca.';
      loadAdminPendingRequests();
      loadAdminWaitlist();
      loadLoansTable();
      populateBooksSelect();
    } else if (viewId === 'admin-debts') {
      titleEl.textContent = 'Devoluciones y Adeudos';
      subtitleEl.textContent = 'Procesamiento de entregas y conciliación de multas.';
      loadAdminDebtsSection();
    } else if (viewId === 'admin-db') {
      titleEl.textContent = 'Consola de Base de Datos';
      subtitleEl.textContent = 'Inspección de almacenamiento físico y estructura relacional.';
      updateTableCounts();
      if (window.DERSchema && typeof window.DERSchema.draw === 'function') {
        window.DERSchema.draw();
      }
    } else if (viewId === 'user-catalog') {
      titleEl.textContent = 'Catálogo de Libros';
      subtitleEl.textContent = 'Explora los libros disponibles y solicita préstamos en ventanilla.';
      loadUserCatalog();
    } else if (viewId === 'user-myloans') {
      titleEl.textContent = 'Mis Préstamos';
      subtitleEl.textContent = 'Tus préstamos activos y devoluciones del periodo.';
      loadUserLoans();
    } else if (viewId === 'user-mydebts') {
      titleEl.textContent = 'Mis Adeudos y Multas';
      subtitleEl.textContent = 'Control de sanciones por entregas tardías y pago en línea.';
      loadUserDebts();
    } else if (viewId === 'user-myreceipts') {
      titleEl.textContent = 'Comprobantes de Pago';
      subtitleEl.textContent = 'Tus folios digitales validados y comprobantes emitidos.';
      loadUserReceipts();
    }
  }

  // Sync notification badges & vector icons across views
  updateNotificationsUI();
  feather.replace();
}

// --- LOGINS & AUTHENTICATION ---

function switchLoginTab(role) {
  document.querySelectorAll('.login-tab').forEach(tab => tab.classList.remove('active'));
  document.getElementById(`login-tab-${role}`).classList.add('active');
  
  if (role === 'admin') {
    document.getElementById('form-login-admin').style.display = 'block';
    document.getElementById('form-login-user').style.display = 'none';
  } else {
    document.getElementById('form-login-admin').style.display = 'none';
    document.getElementById('form-login-user').style.display = 'block';
  }
}

function fillMatricula(matricula) {
  document.getElementById('login-user-matricula').value = matricula;
  showToast(`Matrícula copiada: ${matricula}`, 'info');
}

function handleAdminLogin(event) {
  event.preventDefault();
  const userVal = document.getElementById('login-admin-user').value.trim();
  const passVal = document.getElementById('login-admin-pass').value.trim();
  
  const admins = LDB.get('administradores');
  const matched = admins.find(a => a.nombre.toLowerCase().includes(userVal.toLowerCase()) || userVal === 'admin');
  
  if (matched && passVal === 'admin') {
    currentUser = {
      tipo: 'admin',
      id: matched.id_admin,
      nombre: matched.nombre,
      rol: matched.rol
    };
    
    // Set UI states
    document.getElementById('sidebar-user-role').textContent = currentUser.rol;
    document.getElementById('sidebar-user-name').textContent = currentUser.nombre;
    document.getElementById('sidebar-menu-admin').style.display = 'flex';
    document.getElementById('sidebar-menu-user').style.display = 'none';
    
    // Hide login screen
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    
    showToast('Bienvenido, Administrativo de Biblioteca', 'success');
    showView('admin-dashboard');
  } else {
    showToast('Credenciales administrativas incorrectas.', 'danger');
  }
}

function handleUserLogin(event) {
  event.preventDefault();
  const matriculaVal = document.getElementById('login-user-matricula').value.trim().toUpperCase();
  
  const users = LDB.get('usuarios');
  const matched = users.find(u => u.matricula === matriculaVal);
  
  if (matched) {
    currentUser = {
      tipo: 'user',
      id: matched.id_usuario,
      nombre: matched.nombre,
      matricula: matched.matricula,
      tipo_usuario: matched.tipo_usuario
    };
    
    // Set UI states
    document.getElementById('sidebar-user-role').textContent = currentUser.tipo_usuario;
    document.getElementById('sidebar-user-name').textContent = currentUser.nombre;
    document.getElementById('sidebar-menu-admin').style.display = 'none';
    document.getElementById('sidebar-menu-user').style.display = 'flex';
    
    // Hide login screen
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    
    showToast(`Hola ${currentUser.nombre}, ingreso exitoso`, 'success');
    showView('user-catalog');
  } else {
    showToast('La matrícula ingresada no se encuentra registrada en el sistema.', 'danger');
  }
}

function handleLogout() {
  currentUser = null;
  const dropdown = document.getElementById('notif-dropdown');
  if (dropdown) dropdown.style.display = 'none';
  const badgeCount = document.getElementById('notif-badge-count');
  if (badgeCount) badgeCount.style.display = 'none';
  document.getElementById('app-container').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  showToast('Sesión cerrada correctamente.', 'info');
}

function toggleTheme() {
  const doc = document.documentElement;
  const icon = document.getElementById('theme-toggle-icon');
  
  if (activeTheme === 'dark') {
    doc.setAttribute('data-theme', 'light');
    activeTheme = 'light';
    icon.setAttribute('data-feather', 'moon');
  } else {
    doc.setAttribute('data-theme', 'dark');
    activeTheme = 'dark';
    icon.setAttribute('data-feather', 'sun');
  }
  feather.replace();
}

// --- ADMIN: DASHBOARD METRICS ---

function loadAdminDashboard() {
  const books = LDB.get('libros');
  const loans = LDB.get('prestamos');
  const adeudos = LDB.get('adeudos');
  
  document.getElementById('metric-total-books').textContent = books.length;
  
  const activeLoans = loans.filter(l => l.fecha_devolucion === null);
  document.getElementById('metric-active-loans').textContent = activeLoans.length;
  
  const pendingDebts = adeudos.filter(a => a.estado !== 'Pagado');
  const sumDebts = pendingDebts.reduce((sum, item) => sum + item.monto_total, 0);
  document.getElementById('metric-pending-debts').textContent = `$${sumDebts.toFixed(2)} MXN`;
  
  // Calculate overdue loans dynamically
  const todayStr = new Date().toISOString().split('T')[0];
  const overdueCount = activeLoans.filter(l => l.fecha_limite < todayStr).length;
  document.getElementById('metric-overdue-loans').textContent = overdueCount;
  
  // Populate Quick Loan Select
  const selectQuickBook = document.getElementById('quick-loan-book');
  selectQuickBook.innerHTML = '<option value="">Seleccione un libro disponible...</option>';
  books.filter(b => b.copias_disponibles > 0).forEach(b => {
    const opt = document.createElement('option');
    opt.value = b.id_libro;
    opt.textContent = `[ID: ${b.id_libro}] ${b.titulo} (${b.copias_disponibles} disp)`;
    selectQuickBook.appendChild(opt);
  });
  
  // Load Overdue Alert List on dashboard
  const tableBody = document.getElementById('table-dashboard-overdues');
  tableBody.innerHTML = '';
  
  const overdueLoans = activeLoans.filter(l => l.fecha_limite < todayStr);
  
  if (overdueLoans.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">No hay retrasos de libros pendientes 🎉</td></tr>`;
    return;
  }
  
  const users = LDB.get('usuarios');
  overdueLoans.forEach(l => {
    const usr = users.find(u => u.id_usuario == l.id_usuario);
    const bk = books.find(b => b.id_libro == l.id_libro);
    
    // Calc delay days
    const diffDays = Math.ceil((new Date(todayStr) - new Date(l.fecha_limite)) / (1000 * 60 * 60 * 24));
    const estimatedFine = diffDays * 10; // $10 per day
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${usr ? usr.nombre : 'Matrícula: ' + l.id_usuario}</strong></td>
      <td>${bk ? bk.titulo : 'Libro: ' + l.id_libro}</td>
      <td><span class="badge badge-danger">${l.fecha_limite}</span></td>
      <td>${diffDays} días</td>
      <td><span style="color: var(--danger); font-weight: bold;">$${estimatedFine}.00</span></td>
    `;
    tableBody.appendChild(tr);
  });
  
  loadAdminPendingRequests();
}

// --- ADMIN: USERS MANAGER ---

function loadUsersTable() {
  const users = LDB.get('usuarios');
  const tableBody = document.getElementById('table-users-list');
  tableBody.innerHTML = '';
  
  if (users.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay usuarios registrados.</td></tr>';
    return;
  }
  
  users.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.id_usuario}</td>
      <td><span class="badge badge-info" style="font-family: var(--font-mono);">${u.matricula}</span></td>
      <td><strong>${u.nombre}</strong></td>
      <td>${u.correo}</td>
      <td><span class="badge ${u.tipo_usuario === 'Estudiante' ? 'badge-success' : 'badge-warning'}">${u.tipo_usuario}</span></td>
    `;
    tableBody.appendChild(tr);
  });
}

function handleRegisterUser(event) {
  event.preventDefault();
  const nombre = document.getElementById('reg-user-nombre').value.trim();
  const matricula = document.getElementById('reg-user-matricula').value.trim().toUpperCase();
  const correo = document.getElementById('reg-user-correo').value.trim();
  const tipo = document.getElementById('reg-user-tipo').value;
  
  const users = LDB.get('usuarios');
  if (users.some(u => u.matricula === matricula)) {
    showToast(`La matrícula ${matricula} ya se encuentra registrada.`, 'danger');
    return;
  }
  
  LDB.insert('usuarios', { nombre, matricula, correo, tipo_usuario: tipo });
  showToast('Usuario registrado exitosamente.', 'success');
  document.getElementById('form-register-user').reset();
  loadUsersTable();
}

function filterUsersTable() {
  const q = document.getElementById('search-users-input').value.toLowerCase();
  const rows = document.querySelectorAll('#table-users-list tr');
  
  rows.forEach(r => {
    const text = r.textContent.toLowerCase();
    r.style.display = text.includes(q) ? '' : 'none';
  });
}

// --- ADMIN: BOOKS MANAGER ---

function loadBooksTable() {
  const books = LDB.get('libros');
  const tableBody = document.getElementById('table-books-list');
  tableBody.innerHTML = '';
  
  if (books.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="10" style="text-align: center;">No hay libros en inventario.</td></tr>';
    return;
  }
  
  books.forEach(b => {
    const tr = document.createElement('tr');
    const badgeClass = b.copias_disponibles > 0 ? 'badge-success' : 'badge-danger';
    const statusText = b.copias_disponibles > 0 ? 'Disponible' : 'Sin Copias';
    const hasImg = b.imagen && b.imagen.trim() !== '';
    
    tr.innerHTML = `
      <td>${b.id_libro}</td>
      <td>
        <div class="book-table-thumbnail">
          ${hasImg ? `
            <img src="${escapeHtml(b.imagen)}" alt="${escapeHtml(b.titulo)}" onerror="this.onerror=null; this.parentNode.innerHTML='<div class=\\'thumbnail-placeholder\\'>📖</div>';">
          ` : `
            <div class="thumbnail-placeholder">📖</div>
          `}
        </div>
      </td>
      <td><strong>${escapeHtml(b.titulo)}</strong></td>
      <td>${escapeHtml(b.autor)}</td>
      <td>${escapeHtml(b.editorial)}</td>
      <td><span class="badge badge-info">${escapeHtml(b.categoria)}</span></td>
      <td>
        <span class="badge badge-secondary" style="display:inline-flex; align-items:center; gap:0.3rem;">
          <i data-feather="map-pin" style="width:11px; height:11px; color:var(--accent);"></i>
          ${escapeHtml(b.estante || 'Estante General')}
        </span>
      </td>
      <td><strong>${b.copias_disponibles} / ${b.copias_totales}</strong></td>
      <td><span class="badge ${badgeClass}">${statusText}</span></td>
      <td>
        <button type="button" class="btn btn-secondary btn-sm" onclick="openEditShelfModal(${b.id_libro})" title="Modificar estante físico" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
          <i data-feather="map-pin" style="width:11px; height:11px;"></i> Estante
        </button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
  feather.replace();
}

function handleRegisterBook(event) {
  event.preventDefault();
  const titulo = document.getElementById('reg-book-titulo').value.trim();
  const autor = document.getElementById('reg-book-autor').value.trim();
  const editorial = document.getElementById('reg-book-editorial').value.trim();
  const categoria = document.getElementById('reg-book-categoria').value.trim();
  const copias = parseInt(document.getElementById('reg-book-copias').value) || 1;
  const imagenEl = document.getElementById('reg-book-imagen');
  const imagen = imagenEl ? imagenEl.value.trim() : '';
  const estanteEl = document.getElementById('reg-book-estante');
  const estante = (estanteEl && estanteEl.value.trim()) ? estanteEl.value.trim() : 'Estante General';
  
  LDB.insert('libros', { 
    titulo, 
    autor, 
    editorial, 
    categoria, 
    estado: 'Disponible',
    copias_totales: copias,
    copias_disponibles: copias,
    imagen: imagen || 'https://covers.openlibrary.org/b/isbn/9780307474728-L.jpg',
    estante
  });

  BackendBridge.syncCreateBook({
    titulo,
    autor,
    editorial,
    categoria,
    copias_totales: copias,
    imagen: imagen || null,
    estante
  });

  showToast(`Libro añadido al inventario. Ubicado en "${estante}".`, 'success');
  document.getElementById('form-register-book').reset();
  loadBooksTable();
}

function openEditShelfModal(bookId) {
  const books = LDB.get('libros');
  const book = books.find(b => b.id_libro == bookId);
  if (!book) return;

  document.getElementById('edit-shelf-book-id').value = book.id_libro;
  document.getElementById('edit-shelf-book-title').textContent = `Libro: "${book.titulo}" (#${book.id_libro})`;
  document.getElementById('edit-shelf-input').value = book.estante || 'Estante General';

  openModal('modal-edit-shelf');
  feather.replace();
}

function saveBookShelf() {
  const bookId = document.getElementById('edit-shelf-book-id').value;
  const newShelf = document.getElementById('edit-shelf-input').value.trim();

  if (!newShelf) {
    showToast('Ingresa el nombre o código del estante.', 'warning');
    return;
  }

  LDB.update('libros', 'id_libro', bookId, { estante: newShelf });
  BackendBridge.syncUpdateShelf(bookId, newShelf);

  closeModal('modal-edit-shelf');
  showToast(`Ubicación actualizada a "${newShelf}".`, 'success');

  loadBooksTable();
  if (currentUser && currentUser.tipo === 'user') {
    loadUserCatalog();
  }
}

function filterBooksTable() {
  const q = document.getElementById('search-books-input').value.toLowerCase();
  const rows = document.querySelectorAll('#table-books-list tr');
  
  rows.forEach(r => {
    const text = r.textContent.toLowerCase();
    r.style.display = text.includes(q) ? '' : 'none';
  });
}

// --- ADMIN: LOANS REGISTRATION (FOLLOWS SEQUENCE DIAGRAM) ---

function populateBooksSelect() {
  const selectQuickBook = document.getElementById('quick-loan-book');
  const books = LDB.get('libros');
  
  selectQuickBook.innerHTML = '<option value="">Seleccione un libro disponible...</option>';
  books.filter(b => b.copias_disponibles > 0).forEach(b => {
    const opt = document.createElement('option');
    opt.value = b.id_libro;
    opt.textContent = `[ID: ${b.id_libro}] ${b.titulo} (${b.copias_disponibles} disp)`;
    selectQuickBook.appendChild(opt);
  });
}

// --- ADMIN LOANS: FILTERING & STATUS MANAGEMENT ---
let activeLoanFilter = 'all'; // 'all' | 'activo' | 'vencido' | 'devuelto'

function setLoanStatusFilter(status) {
  activeLoanFilter = status;
  // Update active pill button
  document.querySelectorAll('.filter-pill').forEach(pill => pill.classList.remove('active'));
  const activeBtn = document.getElementById(`filter-pill-${status}`);
  if (activeBtn) activeBtn.classList.add('active');
  loadLoansTable();
}

function loadLoansTable() {
  const loans = LDB.get('prestamos');
  const users = LDB.get('usuarios');
  const books = LDB.get('libros');
  const tableBody = document.getElementById('table-loans-list');
  if (!tableBody) return;

  const today = new Date().toISOString().split('T')[0];
  const searchInput = document.getElementById('search-loans-input');
  const q = searchInput ? searchInput.value.toLowerCase().trim() : '';

  // 1. Calculate counts for filter pills
  const totalCount = loans.length;
  let devueltosCount = 0;
  let vencidosCount = 0;
  let activosCount = 0;

  loans.forEach(l => {
    if (l.fecha_devolucion) {
      devueltosCount++;
    } else if (l.fecha_limite < today) {
      vencidosCount++;
    } else {
      activosCount++;
    }
  });

  // Update pill counters
  if (document.getElementById('count-pill-all')) document.getElementById('count-pill-all').textContent = totalCount;
  if (document.getElementById('count-pill-activo')) document.getElementById('count-pill-activo').textContent = activosCount;
  if (document.getElementById('count-pill-vencido')) document.getElementById('count-pill-vencido').textContent = vencidosCount;
  if (document.getElementById('count-pill-devuelto')) document.getElementById('count-pill-devuelto').textContent = devueltosCount;

  // 2. Filter loans according to status
  let filtered = [...loans];
  if (activeLoanFilter === 'activo') {
    filtered = filtered.filter(l => !l.fecha_devolucion && l.fecha_limite >= today);
  } else if (activeLoanFilter === 'vencido') {
    filtered = filtered.filter(l => !l.fecha_devolucion && l.fecha_limite < today);
  } else if (activeLoanFilter === 'devuelto') {
    filtered = filtered.filter(l => l.fecha_devolucion !== null);
  }

  // 3. Search query filter
  if (q) {
    filtered = filtered.filter(l => {
      const usr = users.find(u => u.id_usuario == l.id_usuario);
      const bk = books.find(b => b.id_libro == l.id_libro);
      const searchTarget = `${l.id_prestamo} ${usr ? usr.matricula + ' ' + usr.nombre : ''} ${bk ? bk.titulo + ' ' + bk.autor : ''} ${l.fecha_prestamo} ${l.fecha_limite} ${l.fecha_devolucion || ''}`.toLowerCase();
      return searchTarget.includes(q);
    });
  }

  tableBody.innerHTML = '';
  if (filtered.length === 0) {
    let emptyMsg = 'No hay historial de préstamos.';
    if (loans.length > 0) {
      if (activeLoanFilter === 'activo') emptyMsg = 'No hay préstamos activos en este momento.';
      else if (activeLoanFilter === 'vencido') emptyMsg = '¡Excelente! No hay préstamos vencidos en este momento.';
      else if (activeLoanFilter === 'devuelto') emptyMsg = 'No hay préstamos devueltos en el historial.';
      else if (q) emptyMsg = `No se encontraron préstamos que coincidan con "${escapeHtml(q)}".`;
    }
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">${emptyMsg}</td></tr>`;
    return;
  }

  // Show from latest to oldest
  [...filtered].reverse().forEach(l => {
    const usr = users.find(u => u.id_usuario == l.id_usuario);
    const bk = books.find(b => b.id_libro == l.id_libro);
    
    let stateBadge = '';
    const limitDate = new Date(l.fecha_limite + 'T00:00:00');
    const currDate = new Date(today + 'T00:00:00');
    const diffDays = Math.round((limitDate - currDate) / (1000 * 60 * 60 * 24));

    if (l.fecha_devolucion) {
      stateBadge = `<span class="badge badge-success" title="Devuelto el ${l.fecha_devolucion}"><i data-feather="check" style="width:12px; height:12px; vertical-align:middle; margin-right:4px;"></i> Devuelto</span>`;
    } else if (diffDays < 0) {
      const delayDays = Math.abs(diffDays);
      stateBadge = `<span class="badge badge-danger" title="Vencido hace ${delayDays} día(s)"><i data-feather="alert-octagon" style="width:12px; height:12px; vertical-align:middle; margin-right:4px;"></i> Vencido (${delayDays}d)</span>`;
    } else if (diffDays === 0) {
      stateBadge = `<span class="badge badge-danger" title="Vence hoy"><i data-feather="alert-triangle" style="width:12px; height:12px; vertical-align:middle; margin-right:4px;"></i> Vence hoy</span>`;
    } else if (diffDays <= 3) {
      stateBadge = `<span class="badge badge-warning" title="Quedan ${diffDays} día(s)"><i data-feather="clock" style="width:12px; height:12px; vertical-align:middle; margin-right:4px;"></i> Activo (${diffDays}d)</span>`;
    } else {
      stateBadge = `<span class="badge badge-info" title="En tiempo"><i data-feather="clock" style="width:12px; height:12px; vertical-align:middle; margin-right:4px;"></i> Activo</span>`;
    }
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>#${l.id_prestamo}</strong></td>
      <td>
        <span class="badge badge-info" style="font-family: var(--font-mono);">${usr ? escapeHtml(usr.matricula) : 'ID:'+l.id_usuario}</span>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${usr ? escapeHtml(usr.nombre) : ''}</div>
      </td>
      <td>
        <strong>${bk ? escapeHtml(bk.titulo) : 'ID:'+l.id_libro}</strong>
        <div style="font-size:0.75rem; color:var(--text-muted);">${bk ? 'Por ' + escapeHtml(bk.autor) : ''}</div>
      </td>
      <td>${l.fecha_prestamo}</td>
      <td><span style="${!l.fecha_devolucion && diffDays < 0 ? 'color: var(--danger); font-weight: 600;' : (!l.fecha_devolucion && diffDays <= 3 ? 'color: var(--warning); font-weight: 600;' : '')}">${l.fecha_limite}</span></td>
      <td>${l.fecha_devolucion ? `<span style="color:var(--success); font-weight:500;">${l.fecha_devolucion}</span>` : '<span style="color: var(--text-muted);">Pendiente</span>'}</td>
      <td>${stateBadge}</td>
    `;
    tableBody.appendChild(tr);
  });
  feather.replace();
}

function filterLoansTable() {
  loadLoansTable();
}

// --- ADMIN PENDING REQUESTS MANAGEMENT ---

function loadAdminPendingRequests() {
  const requests = LDB.get('solicitudes') || [];
  const pending = requests.filter(r => r.estado === 'Pendiente');
  const users = LDB.get('usuarios');
  const books = LDB.get('libros');
  
  // Badge count on panel header
  const badgeEl = document.getElementById('badge-admin-pending-requests');
  if (badgeEl) {
    badgeEl.textContent = `${pending.length} pendiente${pending.length === 1 ? '' : 's'}`;
    badgeEl.className = `badge ${pending.length > 0 ? 'badge-warning' : 'badge-info'}`;
  }
  
  // Badge count on sidebar
  const sidebarBadge = document.getElementById('sidebar-loans-badge');
  if (sidebarBadge) {
    if (pending.length > 0) {
      sidebarBadge.textContent = pending.length;
      sidebarBadge.style.display = 'inline-block';
    } else {
      sidebarBadge.style.display = 'none';
    }
  }

  const tableBody = document.getElementById('table-admin-pending-requests');
  if (!tableBody) return;
  tableBody.innerHTML = '';
  
  if (pending.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
          <i data-feather="check-circle" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 0.5rem; color: var(--success);"></i>
          No hay solicitudes de préstamo pendientes por autorizar.
        </td>
      </tr>
    `;
    feather.replace();
    return;
  }
  
  [...pending].reverse().forEach(r => {
    const user = users.find(u => u.id_usuario === r.id_usuario);
    const book = books.find(b => b.id_libro === r.id_libro);
    const hasCopies = book && book.copias_disponibles > 0;
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>#${r.id_solicitud}</strong></td>
      <td>
        <strong>${user ? escapeHtml(user.nombre) : 'Usuario #' + r.id_usuario}</strong>
        <div style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--accent);">${user ? escapeHtml(user.matricula) : ''}</div>
      </td>
      <td><span class="badge badge-info">${user ? escapeHtml(user.tipo_usuario) : 'Estudiante'}</span></td>
      <td>
        <strong>${book ? escapeHtml(book.titulo) : 'Libro #' + r.id_libro}</strong>
        <div style="font-size: 0.75rem; color: var(--text-muted);">ID: #${r.id_libro} • ${book ? escapeHtml(book.autor) : ''}</div>
      </td>
      <td>
        <span class="badge ${hasCopies ? 'badge-success' : 'badge-danger'}">
          ${book ? book.copias_disponibles + ' disponibles' : 'Sin copias'}
        </span>
      </td>
      <td>${r.fecha_solicitud}</td>
      <td>
        <div style="display: flex; gap: 0.5rem;">
          <button type="button" class="btn btn-primary btn-sm" onclick="authorizeLoanRequest(${r.id_solicitud})" ${!hasCopies ? 'disabled title="Sin copias disponibles"' : ''} style="padding: 0.35rem 0.65rem; font-size: 0.8rem;">
            <i data-feather="check" style="width: 13px; height: 13px;"></i> Autorizar y Entregar
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="rejectLoanRequest(${r.id_solicitud})" style="padding: 0.35rem 0.65rem; font-size: 0.8rem; color: var(--danger);">
            <i data-feather="x" style="width: 13px; height: 13px;"></i> Rechazar
          </button>
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  });
  feather.replace();
}

function authorizeLoanRequest(requestId) {
  const requests = LDB.get('solicitudes') || [];
  const req = requests.find(r => r.id_solicitud === requestId);
  if (!req || req.estado !== 'Pendiente') {
    showToast('Solicitud no encontrada o ya procesada.', 'warning');
    return;
  }
  
  const books = LDB.get('libros');
  const book = books.find(b => b.id_libro == req.id_libro);
  const users = LDB.get('usuarios');
  const user = users.find(u => u.id_usuario == req.id_usuario);
  
  if (!book || book.copias_disponibles <= 0) {
    showToast(`El libro "${book ? book.titulo : 'solicitado'}" no tiene copias disponibles para autorizar el préstamo.`, 'danger');
    return;
  }
  
  const today = new Date().toISOString().split('T')[0];
  const limitDate = new Date();
  limitDate.setDate(limitDate.getDate() + 7);
  const limitDateStr = limitDate.toISOString().split('T')[0];
  
  // 1. Insert loan
  const newLoan = LDB.insert('prestamos', {
    id_usuario: req.id_usuario,
    id_libro: req.id_libro,
    fecha_prestamo: today,
    fecha_limite: limitDateStr,
    fecha_devolucion: null
  });
  
  // 2. Decrement available book copies
  const nuevasCopias = book.copias_disponibles - 1;
  LDB.update('libros', 'id_libro', book.id_libro, {
    copias_disponibles: nuevasCopias,
    estado: nuevasCopias === 0 ? 'Prestado' : 'Disponible'
  });
  
  // 3. Mark request as 'Autorizada' -> this removes the pending delivery notification for the student/teacher!
  LDB.update('solicitudes', 'id_solicitud', requestId, {
    estado: 'Autorizada',
    fecha_autorizacion: today,
    id_prestamo: newLoan.id_prestamo
  });
  
  showToast(`¡Solicitud #${requestId} autorizada! Préstamo #${newLoan.id_prestamo} generado para ${user ? user.matricula : 'Usuario'}. La notificación ha sido retirada.`, 'success');
  
  loadAdminPendingRequests();
  loadLoansTable();
  updateNotificationsUI();
  if (document.getElementById('metric-active-loans')) {
    loadAdminDashboard();
  }
}

function rejectLoanRequest(requestId) {
  if (!confirm('¿Deseas rechazar esta solicitud de préstamo?')) return;
  
  const requests = LDB.get('solicitudes') || [];
  const req = requests.find(r => r.id_solicitud === requestId);
  if (!req || req.estado !== 'Pendiente') {
    showToast('Solicitud no encontrada o ya procesada.', 'warning');
    return;
  }
  
  LDB.update('solicitudes', 'id_solicitud', requestId, {
    estado: 'Rechazada',
    fecha_rechazo: new Date().toISOString().split('T')[0]
  });
  
  showToast(`Solicitud #${requestId} rechazada.`, 'info');
  loadAdminPendingRequests();
  updateNotificationsUI();
}

// Core business logic implementing loan sequence diagram
function handleRegisterLoan(event, isQuickForm) {
  event.preventDefault();
  
  let matricula = '';
  let idLibro = '';
  let fechaP = new Date().toISOString().split('T')[0];
  let fechaL = '';
  
  if (isQuickForm) {
    matricula = document.getElementById('quick-loan-user').value.trim().toUpperCase();
    idLibro = document.getElementById('quick-loan-book').value;
    // 7 days limit by default
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() + 7);
    fechaL = limitDate.toISOString().split('T')[0];
  } else {
    matricula = document.getElementById('det-loan-usuario').value.trim().toUpperCase();
    idLibro = document.getElementById('det-loan-libro').value.trim();
    fechaP = document.getElementById('det-loan-fecha-p').value;
    fechaL = document.getElementById('det-loan-fecha-l').value;
  }
  
  // Step 4. Verificar existencia de usuario y libro
  const users = LDB.get('usuarios');
  const books = LDB.get('libros');
  
  const targetUser = users.find(u => u.matricula === matricula);
  const targetBook = books.find(b => b.id_libro == idLibro);
  
  if (!targetUser || !targetBook) {
    // Step 5a: Mostrar error: Usuario o libro no existe
    showToast('ERROR: Usuario o libro no encontrado en la base de datos.', 'danger');
    return;
  }
  
  // Step 6: Verificar disponibilidad del libro (por copias)
  if (targetBook.copias_disponibles <= 0) {
    // Step 7a: Libro no disponible (Sin copias)
    showToast(`El libro "${targetBook.titulo}" no tiene copias disponibles para préstamo.`, 'warning');
    return;
  }
  
  // Check if this user already has an active debt. Prevent loans to users with debts!
  const adeudos = LDB.get('adeudos');
  const userLoans = LDB.get('prestamos').filter(l => l.id_usuario === targetUser.id_usuario);
  const hasPendingDebt = adeudos.some(a => a.estado !== 'Pagado' && userLoans.some(l => l.id_prestamo === a.id_prestamo));
  if (hasPendingDebt) {
    showToast(`ERROR: El usuario ${targetUser.nombre} tiene multas pendientes de pago y no puede solicitar préstamos.`, 'danger');
    return;
  }

  // Step 8: Préstamo de registro (Insert into DB)
  const newLoan = LDB.insert('prestamos', {
    id_usuario: targetUser.id_usuario,
    id_libro: targetBook.id_libro,
    fecha_prestamo: fechaP,
    fecha_limite: fechaL,
    fecha_devolucion: null
  });

  // Backend Integration (Etapa 6)
  BackendBridge.syncLoan({
    id_usuario: targetUser.id_usuario,
    id_libro: targetBook.id_libro,
    fecha_prestamo: fechaP,
    fecha_limite: fechaL
  });
  
  // Step 9: Actualizar estado libro y decrementar copias disponibles
  const nuevasCopiasDisp = targetBook.copias_disponibles - 1;
  LDB.update('libros', 'id_libro', targetBook.id_libro, { 
    copias_disponibles: nuevasCopiasDisp,
    estado: nuevasCopiasDisp === 0 ? 'Prestado' : 'Disponible'
  });

  // Auto-fulfill any matching pending request for this user and book
  const requests = LDB.get('solicitudes') || [];
  const pendingReq = requests.find(r => r.id_usuario === targetUser.id_usuario && r.id_libro == targetBook.id_libro && r.estado === 'Pendiente');
  if (pendingReq) {
    LDB.update('solicitudes', 'id_solicitud', pendingReq.id_solicitud, {
      estado: 'Autorizada',
      fecha_autorizacion: fechaP,
      id_prestamo: newLoan.id_prestamo
    });
  }
  loadAdminPendingRequests();
  updateNotificationsUI();
  
  showToast(`Préstamo registrado correctamente. Folio de préstamo: ${newLoan.id_prestamo}`, 'success');
  
  // Reset forms
  if (isQuickForm) {
    document.getElementById('form-quick-loan').reset();
    loadAdminDashboard();
  } else {
    document.getElementById('form-detailed-loan').reset();
    // Reset dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('det-loan-fecha-p').value = today;
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() + 7);
    document.getElementById('det-loan-fecha-l').value = limitDate.toISOString().split('T')[0];
    loadLoansTable();
  }
  
  // Step 10: Mostrar comprobante de préstamo (Ticket Modal)
  showLoanTicket(newLoan, targetUser, targetBook);
}

function showLoanTicket(loan, user, book) {
  const title = document.getElementById('modal-ticket-title');
  title.textContent = 'VALE DE PRÉSTAMO DIGITAL';
  
  const container = document.getElementById('ticket-container');
  container.innerHTML = `
    <div class="receipt-ticket">
      <div class="receipt-header">
        <div class="receipt-logo">VALE DE PRÉSTAMO</div>
        <p>BIBLIOTECA ESCOLAR INSTITUCIONAL</p>
        <p>Reporte de salida de material</p>
      </div>
      <div class="receipt-row">
        <span>Folio Préstamo:</span>
        <span style="font-weight:bold;">#PR-${loan.id_prestamo.toString().padStart(5, '0')}</span>
      </div>
      <div class="receipt-row">
        <span>Fecha de Salida:</span>
        <span>${loan.fecha_prestamo}</span>
      </div>
      <div class="receipt-row" style="margin-bottom: 1rem;">
        <span>Límite de Entrega:</span>
        <span style="color:var(--danger); font-weight:bold;">${loan.fecha_limite}</span>
      </div>
      <div style="border-top:1px dashed #000; padding-top:0.75rem; margin-top:0.75rem;">
        <span style="font-size:0.7rem; color:#4a5568;">DATOS DEL LECTOR:</span>
        <div class="receipt-row" style="margin-top:0.25rem;">
          <span>Nombre:</span>
          <strong>${user.nombre}</strong>
        </div>
        <div class="receipt-row">
          <span>Matrícula:</span>
          <span>${user.matricula} (${user.tipo_usuario})</span>
        </div>
      </div>
      <div style="border-top:1px dashed #000; padding-top:0.75rem; margin-top:0.75rem;">
        <span style="font-size:0.7rem; color:#4a5568;">MATERIAL PRESTADO:</span>
        <div style="display:flex; gap:0.75rem; align-items:center; margin-top:0.5rem;">
          ${book.imagen ? `<img src="${escapeHtml(book.imagen)}" alt="${escapeHtml(book.titulo)}" style="width:45px; height:60px; object-fit:cover; border-radius:4px; border:1px solid #ccc; flex-shrink:0;">` : ''}
          <div style="flex-grow:1;">
            <div class="receipt-row" style="margin-bottom:0.15rem;">
              <span>Libro ID:</span>
              <span>#${book.id_libro}</span>
            </div>
            <div style="font-size:0.85rem; font-weight:bold; line-height:1.2; margin-bottom:0.15rem;">
              ${escapeHtml(book.titulo)}
            </div>
            <div style="font-size:0.75rem; color:#4a5568;">
              Por ${escapeHtml(book.autor)}
            </div>
          </div>
        </div>
      </div>
      <div class="barcode"></div>
      <div class="receipt-footer">
        <p>CONSERVA ESTE COMPROBANTE</p>
        <p>El retraso genera una penalización de $10.00 MXN por día natural.</p>
      </div>
    </div>
  `;
  
  openModal('modal-ticket');
}

// --- ADMIN: DEVOLUCIONES Y ADEUDOS ---

function loadAdminDebtsSection() {
  const loans = LDB.get('prestamos');
  const books = LDB.get('libros');
  const users = LDB.get('usuarios');
  
  // Populate Devoluciones Select Box (Active loans only)
  const selectLoans = document.getElementById('return-loan-id');
  selectLoans.innerHTML = '<option value="">Seleccione un préstamo activo...</option>';
  
  loans.filter(l => l.fecha_devolucion === null).forEach(l => {
    const usr = users.find(u => u.id_usuario == l.id_usuario);
    const bk = books.find(b => b.id_libro == l.id_libro);
    const opt = document.createElement('option');
    opt.value = l.id_prestamo;
    opt.textContent = `Préstamo #${l.id_prestamo} • ${usr ? usr.nombre : 'Matrícula: ' + l.id_usuario} • ${bk ? bk.titulo : 'Libro: ' + l.id_libro}`;
    selectLoans.appendChild(opt);
  });
  
  // Load Pending Debts table
  const tableDebts = document.getElementById('table-debts-list');
  const adeudos = LDB.get('adeudos');
  
  tableDebts.innerHTML = '';
  if (adeudos.length === 0) {
    tableDebts.innerHTML = '<tr><td colspan="8" style="text-align: center;">No hay registros de adeudos.</td></tr>';
  } else {
    adeudos.forEach(a => {
      const loan = loans.find(l => l.id_prestamo == a.id_prestamo);
      const usr = loan ? users.find(u => u.id_usuario == loan.id_usuario) : null;
      const bk = loan ? books.find(b => b.id_libro == loan.id_libro) : null;
      
      let stateBadge = '';
      let actionBtn = '';
      
      if (a.estado === 'Pagado') {
        stateBadge = '<span class="badge badge-success">Pagado</span>';
        actionBtn = `<button class="btn btn-secondary" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="viewPaymentReceipt(${a.id_adeudo})"><i data-feather="file-text" style="width:12px; height:12px;"></i> Ticket</button>`;
      } else if (a.estado === 'Validacion_Pending' || a.estado === 'Validacion_Pendiente') {
        stateBadge = '<span class="badge badge-info">Validación Pendiente</span>';
        actionBtn = `<span style="font-size:0.75rem; color:var(--text-muted);">Revisar panel lateral</span>`;
      } else {
        stateBadge = '<span class="badge badge-danger">Pendiente</span>';
        actionBtn = `<button class="btn btn-success" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="registerPresencialPayment(${a.id_adeudo})"><i data-feather="dollar-sign" style="width:12px; height:12px;"></i> Pagar Ventanilla</button>`;
      }
      
      let motivoHtml = '';
      if (a.monto_dano > 0 && a.dias_retraso > 0) {
        motivoHtml = `<span class="badge badge-danger" style="margin-bottom:0.2rem;">Retraso + Daños</span><br><span style="font-size:0.75rem; color:var(--text-secondary);">${escapeHtml(a.motivo || '')}</span>`;
      } else if (a.monto_dano > 0) {
        motivoHtml = `<span class="badge badge-danger" style="margin-bottom:0.2rem;">Daños físicos</span><br><span style="font-size:0.75rem; color:var(--danger);">${escapeHtml(a.motivo || `Daños ($${a.monto_dano}.00)`)}</span>`;
      } else {
        motivoHtml = `<span class="badge badge-warning" style="margin-bottom:0.2rem;">Retraso</span><br><span style="font-size:0.75rem; color:var(--text-secondary);">${a.dias_retraso} días</span>`;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>#AD-${a.id_adeudo}</td>
        <td><span class="badge badge-info" style="font-family:var(--font-mono);">${usr ? usr.matricula : 'N/A'}</span></td>
        <td>${bk ? bk.titulo : 'N/A'}</td>
        <td>${motivoHtml}</td>
        <td>${a.dias_retraso} días</td>
        <td><strong style="color: var(--danger);">$${a.monto_total}.00 MXN</strong></td>
        <td>${stateBadge}</td>
        <td>${actionBtn}</td>
      `;
      tableDebts.appendChild(tr);
    });
  }

  // Load pending validations table
  const tableVal = document.getElementById('table-validation-list');
  const pagos = LDB.get('pagos');
  const unvalidatedPayments = pagos.filter(p => p.validado === 0 && p.tipo_pago === 'Transferencia');
  
  tableVal.innerHTML = '';
  if (unvalidatedPayments.length === 0) {
    tableVal.innerHTML = '<tr><td colspan="5" style="text-align: center; color:var(--text-muted);">No hay transferencias pendientes.</td></tr>';
  } else {
    unvalidatedPayments.forEach(p => {
      const adeudo = adeudos.find(ad => ad.id_adeudo == p.id_adeudo);
      const loan = adeudo ? loans.find(l => l.id_prestamo == adeudo.id_prestamo) : null;
      const usr = loan ? users.find(u => u.id_usuario == loan.id_usuario) : null;
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>Adeudo #AD-${p.id_adeudo} (${usr ? usr.nombre : 'Usuario'})</td>
        <td><strong>$${p.monto}.00</strong></td>
        <td>${p.fecha_pago}</td>
        <td>
          <a href="#" onclick="showMockReceiptImage(${p.id_pago})" style="display:flex; align-items:center; gap:0.25rem; font-size:0.8rem; color:var(--accent);">
            <i data-feather="image" style="width:12px; height:12px;"></i> Ver Recibo Subido
          </a>
        </td>
        <td>
          <button class="btn btn-primary" style="padding:0.2rem 0.5rem; font-size:0.75rem;" onclick="validateOnlinePayment(${p.id_pago})">
            <i data-feather="check" style="width:12px; height:12px;"></i> Validar
          </button>
        </td>
      `;
      tableVal.appendChild(tr);
    });
  }
  feather.replace();
}

function toggleDamageInputs() {
  const checkbox = document.getElementById('return-has-damage');
  const fields = document.getElementById('return-damage-fields');
  if (checkbox && fields) {
    fields.style.display = checkbox.checked ? 'block' : 'none';
    if (!checkbox.checked) {
      const amt = document.getElementById('return-damage-amount');
      const rsn = document.getElementById('return-damage-reason');
      if (amt) amt.value = '50';
      if (rsn) rsn.value = '';
    }
  }
}

function updateReturnPreview() {
  const loanId = document.getElementById('return-loan-id').value;
  const returnDateVal = document.getElementById('return-fecha').value;
  const previewDiv = document.getElementById('return-preview-info');
  
  if (!loanId || !returnDateVal) {
    previewDiv.style.display = 'none';
    return;
  }
  
  const loans = LDB.get('prestamos');
  const loan = loans.find(l => l.id_prestamo == loanId);
  
  if (!loan) return;
  
  const limitDate = new Date(loan.fecha_limite);
  const returnDate = new Date(returnDateVal);

  let diffDays = 0;
  let fineAmount = 0;
  if (returnDate > limitDate) {
    const diffTime = Math.abs(returnDate - limitDate);
    diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    fineAmount = diffDays * 10; // $10 pesos por día
  }

  const hasDamage = document.getElementById('return-has-damage') && document.getElementById('return-has-damage').checked;
  const damageAmountVal = hasDamage ? (parseFloat(document.getElementById('return-damage-amount').value) || 0) : 0;
  const damageReasonVal = hasDamage ? (document.getElementById('return-damage-reason').value.trim() || 'Daños físicos reportados') : '';
  const totalAmount = fineAmount + damageAmountVal;
  
  previewDiv.style.display = 'block';
  previewDiv.style.border = '1px solid var(--border-glass)';
  
  if (totalAmount === 0) {
    previewDiv.style.backgroundColor = 'rgba(16, 185, 129, 0.08)';
    previewDiv.innerHTML = `
      <span style="color:var(--success); font-weight:bold;">¡A tiempo y sin daños!</span> El libro está dentro del periodo límite y en perfectas condiciones. No se generará ninguna multa.
    `;
  } else {
    previewDiv.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
    let detailsHtml = '';
    if (diffDays > 0) {
      detailsHtml += `• Retraso en entrega (${diffDays} días): <strong>$${fineAmount}.00 MXN</strong><br>`;
    }
    if (hasDamage && damageAmountVal > 0) {
      detailsHtml += `• Multa por daños físicos: <strong>$${damageAmountVal}.00 MXN</strong> (Motivo: ${escapeHtml(damageReasonVal)})<br>`;
    }
    previewDiv.innerHTML = `
      <span style="color:var(--danger); font-weight:bold;">Recargo aplicable a la cuenta del usuario:</span><br>
      ${detailsHtml}
      <div style="margin-top:0.35rem; font-size:0.9rem;">Total a cargar: <strong style="color:var(--danger);">$${totalAmount}.00 MXN</strong></div>
    `;
  }
}

// Business logic for registering returns, calculating automatic fines
function handleRegisterReturn(event) {
  event.preventDefault();
  const loanId = document.getElementById('return-loan-id').value;
  const returnDateVal = document.getElementById('return-fecha').value;
  
  const loans = LDB.get('prestamos');
  const loan = loans.find(l => l.id_prestamo == loanId);
  
  if (!loan) {
    showToast('Seleccione un préstamo válido.', 'warning');
    return;
  }
  
  // Set date returned
  LDB.update('prestamos', 'id_prestamo', loanId, { fecha_devolucion: returnDateVal });
  
  // Set book status back to Available and increment copies
  const targetBook = LDB.get('libros').find(b => b.id_libro == loan.id_libro);
  if (targetBook) {
    const nuevasCopias = Math.min(targetBook.copias_totales, (targetBook.copias_disponibles || 0) + 1);
    LDB.update('libros', 'id_libro', loan.id_libro, { 
      copias_disponibles: nuevasCopias,
      estado: 'Disponible'
    });
  }
  
  // Calculate potential fine (Calendar date difference to avoid timezone shifts)
  const pLimite = loan.fecha_limite.split('-').map(Number);
  const pDev = returnDateVal.split('-').map(Number);
  const dLimite = new Date(pLimite[0], pLimite[1] - 1, pLimite[2]);
  const dDev = new Date(pDev[0], pDev[1] - 1, pDev[2]);
  
  let diffDays = 0;
  let fineAmount = 0;
  if (dDev > dLimite) {
    const diffTime = dDev.getTime() - dLimite.getTime();
    diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    fineAmount = diffDays * 10; // $10 per day
  }

  // Multa por daños físicos si el administrador lo decide
  const hasDamage = document.getElementById('return-has-damage') && document.getElementById('return-has-damage').checked;
  const damageAmountVal = hasDamage ? (parseFloat(document.getElementById('return-damage-amount').value) || 0) : 0;
  const damageReasonVal = hasDamage ? (document.getElementById('return-damage-reason').value.trim() || 'Daños en el ejemplar') : '';
  const totalAmount = fineAmount + damageAmountVal;

  let motivoCompleto = null;
  if (diffDays > 0 && damageAmountVal > 0) {
    motivoCompleto = `Retraso (${diffDays} días: $${fineAmount}.00) + Daños físicos ($${damageAmountVal}.00): ${damageReasonVal}`;
  } else if (damageAmountVal > 0) {
    motivoCompleto = `Daños físicos ($${damageAmountVal}.00): ${damageReasonVal}`;
  } else if (diffDays > 0) {
    motivoCompleto = `Retraso de entrega (${diffDays} días)`;
  }

  let generatedDebt = null;
  if (totalAmount > 0) {
    generatedDebt = LDB.insert('adeudos', {
      id_prestamo: loan.id_prestamo,
      estado: 'Pendiente',
      dias_retraso: diffDays,
      monto_total: totalAmount,
      monto_dano: damageAmountVal,
      motivo: motivoCompleto
    });
    
    showToast(`Devolución procesada. Multa generada de $${totalAmount}.00 MXN reflejada en la cuenta del usuario.`, 'warning');
  } else {
    showToast('Devolución guardada a tiempo. ¡Excelente lector!', 'success');
  }

  // Notificar al siguiente en la cola de espera si hay lectores esperando este libro
  const waitlist = LDB.get('cola_espera') || [];
  const nextWait = waitlist.find(w => w.id_libro == loan.id_libro && w.estado === 'En_Espera');
  if (nextWait) {
    LDB.update('cola_espera', 'id_reserva', nextWait.id_reserva, {
      estado: 'Disponible_Para_Retirar',
      fecha_disponible: returnDateVal
    });
    const users = LDB.get('usuarios');
    const waitingUser = users.find(u => u.id_usuario === nextWait.id_usuario);
    showToast(`📢 ¡Cola de espera! Se notificó a ${waitingUser ? waitingUser.nombre : 'lector'} que "${targetBook ? targetBook.titulo : 'el libro'}" ya está listo en ${targetBook ? targetBook.estante : 'estante'}.`, 'info');
  }

  // Backend Integration (Etapa 6)
  BackendBridge.syncReturn({
    id_prestamo: parseInt(loanId),
    fecha_devolucion: returnDateVal,
    multa_dano: damageAmountVal,
    motivo_dano: damageReasonVal
  });
  
  document.getElementById('form-register-return').reset();
  if (document.getElementById('return-has-damage')) {
    document.getElementById('return-has-damage').checked = false;
    toggleDamageInputs();
  }
  // Reset date fields
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('return-fecha').value = today;
  document.getElementById('return-preview-info').style.display = 'none';
  
  loadAdminDebtsSection();
  loadAdminWaitlist();
  loadLoansTable();
  updateNotificationsUI();
}

function registerPresencialPayment(adeudoId) {
  const adeudos = LDB.get('adeudos');
  const adeudo = adeudos.find(ad => ad.id_adeudo == adeudoId);
  
  if (!adeudo) return;
  
  const today = new Date().toISOString().split('T')[0];
  
  // Register payment record validated by admin
  const payment = LDB.insert('pagos', {
    id_adeudo: adeudoId,
    monto: adeudo.monto_total,
    fecha_pago: today,
    tipo_pago: 'Presencial',
    validado: 1,
    id_admin: currentUser.id
  });
  
  // Update debt state to Paid
  LDB.update('adeudos', 'id_adeudo', adeudoId, { estado: 'Pagado' });
  
  // Generate digital receipt (comprobante)
  const folio = `F-${today.replace(/-/g, '')}-${payment.id_pago.toString().padStart(4, '0')}`;
  const receipt = LDB.insert('comprobantes', {
    id_pago: payment.id_pago,
    folio: folio,
    fecha: today
  });

  // Backend Integration (Etapa 6)
  BackendBridge.syncPayment({
    id_adeudo: parseInt(adeudoId),
    monto: adeudo.monto_total,
    fecha_pago: today,
    tipo_pago: 'Presencial',
    id_admin: currentUser ? currentUser.id : 1
  });

  showToast(`Pago presencial registrado y validado. Folio: ${folio}`, 'success');
  loadAdminDebtsSection();
  
  // Display ticket receipt modal
  showPaymentTicket(receipt, payment, adeudo);
}

function validateOnlinePayment(pagoId) {
  const pagos = LDB.get('pagos');
  const payment = pagos.find(p => p.id_pago == pagoId);
  
  if (!payment) return;
  
  const today = new Date().toISOString().split('T')[0];
  
  // Update payment to validated
  LDB.update('pagos', 'id_pago', pagoId, { 
    validado: 1,
    id_admin: currentUser.id 
  });
  
  // Update debt status to Paid
  LDB.update('adeudos', 'id_adeudo', payment.id_adeudo, { estado: 'Pagado' });
  
  // Generate comprobante
  const folio = `F-${today.replace(/-/g, '')}-${payment.id_pago.toString().padStart(4, '0')}`;
  const receipt = LDB.insert('comprobantes', {
    id_pago: payment.id_pago,
    folio: folio,
    fecha: today
  });

  // Backend Integration (Etapa 6)
  BackendBridge.syncValidatePayment(pagoId, currentUser ? currentUser.id : 1);

  showToast(`Pago en línea aprobado. Comprobante digital generado: ${folio}`, 'success');
  loadAdminDebtsSection();
  
  // Display ticket receipt modal
  const adeudos = LDB.get('adeudos');
  const adeudo = adeudos.find(a => a.id_adeudo == payment.id_adeudo);
  showPaymentTicket(receipt, payment, adeudo);
}

function showPaymentTicket(receipt, payment, adeudo) {
  const title = document.getElementById('modal-ticket-title');
  title.textContent = 'COMPROBANTE DIGITAL DE PAGO';
  
  const loans = LDB.get('prestamos');
  const loan = loans.find(l => l.id_prestamo == adeudo.id_prestamo);
  const users = LDB.get('usuarios');
  const user = loan ? users.find(u => u.id_usuario == loan.id_usuario) : null;
  const books = LDB.get('libros');
  const book = loan ? books.find(b => b.id_libro == loan.id_libro) : null;
  
  const container = document.getElementById('ticket-container');
  container.innerHTML = `
    <div class="receipt-ticket">
      <div class="receipt-header">
        <div class="receipt-logo">COMPROBANTE OFICIAL</div>
        <p>SISTEMA GENERAL DE BIBLIOTECA</p>
        <p>Control de Recargos y Multas</p>
      </div>
      <div class="receipt-row">
        <span>Folio Digital:</span>
        <span style="font-weight:bold;">${receipt.folio}</span>
      </div>
      <div class="receipt-row">
        <span>Fecha de Pago:</span>
        <span>${payment.fecha_pago}</span>
      </div>
      <div class="receipt-row">
        <span>Tipo de Pago:</span>
        <span style="font-weight:bold;">${payment.tipo_pago}</span>
      </div>
      <div style="border-top:1px dashed #000; padding-top:0.75rem; margin-top:0.75rem;">
        <span style="font-size:0.7rem; color:#4a5568;">CONTRIBUYENTE LECTOR:</span>
        <div class="receipt-row" style="margin-top:0.25rem;">
          <span>Nombre:</span>
          <strong>${user ? user.nombre : 'Usuario'}</strong>
        </div>
        <div class="receipt-row">
          <span>Matrícula:</span>
          <span>${user ? user.matricula : 'N/A'}</span>
        </div>
      </div>
      <div style="border-top:1px dashed #000; padding-top:0.75rem; margin-top:0.75rem;">
        <span style="font-size:0.7rem; color:#4a5568;">DETALLE DE SANCION:</span>
        <div class="receipt-row" style="margin-top:0.25rem;">
          <span>ID Adeudo:</span>
          <span>#AD-${adeudo.id_adeudo}</span>
        </div>
        <div class="receipt-row">
          <span>Libro:</span>
          <span style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${book ? book.titulo : 'N/A'}</span>
        </div>
        <div class="receipt-row">
          <span>Días de demora:</span>
          <span>${adeudo.dias_retraso} días</span>
        </div>
        ${(adeudo.monto_dano && adeudo.monto_dano > 0) ? `
        <div class="receipt-row" style="color:var(--danger); font-weight:bold;">
          <span>Multa por daños:</span>
          <span>$${adeudo.monto_dano}.00 MXN</span>
        </div>` : ''}
        ${adeudo.motivo ? `
        <div class="receipt-row" style="font-size:0.75rem; color:#4a5568;">
          <span>Concepto:</span>
          <span style="max-width:180px; text-align:right;">${escapeHtml(adeudo.motivo)}</span>
        </div>` : ''}
      </div>
      <div class="receipt-row total">
        <span>MONTO TOTAL PAGADO:</span>
        <span>$${payment.monto.toFixed(2)} MXN</span>
      </div>
      <div class="barcode"></div>
      <div class="receipt-footer">
        <p>VALIDADO DIGITALMENTE POR LA INSTITUCIÓN</p>
        <p>Este recibo oficial ampara el término de tu sanción económica.</p>
      </div>
    </div>
  `;
  
  openModal('modal-ticket');
}

function viewPaymentReceipt(adeudoId) {
  const pagos = LDB.get('pagos');
  const payment = pagos.find(p => p.id_adeudo == adeudoId && p.validado === 1);
  if (!payment) return;
  
  const receipts = LDB.get('comprobantes');
  const receipt = receipts.find(r => r.id_pago == payment.id_pago);
  if (!receipt) return;
  
  const adeudos = LDB.get('adeudos');
  const adeudo = adeudos.find(ad => ad.id_adeudo == adeudoId);
  
  showPaymentTicket(receipt, payment, adeudo);
}

// Simulated online file check mockup
function showMockReceiptImage(pagoId) {
  const title = document.getElementById('modal-ticket-title');
  title.textContent = 'COMPROBANTE DE TRANSFERENCIA CARGADO';
  
  const container = document.getElementById('ticket-container');
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; gap:1rem; padding: 1.5rem; text-align:center;">
      <p style="color:var(--text-secondary); font-size:0.85rem;">Vista digital del archivo adjunto para el pago #${pagoId}</p>
      <div style="border: 2px solid var(--border-glass); border-radius:12px; overflow:hidden; width:100%; max-width:320px; background:#000;">
        <img src="https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=600" alt="Recibo bancario simulado" style="width:100%; height:200px; object-fit:cover;">
      </div>
      <div style="font-size:0.8rem; background:rgba(0,0,0,0.2); padding:0.75rem; border-radius:8px; width:100%;">
        <strong>Detalle del archivo:</strong> Recibo_Transferencia_MULTA.png<br>
        <strong>Mapeo DB:</strong> Pago ID: ${pagoId} • Validado: FALSO
      </div>
    </div>
  `;
  openModal('modal-ticket');
}

// --- USER: CATALOGUE SECTION ---

function loadUserCatalog() {
  const books = LDB.get('libros');
  
  // Extract unique categories for filter
  const selectCat = document.getElementById('filter-catalog-category');
  const categories = [...new Set(books.map(b => b.categoria))];
  selectCat.innerHTML = '<option value="">Todas las Categorías</option>';
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    selectCat.appendChild(opt);
  });

  // Render alert banner for pending requests
  const alertContainer = document.getElementById('user-catalog-alert-container');
  if (alertContainer && currentUser && currentUser.tipo === 'user') {
    const requests = LDB.get('solicitudes') || [];
    const userPending = requests.filter(r => r.id_usuario === currentUser.id && r.estado === 'Pendiente');
    if (userPending.length > 0) {
      alertContainer.innerHTML = `
        <div class="alert-callout alert-callout-pending">
          <div class="alert-callout-icon"><i data-feather="clock"></i></div>
          <div class="alert-callout-body">
            <strong class="alert-callout-title">Tienes ${userPending.length} solicitud(es) de libro pendiente(s) de entrega</strong>
            <p class="alert-callout-text">El personal administrativo debe autorizar la entrega en ventanilla. Cuando el administrador lo autorice, <strong>la notificación se retirará automáticamente</strong> y tu periodo de préstamo comenzará.</p>
          </div>
        </div>
      `;
    } else {
      alertContainer.innerHTML = '';
    }
  }
  
  renderBooksGrid(books);
}

function renderBooksGrid(booksList) {
  const container = document.getElementById('catalog-grid-container');
  container.innerHTML = '';
  
  if (booksList.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem;">No se encontraron libros en el catálogo escolar.</div>`;
    return;
  }
  
  const requests = LDB.get('solicitudes') || [];
  const waitlist = LDB.get('cola_espera') || [];
  const userLoans = currentUser && currentUser.tipo === 'user' ? LDB.get('prestamos').filter(l => l.id_usuario === currentUser.id) : [];

  booksList.forEach(b => {
    const isAvailable = b.copias_disponibles > 0;
    const badgeClass = isAvailable ? 'badge-success' : 'badge-danger';
    const statusText = isAvailable ? 'Disponible' : 'Sin Copias';
    const hasImage = b.imagen && b.imagen.trim() !== '';

    const isPending = currentUser && currentUser.tipo === 'user' && requests.some(r => r.id_usuario === currentUser.id && r.id_libro == b.id_libro && r.estado === 'Pendiente');
    const isBorrowed = userLoans.some(l => l.id_libro == b.id_libro && l.fecha_devolucion === null);
    
    // Verificar si el usuario está en lista de espera o si ya le toca
    const myWait = currentUser && currentUser.tipo === 'user'
      ? waitlist.find(w => w.id_usuario === currentUser.id && w.id_libro == b.id_libro && ['En_Espera', 'Disponible_Para_Retirar'].includes(w.estado))
      : null;

    let actionBtnHtml = '';
    if (isPending) {
      actionBtnHtml = `
        <button type="button" class="btn btn-warning btn-sm" onclick="requestLoanInfo(${b.id_libro})" title="Solicitud pendiente de entrega">
          <i data-feather="clock" style="width:12px; height:12px; display:inline-block; vertical-align:middle; margin-right:0.25rem;"></i> Pendiente
        </button>
      `;
    } else if (isBorrowed) {
      actionBtnHtml = `<span class="badge badge-info" style="font-size:0.75rem;">En posesión</span>`;
    } else if (myWait && myWait.estado === 'Disponible_Para_Retirar') {
      actionBtnHtml = `
        <button type="button" class="btn btn-success btn-sm" onclick="requestLoanInfo(${b.id_libro})" title="¡Tu libro reservado ya está disponible!">
          <i data-feather="bell" style="width:12px; height:12px; display:inline-block; vertical-align:middle; margin-right:0.25rem;"></i> ¡Tu Turno!
        </button>
      `;
    } else if (myWait && myWait.estado === 'En_Espera') {
      const posAhead = waitlist.filter(w => w.id_libro == b.id_libro && w.estado === 'En_Espera' && w.id_reserva <= myWait.id_reserva).length;
      actionBtnHtml = `
        <button type="button" class="btn btn-warning btn-sm" onclick="requestLoanInfo(${b.id_libro})" title="En lista de espera para este libro">
          <i data-feather="clock" style="width:12px; height:12px; display:inline-block; vertical-align:middle; margin-right:0.25rem;"></i> En Cola (#${posAhead})
        </button>
      `;
    } else if (isAvailable) {
      actionBtnHtml = `
        <button type="button" class="btn btn-secondary btn-sm" onclick="requestLoanInfo(${b.id_libro})">
          <i data-feather="book-open" style="width:12px; height:12px; display:inline-block; vertical-align:middle; margin-right:0.25rem;"></i> Solicitar
        </button>
      `;
    } else {
      actionBtnHtml = `
        <button type="button" class="btn btn-primary btn-sm" onclick="requestLoanInfo(${b.id_libro})" style="background: linear-gradient(135deg, var(--secondary), var(--accent)); font-size:0.78rem;" title="Anotarse en la cola de espera para este libro">
          <i data-feather="users" style="width:12px; height:12px; display:inline-block; vertical-align:middle; margin-right:0.25rem;"></i> Cola Espera
        </button>
      `;
    }

    const card = document.createElement('div');
    card.className = 'book-card';
    card.innerHTML = `
      <div class="book-cover-container">
        ${hasImage ? `
          <img src="${escapeHtml(b.imagen)}" alt="${escapeHtml(b.titulo)}" class="book-cover-img" onerror="this.onerror=null; this.parentNode.innerHTML='<div class=\\'book-cover-fallback\\'><span>📖</span><p>${escapeHtml(b.titulo)}</p></div>';">
        ` : `
          <div class="book-cover-fallback">
            <span>📖</span>
            <p>${escapeHtml(b.titulo)}</p>
          </div>
        `}
        <span class="badge ${badgeClass} book-status-badge">${statusText}</span>
      </div>

      <div class="book-card-body">
        <div class="book-meta-top">
          <span class="book-category">${escapeHtml(b.categoria)}</span>
        </div>
        <h4 class="book-title" title="${escapeHtml(b.titulo)}">${escapeHtml(b.titulo)}</h4>
        <p class="book-author">Por ${escapeHtml(b.autor)}</p>
        <p class="book-editorial">Editorial: ${escapeHtml(b.editorial)}</p>
        <div class="book-shelf-tag">
          <i data-feather="map-pin"></i>
          <span>Estante: <strong>${escapeHtml(b.estante || 'Estante General')}</strong></span>
        </div>
        <div class="book-copies-indicator">
          <span class="copies-dot ${isAvailable ? 'available' : 'empty'}"></span>
          <span>Copias: <strong style="color: ${isAvailable ? 'var(--success)' : 'var(--danger)'};">${b.copias_disponibles} de ${b.copias_totales}</strong></span>
        </div>
      </div>

      <div class="book-footer">
        <span class="book-id-tag">ID: #${b.id_libro}</span>
        ${actionBtnHtml}
      </div>
    `;
    container.appendChild(card);
  });
  feather.replace();
}

// ==========================================================================
// NOTIFICATIONS SYSTEM & BOOK REQUEST LOGIC (ESTUDIANTE / DOCENTE)
// ==========================================================================

function getUserNotifications(userId) {
  const notifications = [];
  const today = new Date().toISOString().split('T')[0];
  const books = LDB.get('libros');
  const requests = LDB.get('solicitudes') || [];
  const loans = LDB.get('prestamos');
  
  // 1. Notificaciones de solicitudes pendientes ("pendiente de ser entregado")
  // Cada que se solicite un libro, aparece aquí.
  // Cuando el administrador lo autoriza (estado = 'Autorizada'), se quita automáticamente.
  const userRequests = requests.filter(r => r.id_usuario === userId && r.estado === 'Pendiente');
  userRequests.forEach(r => {
    const book = books.find(b => b.id_libro == r.id_libro);
    const bookTitle = book ? book.titulo : `Libro #${r.id_libro}`;
    notifications.push({
      id: `req-${r.id_solicitud}`,
      type: 'pending_delivery',
      level: 'warning',
      icon: 'clock',
      title: 'Préstamo Pendiente de Entrega',
      message: `Has solicitado "${bookTitle}". Tu solicitud está pendiente de ser autorizada y entregada en ventanilla por el administrador.`,
      bookTitle: bookTitle,
      date: r.fecha_solicitud,
      badgeText: 'Pendiente de entrega',
      badgeClass: 'badge-warning'
    });
  });

  // 2. Notificaciones de plazo por vencer (3 días, 2 días, 1 día antes, hoy y vencidos)
  const activeLoans = loans.filter(l => l.id_usuario === userId && l.fecha_devolucion === null);
  activeLoans.forEach(l => {
    const book = books.find(b => b.id_libro == l.id_libro);
    const bookTitle = book ? book.titulo : `Libro #${l.id_libro}`;
    
    // Cálculo exacto de diferencia de días calendario
    const limitDate = new Date(l.fecha_limite + 'T00:00:00');
    const currDate = new Date(today + 'T00:00:00');
    const diffDays = Math.round((limitDate - currDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 3) {
      notifications.push({
        id: `loan-${l.id_prestamo}-3days`,
        type: 'due_warning',
        daysLeft: 3,
        level: 'warning',
        icon: 'calendar',
        title: 'Plazo por vencer: Faltan 3 días',
        message: `El plazo para la entrega del libro "${bookTitle}" vence en 3 días (${l.fecha_limite}). Prepárate para devolverlo a tiempo en biblioteca.`,
        bookTitle: bookTitle,
        date: l.fecha_limite,
        badgeText: 'Faltan 3 días',
        badgeClass: 'badge-warning'
      });
    } else if (diffDays === 2) {
      notifications.push({
        id: `loan-${l.id_prestamo}-2days`,
        type: 'due_warning',
        daysLeft: 2,
        level: 'warning',
        icon: 'alert-triangle',
        title: 'Plazo por vencer: Faltan 2 días',
        message: `Atención: Quedan solo 2 días para entregar "${bookTitle}" (Fecha límite: ${l.fecha_limite}). Devuélvelo pronto para evitar recargos de $10.00 MXN/día.`,
        bookTitle: bookTitle,
        date: l.fecha_limite,
        badgeText: 'Faltan 2 días',
        badgeClass: 'badge-warning'
      });
    } else if (diffDays === 1) {
      notifications.push({
        id: `loan-${l.id_prestamo}-1day`,
        type: 'due_urgent',
        daysLeft: 1,
        level: 'danger',
        icon: 'alert-octagon',
        title: '¡Mañana es el último día! (Falta 1 día)',
        message: `¡Urgente! Mañana (${l.fecha_limite}) es la fecha límite para entregar "${bookTitle}". No hay excusa de que no se avisó: devuélvelo para evitar sanciones.`,
        bookTitle: bookTitle,
        date: l.fecha_limite,
        badgeText: '¡Vence mañana!',
        badgeClass: 'badge-danger'
      });
    } else if (diffDays === 0) {
      notifications.push({
        id: `loan-${l.id_prestamo}-today`,
        type: 'due_today',
        daysLeft: 0,
        level: 'danger',
        icon: 'alert-octagon',
        title: '¡Hoy vence el plazo de entrega!',
        message: `Hoy (${l.fecha_limite}) es la fecha límite para entregar "${bookTitle}". Acude hoy mismo a la biblioteca institucional.`,
        bookTitle: bookTitle,
        date: l.fecha_limite,
        badgeText: '¡Vence hoy!',
        badgeClass: 'badge-danger'
      });
    } else if (diffDays < 0) {
      const delayDays = Math.abs(diffDays);
      notifications.push({
        id: `loan-${l.id_prestamo}-overdue`,
        type: 'overdue',
        daysLeft: diffDays,
        level: 'danger',
        icon: 'x-circle',
        title: '¡Préstamo Vencido!',
        message: `El préstamo del libro "${bookTitle}" venció hace ${delayDays} día(s) (${l.fecha_limite}). Acude urgentemente a la biblioteca a devolverlo y liquidar el recargo.`,
        bookTitle: bookTitle,
        date: l.fecha_limite,
        badgeText: `Vencido (${delayDays}d)`,
        badgeClass: 'badge-danger'
      });
    }
  });

  return notifications;
}

function updateNotificationsUI() {
  const badgeCount = document.getElementById('notif-badge-count');
  const countPill = document.getElementById('notif-count-pill');
  const notifList = document.getElementById('notif-list-container');
  const sidebarMyLoansBadge = document.getElementById('sidebar-myloans-badge');
  const sidebarLoansBadge = document.getElementById('sidebar-loans-badge');

  if (!currentUser) {
    if (badgeCount) badgeCount.style.display = 'none';
    return;
  }

  if (currentUser.tipo === 'user') {
    const notifs = getUserNotifications(currentUser.id);
    
    // Header bell badge
    if (badgeCount) {
      if (notifs.length > 0) {
        badgeCount.textContent = notifs.length;
        badgeCount.style.display = 'flex';
        badgeCount.classList.add('pulse');
      } else {
        badgeCount.style.display = 'none';
        badgeCount.classList.remove('pulse');
      }
    }
    
    // Dropdown count pill
    if (countPill) {
      countPill.textContent = `${notifs.length} activa${notifs.length === 1 ? '' : 's'}`;
      countPill.className = `badge ${notifs.length > 0 ? 'badge-warning' : 'badge-info'}`;
    }

    // Sidebar badge
    if (sidebarMyLoansBadge) {
      if (notifs.length > 0) {
        sidebarMyLoansBadge.textContent = notifs.length;
        sidebarMyLoansBadge.style.display = 'inline-block';
      } else {
        sidebarMyLoansBadge.style.display = 'none';
      }
    }

    // Dropdown list HTML
    if (notifList) {
      if (notifs.length === 0) {
        notifList.innerHTML = `
          <div class="notif-empty">
            <i data-feather="check-circle" style="width: 28px; height: 28px; color: var(--success); margin-bottom: 0.5rem;"></i>
            <p style="font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">No tienes avisos pendientes</p>
            <span style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">Estás al corriente con tus préstamos y entregas.</span>
          </div>
        `;
      } else {
        let html = '';
        notifs.forEach(n => {
          html += `
            <div class="notif-item ${n.level}">
              <div class="notif-item-icon">
                <i data-feather="${n.icon}"></i>
              </div>
              <div class="notif-item-content">
                <div class="notif-item-header">
                  <span class="notif-item-title">${escapeHtml(n.title)}</span>
                  <span class="badge ${n.badgeClass}" style="font-size: 0.65rem; padding: 0.15rem 0.45rem;">${escapeHtml(n.badgeText)}</span>
                </div>
                <p class="notif-item-desc">${escapeHtml(n.message)}</p>
              </div>
            </div>
          `;
        });
        notifList.innerHTML = html;
      }
      feather.replace();
    }

    renderUserLoansAlerts();

  } else if (currentUser.tipo === 'admin') {
    const requests = LDB.get('solicitudes') || [];
    const pendingReqs = requests.filter(r => r.estado === 'Pendiente');
    const loans = LDB.get('prestamos');
    const today = new Date().toISOString().split('T')[0];
    const overdueLoans = loans.filter(l => !l.fecha_devolucion && l.fecha_limite < today);
    const totalAdminAlerts = pendingReqs.length + overdueLoans.length;

    if (badgeCount) {
      if (totalAdminAlerts > 0) {
        badgeCount.textContent = totalAdminAlerts;
        badgeCount.style.display = 'flex';
      } else {
        badgeCount.style.display = 'none';
      }
    }

    if (countPill) {
      countPill.textContent = `${totalAdminAlerts} aviso${totalAdminAlerts === 1 ? '' : 's'}`;
      countPill.className = `badge ${totalAdminAlerts > 0 ? 'badge-warning' : 'badge-info'}`;
    }

    if (sidebarLoansBadge) {
      if (pendingReqs.length > 0) {
        sidebarLoansBadge.textContent = pendingReqs.length;
        sidebarLoansBadge.style.display = 'inline-block';
      } else {
        sidebarLoansBadge.style.display = 'none';
      }
    }

    if (notifList) {
      if (totalAdminAlerts === 0) {
        notifList.innerHTML = `
          <div class="notif-empty">
            <i data-feather="check-circle" style="width: 28px; height: 28px; color: var(--success); margin-bottom: 0.5rem;"></i>
            <p style="font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">Sin alertas administrativas</p>
            <span style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">No hay solicitudes pendientes ni préstamos vencidos.</span>
          </div>
        `;
      } else {
        let html = '';
        if (pendingReqs.length > 0) {
          html += `
            <div class="notif-item warning" onclick="showView('admin-loans'); toggleNotificationPanel(false);" style="cursor: pointer;">
              <div class="notif-item-icon"><i data-feather="inbox"></i></div>
              <div class="notif-item-content">
                <div class="notif-item-header">
                  <span class="notif-item-title">Solicitudes Pendientes</span>
                  <span class="badge badge-warning">${pendingReqs.length}</span>
                </div>
                <p class="notif-item-desc">Hay ${pendingReqs.length} solicitud(es) de libros esperando tu autorización y entrega.</p>
              </div>
            </div>
          `;
        }
        if (overdueLoans.length > 0) {
          html += `
            <div class="notif-item danger" onclick="showView('admin-loans'); setLoanStatusFilter('vencido'); toggleNotificationPanel(false);" style="cursor: pointer;">
              <div class="notif-item-icon"><i data-feather="alert-octagon"></i></div>
              <div class="notif-item-content">
                <div class="notif-item-header">
                  <span class="notif-item-title">Préstamos Vencidos</span>
                  <span class="badge badge-danger">${overdueLoans.length}</span>
                </div>
                <p class="notif-item-desc">Existen ${overdueLoans.length} préstamo(s) que han superado su fecha límite de devolución.</p>
              </div>
            </div>
          `;
        }
        notifList.innerHTML = html;
      }
      feather.replace();
    }
  }
}

function toggleNotificationPanel(forceOpen) {
  const dropdown = document.getElementById('notif-dropdown');
  if (!dropdown) return;
  
  if (typeof forceOpen === 'boolean') {
    dropdown.style.display = forceOpen ? 'block' : 'none';
  } else {
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
  }
  
  if (dropdown.style.display === 'block') {
    updateNotificationsUI();
    feather.replace();
  }
}

function handleNotifViewAll() {
  toggleNotificationPanel(false);
  if (currentUser && currentUser.tipo === 'user') {
    showView('user-myloans');
  } else {
    showView('admin-loans');
  }
}

function renderUserLoansAlerts() {
  const container = document.getElementById('user-loans-alerts-container');
  if (!container || !currentUser || currentUser.tipo !== 'user') return;
  
  const notifications = getUserNotifications(currentUser.id);
  if (notifications.length === 0) {
    container.innerHTML = '';
    return;
  }
  
  let html = '<div style="display: flex; flex-direction: column; gap: 0.75rem;">';
  notifications.forEach(n => {
    let alertClass = 'alert-callout-warning';
    if (n.level === 'danger') alertClass = 'alert-callout-danger';
    if (n.type === 'pending_delivery') alertClass = 'alert-callout-pending';
    
    html += `
      <div class="alert-callout ${alertClass}">
        <div class="alert-callout-icon">
          <i data-feather="${n.icon}"></i>
        </div>
        <div class="alert-callout-body">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
            <strong class="alert-callout-title">${escapeHtml(n.title)}</strong>
            <span class="badge ${n.badgeClass}">${escapeHtml(n.badgeText)}</span>
          </div>
          <p class="alert-callout-text">${escapeHtml(n.message)}</p>
        </div>
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
  feather.replace();
}

function submitLoanRequest(bookId) {
  if (!currentUser || currentUser.tipo !== 'user') {
    showToast('Debes iniciar sesión como estudiante o docente para solicitar libros.', 'warning');
    return;
  }
  
  const books = LDB.get('libros');
  const book = books.find(b => b.id_libro == bookId);
  if (!book) {
    showToast('Libro no encontrado en el sistema.', 'danger');
    return;
  }
  
  if (book.copias_disponibles <= 0) {
    showToast(`No hay copias disponibles de "${book.titulo}".`, 'warning');
    return;
  }
  
  // Validation 1: No pending unpaid debts
  const adeudos = LDB.get('adeudos');
  const userLoans = LDB.get('prestamos').filter(l => l.id_usuario === currentUser.id);
  const hasPendingDebt = adeudos.some(a => a.estado !== 'Pagado' && userLoans.some(l => l.id_prestamo === a.id_prestamo));
  if (hasPendingDebt) {
    showToast(`ERROR: Tienes multas pendientes de pago. Acude a ventanilla para liquidar adeudos antes de solicitar nuevos préstamos.`, 'danger');
    return;
  }
  
  // Validation 2: Cannot request a book that is already pending
  const requests = LDB.get('solicitudes') || [];
  const alreadyRequested = requests.some(r => r.id_usuario === currentUser.id && r.id_libro == bookId && r.estado === 'Pendiente');
  if (alreadyRequested) {
    showToast(`Ya tienes una solicitud pendiente para "${book.titulo}".`, 'warning');
    return;
  }
  
  // Validation 3: Cannot request a book already in active possession
  const alreadyBorrowed = userLoans.some(l => l.id_libro == bookId && l.fecha_devolucion === null);
  if (alreadyBorrowed) {
    showToast(`Ya tienes una copia de "${book.titulo}" en préstamo activo.`, 'warning');
    return;
  }
  
  const today = new Date().toISOString().split('T')[0];
  LDB.insert('solicitudes', {
    id_usuario: currentUser.id,
    id_libro: book.id_libro,
    fecha_solicitud: today,
    estado: 'Pendiente'
  });
  
  closeModal('modal-ticket');
  showToast(`¡Solicitud enviada! Has solicitado "${book.titulo}". Se ha agregado una notificación: pendiente de ser entregado.`, 'success');
  
  loadUserCatalog();
  updateNotificationsUI();
}

function requestLoanInfo(bookId) {
  const books = LDB.get('libros');
  const book = books.find(b => b.id_libro == bookId);
  if (!book) return;
  
  const title = document.getElementById('modal-ticket-title');
  title.textContent = 'SOLICITUD DE PRÉSTAMO';
  
  const requests = LDB.get('solicitudes') || [];
  const isPending = currentUser && currentUser.tipo === 'user' && requests.some(r => r.id_usuario === currentUser.id && r.id_libro == bookId && r.estado === 'Pendiente');
  
  const userLoans = currentUser && currentUser.tipo === 'user' ? LDB.get('prestamos').filter(l => l.id_usuario === currentUser.id) : [];
  const isBorrowed = userLoans.some(l => l.id_libro == bookId && l.fecha_devolucion === null);

  const hasImage = book.imagen && book.imagen.trim() !== '';
  const imageHtml = hasImage ? `
    <div style="width: 120px; height: 170px; flex-shrink: 0; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 20px rgba(0,0,0,0.4); border: 1px solid var(--border-glass);">
      <img src="${escapeHtml(book.imagen)}" alt="${escapeHtml(book.titulo)}" style="width:100%; height:100%; object-fit:cover;" onerror="this.onerror=null; this.src='https://covers.openlibrary.org/b/isbn/9780307474728-L.jpg';">
    </div>
  ` : `
    <div style="width: 120px; height: 170px; flex-shrink: 0; border-radius: 12px; background: linear-gradient(135deg, var(--primary), var(--secondary)); display:flex; flex-direction:column; align-items:center; justify-content:center; padding:1rem; text-align:center; color:#fff; box-shadow: 0 8px 20px rgba(0,0,0,0.4);">
      <i data-feather="book-open" style="width:32px; height:32px; margin-bottom:0.5rem;"></i>
      <span style="font-size:0.75rem; font-weight:bold;">${escapeHtml(book.titulo)}</span>
    </div>
  `;

  let actionHtml = '';
  if (isPending) {
    actionHtml = `
      <div style="background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 1rem; text-align: left;">
        <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--warning); font-weight: 600; margin-bottom: 0.35rem;">
          <i data-feather="clock" style="width: 18px; height: 18px;"></i> Solicitud Pendiente de Entrega
        </div>
        <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5;">
          Ya has solicitado este título. Se encuentra <strong>pendiente de ser autorizado y entregado</strong> por el administrador de biblioteca. Cuando el administrador lo autorice, <strong>esta notificación se quitará automáticamente</strong> y tu préstamo quedará activo.
        </p>
      </div>
    `;
  } else if (isBorrowed) {
    actionHtml = `
      <div style="background: rgba(6, 182, 212, 0.12); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 12px; padding: 1rem; text-align: left;">
        <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--accent); font-weight: 600; margin-bottom: 0.35rem;">
          <i data-feather="check-circle" style="width: 18px; height: 18px;"></i> Préstamo activo en posesión
        </div>
        <p style="font-size: 0.85rem; color: var(--text-secondary);">
          Actualmente posees una copia en préstamo de este libro. Consulta la pestaña "Mis Préstamos" para verificar la fecha límite de entrega.
        </p>
      </div>
    `;
  } else if (book.copias_disponibles <= 0) {
    actionHtml = `
      <div style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 1rem; text-align: left;">
        <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--danger); font-weight: 600; margin-bottom: 0.35rem;">
          <i data-feather="alert-octagon" style="width: 18px; height: 18px;"></i> Sin copias disponibles
        </div>
        <p style="font-size: 0.85rem; color: var(--text-secondary);">
          En este momento todas las copias de este libro están prestadas. Espera a que un usuario lo devuelva.
        </p>
      </div>
    `;
  } else {
    actionHtml = `
      <div style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.2); padding: 1rem; border-radius: 12px; font-size: 0.85rem; text-align: left;">
        <h4 style="color: var(--primary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
          <i data-feather="info" style="width:16px; height:16px;"></i> Proceso de préstamo:
        </h4>
        <ul style="margin-left: 1.25rem; color: var(--text-secondary); line-height: 1.6;">
          <li>Al confirmar tu solicitud, se generará una <strong>notificación de pendiente de entrega</strong> en tu cuenta.</li>
          <li>Acude a la ventanilla con tu matrícula: <strong style="color: var(--accent); font-family: var(--font-mono);">${currentUser.matricula}</strong>.</li>
          <li>En cuanto el administrador autorice la entrega del libro, <strong>la notificación se retirará automáticamente</strong> y tu plazo de 7 días comenzará a contar.</li>
        </ul>
      </div>

      <button type="button" class="btn btn-primary" style="width: 100%; margin-top: 1rem; padding: 0.75rem;" onclick="submitLoanRequest(${book.id_libro})">
        <i data-feather="send"></i> Confirmar Solicitud de Préstamo
      </button>
    `;
  }

  const container = document.getElementById('ticket-container');
  container.innerHTML = `
    <div style="padding: 1rem; display: flex; flex-direction: column; gap: 1.25rem;">
      <div style="display: flex; gap: 1.25rem; align-items: center;">
        ${imageHtml}
        <div style="text-align: left; flex-grow: 1;">
          <span class="badge badge-info" style="margin-bottom:0.5rem; display:inline-block;">${escapeHtml(book.categoria)}</span>
          <h3 style="font-size: 1.2rem; color: var(--text-primary); margin-bottom: 0.25rem; line-height: 1.3;">${escapeHtml(book.titulo)}</h3>
          <p style="color: var(--text-secondary); font-size: 0.9rem;">Por <strong>${escapeHtml(book.autor)}</strong></p>
          <p style="color: var(--text-muted); font-size: 0.8rem; margin-top:0.25rem;">Editorial: ${escapeHtml(book.editorial)}</p>
          <div style="margin-top: 0.5rem; font-size: 0.85rem;">
            Estado: <span class="badge ${book.copias_disponibles > 0 ? 'badge-success' : 'badge-danger'}">${book.copias_disponibles > 0 ? `Disponible (${book.copias_disponibles} copias)` : 'Sin copias'}</span>
          </div>
        </div>
      </div>
      
      ${actionHtml}
    </div>
  `;
  feather.replace();
  openModal('modal-ticket');
}

function filterCatalogGrid() {
  const q = document.getElementById('search-catalog-input').value.toLowerCase();
  const cat = document.getElementById('filter-catalog-category').value;
  const books = LDB.get('libros');
  
  const filtered = books.filter(b => {
    const matchesQuery = b.titulo.toLowerCase().includes(q) || b.autor.toLowerCase().includes(q) || b.id_libro.toString() === q;
    const matchesCategory = cat === '' || b.categoria === cat;
    return matchesQuery && matchesCategory;
  });
  
  renderBooksGrid(filtered);
}

// --- USER: MY LOANS ---

function loadUserLoans() {
  const loans = LDB.get('prestamos');
  const books = LDB.get('libros');
  
  // Filter loans belonging to current logged in student/docent
  const myLoans = loans.filter(l => l.id_usuario === currentUser.id);
  const tableBody = document.getElementById('table-user-loans');
  const today = new Date().toISOString().split('T')[0];

  // Update pill count if present
  const countPill = document.getElementById('user-loans-count-pill');
  if (countPill) {
    const activeCount = myLoans.filter(l => l.fecha_devolucion === null).length;
    countPill.textContent = `${activeCount} activo${activeCount === 1 ? '' : 's'}`;
  }

  // Render alert banners for imminent deadlines and pending requests
  renderUserLoansAlerts();
  
  tableBody.innerHTML = '';
  if (myLoans.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color:var(--text-muted); padding:2rem;">No posees ningún préstamo activo o histórico.</td></tr>';
    return;
  }
  
  [...myLoans].reverse().forEach(l => {
    const bk = books.find(b => b.id_libro == l.id_libro);
    
    let stateBadge = '';
    const limitDate = new Date(l.fecha_limite + 'T00:00:00');
    const currDate = new Date(today + 'T00:00:00');
    const diffDays = Math.round((limitDate - currDate) / (1000 * 60 * 60 * 24));

    let deadlineDisplay = l.fecha_limite;

    if (l.fecha_devolucion) {
      stateBadge = `<span class="badge badge-success"><i data-feather="check" style="width:12px; height:12px; vertical-align:middle; margin-right:3px;"></i> Devuelto</span>`;
    } else if (diffDays < 0) {
      const delayDays = Math.abs(diffDays);
      stateBadge = `<span class="badge badge-danger"><i data-feather="alert-octagon" style="width:12px; height:12px; vertical-align:middle; margin-right:3px;"></i> Vencido (${delayDays}d)</span>`;
      deadlineDisplay = `<span style="color:var(--danger); font-weight:bold;">${l.fecha_limite}</span> <span class="badge badge-danger" style="font-size:0.68rem; margin-left:4px;">-${delayDays} días</span>`;
    } else if (diffDays === 0) {
      stateBadge = `<span class="badge badge-danger"><i data-feather="alert-triangle" style="width:12px; height:12px; vertical-align:middle; margin-right:3px;"></i> ¡Vence hoy!</span>`;
      deadlineDisplay = `<span style="color:var(--danger); font-weight:bold;">${l.fecha_limite}</span> <span class="badge badge-danger" style="font-size:0.68rem; margin-left:4px;">¡Hoy!</span>`;
    } else if (diffDays === 1) {
      stateBadge = `<span class="badge badge-danger"><i data-feather="alert-octagon" style="width:12px; height:12px; vertical-align:middle; margin-right:3px;"></i> ¡Vence mañana!</span>`;
      deadlineDisplay = `<span style="color:var(--danger); font-weight:bold;">${l.fecha_limite}</span> <span class="badge badge-danger" style="font-size:0.68rem; margin-left:4px;">Falta 1 día</span>`;
    } else if (diffDays === 2) {
      stateBadge = `<span class="badge badge-warning"><i data-feather="alert-triangle" style="width:12px; height:12px; vertical-align:middle; margin-right:3px;"></i> Quedan 2 días</span>`;
      deadlineDisplay = `<span style="color:var(--warning); font-weight:bold;">${l.fecha_limite}</span> <span class="badge badge-warning" style="font-size:0.68rem; margin-left:4px;">2 días</span>`;
    } else if (diffDays === 3) {
      stateBadge = `<span class="badge badge-warning"><i data-feather="clock" style="width:12px; height:12px; vertical-align:middle; margin-right:3px;"></i> Quedan 3 días</span>`;
      deadlineDisplay = `<span style="color:var(--warning); font-weight:bold;">${l.fecha_limite}</span> <span class="badge badge-warning" style="font-size:0.68rem; margin-left:4px;">3 días</span>`;
    } else {
      stateBadge = `<span class="badge badge-info"><i data-feather="clock" style="width:12px; height:12px; vertical-align:middle; margin-right:3px;"></i> Activo (${diffDays}d)</span>`;
      deadlineDisplay = `<span>${l.fecha_limite}</span>`;
    }
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${bk ? escapeHtml(bk.titulo) : 'ID: ' + l.id_libro}</strong><br><span style="font-size:0.75rem; color:var(--text-muted);">Por ${bk ? escapeHtml(bk.autor) : 'N/A'}</span></td>
      <td>${l.fecha_prestamo}</td>
      <td>${deadlineDisplay}</td>
      <td>${l.fecha_devolucion ? `<span style="color:var(--success); font-weight:500;">${l.fecha_devolucion}</span>` : '<span style="color:var(--text-muted);">Activo en posesión</span>'}</td>
      <td>${stateBadge}</td>
    `;
    tableBody.appendChild(tr);
  });
  feather.replace();
}

// --- USER: MY DEBTS & ONLINE PAYMENTS ---

function loadUserDebts() {
  const loans = LDB.get('prestamos');
  const adeudos = LDB.get('adeudos');
  const books = LDB.get('libros');
  
  const myLoansIds = loans.filter(l => l.id_usuario === currentUser.id).map(l => l.id_prestamo);
  const myAdeudos = adeudos.filter(a => myLoansIds.includes(a.id_prestamo));
  const tableBody = document.getElementById('table-user-debts');
  
  tableBody.innerHTML = '';
  document.getElementById('user-pay-panel').style.display = 'none';
  
  if (myAdeudos.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color:var(--text-muted); padding:2rem;">¡Excelente! No tienes multas ni adeudos de biblioteca.</td></tr>';
    return;
  }
  
  myAdeudos.forEach(a => {
    const loan = loans.find(l => l.id_prestamo == a.id_prestamo);
    const bk = loan ? books.find(b => b.id_libro == loan.id_libro) : null;
    
    let stateBadge = '';
    let actionBtn = '';
    
    if (a.estado === 'Pagado') {
      stateBadge = '<span class="badge badge-success">Pagado</span>';
      actionBtn = `<span style="font-size:0.8rem; color:var(--success); font-weight:600;">Completado</span>`;
    } else if (a.estado === 'Validacion_Pending' || a.estado === 'Validacion_Pendiente') {
      stateBadge = '<span class="badge badge-info">Validación Pendiente</span>';
      actionBtn = `<span style="font-size:0.75rem; color:var(--text-muted);">Esperando aprobación</span>`;
    } else {
      stateBadge = '<span class="badge badge-danger">Pendiente</span>';
      actionBtn = `<button class="btn btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="showTransferPayForm(${a.id_adeudo}, ${a.monto_total})"><i data-feather="credit-card" style="width:12px; height:12px;"></i> Pagar Multa</button>`;
    }
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${bk ? bk.titulo : 'N/A'}</strong><br><span style="font-size:0.75rem; color:var(--text-muted);">Retraso registrado</span></td>
      <td>${a.dias_retraso} días</td>
      <td><strong style="color:var(--danger);">$${a.monto_total}.00</strong></td>
      <td>${stateBadge}</td>
      <td>${actionBtn}</td>
    `;
    tableBody.appendChild(tr);
  });
  feather.replace();
}

function showTransferPayForm(adeudoId, monto) {
  document.getElementById('user-pay-panel').style.display = 'block';
  document.getElementById('pay-adeudo-id').value = adeudoId;
  document.getElementById('pay-monto').value = `$${monto}.00 MXN`;
  document.getElementById('transfer-ref-tag').textContent = `MULTA-${adeudoId}-${currentUser.matricula}`;
  
  // Clear uploader state
  uploadedFileSimulated = null;
  document.getElementById('file-upload-preview').style.display = 'none';
  document.getElementById('file-upload-zone').style.borderColor = 'var(--border-glass)';
  
  showToast('Formulario de pago listo en el panel lateral.', 'info');
}

function triggerFileSelect() {
  document.getElementById('pay-file-input').click();
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  uploadedFileSimulated = file;
  
  const preview = document.getElementById('file-upload-preview');
  preview.innerHTML = `
    <div class="file-preview">
      <i data-feather="file" style="color:var(--accent); width:24px; height:24px;"></i>
      <div class="file-preview-info">
        <span>${file.name}</span>
        <small>${(file.size / 1024).toFixed(1)} KB</small>
      </div>
      <button type="button" class="file-preview-remove" onclick="removeUploadedFile()"><i data-feather="trash-2"></i></button>
    </div>
  `;
  preview.style.display = 'block';
  document.getElementById('file-upload-zone').style.borderColor = 'var(--success)';
  feather.replace();
}

function removeUploadedFile() {
  uploadedFileSimulated = null;
  document.getElementById('pay-file-input').value = '';
  document.getElementById('file-upload-preview').style.display = 'none';
  document.getElementById('file-upload-zone').style.borderColor = 'var(--border-glass)';
  showToast('Archivo removido.', 'info');
}

// User submits bank transfer payment details to wait for manual validation
function handlePayTransfer(event) {
  event.preventDefault();
  const adeudoId = document.getElementById('pay-adeudo-id').value;
  const ref = document.getElementById('pay-referencia').value.trim();
  
  const adeudos = LDB.get('adeudos');
  const adeudo = adeudos.find(a => a.id_adeudo == adeudoId);
  
  if (!adeudo) return;
  if (!uploadedFileSimulated) {
    showToast('Por favor, adjunta tu recibo de transferencia para continuar.', 'warning');
    return;
  }
  
  const today = new Date().toISOString().split('T')[0];
  
  // Insert payment record with validado = 0 (Waiting validation)
  LDB.insert('pagos', {
    id_adeudo: parseInt(adeudoId),
    monto: adeudo.monto_total,
    fecha_pago: today,
    tipo_pago: 'Transferencia',
    validado: 0,
    id_admin: null // Assigned when administrative validates it
  });
  
  // Change Adeudo status to 'Validacion_Pendiente'
  LDB.update('adeudos', 'id_adeudo', adeudoId, { estado: 'Validacion_Pendiente' });
  
  showToast('Pago notificado correctamente. En espera de aprobación por el personal.', 'success');
  
  document.getElementById('form-pay-transfer').reset();
  removeUploadedFile();
  loadUserDebts();
}

// --- USER: MY RECEIPTS ---

function loadUserReceipts() {
  const loans = LDB.get('prestamos');
  const adeudos = LDB.get('adeudos');
  const pagos = LDB.get('pagos');
  const receipts = LDB.get('comprobantes');
  
  const myLoansIds = loans.filter(l => l.id_usuario === currentUser.id).map(l => l.id_prestamo);
  const myAdeudosIds = adeudos.filter(a => myLoansIds.includes(a.id_prestamo)).map(a => a.id_adeudo);
  const myPagosIds = pagos.filter(p => myAdeudosIds.includes(p.id_adeudo) && p.validado === 1).map(p => p.id_pago);
  
  const myReceipts = receipts.filter(r => myPagosIds.includes(r.id_pago));
  const tableBody = document.getElementById('table-user-receipts');
  
  tableBody.innerHTML = '';
  if (myReceipts.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color:var(--text-muted); padding:2rem;">No tienes comprobantes emitidos todavía.</td></tr>';
    return;
  }
  
  myReceipts.forEach(r => {
    const payment = pagos.find(p => p.id_pago == r.id_pago);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="badge badge-info" style="font-family:var(--font-mono);">${r.folio}</span></td>
      <td>${r.fecha}</td>
      <td><strong>$${payment ? payment.monto.toFixed(2) : '0.00'} MXN</strong></td>
      <td><span class="badge badge-success">${payment ? payment.tipo_pago : 'N/A'}</span></td>
      <td>
        <button class="btn btn-secondary" style="padding:0.2rem 0.5rem; font-size:0.75rem;" onclick="viewPaymentReceipt(${payment.id_adeudo})">
          <i data-feather="download" style="width:12px; height:12px;"></i> Descargar Ticket
        </button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
  feather.replace();
}

// --- MODAL UTILS ---

function openModal(modalId) {
  document.getElementById(modalId).style.display = 'flex';
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

// --- SQL TERMINAL INTERPRETER ENGINE ---

function focusTerminalInput() {
  document.getElementById('sql-terminal-input').focus();
}

function handleTerminalCommand(event) {
  if (event.key === 'Enter') {
    const inputEl = document.getElementById('sql-terminal-input');
    const command = inputEl.value.trim();
    inputEl.value = '';
    
    if (command === '') return;
    
    executeSQLConsoleCommand(command);
  }
}

// Global hook to execute SQL statements from dashboard actions
function executeSQLQuery(query) {
  showView('admin-db');
  document.getElementById('sql-terminal-input').value = query;
  focusTerminalInput();
  
  setTimeout(() => {
    executeSQLConsoleCommand(query);
  }, 200);
}

function clearSQLResults() {
  document.getElementById('sql-results-panel').style.display = 'none';
  document.getElementById('sql-results-table-container').innerHTML = '';
}

// Mini SQL Parser Engine in JavaScript
function executeSQLConsoleCommand(cmdStr) {
  const terminalBody = document.getElementById('sql-terminal-body');
  
  // Echo query
  const echoLine = document.createElement('div');
  echoLine.className = 'terminal-line';
  echoLine.innerHTML = `<span class="terminal-prompt">library.db&gt;</span> <span style="color:#fff;">${cmdStr}</span>`;
  terminalBody.appendChild(echoLine);
  
  // Parse command (case insensitive)
  const cleanCmd = cmdStr.trim().replace(/;$/, '');
  const tokens = cleanCmd.split(/\s+/);
  const action = tokens[0].toUpperCase();
  
  const printLine = (text, type = '') => {
    const line = document.createElement('div');
    line.className = `terminal-line ${type}`;
    line.textContent = text;
    terminalBody.appendChild(line);
    terminalBody.scrollTop = terminalBody.scrollHeight;
  };
  
  if (action === 'HELP') {
    printLine('Comandos disponibles:');
    printLine('  HELP                       Muestra esta ayuda');
    printLine('  CLEAR                      Limpia la terminal');
    printLine('  RESET                      Restablece la base de datos a los valores de fábrica');
    printLine('  SELECT * FROM [tabla]      Lista los registros de una tabla');
    printLine('  SELECT [col] FROM [tabla]  Lista columnas específicas');
    printLine('  DELETE FROM [tabla]        Borra registros de la base de datos');
    printLine('Tablas del esquema: usuarios, libros, prestamos, adeudos, pagos, comprobantes.');
    return;
  }
  
  if (action === 'RESET') {
    localStorage.clear();
    seedDatabase();
    updateTableCounts();
    if (window.DERSchema && typeof window.DERSchema.draw === 'function') {
      window.DERSchema.draw();
    }
    printLine('Base de datos restablecida a los valores iniciales con copias de libros.');
    showToast('Base de datos restablecida.', 'success');
    return;
  }
  
  if (action === 'CLEAR') {
    terminalBody.innerHTML = '';
    clearSQLResults();
    return;
  }
  
  // SELECT Query handler
  if (action === 'SELECT') {
    const selectMatch = cleanCmd.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?$/i);
    if (!selectMatch) {
      printLine('Error sintáctico: Estructura SELECT incorrecta. Ej: SELECT * FROM libros;', 'error');
      return;
    }
    
    const cols = selectMatch[1].trim();
    const table = selectMatch[2].trim().toLowerCase();
    const whereClause = selectMatch[3] ? selectMatch[3].trim() : null;
    
    // Check if table exists
    const validTables = ['usuarios', 'libros', 'prestamos', 'adeudos', 'pagos', 'comprobantes', 'administradores'];
    if (!validTables.includes(table)) {
      printLine(`Error de motor: La tabla '${table}' no existe en el esquema.`, 'error');
      return;
    }
    
    let list = LDB.get(table);
    
    // Process WHERE condition (extremely basic comparison e.g., id = 1 or col = 'val')
    if (whereClause) {
      const whereMatch = whereClause.match(/(\w+)\s*(=|!=|LIKE)\s*(.+)$/i);
      if (whereMatch) {
        const colName = whereMatch[1].trim();
        const operator = whereMatch[2].toUpperCase();
        let value = whereMatch[3].trim().replace(/^'|'$/g, '').replace(/^"|"$/g, '');
        
        list = list.filter(item => {
          const itemVal = item[colName];
          if (itemVal === undefined) return false;
          
          if (operator === '=') return itemVal == value;
          if (operator === '!=') return itemVal != value;
          if (operator === 'LIKE') return itemVal.toString().toLowerCase().includes(value.toLowerCase());
          return false;
        });
      } else {
        printLine(`Error sintáctico en cláusula WHERE: '${whereClause}'`, 'error');
        return;
      }
    }
    
    if (list.length === 0) {
      printLine('Query exitoso: 0 registros encontrados.');
      clearSQLResults();
      return;
    }
    
    // Process selected columns
    let colKeys = Object.keys(list[0]);
    if (cols !== '*') {
      const requestedCols = cols.split(',').map(c => c.trim());
      colKeys = colKeys.filter(k => requestedCols.includes(k));
    }
    
    // Format output in dashboard results panel
    const resultsPanel = document.getElementById('sql-results-panel');
    const tableContainer = document.getElementById('sql-results-table-container');
    
    resultsPanel.style.display = 'block';
    
    let tableHtml = '<table class="sql-results-table"><thead><tr>';
    colKeys.forEach(k => {
      tableHtml += `<th>${k}</th>`;
    });
    tableHtml += '</tr></thead><tbody>';
    
    list.forEach(row => {
      tableHtml += '<tr>';
      colKeys.forEach(k => {
        tableHtml += `<td>${row[k] !== null ? row[k] : 'NULL'}</td>`;
      });
      tableHtml += '</tr>';
    });
    tableHtml += '</tbody></table>';
    
    tableContainer.innerHTML = tableHtml;
    
    printLine(`Query exitoso: ${list.length} registros encontrados. Resultados mostrados abajo.`);
    return;
  }
  
  // DELETE Query handler
  if (action === 'DELETE') {
    const deleteMatch = cleanCmd.match(/DELETE\s+FROM\s+(\w+)\s+WHERE\s+(\w+)\s*=\s*(.+)$/i);
    if (!deleteMatch) {
      printLine('Error sintáctico: DELETE requiere cláusula WHERE exacta. Ej: DELETE FROM libros WHERE id_libro = 5;', 'error');
      return;
    }
    
    const table = deleteMatch[1].trim().toLowerCase();
    const key = deleteMatch[2].trim();
    const val = deleteMatch[3].trim().replace(/^'|'$/g, '').replace(/^"|"$/g, '');
    
    const validTables = ['usuarios', 'libros', 'prestamos', 'adeudos', 'pagos', 'comprobantes'];
    if (!validTables.includes(table)) {
      printLine(`Error: La tabla '${table}' no existe.`, 'error');
      return;
    }
    
    const success = LDB.delete(table, key, val);
    if (success) {
      printLine(`DELETE exitoso: Registros de la tabla '${table}' actualizados.`);
      showToast('Registros borrados mediante consola SQL.', 'warning');
    } else {
      printLine('0 registros borrados: Condición no coincide.');
    }
    return;
  }
  
  printLine(`Comando no reconocido: '${action}'. Escribe HELP para ayuda.`, 'error');
}

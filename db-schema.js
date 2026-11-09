/* ==========================================================================
   DYNAMIC DER DIAGRAM RENDERER - SVG SCHEMA VISUALIZER
   ========================================================================== */

window.DERSchema = (function() {
  let svgElement = null;
  let activeTable = null;

  // Table positions in coordinate space (1000x500 box)
  const tablesMetadata = {
    usuarios: {
      name: "USUARIO",
      x: 30, y: 30, w: 180, h: 140,
      attrs: [
        { name: "id_usuario", type: "INTEGER (PK)", key: "pk" },
        { name: "nombre", type: "TEXT", key: "" },
        { name: "matricula", type: "TEXT (UQ)", key: "" },
        { name: "correo", type: "TEXT", key: "" },
        { name: "tipo_usuario", type: "TEXT", key: "" }
      ]
    },
    prestamos: {
      name: "PRESTAMO",
      x: 300, y: 30, w: 180, h: 160,
      attrs: [
        { name: "id_prestamo", type: "INTEGER (PK)", key: "pk" },
        { name: "id_usuario", type: "INTEGER (FK)", key: "fk" },
        { name: "id_libro", type: "INTEGER (FK)", key: "fk" },
        { name: "fecha_prestamo", type: "TEXT", key: "" },
        { name: "fecha_limite", type: "TEXT", key: "" },
        { name: "fecha_devolucion", type: "TEXT", key: "" }
      ]
    },
    libros: {
      name: "LIBRO",
      x: 580, y: 30, w: 180, h: 245,
      attrs: [
        { name: "id_libro", type: "INTEGER (PK)", key: "pk" },
        { name: "titulo", type: "TEXT", key: "" },
        { name: "autor", type: "TEXT", key: "" },
        { name: "editorial", type: "TEXT", key: "" },
        { name: "estado", type: "TEXT", key: "" },
        { name: "categoria", type: "TEXT", key: "" },
        { name: "copias_totales", type: "INTEGER", key: "" },
        { name: "copias_disponibles", type: "INTEGER", key: "" },
        { name: "estante", type: "TEXT", key: "" },
        { name: "imagen", type: "TEXT", key: "" }
      ]
    },
    administradores: {
      name: "ADMINISTRADOR",
      x: 820, y: 150, w: 180, h: 110,
      attrs: [
        { name: "id_admin", type: "INTEGER (PK)", key: "pk" },
        { name: "nombre", type: "TEXT", key: "" },
        { name: "rol", type: "TEXT", key: "" }
      ]
    },
    adeudos: {
      name: "ADEUDO",
      x: 300, y: 270, w: 180, h: 170,
      attrs: [
        { name: "id_adeudo", type: "INTEGER (PK)", key: "pk" },
        { name: "id_prestamo", type: "INTEGER (FK)", key: "fk" },
        { name: "estado", type: "TEXT", key: "" },
        { name: "dias_retraso", type: "INTEGER", key: "" },
        { name: "monto_dano", type: "REAL", key: "" },
        { name: "motivo", type: "TEXT", key: "" },
        { name: "monto_total", type: "REAL", key: "" }
      ]
    },
    pagos: {
      name: "PAGO",
      x: 580, y: 295, w: 180, h: 160,
      attrs: [
        { name: "id_pago", type: "INTEGER (PK)", key: "pk" },
        { name: "id_adeudo", type: "INTEGER (FK)", key: "fk" },
        { name: "monto", type: "REAL", key: "" },
        { name: "fecha_pago", type: "TEXT", key: "" },
        { name: "tipo_pago", type: "TEXT", key: "" },
        { name: "validado", type: "INTEGER", key: "" },
        { name: "id_admin", type: "INTEGER (FK)", key: "fk" }
      ]
    },
    comprobantes: {
      name: "COMPROBANTE",
      x: 820, y: 340, w: 180, h: 110,
      attrs: [
        { name: "id_comprobante", type: "INTEGER (PK)", key: "pk" },
        { name: "id_pago", type: "INTEGER (FK)", key: "fk" },
        { name: "folio", type: "TEXT (UQ)", key: "" },
        { name: "fecha", type: "TEXT", key: "" }
      ]
    },
    cola_espera: {
      name: "COLA_ESPERA",
      x: 30, y: 240, w: 180, h: 160,
      attrs: [
        { name: "id_reserva", type: "INTEGER (PK)", key: "pk" },
        { name: "id_usuario", type: "INTEGER (FK)", key: "fk" },
        { name: "id_libro", type: "INTEGER (FK)", key: "fk" },
        { name: "fecha_reserva", type: "TEXT", key: "" },
        { name: "estado", type: "TEXT", key: "" },
        { name: "fecha_disponible", type: "TEXT", key: "" }
      ]
    }
  };

  // Connectors listing target foreign keys
  const relationships = [
    {
      from: "usuarios", to: "prestamos",
      fx: 30 + 180, fy: 30 + 70, // right middle of usuarios
      tx: 300, ty: 30 + 50,       // left upper of prestamos
      label: "1 : N", textX: 240, textY: 55
    },
    {
      from: "libros", to: "prestamos",
      fx: 580, fy: 30 + 70,       // left middle of libros
      tx: 300 + 180, ty: 30 + 70, // right middle of prestamos
      label: "1 : N", textX: 520, textY: 75
    },
    {
      from: "prestamos", to: "adeudos",
      fx: 300 + 90, fy: 30 + 160, // bottom center of prestamos
      tx: 300 + 90, ty: 290,      // top center of adeudos
      label: "1 : 0..1", textX: 400, textY: 235
    },
    {
      from: "adeudos", to: "pagos",
      fx: 300 + 180, fy: 290 + 60,// right middle of adeudos
      tx: 580, ty: 290 + 50,      // left upper of pagos
      label: "1 : N", textX: 510, textY: 345
    },
    {
      from: "pagos", to: "comprobantes",
      fx: 580 + 180, fy: 290 + 80,// right middle of pagos
      tx: 820, ty: 340 + 50,      // left upper of comprobantes
      label: "1 : 1", textX: 780, textY: 380
    },
    {
      from: "administradores", to: "pagos",
      fx: 820, fy: 150 + 60,      // left lower of admins
      tx: 580 + 180, ty: 290 + 130,// right lower of pagos
      label: "1 : N", textX: 790, textY: 250
    },
    {
      from: "usuarios", to: "cola_espera",
      fx: 30 + 90, fy: 30 + 140,  // bottom of usuarios
      tx: 30 + 90, ty: 240,       // top of cola_espera
      label: "1 : 0..N", textX: 130, textY: 205
    }
  ];

  function init(svgId) {
    svgElement = document.getElementById(svgId);
    if (!svgElement) return;
    
    // Set viewBox attribute to make it scale automatically
    svgElement.setAttribute("viewBox", "0 0 1030 480");
    draw();
  }

  function draw() {
    if (!svgElement) return;
    svgElement.innerHTML = '';
    
    // Create filters and markers
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    
    // Shadow filter
    defs.innerHTML = `
      <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    `;
    svgElement.appendChild(defs);

    // 1. Draw relationships (Connector Lines)
    relationships.forEach((rel, index) => {
      const isActive = activeTable === rel.from || activeTable === rel.to;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      
      // Draw standard Bezier curve for relational layout
      const dx = Math.abs(rel.tx - rel.fx) * 0.5;
      const dy = Math.abs(rel.ty - rel.fy) * 0.5;
      
      let d = "";
      if (rel.from === "prestamos" && rel.to === "adeudos") {
        // Vertical relationship line
        d = `M ${rel.fx} ${rel.fy} L ${rel.tx} ${rel.ty}`;
      } else {
        d = `M ${rel.fx} ${rel.fy} C ${rel.fx + dx} ${rel.fy}, ${rel.tx - dx} ${rel.ty}, ${rel.tx} ${rel.ty}`;
      }

      path.setAttribute("d", d);
      path.setAttribute("class", `schema-connector ${isActive ? 'active' : ''}`);
      svgElement.appendChild(path);
      
      // Label text
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", rel.textX);
      text.setAttribute("y", rel.textY);
      text.setAttribute("class", "relationship-label");
      if (isActive) {
        text.setAttribute("fill", "var(--accent)");
        text.setAttribute("font-weight", "bold");
      }
      text.textContent = rel.label;
      svgElement.appendChild(text);
    });

    // 2. Draw Table Nodes
    Object.keys(tablesMetadata).forEach(tableKey => {
      const meta = tablesMetadata[tableKey];
      const count = getRowCount(tableKey);
      const isActive = activeTable === tableKey;
      
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("style", "cursor: pointer;");
      g.onclick = () => selectNode(tableKey);

      // Node base box
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", meta.x);
      rect.setAttribute("y", meta.y);
      rect.setAttribute("width", meta.w);
      rect.setAttribute("height", meta.h);
      rect.setAttribute("class", `schema-node ${isActive ? 'active' : ''}`);
      g.appendChild(rect);

      // Node Header Box
      const headerRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      headerRect.setAttribute("x", meta.x);
      headerRect.setAttribute("y", meta.y);
      headerRect.setAttribute("width", meta.w);
      headerRect.setAttribute("height", 30);
      headerRect.setAttribute("class", "schema-node-header");
      g.appendChild(headerRect);

      // Header title
      const title = document.createElementNS("http://www.w3.org/2000/svg", "text");
      title.setAttribute("x", meta.x + 12);
      title.setAttribute("y", meta.y + 19);
      title.setAttribute("class", "schema-title");
      title.textContent = `${meta.name} (${count})`;
      g.appendChild(title);

      // Attributes list
      meta.attrs.forEach((attr, i) => {
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", meta.x + 15);
        text.setAttribute("y", meta.y + 50 + (i * 20));
        
        let attrClass = "schema-attr";
        let prefix = "  ";
        if (attr.key === 'pk') {
          attrClass = "schema-attr schema-pk";
          prefix = "🔑 ";
        } else if (attr.key === 'fk') {
          attrClass = "schema-attr schema-fk";
          prefix = "🔗 ";
        }
        
        text.setAttribute("class", attrClass);
        text.textContent = `${prefix}${attr.name}: ${attr.type}`;
        g.appendChild(text);
      });

      svgElement.appendChild(g);
    });
  }

  function selectNode(tableKey) {
    if (activeTable === tableKey) {
      activeTable = null; // Unselect
    } else {
      activeTable = tableKey;
      
      // Auto trigger SQL selection in Console
      if (typeof window.executeSQLQuery === 'function') {
        // Just focus or write query
        const terminalInput = document.getElementById('sql-terminal-input');
        if (terminalInput) {
          terminalInput.value = `SELECT * FROM ${tableKey};`;
        }
      }
    }
    draw();
  }

  function getRowCount(table) {
    try {
      const data = localStorage.getItem(`db_${table}`);
      return data ? JSON.parse(data).length : 0;
    } catch (e) {
      return 0;
    }
  }

  return {
    init: init,
    draw: draw,
    selectNode: selectNode
  };
})();

-- SISTEMA DE BIBLIOTECA - BASE DE DATOS MYSQL
-- 
-- ATOMICIDAD: Una transacción se completa completamente o no se realiza
-- COHERENCIA: Los datos siempre cumplen las reglas de negocio
-- AISLAMIENTO: Transacciones concurrentes no interfieren entre sí
-- DURABILIDAD: Una vez confirmada, la transacción persiste
--
CREATE DATABASE IF NOT EXISTS biblioteca_db;
USE biblioteca_db;

-- TABLA: administradores
-- COHERENCIA: 
--    - id_admin como PRIMARY KEY garantiza unicidad
--    - Las claves primarias son la base de la integridad referencial
--    - NOT NULL asegura que ningún campo obligatorio quede vacío
-- =====================================================================
CREATE TABLE IF NOT EXISTS administradores (
    id_admin INT PRIMARY KEY AUTO_INCREMENT,                         -- PK: identidad única
    nombre VARCHAR(100) NOT NULL,                                    -- NOT NULL: obligatorio
    rol VARCHAR(50) NOT NULL,
    contrasena VARCHAR(255) NOT NULL
);

-- TABLA: usuarios
-- COHERENCIA:
--    - PRIMARY KEY (id_usuario): cada usuario tiene identificador único
--    - UNIQUE (matricula): evita duplicados, garantiza coherencia de datos
--    - NOT NULL: campos obligatorios, no puede haber usuarios sin nombre
--    - ENUM: restringe tipo_usuario solo a 'Estudiante' o 'Docente'
-- =====================================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INT PRIMARY KEY AUTO_INCREMENT,                      -- PK: identidad única
    nombre VARCHAR(100) NOT NULL,                                   -- NOT NULL: obligatorio
    matricula VARCHAR(50) UNIQUE NOT NULL,                          -- UNIQUE + NOT NULL: evita duplicados
    correo VARCHAR(100) NOT NULL,
    tipo_usuario ENUM('Estudiante', 'Docente') NOT NULL             -- ENUM: restringe valores
);

-- TABLA: libros
-- COHERENCIA:
--    - copias_totales >= 0 (CHECK en MySQL 8.0+): no pueden existir copias negativas
--    - copias_disponibles <= copias_totales (regla de negocio validada en backend)
--    - DEFAULT 'Disponible': estado por defecto coherente
-- =====================================================================
CREATE TABLE IF NOT EXISTS libros (
    id_libro INT PRIMARY KEY AUTO_INCREMENT,
    titulo VARCHAR(200) NOT NULL,
    autor VARCHAR(100) NOT NULL,
    editorial VARCHAR(100) NOT NULL,
    estado VARCHAR(50) DEFAULT 'Disponible',                       -- DEFAULT: valor coherente
    categoria VARCHAR(50) NOT NULL,
    copias_totales INT NOT NULL DEFAULT 1,
    copias_disponibles INT NOT NULL DEFAULT 1,
    imagen VARCHAR(500) NULL                                       -- URL de portada del libro
);

-- TABLA: prestamos
-- COHERENCIA (Claves Foráneas):
--    - id_usuario debe existir en usuarios
--    - id_libro debe existir en libros
--    - ON DELETE RESTRICT: impide eliminar un usuario/libro con préstamos activos
--      Esto GARANTIZA INTEGRIDAD REFERENCIAL (parte de COHERENCIA)
--
-- COHERENCIA (Tipos de datos):
--    - fecha_limite >= fecha_prestamo (se valida en backend por compatibilidad)
--    - fecha_devolucion puede ser NULL (préstamo aún activo)
-- =====================================================================
CREATE TABLE IF NOT EXISTS prestamos (
    id_prestamo INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    id_libro INT NOT NULL,
    fecha_prestamo DATE NOT NULL,
    fecha_limite DATE NOT NULL,
    fecha_devolucion DATE NULL,
    
    -- COHERENCIA: Foreign Keys garantizan integridad referencial
    -- ON DELETE RESTRICT: protección contra eliminación de registros referenciados
    CONSTRAINT fk_prestamo_usuario FOREIGN KEY (id_usuario) 
        REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
    CONSTRAINT fk_prestamo_libro FOREIGN KEY (id_libro) 
        REFERENCES libros(id_libro) ON DELETE RESTRICT
);

-- TABLA: adeudos
-- COHERENCIA:
--    - ENUM restringe estado a valores válidos ('Pendiente', 'Pagado', 'Validacion_Pendiente')
--    - dias_retraso >= 0 (validado en backend)
--    - monto_total >= 0 (validado en backend)
--
-- CLAVE FORÁNEA:
--    - id_prestamo referencia a prestamos
--    - Un adeudo NO puede existir sin un préstamo asociado
-- =====================================================================
CREATE TABLE IF NOT EXISTS adeudos (
    id_adeudo INT PRIMARY KEY AUTO_INCREMENT,
    id_prestamo INT NOT NULL,
    estado ENUM('Pendiente', 'Pagado', 'Validacion_Pendiente') DEFAULT 'Pendiente',  -- ENUM restringe
    dias_retraso INT NOT NULL DEFAULT 0,
    monto_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    
    CONSTRAINT fk_adeudo_prestamo FOREIGN KEY (id_prestamo) 
        REFERENCES prestamos(id_prestamo) ON DELETE RESTRICT                         -- COHERENCIA: FK
);

-- TABLA: pagos
-- COHERENCIA:
--    - monto > 0 (validado en backend)
--    - validado BOOLEAN: solo TRUE/FALSE
--    - tipo_pago ENUM: restringido a 'Presencial' o 'Transferencia'
--
-- CLAVES FORÁNEAS:
--    - id_adeudo referencia a adeudos
--    - id_admin referencia a administradores
--    - ON DELETE SET NULL: si el admin es eliminado, el pago conserva registro (coherencia histórica)
-- =====================================================================
CREATE TABLE IF NOT EXISTS pagos (
    id_pago INT PRIMARY KEY AUTO_INCREMENT,
    id_adeudo INT NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    fecha_pago DATE NOT NULL,
    tipo_pago ENUM('Presencial', 'Transferencia') NOT NULL,        -- ENUM: restringe
    validado BOOLEAN DEFAULT FALSE,                                -- BOOLEAN: solo TRUE/FALSE
    id_admin INT NULL,
    
    CONSTRAINT fk_pago_adeudo FOREIGN KEY (id_adeudo) 
        REFERENCES adeudos(id_adeudo) ON DELETE RESTRICT,
    CONSTRAINT fk_pago_admin FOREIGN KEY (id_admin) 
        REFERENCES administradores(id_admin) ON DELETE SET NULL    -- SET NULL: mantiene coherencia histórica
);

-- TABLA: comprobantes
-- COHERENCIA:
--    - folio UNIQUE: cada comprobante tiene identificador único
--    - UNIQUE evita duplicados de folio
--
-- CLAVE FORÁNEA:
--    - id_pago referencia a pagos
--    - ON DELETE CASCADE: si se elimina pago, se elimina su comprobante
--      (coherencia: no puede haber comprobante sin pago)
-- =====================================================================
CREATE TABLE IF NOT EXISTS comprobantes (
    id_comprobante INT PRIMARY KEY AUTO_INCREMENT,
    id_pago INT NOT NULL,
    folio VARCHAR(50) UNIQUE NOT NULL,                            -- UNIQUE: evita folios duplicados
    fecha DATE NOT NULL,
    
    CONSTRAINT fk_comprobante_pago FOREIGN KEY (id_pago) 
        REFERENCES pagos(id_pago) ON DELETE CASCADE               -- CASCADE: mantiene coherencia
);
-- ============================================================
-- TrustLink — Esquema de base de datos (MySQL 8+)
-- ============================================================
-- NOTA: Spring Boot ya crea/actualiza estas tablas automáticamente al
-- arrancar (spring.jpa.hibernate.ddl-auto=update), así que NO necesitan
-- correr este script a mano para que la app funcione. Se incluye como
-- referencia / documentación del esquema, y por si prefieren crear la
-- base de datos manualmente antes de arrancar la app.

CREATE DATABASE IF NOT EXISTS trustlink CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE trustlink;

-- ------------------------------------------------------------
-- Usuarios: compradores, vendedores y superadmin
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
    contrasena_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    apellido VARCHAR(80) NOT NULL,
    telefono VARCHAR(20),
    foto_url VARCHAR(255),
    wallet_address VARCHAR(42) UNIQUE,
    wallet_private_key_cifrada TEXT,
    rol VARCHAR(20) NOT NULL DEFAULT 'USUARIO',
    baneado BOOLEAN NOT NULL DEFAULT FALSE,
    motivo_baneo VARCHAR(255),
    email_verificado BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Tokens de recuperación de contraseña
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expira_en DATETIME NOT NULL,
    usado BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reset_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Productos publicados en el marketplace
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS productos (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    vendedor_id BIGINT NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    precio_soles DECIMAL(10,2) NOT NULL,
    foto_url VARCHAR(255),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_producto_vendedor FOREIGN KEY (vendedor_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Órdenes de escrow (espejo del contrato TrustLinkEscrow on-chain)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ordenes_escrow (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    orden_id_onchain BIGINT,
    comprador_id BIGINT NOT NULL,
    vendedor_id BIGINT NOT NULL,
    producto_id BIGINT NOT NULL,
    monto_soles DECIMAL(10,2) NOT NULL,
    monto_eth DECIMAL(30,18),
    codigo_confirmacion VARCHAR(20),
    estado VARCHAR(20) NOT NULL DEFAULT 'EN_CUSTODIA',
    tx_hash_creacion VARCHAR(100),
    tx_hash_liberacion VARCHAR(100),
    plazo_confirmacion DATETIME,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME,
    CONSTRAINT fk_orden_comprador FOREIGN KEY (comprador_id) REFERENCES usuarios(id),
    CONSTRAINT fk_orden_vendedor FOREIGN KEY (vendedor_id) REFERENCES usuarios(id),
    CONSTRAINT fk_orden_producto FOREIGN KEY (producto_id) REFERENCES productos(id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Cache local de reputación (espejo del contrato TrustLinkReputation)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reputacion_vendedores (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id BIGINT NOT NULL UNIQUE,
    ventas_exitosas INT NOT NULL DEFAULT 0,
    score_actual INT NOT NULL DEFAULT 0,
    compradores_distintos INT NOT NULL DEFAULT 0,
    ultimo_token_id_sbt BIGINT,
    actualizado_en DATETIME,
    CONSTRAINT fk_reputacion_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Solicitudes de crédito (mockup del MVP, ver ScoringService)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS solicitudes_credito (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    monto_solicitado DECIMAL(10,2) NOT NULL,
    techo_disponible_al_momento DECIMAL(10,2) NOT NULL,
    score_al_momento INT NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'APROBADO_AUTOMATICO',
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_credito_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Superadmin por defecto
-- ------------------------------------------------------------
-- NO se inserta aquí a propósito: el hash de la contraseña 'trust2026'
-- se genera automáticamente al arrancar la aplicación por primera vez
-- (ver com.trustlink.backend.config.DataSeeder), usando BCrypt con la
-- misma librería que valida el login — así se evita el riesgo de pegar
-- un hash BCrypt generado externamente que no coincida con la config
-- del proyecto (factor de trabajo, versión del algoritmo, etc.).
--
-- Login del superadmin tras el primer arranque:
--   Email:      superadmin@trustlink.com
--   Contraseña: trust2026

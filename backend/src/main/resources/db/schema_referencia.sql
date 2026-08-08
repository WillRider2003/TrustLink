-- =============================================================
-- TrustLink -- Esquema completo de base de datos (MySQL 8+)
-- =============================================================
-- IMPORTANTE: este archivo es solo de REFERENCIA/documentacion.
-- No hace falta ejecutarlo a mano: con spring.jpa.hibernate.ddl-auto=update
-- en application.properties, Hibernate crea y actualiza estas tablas
-- automaticamente al arrancar la aplicacion.
--
-- Como no hay datos importantes guardados, la forma mas simple y
-- segura de aplicar todos los cambios de las 7 fases es:
--
--   DROP DATABASE trustlink;
--   CREATE DATABASE trustlink CHARACTER SET utf8mb4;
--
-- y luego levantar el backend normalmente (mvn spring-boot:run) --
-- Hibernate recreara todas las tablas de cero, incluidas las nuevas
-- (solicitudes_vendedor, logs_auditoria, notificaciones, resenas) y
-- las columnas nuevas en usuarios y ordenes_escrow.
-- =============================================================

CREATE DATABASE IF NOT EXISTS trustlink CHARACTER SET utf8mb4;
USE trustlink;

-- -------------------------------------------------------------
-- usuarios
-- -------------------------------------------------------------
CREATE TABLE usuarios (
    id                          BIGINT AUTO_INCREMENT PRIMARY KEY,
    email                       VARCHAR(150) NOT NULL UNIQUE,
    contrasena_hash             VARCHAR(255) NULL,
    proveedor_auth              VARCHAR(20)  NOT NULL DEFAULT 'LOCAL',
    nombre                      VARCHAR(80)  NOT NULL,
    apellido                    VARCHAR(80)  NOT NULL,
    telefono                    VARCHAR(20)  NULL,
    foto_url                    VARCHAR(255) NULL,
    wallet_address              VARCHAR(42)  NULL UNIQUE,
    wallet_private_key_cifrada  TEXT NULL,
    rol                         VARCHAR(20)  NOT NULL DEFAULT 'USUARIO',
    vendedor_aprobado           BOOLEAN NOT NULL DEFAULT FALSE,
    notificaciones_en_app       BOOLEAN NOT NULL DEFAULT TRUE,
    notificaciones_por_correo   BOOLEAN NOT NULL DEFAULT TRUE,
    baneado                     BOOLEAN NOT NULL DEFAULT FALSE,
    motivo_baneo                VARCHAR(255) NULL,
    email_verificado            BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en                   DATETIME NOT NULL,
    actualizado_en              DATETIME NULL
);

-- -------------------------------------------------------------
-- productos
-- -------------------------------------------------------------
CREATE TABLE productos (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    vendedor_id    BIGINT NOT NULL,
    nombre         VARCHAR(150) NOT NULL,
    descripcion    TEXT NULL,
    precio_soles   DECIMAL(10,2) NOT NULL,
    foto_url       VARCHAR(255) NULL,
    activo         BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en      DATETIME NOT NULL,
    CONSTRAINT fk_productos_vendedor FOREIGN KEY (vendedor_id) REFERENCES usuarios(id)
);

-- -------------------------------------------------------------
-- ordenes_escrow
-- -------------------------------------------------------------
CREATE TABLE ordenes_escrow (
    id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
    orden_id_onchain      BIGINT NULL,
    comprador_id          BIGINT NOT NULL,
    vendedor_id           BIGINT NOT NULL,
    producto_id           BIGINT NOT NULL,
    monto_soles           DECIMAL(10,2) NOT NULL,
    monto_eth             DECIMAL(30,18) NULL,
    codigo_confirmacion   VARCHAR(20) NULL,
    estado                VARCHAR(20) NOT NULL DEFAULT 'EN_CUSTODIA',
    tx_hash_creacion      VARCHAR(100) NULL,
    tx_hash_liberacion    VARCHAR(100) NULL,
    plazo_confirmacion    DATETIME NULL,
    marcado_enviado       BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_envio           DATETIME NULL,
    foto_entrega_url      VARCHAR(255) NULL,
    creado_en             DATETIME NOT NULL,
    actualizado_en        DATETIME NULL,
    CONSTRAINT fk_orden_comprador FOREIGN KEY (comprador_id) REFERENCES usuarios(id),
    CONSTRAINT fk_orden_vendedor  FOREIGN KEY (vendedor_id)  REFERENCES usuarios(id),
    CONSTRAINT fk_orden_producto  FOREIGN KEY (producto_id)  REFERENCES productos(id)
);

-- -------------------------------------------------------------
-- reputacion_vendedores
-- -------------------------------------------------------------
CREATE TABLE reputacion_vendedores (
    id                       BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id               BIGINT NOT NULL UNIQUE,
    ventas_exitosas          INT NOT NULL DEFAULT 0,
    score_actual             INT NOT NULL DEFAULT 0,
    compradores_distintos    INT NOT NULL DEFAULT 0,
    ultimo_token_id_sbt      BIGINT NULL,
    actualizado_en           DATETIME NULL,
    CONSTRAINT fk_reputacion_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- -------------------------------------------------------------
-- solicitudes_credito
-- -------------------------------------------------------------
CREATE TABLE solicitudes_credito (
    id                            BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id                    BIGINT NOT NULL,
    monto_solicitado              DECIMAL(10,2) NOT NULL,
    techo_disponible_al_momento   DECIMAL(10,2) NOT NULL,
    score_al_momento              INT NOT NULL,
    estado                        VARCHAR(20) NOT NULL DEFAULT 'APROBADO_AUTOMATICO',
    creado_en                     DATETIME NOT NULL,
    CONSTRAINT fk_credito_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- -------------------------------------------------------------
-- password_reset_tokens
-- -------------------------------------------------------------
CREATE TABLE password_reset_tokens (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id   BIGINT NOT NULL,
    token_hash   VARCHAR(64) NOT NULL UNIQUE,
    expira_en    DATETIME NOT NULL,
    usado        BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en    DATETIME NOT NULL
);

-- -------------------------------------------------------------
-- solicitudes_vendedor  (Fase 1)
-- -------------------------------------------------------------
CREATE TABLE solicitudes_vendedor (
    id                     BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id             BIGINT NOT NULL,
    nombre_negocio         VARCHAR(120) NOT NULL,
    tipo_productos         VARCHAR(255) NOT NULL,
    descripcion            TEXT NULL,
    informacion_adicional  TEXT NULL,
    estado                 VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    motivo_resolucion      VARCHAR(255) NULL,
    resuelta_por_id        BIGINT NULL,
    resuelta_en            DATETIME NULL,
    creado_en              DATETIME NOT NULL,
    CONSTRAINT fk_solicitud_vendedor_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    CONSTRAINT fk_solicitud_vendedor_resuelta_por FOREIGN KEY (resuelta_por_id) REFERENCES usuarios(id)
);

-- -------------------------------------------------------------
-- logs_auditoria  (Fase 2)
-- -------------------------------------------------------------
CREATE TABLE logs_auditoria (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    actor_id       BIGINT NULL,
    actor_email    VARCHAR(150) NULL,
    accion         VARCHAR(40) NOT NULL,
    entidad_tipo   VARCHAR(60) NULL,
    entidad_id     BIGINT NULL,
    detalle        VARCHAR(500) NOT NULL,
    ip_origen      VARCHAR(45) NULL,
    creado_en      DATETIME NOT NULL,
    CONSTRAINT fk_log_actor FOREIGN KEY (actor_id) REFERENCES usuarios(id)
);

-- -------------------------------------------------------------
-- notificaciones  (Fase 3)
-- -------------------------------------------------------------
CREATE TABLE notificaciones (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id   BIGINT NOT NULL,
    titulo       VARCHAR(150) NOT NULL,
    mensaje      VARCHAR(500) NOT NULL,
    enlace       VARCHAR(255) NULL,
    leida        BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en    DATETIME NOT NULL,
    CONSTRAINT fk_notificacion_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- -------------------------------------------------------------
-- resenas  (Fase 4)
-- -------------------------------------------------------------
CREATE TABLE resenas (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    producto_id    BIGINT NOT NULL,
    comprador_id   BIGINT NOT NULL,
    orden_id       BIGINT NOT NULL UNIQUE,
    calificacion   INT NOT NULL,
    comentario     TEXT NULL,
    creado_en      DATETIME NOT NULL,
    CONSTRAINT fk_resena_producto  FOREIGN KEY (producto_id)  REFERENCES productos(id),
    CONSTRAINT fk_resena_comprador FOREIGN KEY (comprador_id) REFERENCES usuarios(id),
    CONSTRAINT fk_resena_orden     FOREIGN KEY (orden_id)     REFERENCES ordenes_escrow(id)
);

-- -------------------------------------------------------------
-- Cuenta superadmin: se siembra automaticamente al arrancar la
-- app si no existe (ver DataSeeder.java). No hace falta insertarla
-- a mano -- el backend la crea con los datos de application.properties
-- (trustlink.superadmin.email / trustlink.superadmin.password).
-- -------------------------------------------------------------

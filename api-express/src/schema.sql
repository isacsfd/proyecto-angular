-- ============================================================================
-- API Express + MySQL — Biblioteca IUB
-- Esquema auxiliar: PROVEEDORES y COMPRAS (3 tablas normalizadas)
-- Todas las tablas tienen: PK, FK (donde aplica), UNIQUE, estado (default 1),
-- creado y actualizado (gestionados por MySQL).
-- Idempotente: usa CREATE TABLE IF NOT EXISTS. Ejecutar con: npm run db:init
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `biblioteca_iub_compras`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `biblioteca_iub_compras`;

CREATE TABLE IF NOT EXISTS `proveedores` (
  `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `razon_social`  VARCHAR(150)  NOT NULL,
  `nit`           VARCHAR(50)   NOT NULL,
  `email`         VARCHAR(120)  NULL,
  `telefono`      VARCHAR(30)   NULL,
  `direccion`     VARCHAR(255)  NULL,
  `estado`        TINYINT(1)    NOT NULL DEFAULT 1,
  `creado`        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `uq_proveedores_nit` UNIQUE (`nit`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `compras` (
  `id`              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `proveedor_id`    INT UNSIGNED  NOT NULL,
  `numero_factura`  VARCHAR(50)   NOT NULL,
  `fecha`           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `total`           DECIMAL(12,2) NOT NULL DEFAULT 0,
  `estado`          TINYINT(1)    NOT NULL DEFAULT 1,
  `creado`          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `uq_compras_numero_factura` UNIQUE (`numero_factura`),
  CONSTRAINT `fk_compras_proveedor` FOREIGN KEY (`proveedor_id`)
    REFERENCES `proveedores` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `detalle_compra` (
  `id`              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `compra_id`       INT UNSIGNED  NOT NULL,
  `descripcion`     VARCHAR(200)  NOT NULL,
  `cantidad`        INT UNSIGNED  NOT NULL DEFAULT 1,
  `precio_unitario` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `estado`          TINYINT(1)    NOT NULL DEFAULT 1,
  `creado`          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_detalle_compra` FOREIGN KEY (`compra_id`)
    REFERENCES `compras` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
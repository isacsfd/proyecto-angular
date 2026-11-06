-- includes_minimos.sql — Completa los mínimos demanded por el Taller (20 principales / 10 secundarias)
-- Soporte: PostgreSQL/Neon (BD Biblioteca IUB) — funciona también en la versión local.
-- Los 5 usuarios de abajo son DATOS DE DEMOSTRACIÓN (cuentas 'iub-demo'); TODO也应 replace
-- passwords hash: 'Biblioteca2026!' (bcrypt) — cambiar después de la demo.
-- Ejecutar sólo si la tabla usuario Tiene <20 filas.

-- (1) Contar filas actuales (verificación previa)
-- SELECT count(*) FROM usuario;

-- (2) Insertar 5 usuarios demo (idempotente si corresponde el ON CONFLICT de username)
INSERT INTO usuario (nombre, username, email, phone, address, rol_id, password, identificacion, nivel_academico, carrera, sede)
VALUES
    ('Estudiantes Demo 1 (cuenta demo)', 'demo.est1', 'demo.est1@iub-demo.edu.co', '3000000001',
     'Calle Demo 1', (SELECT id FROM rol WHERE nombre = 'Estudiante' LIMIT 1),
     '$2b$12$5MNaIlN/ohozc5ieLeaJzODjw6G9ZLCHRkD6hXg7Ts3GCc6jZ.Z.u', '9000000001', 'Técnico Profesional', 'Administración de Empresas', 'Soledad'),
    ('Estudiantes Demo 2 (cuenta demo)', 'demo.est2', 'demo.est2@iub-demo.edu.co', '3000000002',
     'Calle Demo 2', (SELECT id FROM rol WHERE nombre = 'Estudiante' LIMIT 1),
     '$2b$12$5MNaIlN/ohozc5ieLeaJzODjw6G9ZLCHRkD6hXg7Ts3GCc6jZ.Z.u', '9000000002', 'Tecnológico', 'Ingeniería Eléctrica', 'Soledad'),
    ('Docente Demo 3 (cuenta demo)', 'demo.doc3', 'demo.doc3@iub-demo.edu.co', '3000000003',
     'Calle Demo 3', (SELECT id FROM rol WHERE nombre = 'Docente' LIMIT 1),
     '$2b$12$5MNaIlN/ohozc5ieLeaJzODjw6G9ZLCHRkD6hXg7Ts3GCc6jZ.Z.u', '9000000003', 'Profesional', 'Ingeniería Industrial', 'Barranquilla'),
    ('Funcionario Demo 4 (cuenta demo)', 'demo.fun4', 'demo.fun4@iub-demo.edu.co', '3000000004',
     'Calle Demo 4', (SELECT id FROM rol WHERE nombre = 'Funcionario' LIMIT 1),
     '$2b$12$5MNaIlN/ohozc5ieLeaJzODjw6G9ZLCHRkD6hXg7Ts3GCc6jZ.Z.u', '9000000004', 'Técnico', 'Gestión Administrativa', 'Colsamiro'),
    ('Administrador Demo 5 (cuenta demo)', 'demo.adm5', 'demo.adm5@iub-demo.edu.co', '3000000005',
     'Calle Demo 5', (SELECT id FROM rol WHERE nombre = 'Administrador' LIMIT 1),
     '$2b$12$5MNaIlN/ohozc5ieLeaJzODjw6G9ZLCHRkD6hXg7Ts3GCc6jZ.Z.u', '9000000005', 'Profesional', 'Ingeniería Telemática', 'Soledad')
ON CONFLICT (username) DO NOTHING;

-- (3) Tabla secundaria (módulos_X_rol) está sobre los mínimos (51 filas ≥ 10) — sin acción.
-- (4) Tw таблицы principales: libros (693 ✔), usuario (15+5=20 ✔), dispositivos y libramientos se pueden revisar:
-- SELECT count(*) FROM dispositivos; -- si <10, correr insert adicional aquí.
-- SELECT count(*) FROM (SELECT DISTINCT book_id FROM prestamos) t; -- historial (no es inventario)

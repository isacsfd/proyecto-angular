-- migracion_rol_super_admin.sql
-- Biblioteca IUB — Amplía el ENUM de roles para incluir super_administrador.
-- NO destructivo: conserva todos los usuarios y roles existentes.
-- Idempotente a nivel de resultado (repetir no daña).

ALTER TABLE `usuarios`
    MODIFY `rol` ENUM(
        'super_administrador',
        'Administrador',
        'Funcionario',
        'Docente',
        'Estudiante'
    ) NOT NULL;
-- Script para corregir el problema de font_display_name

-- Opción 1: Si la columna existe y es NOT NULL, hacerla opcional
ALTER TABLE app_fonts 
ALTER COLUMN font_display_name DROP NOT NULL;

-- Opción 2: Si prefieres mantenerla NOT NULL, actualizar valores existentes
UPDATE app_fonts 
SET font_display_name = font_name 
WHERE font_display_name IS NULL;

-- Opción 3: Si la columna no debería existir, eliminarla
-- ALTER TABLE app_fonts DROP COLUMN IF EXISTS font_display_name;

-- Verificar estructura actual
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'app_fonts'
ORDER BY ordinal_position;





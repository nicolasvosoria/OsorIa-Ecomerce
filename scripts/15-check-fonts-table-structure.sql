-- Script para verificar la estructura completa de la tabla app_fonts

-- Ver todas las columnas de app_fonts
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'app_fonts'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Ver algunos registros existentes para entender la estructura
SELECT * FROM app_fonts LIMIT 1;





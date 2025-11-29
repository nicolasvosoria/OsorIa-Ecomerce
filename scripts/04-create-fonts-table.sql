-- Crear tabla de fuentes
CREATE TABLE IF NOT EXISTS app_fonts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  font_name VARCHAR(100) NOT NULL UNIQUE,
  font_family VARCHAR(200) NOT NULL,
  google_font_url TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_app_fonts_active ON app_fonts(is_active);
CREATE INDEX IF NOT EXISTS idx_app_fonts_name ON app_fonts(font_name);

-- Insertar fuentes por defecto
INSERT INTO app_fonts (font_name, font_family, google_font_url, is_active) VALUES
(
  'Inter',
  '"Inter", sans-serif',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  TRUE
),
(
  'Roboto',
  '"Roboto", sans-serif',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap',
  FALSE
),
(
  'Open Sans',
  '"Open Sans", sans-serif',
  'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap',
  FALSE
),
(
  'Poppins',
  '"Poppins", sans-serif',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
  FALSE
),
(
  'Montserrat',
  '"Montserrat", sans-serif',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap',
  FALSE
)
ON CONFLICT (font_name) DO NOTHING;

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_app_fonts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER trigger_update_app_fonts_updated_at
  BEFORE UPDATE ON app_fonts
  FOR EACH ROW
  EXECUTE FUNCTION update_app_fonts_updated_at();

-- Crear tabla de temas
CREATE TABLE IF NOT EXISTS app_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_name VARCHAR(100) NOT NULL UNIQUE,
  colors JSONB NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_app_themes_active ON app_themes(is_active);
CREATE INDEX IF NOT EXISTS idx_app_themes_name ON app_themes(theme_name);

-- Insertar temas por defecto
INSERT INTO app_themes (theme_name, colors, is_active) VALUES
(
  'Claro Original',
  '{
    "primary": "#005aa1",
    "secondary": "#c4faff",
    "accent": "#005aa1",
    "background": "#ffffff",
    "foreground": "#1a1a1a",
    "card": "#ffffff",
    "cardForeground": "#1a1a1a",
    "border": "#e5e5e5",
    "muted": "#f5f5f5",
    "mutedForeground": "#737373"
  }'::jsonb,
  TRUE
),
(
  'Claro Azul',
  '{
    "primary": "#2563eb",
    "secondary": "#dbeafe",
    "accent": "#2563eb",
    "background": "#ffffff",
    "foreground": "#1e293b",
    "card": "#ffffff",
    "cardForeground": "#1e293b",
    "border": "#e2e8f0",
    "muted": "#f1f5f9",
    "mutedForeground": "#64748b"
  }'::jsonb,
  FALSE
),
(
  'Oscuro Azul',
  '{
    "primary": "#3b82f6",
    "secondary": "#1e3a8a",
    "accent": "#60a5fa",
    "background": "#0f172a",
    "foreground": "#f1f5f9",
    "card": "#1e293b",
    "cardForeground": "#f1f5f9",
    "border": "#334155",
    "muted": "#1e293b",
    "mutedForeground": "#94a3b8"
  }'::jsonb,
  FALSE
),
(
  'Oscuro Verde',
  '{
    "primary": "#10b981",
    "secondary": "#064e3b",
    "accent": "#34d399",
    "background": "#0f172a",
    "foreground": "#f1f5f9",
    "card": "#1e293b",
    "cardForeground": "#f1f5f9",
    "border": "#334155",
    "muted": "#1e293b",
    "mutedForeground": "#94a3b8"
  }'::jsonb,
  FALSE
)
ON CONFLICT (theme_name) DO NOTHING;

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_app_themes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER trigger_update_app_themes_updated_at
  BEFORE UPDATE ON app_themes
  FOR EACH ROW
  EXECUTE FUNCTION update_app_themes_updated_at();

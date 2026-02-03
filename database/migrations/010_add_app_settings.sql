-- App settings table for global branding/config
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  logo_file_path TEXT,
  logo_file_name TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed a single global row if it doesn't exist
INSERT INTO app_settings (key)
VALUES ('global')
ON CONFLICT (key) DO NOTHING;

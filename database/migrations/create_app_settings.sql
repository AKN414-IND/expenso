-- SQL to create app_settings table for storing application settings
-- This should be run in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster key lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

-- Insert initial settings
INSERT INTO app_settings (key, value, description) 
VALUES 
  ('last_notification_cleanup', '0', 'Timestamp of last notification cleanup'),
  ('notification_batch_size', '5', 'Number of notifications to process in a batch'),
  ('notification_cleanup_interval', '86400000', 'Interval in milliseconds between cleanup runs (24 hours)')
ON CONFLICT (key) DO NOTHING;

-- Create or replace function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for app_settings table
DROP TRIGGER IF EXISTS update_app_settings_updated_at ON app_settings;
CREATE TRIGGER update_app_settings_updated_at 
  BEFORE UPDATE ON app_settings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
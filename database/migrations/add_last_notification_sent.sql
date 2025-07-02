-- SQL to add last_notification_sent column to payment_reminders table
-- This should be run in your Supabase SQL editor

ALTER TABLE payment_reminders 
ADD COLUMN IF NOT EXISTS last_notification_sent TIMESTAMPTZ DEFAULT NULL;

-- Add comment to the column
COMMENT ON COLUMN payment_reminders.last_notification_sent IS 'Timestamp when the last notification was sent for this reminder';
-- Migration: Add reminders/notifications system
-- This enables users to set plant care reminders with recurring schedules

-- Create reminders table
CREATE TABLE reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  recurrence_type VARCHAR(20) NOT NULL CHECK (recurrence_type IN ('none', 'daily', 'weekly', 'monthly', 'custom')),
  recurrence_interval INTEGER CHECK (recurrence_interval > 0),
  recurrence_unit VARCHAR(10) CHECK (recurrence_unit IN ('days', 'weeks', 'months')),
  notification_id VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT true,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_reminders_plant_id ON reminders(plant_id);
CREATE INDEX idx_reminders_household_id ON reminders(household_id);
CREATE INDEX idx_reminders_date_time ON reminders(date, time);
CREATE INDEX idx_reminders_active ON reminders(is_active);

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reminders_updated_at
    BEFORE UPDATE ON reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Note: Household isolation is handled at the application level via ReminderService
-- consistent with other tables in this schema

-- Add helpful comments
COMMENT ON TABLE reminders IS 'Plant care reminders and notifications';
COMMENT ON COLUMN reminders.recurrence_type IS 'Type of recurrence: none, daily, weekly, monthly, or custom';
COMMENT ON COLUMN reminders.recurrence_interval IS 'For custom recurrence: repeat every X units';
COMMENT ON COLUMN reminders.recurrence_unit IS 'For custom recurrence: unit (days, weeks, months)';
COMMENT ON COLUMN reminders.notification_id IS 'Expo notification ID for canceling scheduled notifications';
COMMENT ON COLUMN reminders.time IS 'Time of day in HH:MM format';
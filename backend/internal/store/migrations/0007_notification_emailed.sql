-- When a notification's email was claimed for sending, so each one is emailed at most once even
-- with several API processes listening. NULL = not emailed (also every row before this column).
ALTER TABLE notifications ADD COLUMN emailed_at timestamptz;

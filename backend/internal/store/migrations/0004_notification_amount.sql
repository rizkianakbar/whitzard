-- The amount a notification is about (wei), so clients can write the text in the member's own
-- language. NULL for notifications without an amount and for rows written before this column.
ALTER TABLE notifications ADD COLUMN amount uint256;

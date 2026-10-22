-- Member email for notification delivery. Optional to keep backward compatibility.
ALTER TABLE members
    ADD COLUMN email text;

CREATE UNIQUE INDEX members_email_unique ON members ((lower(email))) WHERE email IS NOT NULL;

-- More off-chain profile fields, so members can recognise each other. All self-declared and never
-- verified (no KYC, thesis Table 2.1). birth_date is shown only to the member themself.
ALTER TABLE members
    ADD COLUMN nickname   text,
    ADD COLUMN birth_date date,
    ADD COLUMN city       text,
    ADD COLUMN photo_hash text,
    ADD COLUMN photo_type text;

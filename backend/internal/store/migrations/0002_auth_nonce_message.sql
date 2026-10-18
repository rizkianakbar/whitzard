-- Store the exact EIP-4361 text a nonce was issued with, so verification checks the signature
-- over that text instead of parsing a client-supplied message. Nonces live for minutes, so
-- dropping any outstanding ones is harmless.
DELETE FROM auth_nonces;
ALTER TABLE auth_nonces ADD COLUMN message text NOT NULL;

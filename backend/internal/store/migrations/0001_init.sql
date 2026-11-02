-- Off-chain mirror of the Whitzard contracts, plus what the indexer, auth and
-- keeper need. Addresses and hashes are lowercase 0x-hex text; token amounts are numeric(78,0) so a
-- full uint256 fits.

CREATE DOMAIN eth_address AS text CHECK (VALUE ~ '^0x[0-9a-f]{40}$');
CREATE DOMAIN eth_hash AS text CHECK (VALUE ~ '^0x[0-9a-f]{64}$');
CREATE DOMAIN uint256 AS numeric(78, 0) CHECK (VALUE >= 0);

-- Indexer progress: last block fully processed, per indexer name.
CREATE TABLE indexer_cursor (
    name        text PRIMARY KEY,
    block       bigint NOT NULL,
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- MEMBER: profile (off-chain) + mirrored on-chain status.
CREATE TABLE members (
    address              eth_address PRIMARY KEY,
    registered_at_block  bigint NOT NULL,
    registered_tx        eth_hash NOT NULL,
    ready                boolean NOT NULL DEFAULT false,
    display_name         text,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now()
);

-- Every ReadyChanged event, so the snapshot of any past block can be rebuilt off-chain.
CREATE TABLE ready_history (
    member        eth_address NOT NULL REFERENCES members (address),
    block_number  bigint NOT NULL,
    log_index     integer NOT NULL,
    ready         boolean NOT NULL,
    tx_hash       eth_hash NOT NULL,
    PRIMARY KEY (member, block_number, log_index)
);

-- What a requester uploads before sending openRequest: linked to the request by the indexer when
-- RequestOpened arrives with the same (requester, evidence hash).
CREATE TABLE request_drafts (
    id             bigserial PRIMARY KEY,
    requester      eth_address NOT NULL,
    title          text NOT NULL,
    description    text NOT NULL,
    evidence_hash  eth_hash NOT NULL,
    file_name      text NOT NULL,
    content_type   text NOT NULL,
    size_bytes     bigint NOT NULL,
    request_id     bigint,
    created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX request_drafts_unlinked ON request_drafts (requester, evidence_hash) WHERE request_id IS NULL;

-- REQUEST. `status` is what the chain has recorded (open → funding → finalized | expired |
-- cancelled); the API derives "expired / awaiting finalize" from the deadline.
CREATE TABLE requests (
    id               bigint PRIMARY KEY,
    requester        eth_address NOT NULL,
    amount           uint256 NOT NULL,
    share            uint256 NOT NULL,
    collected        uint256 NOT NULL DEFAULT 0,
    refunded_total   uint256 NOT NULL DEFAULT 0,
    contributors     integer NOT NULL DEFAULT 0,
    snapshot_block   bigint NOT NULL,
    snapshot_size    integer NOT NULL,
    deadline         timestamptz NOT NULL,
    evidence_hash    eth_hash NOT NULL,
    status           text NOT NULL CHECK (status IN ('open', 'funding', 'finalized', 'expired', 'cancelled')),
    title            text,
    description      text,
    draft_id         bigint REFERENCES request_drafts (id),
    opened_tx        eth_hash NOT NULL,
    opened_block     bigint NOT NULL,
    opened_at        timestamptz NOT NULL,
    finalized_tx     eth_hash,
    finalized_at     timestamptz,
    finalized_total  uint256,
    cancelled_tx     eth_hash,
    cancelled_at     timestamptz
);
CREATE INDEX requests_requester ON requests (requester);
CREATE INDEX requests_due ON requests (deadline) WHERE status IN ('open', 'funding');

-- CONTRIBUTION: one per (request, member), with the refund markers for cancelled requests.
CREATE TABLE contributions (
    request_id      bigint NOT NULL REFERENCES requests (id),
    member          eth_address NOT NULL,
    amount          uint256 NOT NULL,
    tx_hash         eth_hash NOT NULL,
    block_number    bigint NOT NULL,
    contributed_at  timestamptz NOT NULL,
    refunded        boolean NOT NULL DEFAULT false,
    refund_tx_hash  eth_hash,
    refunded_at     timestamptz,
    PRIMARY KEY (request_id, member)
);
CREATE INDEX contributions_member ON contributions (member);

-- Snapshot members of each request and their response, so "did not respond" and "explicitly
-- declined" can be told apart.
CREATE TABLE snapshot_members (
    request_id    bigint NOT NULL REFERENCES requests (id),
    member        eth_address NOT NULL,
    response      text NOT NULL DEFAULT 'pending'
                  CHECK (response IN ('pending', 'participating', 'declined', 'contributed')),
    responded_at  timestamptz,
    PRIMARY KEY (request_id, member)
);
CREATE INDEX snapshot_members_member ON snapshot_members (member);

-- NOTIFICATION (KF-4): delivered live over WebSocket via pg_notify, listed by GET /notifications.
CREATE TABLE notifications (
    id           bigserial PRIMARY KEY,
    member       eth_address NOT NULL,
    type         text NOT NULL,
    title        text NOT NULL,
    description  text NOT NULL,
    request_id   bigint REFERENCES requests (id),
    is_read      boolean NOT NULL DEFAULT false,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_member ON notifications (member, created_at DESC);

-- Sign-In with Ethereum: one-time nonces and session tokens (only a SHA-256 of the token is kept).
CREATE TABLE auth_nonces (
    nonce       text PRIMARY KEY,
    address     eth_address NOT NULL,
    expires_at  timestamptz NOT NULL,
    used_at     timestamptz
);

CREATE TABLE sessions (
    token_hash  text PRIMARY KEY,
    address     eth_address NOT NULL,
    expires_at  timestamptz NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- Keeper: the last finalize transaction sent per request, so it is not sent twice.
CREATE TABLE keeper_finalizations (
    request_id  bigint PRIMARY KEY REFERENCES requests (id),
    tx_hash     eth_hash NOT NULL,
    sent_at     timestamptz NOT NULL DEFAULT now()
);

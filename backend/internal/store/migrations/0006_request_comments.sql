-- Discussion thread on each request detail page.
CREATE TABLE request_comments (
    id          bigserial PRIMARY KEY,
    request_id  bigint NOT NULL REFERENCES requests (id),
    member      eth_address NOT NULL REFERENCES members (address),
    body        text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX request_comments_request ON request_comments (request_id, created_at, id);

-- RFB-Ticket, isolated D1 schema. No real payment gateway or production data.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS events (
 id TEXT PRIMARY KEY, organizer_uid TEXT NOT NULL, title TEXT NOT NULL,
 description TEXT NOT NULL DEFAULT '', city TEXT NOT NULL,
 starts_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','cancelled')),
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS event_staff (
 event_id TEXT NOT NULL REFERENCES events(id), uid TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('organizer','gate')),
 PRIMARY KEY(event_id, uid)
);
CREATE TABLE IF NOT EXISTS lots (
 id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(id),
 label TEXT NOT NULL, capacity INTEGER NOT NULL CHECK(capacity >= 0),
 reserved INTEGER NOT NULL DEFAULT 0 CHECK(reserved >= 0),
 issued INTEGER NOT NULL DEFAULT 0 CHECK(issued >= 0),
 price_cents INTEGER NOT NULL CHECK(price_cents >= 0),
 status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available','paused')),
 CHECK(reserved + issued <= capacity)
);
CREATE TABLE IF NOT EXISTS orders (
 id TEXT PRIMARY KEY, buyer_uid TEXT NOT NULL, event_id TEXT NOT NULL REFERENCES events(id),
 lot_id TEXT NOT NULL REFERENCES lots(id), quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 4),
 amount_cents INTEGER NOT NULL CHECK(amount_cents >= 0),
 status TEXT NOT NULL CHECK(status IN ('creating','held','issuing','issued','cancelled','expired','refunded')),
 hold_expires_at INTEGER NOT NULL,
 request_key TEXT NOT NULL, created_at INTEGER NOT NULL,
 UNIQUE(buyer_uid, request_key)
);
CREATE TABLE IF NOT EXISTS tickets (
 id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id),
 event_id TEXT NOT NULL REFERENCES events(id), owner_uid TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'issued' CHECK(status IN ('issued','used','revoked')),
 token_version INTEGER NOT NULL DEFAULT 1 CHECK(token_version >= 1),
 transfer_count INTEGER NOT NULL DEFAULT 0 CHECK(transfer_count >= 0),
 used_at INTEGER, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS checkins (
 ticket_id TEXT PRIMARY KEY REFERENCES tickets(id),
 event_id TEXT NOT NULL REFERENCES events(id), fiscal_uid TEXT NOT NULL,
 request_id TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS audit (
 id INTEGER PRIMARY KEY AUTOINCREMENT, event_id TEXT,
 actor_uid TEXT NOT NULL, action TEXT NOT NULL,
 target_id TEXT, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status, starts_at);
CREATE INDEX IF NOT EXISTS idx_staff_uid ON event_staff(uid, role);
CREATE INDEX IF NOT EXISTS idx_lots_event ON lots(event_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_uid, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_expire ON orders(status, hold_expires_at);
CREATE INDEX IF NOT EXISTS idx_tickets_owner ON tickets(owner_uid, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkins_event ON checkins(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event ON audit(event_id, created_at DESC);

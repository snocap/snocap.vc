CREATE TABLE IF NOT EXISTS viewers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  viewed_at TEXT NOT NULL DEFAULT (datetime('now')),
  user_agent TEXT,
  country TEXT
);

CREATE INDEX idx_viewers_email ON viewers(email);
CREATE INDEX idx_viewers_viewed_at ON viewers(viewed_at);

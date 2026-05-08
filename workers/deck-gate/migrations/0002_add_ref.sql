ALTER TABLE viewers ADD COLUMN ref TEXT;

CREATE INDEX idx_viewers_ref ON viewers(ref);

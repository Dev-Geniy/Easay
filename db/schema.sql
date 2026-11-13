-- Cloudflare D1 setup: wrangler d1 execute <database-name> --remote --file=./db/schema.sql
CREATE TABLE IF NOT EXISTS exam_attempts (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  questions_json TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_attempt_ip_day ON exam_attempts(ip_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_attempt_expiration ON exam_attempts(expires_at);
CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  course_title TEXT NOT NULL,
  score INTEGER NOT NULL,
  recipient TEXT NOT NULL,
  publish_name INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cert_course ON certificates(course_id);

-- Stores every "Free sample week" form submission.
CREATE TABLE plan_requests (
  id              SERIAL PRIMARY KEY,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 1. About you
  first_name      TEXT NOT NULL,
  email           TEXT NOT NULL,
  age_range       TEXT,

  -- 2-3. Goal and level
  goal_track      TEXT,
  fitness_level   TEXT,

  -- 4-6. Training
  limitations     JSONB NOT NULL DEFAULT '[]',
  equipment       JSONB NOT NULL DEFAULT '[]',
  daily_minutes   INTEGER,

  -- 7-8. Food
  diet            TEXT,
  cook_minutes    INTEGER,
  allergies       JSONB NOT NULL DEFAULT '[]',
  dislikes        TEXT,

  -- 9. Health check (special-category data under GDPR)
  health_flags    JSONB NOT NULL DEFAULT '[]',
  needs_doctor    BOOLEAN NOT NULL DEFAULT FALSE,

  -- 10. Community
  wants_group     BOOLEAN NOT NULL DEFAULT FALSE,

  -- Consent (stored with a timestamp as proof)
  health_consent  BOOLEAN NOT NULL,
  terms_accepted  BOOLEAN NOT NULL,
  newsletter      BOOLEAN NOT NULL DEFAULT FALSE,
  consent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX plan_requests_email_idx ON plan_requests (email);
CREATE INDEX plan_requests_created_at_idx ON plan_requests (created_at DESC);

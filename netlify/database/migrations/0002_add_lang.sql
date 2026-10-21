-- Language the visitor used on the site (en, de or nl).
ALTER TABLE plan_requests ADD COLUMN lang TEXT NOT NULL DEFAULT 'en';

-- Proposed schema only. Not executed; no database connection is required.
CREATE TABLE who_source (
  sha256 CHAR(64) PRIMARY KEY,
  source_url TEXT NOT NULL,
  source_page TEXT,
  retrieved_at_utc VARCHAR(40) NOT NULL,
  original_file VARCHAR(255) NOT NULL,
  byte_length INT UNSIGNED NOT NULL
);

CREATE TABLE who_dataset (
  dataset_id VARCHAR(100) PRIMARY KEY,
  indicator ENUM('wfa', 'lhfa', 'hcfa') NOT NULL,
  sex ENUM('male', 'female') NOT NULL,
  unit ENUM('kg', 'cm') NOT NULL,
  standard_publication_year SMALLINT UNSIGNED NOT NULL,
  min_age_days SMALLINT UNSIGNED NOT NULL,
  max_age_days SMALLINT UNSIGNED NOT NULL,
  zscore_source_sha256 CHAR(64) NOT NULL,
  percentile_source_sha256 CHAR(64) NOT NULL,
  FOREIGN KEY (zscore_source_sha256) REFERENCES who_source(sha256),
  FOREIGN KEY (percentile_source_sha256) REFERENCES who_source(sha256)
);

CREATE TABLE who_lms (
  dataset_id VARCHAR(100) NOT NULL,
  age_days SMALLINT UNSIGNED NOT NULL,
  l DOUBLE NOT NULL,
  m DOUBLE NOT NULL,
  s DOUBLE NOT NULL,
  measurement_method ENUM('recumbent_length', 'standing_height'),
  PRIMARY KEY (dataset_id, age_days),
  FOREIGN KEY (dataset_id) REFERENCES who_dataset(dataset_id)
);

CREATE TABLE who_curve_value (
  dataset_id VARCHAR(100) NOT NULL,
  age_days SMALLINT UNSIGNED NOT NULL,
  curve_kind ENUM('zscore', 'percentile') NOT NULL,
  curve_position DECIMAL(5,2) NOT NULL,
  value DOUBLE NOT NULL,
  PRIMARY KEY (dataset_id, age_days, curve_kind, curve_position),
  FOREIGN KEY (dataset_id, age_days) REFERENCES who_lms(dataset_id, age_days)
);

-- Map JSON zScores/percentiles to curve_position; never use a locale-formatted
-- string. DOUBLE preserves the original workbook's binary numeric values.
-- Keep original OOXML numeric strings in extracted/ and raw XLSX files for audit.

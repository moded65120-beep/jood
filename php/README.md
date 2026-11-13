# PHP standalone app — first implementation

This standalone PHP application uses the existing React project only as a visual and feature reference. It is intentionally separate and does not modify or require React files.

## Requirements

- PHP 8.1+ with PDO MySQL enabled
- MySQL/MariaDB
- HTTPS for deployment

## Setup

1. Create a database and a restricted database user in Plesk.
2. Import `database/schema.sql` with phpMyAdmin. If the hosting panel already created the database, remove the optional `CREATE DATABASE` and `USE` statements first, then import into the selected database.
3. Set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASS` as PHP environment variables in Plesk. Never commit actual credentials.
4. Set the website document root to `php/public` (or configure the host's document root accordingly). Keep `app/` and `database/` outside the public web root.
5. Enable HTTPS and verify the PHP version and `pdo_mysql` extension.

## Current scope

The first iteration includes registration/login/logout, basic session/CSRF protections, a family dashboard, and child profiles. It defines initial tables for growth measurements, vaccinations, milestones, and appointments. Several feature pages are read-only/empty states: growth charting, WHO reference integration, vaccination workflows, milestones editing, appointment booking, and the doctor portal still need implementation and tests.

Use fictional records only. This student demo is not a clinical system and does not provide medical advice or diagnosis.

-- 0027_nfl_retail_variants.sql
-- Adds the missing retail-tier variants (Mega/Blaster/Hanger/Jumbo) for
-- 2024 NFL and 2025 NFL hobby releases. Per Beckett research, NOT every
-- brand has every retail tier — premium-only lines (National Treasures,
-- Immaculate, Flawless, Spectra, Phoenix, One, Certified, Honors) are
-- hobby-only and skipped here.
--
-- Variants matrix per product line (only including the SKUs that
-- actually exist in retail):
--
--   Prizm NFL:       hobby + jumbo + mega + blaster + hanger + FOTL
--   Donruss NFL:     hobby + jumbo + mega + blaster + hanger
--   Donruss Optic NFL: hobby + mega + blaster + hanger
--   Mosaic NFL:      hobby + mega + blaster
--   Select NFL:      hobby + mega + blaster
--   Contenders NFL:  hobby + mega + blaster + Optic
--
-- Hobby Box rows already exist (from migrations 0014/0026). This
-- migration ONLY adds the retail tiers + Jumbo where applicable.
--
-- All published. image_url null until admin/scraper fills them.
-- variant_group + variant_type derive automatically via the trigger.
-- Idempotent: ON CONFLICT (slug) DO NOTHING.

insert into skus (
  slug, year, brand, sport, set_name, product, release_date,
  description, image_url, gradient_from, gradient_to, is_published
)
values
  -- =====================================================================
  -- 2024 NFL retail variants (Caleb Williams / Jayden Daniels rookie class)
  -- =====================================================================

  -- Prizm 2024 NFL retail (hobby + FOTL already exist from 0026)
  ('2024-panini-prizm-football-jumbo-box', 2024, 'Panini', 'NFL', 'Prizm', 'Jumbo Box', '2025-02-12',
    '2024 Panini Prizm Football Jumbo Box. HTA-exclusive parallels, 4 autos per box.',
    null, '#1e40af', '#a855f7', true),
  ('2024-panini-prizm-football-mega-box', 2024, 'Panini', 'NFL', 'Prizm', 'Mega Box', '2025-02-12',
    '2024 Panini Prizm Football Mega Box. Target-exclusive parallels.',
    null, '#1e40af', '#a855f7', true),
  ('2024-panini-prizm-football-blaster-box', 2024, 'Panini', 'NFL', 'Prizm', 'Blaster Box', '2025-02-12',
    '2024 Panini Prizm Football Blaster Box. Walmart/Target retail. Lazer Prizm parallels.',
    null, '#1e40af', '#a855f7', true),
  ('2024-panini-prizm-football-hanger-box', 2024, 'Panini', 'NFL', 'Prizm', 'Hanger Box', '2025-02-12',
    '2024 Panini Prizm Football Hanger Box. Retail-exclusive Pink Pulsar parallels.',
    null, '#1e40af', '#a855f7', true),

  -- Donruss 2024 NFL retail
  ('2024-panini-donruss-football-jumbo-box', 2024, 'Panini', 'NFL', 'Donruss', 'Jumbo Box', '2024-09-25',
    '2024 Panini Donruss Football Jumbo Box. HTA configuration, Rated Rookies.',
    null, '#9a3412', '#fbbf24', true),
  ('2024-panini-donruss-football-mega-box', 2024, 'Panini', 'NFL', 'Donruss', 'Mega Box', '2024-09-25',
    '2024 Panini Donruss Football Mega Box. Retail-exclusive parallels.',
    null, '#9a3412', '#fbbf24', true),
  ('2024-panini-donruss-football-blaster-box', 2024, 'Panini', 'NFL', 'Donruss', 'Blaster Box', '2024-09-25',
    '2024 Panini Donruss Football Blaster Box. Walmart/Target retail.',
    null, '#9a3412', '#fbbf24', true),
  ('2024-panini-donruss-football-hanger-box', 2024, 'Panini', 'NFL', 'Donruss', 'Hanger Box', '2024-09-25',
    '2024 Panini Donruss Football Hanger Box. Retail.',
    null, '#9a3412', '#fbbf24', true),

  -- Donruss Optic 2024 NFL retail
  ('2024-panini-donruss-optic-football-mega-box', 2024, 'Panini', 'NFL', 'Donruss Optic', 'Mega Box', '2025-04-23',
    '2024 Panini Donruss Optic Football Mega Box. Retail-exclusive Holo parallels.',
    null, '#ea580c', '#fbbf24', true),
  ('2024-panini-donruss-optic-football-blaster-box', 2024, 'Panini', 'NFL', 'Donruss Optic', 'Blaster Box', '2025-04-23',
    '2024 Panini Donruss Optic Football Blaster Box. Walmart/Target retail.',
    null, '#ea580c', '#fbbf24', true),
  ('2024-panini-donruss-optic-football-hanger-box', 2024, 'Panini', 'NFL', 'Donruss Optic', 'Hanger Box', '2025-04-23',
    '2024 Panini Donruss Optic Football Hanger Box. Retail.',
    null, '#ea580c', '#fbbf24', true),

  -- Mosaic 2024 NFL retail
  ('2024-panini-mosaic-football-mega-box', 2024, 'Panini', 'NFL', 'Mosaic', 'Mega Box', '2025-04-09',
    '2024 Panini Mosaic Football Mega Box. Retail-exclusive Mosaic parallels.',
    null, '#7f1d1d', '#0ea5e9', true),
  ('2024-panini-mosaic-football-blaster-box', 2024, 'Panini', 'NFL', 'Mosaic', 'Blaster Box', '2025-04-09',
    '2024 Panini Mosaic Football Blaster Box. Walmart/Target retail.',
    null, '#7f1d1d', '#0ea5e9', true),

  -- Select 2024 NFL retail
  ('2024-panini-select-football-mega-box', 2024, 'Panini', 'NFL', 'Select', 'Mega Box', '2025-05-28',
    '2024 Panini Select Football Mega Box. Retail-exclusive Tie-Dye parallels.',
    null, '#dc2626', '#1e3a8a', true),
  ('2024-panini-select-football-blaster-box', 2024, 'Panini', 'NFL', 'Select', 'Blaster Box', '2025-05-28',
    '2024 Panini Select Football Blaster Box. Retail.',
    null, '#dc2626', '#1e3a8a', true),

  -- Contenders 2024 NFL retail
  ('2024-panini-contenders-football-mega-box', 2024, 'Panini', 'NFL', 'Contenders', 'Mega Box', '2025-06-11',
    '2024 Panini Contenders Football Mega Box. 1 auto + 2 memorabilia per box, Teal parallels.',
    null, '#1e40af', '#facc15', true),
  ('2024-panini-contenders-football-blaster-box', 2024, 'Panini', 'NFL', 'Contenders', 'Blaster Box', '2025-06-11',
    '2024 Panini Contenders Football Blaster Box. Retail.',
    null, '#1e40af', '#facc15', true),
  ('2024-panini-contenders-optic-football-hobby-box', 2024, 'Panini', 'NFL', 'Contenders Optic', 'Hobby Box', '2025-06-18',
    '2024 Panini Contenders Optic Football Hobby Box. Optic chrome variant of the Contenders line, Rookie Ticket Optic autos.',
    null, '#0d9488', '#facc15', true),

  -- =====================================================================
  -- 2025 NFL retail variants (Cam Ward / Travis Hunter rookie class)
  -- Prizm + Donruss already have retail variants from 0014/0026
  -- =====================================================================

  -- Donruss Optic 2025 NFL retail
  ('2025-panini-donruss-optic-football-mega-box', 2025, 'Panini', 'NFL', 'Donruss Optic', 'Mega Box', '2026-04-22',
    '2025-26 Panini Donruss Optic Football Mega Box. Retail Optichrome parallels.',
    null, '#ea580c', '#fbbf24', true),
  ('2025-panini-donruss-optic-football-blaster-box', 2025, 'Panini', 'NFL', 'Donruss Optic', 'Blaster Box', '2026-04-22',
    '2025-26 Panini Donruss Optic Football Blaster Box. Walmart/Target retail.',
    null, '#ea580c', '#fbbf24', true),
  ('2025-panini-donruss-optic-football-hanger-box', 2025, 'Panini', 'NFL', 'Donruss Optic', 'Hanger Box', '2026-04-22',
    '2025-26 Panini Donruss Optic Football Hanger Box. Retail.',
    null, '#ea580c', '#fbbf24', true),

  -- Mosaic 2025 NFL retail (we already have mega from 0014)
  ('2025-panini-mosaic-football-blaster-box', 2025, 'Panini', 'NFL', 'Mosaic', 'Blaster Box', '2025-12-17',
    '2025 Panini Mosaic Football Blaster Box. Retail Mosaic parallels.',
    null, '#7f1d1d', '#0ea5e9', true),

  -- Select 2025 NFL retail (we have hobby from 0014)
  ('2025-panini-select-football-mega-box', 2025, 'Panini', 'NFL', 'Select', 'Mega Box', '2025-11-19',
    '2025 Panini Select Football Mega Box. Retail-exclusive Tie-Dye parallels.',
    null, '#dc2626', '#1e3a8a', true),
  ('2025-panini-select-football-blaster-box', 2025, 'Panini', 'NFL', 'Select', 'Blaster Box', '2025-11-19',
    '2025 Panini Select Football Blaster Box. Retail.',
    null, '#dc2626', '#1e3a8a', true)
on conflict (slug) do nothing;

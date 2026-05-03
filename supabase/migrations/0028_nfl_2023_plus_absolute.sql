-- 0028_nfl_2023_plus_absolute.sql
-- Adds NFL coverage gaps from user's "top 10 most popular per year" list:
--   - 2023 NFL: all 10 top sets (none currently in catalog)
--   - 2024 NFL: Absolute (the only one missing from the top 10)
--
-- 2023 NFL rookie class headliners: C.J. Stroud, Bijan Robinson, Jahmyr
-- Gibbs, Jaxon Smith-Njigba, Will Levis, Sam LaPorta, Anthony Richardson.
-- All 10 sets have shipped — published immediately.
--
-- Release dates per Beckett 2023 NFL release calendar.
-- All published. Image URLs null — admin uploads as photos surface.
-- Idempotent: ON CONFLICT (slug) DO NOTHING.

insert into skus (
  slug, year, brand, sport, set_name, product, release_date,
  description, image_url, gradient_from, gradient_to, is_published
)
values
  -- =====================================================================
  -- 2023 NFL top 10 (C.J. Stroud / Bijan Robinson / Jahmyr Gibbs class)
  -- =====================================================================

  ('2023-panini-prizm-football-hobby-box', 2023, 'Panini', 'NFL', 'Prizm', 'Hobby Box', '2024-02-21',
    '2023 Panini Prizm Football Hobby Box. The flagship NFL hobby release. C.J. Stroud, Bijan Robinson, Jahmyr Gibbs rookies. 12 packs per box.',
    null, '#1e40af', '#a855f7', true),

  ('2023-panini-donruss-optic-football-hobby-box', 2023, 'Panini', 'NFL', 'Donruss Optic', 'Hobby Box', '2024-04-10',
    '2023 Panini Donruss Optic Football Hobby Box. Holo prizm parallels, Rated Rookies on chrome.',
    null, '#ea580c', '#fbbf24', true),

  ('2023-panini-select-football-hobby-box', 2023, 'Panini', 'NFL', 'Select', 'Hobby Box', '2024-05-22',
    '2023 Panini Select Football Hobby Box. Concourse, Premier, Field Level, Club Level tiers.',
    null, '#dc2626', '#1e3a8a', true),

  ('2023-panini-mosaic-football-hobby-box', 2023, 'Panini', 'NFL', 'Mosaic', 'Hobby Box', '2024-04-17',
    '2023 Panini Mosaic Football Hobby Box. Vibrant prizm-style parallels.',
    null, '#7f1d1d', '#0ea5e9', true),

  ('2023-panini-contenders-football-hobby-box', 2023, 'Panini', 'NFL', 'Contenders', 'Hobby Box', '2024-06-19',
    '2023 Panini Contenders Football Hobby Box. 5 autos per box including 1 hard-signed. The hobby Rookie Ticket auto chase.',
    null, '#1e40af', '#facc15', true),

  ('2023-panini-donruss-football-hobby-box', 2023, 'Panini', 'NFL', 'Donruss', 'Hobby Box', '2023-09-13',
    '2023 Panini Donruss Football Hobby Box. Rated Rookies, Optic Press Proofs, 24 packs per box.',
    null, '#9a3412', '#fbbf24', true),

  ('2023-panini-national-treasures-football-hobby-box', 2023, 'Panini', 'NFL', 'National Treasures', 'Hobby Box', '2024-08-14',
    '2023 Panini National Treasures Football Hobby Box. Ultra-premium with patch autos and 1/1s.',
    null, '#171717', '#a16207', true),

  ('2023-panini-immaculate-football-hobby-box', 2023, 'Panini', 'NFL', 'Immaculate', 'Hobby Box', '2024-07-24',
    '2023 Panini Immaculate Football Hobby Box. 5 autos or memorabilia per box. Premium high-end.',
    null, '#1f2937', '#f43f5e', true),

  ('2023-panini-absolute-football-hobby-box', 2023, 'Panini', 'NFL', 'Absolute', 'Hobby Box', '2023-10-25',
    '2023 Panini Absolute Football Hobby Box. Kaboom! inserts, 4 autos or memorabilia per box.',
    null, '#7c2d12', '#f59e0b', true),

  ('2023-panini-spectra-football-hobby-box', 2023, 'Panini', 'NFL', 'Spectra', 'Hobby Box', '2024-06-26',
    '2023 Panini Spectra Football Hobby Box. Chrome refractor parallels, premium on-card autos.',
    null, '#581c87', '#22d3ee', true),

  -- 2023 NFL Phoenix is also popular but didn't make the user's top 10.
  -- Adding for completeness since it's actively traded.
  ('2023-panini-phoenix-football-hobby-box', 2023, 'Panini', 'NFL', 'Phoenix', 'Hobby Box', '2023-12-13',
    '2023 Panini Phoenix Football Hobby Box. Rookie Autograph Jersey cards, vast parallel roster.',
    null, '#b91c1c', '#f59e0b', true),

  -- =====================================================================
  -- 2024 NFL Absolute (was missing from migration 0026)
  -- Released October 2024 — already shipped.
  -- =====================================================================

  ('2024-panini-absolute-football-hobby-box', 2024, 'Panini', 'NFL', 'Absolute', 'Hobby Box', '2024-10-23',
    '2024 Panini Absolute Football Hobby Box. Kaboom! inserts, 4 autos or memorabilia per box. Caleb Williams, Jayden Daniels rookie class.',
    null, '#7c2d12', '#f59e0b', true)

on conflict (slug) do nothing;

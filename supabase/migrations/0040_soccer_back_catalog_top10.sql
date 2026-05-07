-- 0040_soccer_back_catalog_top10.sql
-- Top 10 most-traded soccer products from the past few seasons that
-- weren't in the catalog yet. Existing 0032 covered UEFA Topps Chrome
-- and Bundesliga 2024-25 onward; this fills the back-catalog gaps:
--
--   Panini Prizm Premier League — annual PL flagship from Panini
--     (the main PL premium product, comparable to Prizm NBA/NFL).
--     2022-23, 2023-24, 2024-25.
--   Topps Chrome Bundesliga — 2022-23 and 2023-24 (we had 2024-25).
--   Topps Chrome UEFA Champions League — 2022-23 (the precursor name
--     before "Club Competitions" rebrand in 2024-25).
--   Topps Chrome Sapphire UEFA Champions League — 2022-23 and
--     2023-24 (online-exclusive premium chrome).
--   Topps Stadium Club Chrome UEFA — 2022-23 and 2023-24.
--
-- Each box gets a matching hobby case row (recase by slug).
-- Image_url null until admin uploads. Idempotent ON CONFLICT DO NOTHING.

insert into skus (
  slug, year, brand, sport, set_name, product, release_date,
  description, image_url, gradient_from, gradient_to, is_published
)
values
  -- =====================================================================
  -- Panini Prizm Premier League — 3 seasons
  -- The main PL flagship from Panini. Hobby box: 1 auto, multi-pack
  -- with deep parallel ladder (Silver, Hyper, Mojo, etc.).
  -- =====================================================================

  ('2022-23-panini-prizm-premier-league-soccer-hobby-box', 2022, 'Panini', 'Soccer', 'Prizm Premier League', 'Hobby Box', '2023-04-19',
    '2022-23 Panini Prizm Premier League Hobby Box. Erling Haaland and Bukayo Saka rookie-card chase. Silver/Hyper/Mojo prizm parallel ladder, 1 auto per box.',
    null, '#1e40af', '#a855f7', true),

  ('2022-23-panini-prizm-premier-league-soccer-hobby-case', 2022, 'Panini', 'Soccer', 'Prizm Premier League', 'Hobby Case', '2023-04-19',
    '2022-23 Panini Prizm Premier League Hobby Case. Sealed case of 12 hobby boxes.',
    null, '#1e40af', '#a855f7', true),

  ('2023-24-panini-prizm-premier-league-soccer-hobby-box', 2023, 'Panini', 'Soccer', 'Prizm Premier League', 'Hobby Box', '2024-05-22',
    '2023-24 Panini Prizm Premier League Hobby Box. Cole Palmer breakout season, Jude Bellingham + Saka chase. Premium parallel ladder, 1 auto per box.',
    null, '#1e40af', '#a855f7', true),

  ('2023-24-panini-prizm-premier-league-soccer-hobby-case', 2023, 'Panini', 'Soccer', 'Prizm Premier League', 'Hobby Case', '2024-05-22',
    '2023-24 Panini Prizm Premier League Hobby Case. Sealed case of 12 hobby boxes.',
    null, '#1e40af', '#a855f7', true),

  ('2024-25-panini-prizm-premier-league-soccer-hobby-box', 2024, 'Panini', 'Soccer', 'Prizm Premier League', 'Hobby Box', '2025-06-04',
    '2024-25 Panini Prizm Premier League Hobby Box. Latest PL Prizm release with full parallel ladder. 1 auto per box.',
    null, '#1e40af', '#a855f7', true),

  ('2024-25-panini-prizm-premier-league-soccer-hobby-case', 2024, 'Panini', 'Soccer', 'Prizm Premier League', 'Hobby Case', '2025-06-04',
    '2024-25 Panini Prizm Premier League Hobby Case. Sealed case of 12 hobby boxes.',
    null, '#1e40af', '#a855f7', true),

  -- =====================================================================
  -- Topps Chrome Bundesliga — 2 seasons (we already have 2024-25)
  -- =====================================================================

  ('2022-23-topps-chrome-bundesliga-soccer-hobby-box', 2022, 'Topps', 'Soccer', 'Chrome Bundesliga', 'Hobby Box', '2023-06-21',
    '2022-23 Topps Chrome Bundesliga Hobby Box. German top-flight chrome, refractor parallels, 1 auto per box.',
    null, '#0c4a6e', '#fbbf24', true),

  ('2022-23-topps-chrome-bundesliga-soccer-hobby-case', 2022, 'Topps', 'Soccer', 'Chrome Bundesliga', 'Hobby Case', '2023-06-21',
    '2022-23 Topps Chrome Bundesliga Hobby Case. Sealed case of hobby boxes.',
    null, '#0c4a6e', '#fbbf24', true),

  ('2023-24-topps-chrome-bundesliga-soccer-hobby-box', 2023, 'Topps', 'Soccer', 'Chrome Bundesliga', 'Hobby Box', '2024-06-19',
    '2023-24 Topps Chrome Bundesliga Hobby Box. Florian Wirtz, Jamal Musiala, Harry Kane (Bayern) chase. Refractor parallels.',
    null, '#0c4a6e', '#fbbf24', true),

  ('2023-24-topps-chrome-bundesliga-soccer-hobby-case', 2023, 'Topps', 'Soccer', 'Chrome Bundesliga', 'Hobby Case', '2024-06-19',
    '2023-24 Topps Chrome Bundesliga Hobby Case. Sealed case of hobby boxes.',
    null, '#0c4a6e', '#fbbf24', true),

  -- =====================================================================
  -- Topps Chrome UEFA Champions League 2022-23
  -- (precursor to "Club Competitions" rebrand in 2024-25)
  -- =====================================================================

  ('2022-23-topps-chrome-uefa-champions-league-soccer-hobby-box', 2022, 'Topps', 'Soccer', 'Chrome UEFA Champions League', 'Hobby Box', '2023-04-12',
    '2022-23 Topps Chrome UEFA Champions League Hobby Box. The precursor before the 2024-25 rebrand to Club Competitions. Rodrygo/Vinicius Real Madrid title-winning season chase. Refractor parallels.',
    null, '#0ea5e9', '#1e3a8a', true),

  ('2022-23-topps-chrome-uefa-champions-league-soccer-hobby-case', 2022, 'Topps', 'Soccer', 'Chrome UEFA Champions League', 'Hobby Case', '2023-04-12',
    '2022-23 Topps Chrome UEFA Champions League Hobby Case. Sealed case of hobby boxes.',
    null, '#0ea5e9', '#1e3a8a', true),

  -- =====================================================================
  -- Topps Chrome Sapphire UEFA Champions League — 2 seasons
  -- (online-exclusive premium chrome variant)
  -- =====================================================================

  ('2022-23-topps-chrome-sapphire-edition-uefa-champions-league-soccer-hobby-box', 2022, 'Topps', 'Soccer', 'Chrome Sapphire Edition UEFA Champions League', 'Hobby Box', '2023-08-09',
    '2022-23 Topps Chrome Sapphire Edition UEFA Champions League Hobby Box. Premium online-exclusive chrome variant with sapphire/aqua/orange refractor parallels.',
    null, '#0c4a6e', '#1e40af', true),

  ('2022-23-topps-chrome-sapphire-edition-uefa-champions-league-soccer-hobby-case', 2022, 'Topps', 'Soccer', 'Chrome Sapphire Edition UEFA Champions League', 'Hobby Case', '2023-08-09',
    '2022-23 Topps Chrome Sapphire Edition UEFA Champions League Hobby Case. Sealed case of hobby boxes.',
    null, '#0c4a6e', '#1e40af', true),

  ('2023-24-topps-chrome-sapphire-edition-uefa-club-competitions-soccer-hobby-box', 2023, 'Topps', 'Soccer', 'Chrome Sapphire Edition UEFA Club Competitions', 'Hobby Box', '2024-08-14',
    '2023-24 Topps Chrome Sapphire Edition UEFA Club Competitions Hobby Box. Online-exclusive premium chrome.',
    null, '#0c4a6e', '#1e40af', true),

  ('2023-24-topps-chrome-sapphire-edition-uefa-club-competitions-soccer-hobby-case', 2023, 'Topps', 'Soccer', 'Chrome Sapphire Edition UEFA Club Competitions', 'Hobby Case', '2024-08-14',
    '2023-24 Topps Chrome Sapphire Edition UEFA Club Competitions Hobby Case. Sealed case of hobby boxes.',
    null, '#0c4a6e', '#1e40af', true),

  -- =====================================================================
  -- Topps Stadium Club Chrome UEFA — 2 seasons (we have 2024-25)
  -- =====================================================================

  ('2022-23-topps-stadium-club-chrome-uefa-champions-league-soccer-hobby-box', 2022, 'Topps', 'Soccer', 'Stadium Club Chrome UEFA Champions League', 'Hobby Box', '2023-11-08',
    '2022-23 Topps Stadium Club Chrome UEFA Champions League Hobby Box. Photography-driven chrome with on-card autographs.',
    null, '#0c4a6e', '#9ca3af', true),

  ('2022-23-topps-stadium-club-chrome-uefa-champions-league-soccer-hobby-case', 2022, 'Topps', 'Soccer', 'Stadium Club Chrome UEFA Champions League', 'Hobby Case', '2023-11-08',
    '2022-23 Topps Stadium Club Chrome UEFA Champions League Hobby Case. Sealed case of hobby boxes.',
    null, '#0c4a6e', '#9ca3af', true),

  ('2023-24-topps-stadium-club-chrome-uefa-club-competitions-soccer-hobby-box', 2023, 'Topps', 'Soccer', 'Stadium Club Chrome UEFA Club Competitions', 'Hobby Box', '2024-10-09',
    '2023-24 Topps Stadium Club Chrome UEFA Club Competitions Hobby Box. Photography-driven chrome with on-card autographs.',
    null, '#0c4a6e', '#9ca3af', true),

  ('2023-24-topps-stadium-club-chrome-uefa-club-competitions-soccer-hobby-case', 2023, 'Topps', 'Soccer', 'Stadium Club Chrome UEFA Club Competitions', 'Hobby Case', '2024-10-09',
    '2023-24 Topps Stadium Club Chrome UEFA Club Competitions Hobby Case. Sealed case of hobby boxes.',
    null, '#0c4a6e', '#9ca3af', true)

on conflict (slug) do nothing;

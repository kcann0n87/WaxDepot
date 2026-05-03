-- 0026_nfl_catalog_expansion.sql
-- Fills out NFL coverage for 2024 (Caleb Williams / Jayden Daniels
-- rookie class — all released between mid-2024 and mid-2025) and the
-- 2025 NFL gaps where popular product lines were missing from earlier
-- migrations. Sources: Beckett, Panini America, DA Card World, Steel
-- City Collectibles release calendars.
--
-- Dates are best-known street dates per Beckett. Products that haven't
-- shipped yet keep an estimated date — admin can adjust per SKU after
-- import.
--
-- All SKUs published (is_published = true) since these are real
-- products buyers actively trade. Images are null for now — admin
-- uploads via /admin/catalog inline upload as Beckett / retailer
-- product photos become available.
--
-- variant_group + variant_type derive automatically via the trigger
-- from migration 0013/0016/0018/0019.
--
-- Idempotent: ON CONFLICT (slug) DO NOTHING — re-runs safely.

insert into skus (
  slug, year, brand, sport, set_name, product, release_date,
  description, image_url, gradient_from, gradient_to, is_published
)
values
  -- =====================================================================
  -- 2024 NFL (Panini era — Caleb Williams / Jayden Daniels / Marvin Harrison Jr. rookie class)
  -- =====================================================================
  ('2024-panini-prizm-football-hobby-box', 2024, 'Panini', 'NFL', 'Prizm', 'Hobby Box', '2025-02-12',
    '2024 Panini Prizm Football Hobby Box. The flagship NFL hobby release. 12 packs per box. Caleb Williams, Jayden Daniels, Marvin Harrison Jr. rookies.',
    null, '#1e40af', '#a855f7', true),

  ('2024-panini-prizm-football-fotl-hobby-box', 2024, 'Panini', 'NFL', 'Prizm FOTL', 'FOTL Hobby Box', '2025-02-05',
    '2024 Panini Prizm Football First Off The Line Hobby Box. FOTL-exclusive parallels and on-card autos. Limited release.',
    null, '#7f1d1d', '#1e3a8a', true),

  ('2024-panini-donruss-football-hobby-box', 2024, 'Panini', 'NFL', 'Donruss', 'Hobby Box', '2024-09-25',
    '2024 Panini Donruss Football Hobby Box. Rated Rookies, Optic Press Proofs, 24 packs per box. The hobby tradition.',
    null, '#9a3412', '#fbbf24', true),

  ('2024-panini-donruss-optic-football-hobby-box', 2024, 'Panini', 'NFL', 'Donruss Optic', 'Hobby Box', '2025-04-23',
    '2024 Panini Donruss Optic Football Hobby Box. Holo prizm parallels, Rated Rookies on chrome. 20 packs per box.',
    null, '#ea580c', '#fbbf24', true),

  ('2024-panini-mosaic-football-hobby-box', 2024, 'Panini', 'NFL', 'Mosaic', 'Hobby Box', '2025-04-09',
    '2024 Panini Mosaic Football Hobby Box. Vibrant prizm-style parallels. 12 packs per box.',
    null, '#7f1d1d', '#0ea5e9', true),

  ('2024-panini-select-football-hobby-box', 2024, 'Panini', 'NFL', 'Select', 'Hobby Box', '2025-05-28',
    '2024 Panini Select Football Hobby Box. Concourse, Premier, Field Level, Club Level tiers. 12 packs per box, 5 cards per pack.',
    null, '#dc2626', '#1e3a8a', true),

  ('2024-panini-phoenix-football-hobby-box', 2024, 'Panini', 'NFL', 'Phoenix', 'Hobby Box', '2024-12-04',
    '2024 Panini Phoenix Football Hobby Box. Rookie Autograph Jersey cards, vast parallel roster. Hobby Preferred 12 packs per box.',
    null, '#b91c1c', '#f59e0b', true),

  ('2024-panini-spectra-football-hobby-box', 2024, 'Panini', 'NFL', 'Spectra', 'Hobby Box', '2025-06-25',
    '2024 Panini Spectra Football Hobby Box. Chrome refractor parallels, premium on-card autos.',
    null, '#581c87', '#22d3ee', true),

  ('2024-panini-immaculate-football-hobby-box', 2024, 'Panini', 'NFL', 'Immaculate', 'Hobby Box', '2025-07-23',
    '2024 Panini Immaculate Football Hobby Box. 5 autos or memorabilia per box. Premium high-end release.',
    null, '#1f2937', '#f43f5e', true),

  ('2024-panini-national-treasures-football-hobby-box', 2024, 'Panini', 'NFL', 'National Treasures', 'Hobby Box', '2025-08-13',
    '2024 Panini National Treasures Football Hobby Box. Ultra-premium with patch autos and 1/1s. The hobby flagship for high-end NFL.',
    null, '#171717', '#a16207', true),

  ('2024-panini-flawless-football-hobby-box', 2024, 'Panini', 'NFL', 'Flawless', 'Hobby Box', '2025-09-17',
    '2024 Panini Flawless Football Hobby Box. Diamond-encrusted designs, premium auto/relic content. Top of the high-end NFL stack.',
    null, '#1e1b4b', '#f0abfc', true),

  ('2024-panini-one-football-hobby-box', 2024, 'Panini', 'NFL', 'One', 'Hobby Box', '2025-09-04',
    '2024 Panini One Football Hobby Box. Single-card-per-pack premium release. Each box guarantees high-end content.',
    null, '#0f172a', '#fbbf24', true),

  ('2024-panini-certified-football-hobby-box', 2024, 'Panini', 'NFL', 'Certified', 'Hobby Box', '2024-11-13',
    '2024 Panini Certified Football Hobby Box. Freshman Fabric Signatures, 242-card base set. 1 FFS auto + 1 other auto + 2 memorabilia per box.',
    null, '#374151', '#facc15', true),

  -- =====================================================================
  -- 2025 NFL gaps — popular sets missing from earlier migrations
  -- (released 2025-2026, mid-Topps-NFL transition)
  -- =====================================================================
  ('2025-panini-donruss-optic-football-hobby-box', 2025, 'Panini', 'NFL', 'Donruss Optic', 'Hobby Box', '2026-04-22',
    '2025-26 Panini Donruss Optic Football Hobby Box. Holo prizm parallels of Cam Ward, Travis Hunter rookies. One of the last Panini NFL Optic releases before the Topps transition.',
    null, '#ea580c', '#fbbf24', true),

  ('2025-panini-phoenix-football-hobby-box', 2025, 'Panini', 'NFL', 'Phoenix', 'Hobby Box', '2025-12-10',
    '2025 Panini Phoenix Football Hobby Box. Rookie Autograph Jersey cards, Paragon and Thunderbirds inserts. Hobby Preferred 12 packs per box.',
    null, '#b91c1c', '#f59e0b', true),

  ('2025-panini-spectra-football-hobby-box', 2025, 'Panini', 'NFL', 'Spectra', 'Hobby Box', '2026-06-24',
    '2025 Panini Spectra Football Hobby Box. Chrome refractor parallels, premium on-card autos of Cam Ward, Travis Hunter, Ashton Jeanty.',
    null, '#581c87', '#22d3ee', true),

  ('2025-panini-flawless-football-hobby-box', 2025, 'Panini', 'NFL', 'Flawless', 'Hobby Box', '2026-09-16',
    '2025 Panini Flawless Football Hobby Box. Diamond-encrusted designs, premium auto/relic content. Among the last Panini Flawless NFL releases.',
    null, '#1e1b4b', '#f0abfc', true),

  ('2025-panini-certified-football-hobby-box', 2025, 'Panini', 'NFL', 'Certified', 'Hobby Box', '2025-11-05',
    '2025 Panini Certified Football Hobby Box. ~2 autos + 2 memorabilia + 10 inserts + 3 numbered parallels per box.',
    null, '#374151', '#facc15', true),

  ('2025-panini-honors-football-hobby-box', 2025, 'Panini', 'NFL', 'Honors', 'Hobby Box', '2026-01-14',
    '2025 Panini Honors Football Hobby Box. On-card buybacks plus 2 autos per box including Recollection Collection or Originals. Online exclusive at $225.',
    null, '#1c1917', '#fbbf24', true)
on conflict (slug) do nothing;

-- 0011_sealed_cases.sql
-- Adds sealed-case SKUs for the most-listed hobby boxes. Each case re-uses
-- the existing hobby-box product photo (case packshots are inconsistently
-- available on retailer CDNs and the inner box image is what buyers
-- recognize). Admins can replace any case image via /admin/catalog.
--
-- Idempotent: ON CONFLICT (slug) DO NOTHING — re-running this is safe.

insert into skus (slug, year, brand, sport, set_name, product, release_date, description, image_url, gradient_from, gradient_to)
values
  -- NBA (basketball)
  ('2025-26-topps-cosmic-chrome-basketball-hobby-case', 2025, 'Topps', 'NBA', 'Cosmic Chrome', 'Hobby Case', '2026-05-01',
    '2025-26 Topps Cosmic Chrome Basketball Hobby Case. 12 hobby boxes per case, 24 autos guaranteed. Cooper Flagg, Dylan Harper rookies.',
    '/products/2025-26-topps-cosmic-chrome-basketball-hobby-box.jpg', '#7c3aed', '#0ea5e9'),
  ('2025-26-panini-prizm-basketball-hobby-case', 2025, 'Panini', 'NBA', 'Prizm', 'Hobby Case', '2026-03-15',
    'Panini Prizm Basketball Hobby Case. 12 hobby boxes per case. The flagship NBA hobby release.',
    '/products/2025-26-panini-prizm-basketball-hobby-box.jpg', '#dc2626', '#facc15'),
  ('2024-25-panini-immaculate-basketball-hobby-case', 2024, 'Panini', 'NBA', 'Immaculate', 'Hobby Case', '2025-03-05',
    'Premium Immaculate Basketball Hobby Case. 5 hobby boxes per case, 25 autos or memorabilia.',
    '/products/2024-25-panini-immaculate-basketball-hobby-box.jpg', '#000000', '#a78bfa'),
  ('2024-25-panini-national-treasures-basketball-hobby-case', 2024, 'Panini', 'NBA', 'National Treasures', 'Hobby Case', '2025-06-18',
    'National Treasures Basketball Hobby Case. 4 hobby boxes per case, 32 autos or memorabilia.',
    '/products/2024-25-panini-national-treasures-basketball-hobby-box.jpg', '#1c1917', '#fbbf24'),
  ('2024-25-panini-donruss-optic-basketball-hobby-case', 2024, 'Panini', 'NBA', 'Donruss Optic', 'Hobby Case', '2025-01-22',
    'Donruss Optic Basketball Hobby Case. 12 hobby boxes per case, holo prizm parallels.',
    '/products/2024-25-panini-donruss-optic-basketball-hobby-box.jpg', '#ea580c', '#fbbf24'),
  ('2024-25-panini-select-basketball-hobby-case', 2024, 'Panini', 'NBA', 'Select', 'Hobby Case', '2025-04-02',
    'Panini Select Basketball Hobby Case. 12 hobby boxes per case.',
    '/products/2024-25-panini-select-basketball-hobby-box.jpg', '#0f172a', '#7c3aed'),

  -- MLB (baseball)
  ('2024-topps-chrome-baseball-hobby-case', 2024, 'Topps', 'MLB', 'Chrome', 'Hobby Case', '2024-08-21',
    '2024 Topps Chrome Baseball Hobby Case. 12 hobby boxes per case, 24 autos.',
    '/products/2024-topps-chrome-baseball-hobby-box.jpg', '#16a34a', '#84cc16'),
  ('2024-bowman-chrome-baseball-hobby-case', 2024, 'Bowman', 'MLB', 'Bowman Chrome', 'Hobby Case', '2024-11-06',
    'Bowman Chrome Baseball Hobby Case. 12 hobby boxes per case, 24 autos. Top MLB prospects.',
    '/products/2024-bowman-chrome-baseball-hobby-box.jpg', '#0d9488', '#06b6d4'),
  ('2025-topps-series-1-baseball-hobby-case', 2025, 'Topps', 'MLB', 'Series 1', 'Hobby Case', '2025-02-12',
    'Topps Series 1 Baseball Hobby Case. 12 hobby boxes per case.',
    '/products/2025-topps-series-1-baseball-hobby-box.jpg', '#0369a1', '#fbbf24'),

  -- NFL (football)
  ('2025-panini-prizm-football-hobby-case', 2025, 'Panini', 'NFL', 'Prizm', 'Hobby Case', '2025-12-10',
    'Prizm Football Hobby Case. 12 hobby boxes per case. The hobby flagship NFL product.',
    '/products/2025-panini-prizm-football-hobby-box.jpg', '#1e40af', '#a855f7'),
  ('2025-panini-select-football-hobby-case', 2025, 'Panini', 'NFL', 'Select', 'Hobby Case', '2025-11-19',
    'Select Football Hobby Case. 12 hobby boxes per case. Concourse, Premier, Club Level tiers.',
    '/products/2025-panini-select-football-hobby-box.jpg', '#dc2626', '#1e3a8a'),
  ('2025-panini-national-treasures-football-hobby-case', 2025, 'Panini', 'NFL', 'National Treasures', 'Hobby Case', '2026-02-25',
    'National Treasures Football Hobby Case. 4 hobby boxes per case, 32 autos/relics.',
    '/products/2025-panini-national-treasures-football-hobby-box.jpg', '#171717', '#a16207'),

  -- NHL (hockey)
  ('2024-25-upper-deck-series-1-hockey-hobby-case', 2024, 'Upper Deck', 'NHL', 'Series 1', 'Hobby Case', '2024-11-13',
    'Upper Deck Series 1 Hockey Hobby Case. 12 hobby boxes per case, Young Guns rookies.',
    '/products/2024-25-upper-deck-series-1-hockey-hobby-box.jpg', '#0891b2', '#1e3a8a'),
  ('2024-25-upper-deck-the-cup-hockey-hobby-case', 2024, 'Upper Deck', 'NHL', 'The Cup', 'Hobby Case', '2025-09-17',
    'Upper Deck The Cup Hockey Hobby Case. 3 hobby boxes per case, 18 hits total. The crown jewel of hockey.',
    '/products/2024-25-upper-deck-the-cup-hockey-hobby-box.jpg', '#000000', '#fbbf24')
on conflict (slug) do nothing;

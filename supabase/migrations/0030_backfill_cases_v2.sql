-- 0030_backfill_cases_v2.sql
-- Re-runs the case auto-generation pattern from migration 0020, this
-- time covering:
--   - All NEW box-variant SKUs added in migrations 0026, 0027, 0028
--     (didn't exist when 0020 ran, so they have no case siblings yet)
--   - Pokemon TCG variants (booster-box, elite-trainer-box) — these
--     were excluded from 0020 but ARE legitimate "sealed case of N
--     units" in the wild
--
-- A "case" is a sealed retail case of N units of the same single-box
-- variant. NOT specifically "Hobby Case" — could be a Mega Case (case
-- of mega boxes), Blaster Case (case of blasters), Booster Box Case
-- (sealed pallet of booster boxes), etc. Each has its own market price
-- distinct from buying N individual units.
--
-- Naming rule: replace trailing "-box" suffix with "-case". Special
-- handling for booster-box and elite-trainer-box (the case form is
-- "booster-box-case" not "booster-case", because the pack format is
-- already named "booster-box").
--
-- Idempotent — NOT EXISTS guard + ON CONFLICT DO NOTHING.

-- ===========================================================================
-- Part 1: Standard box → case rename (replace trailing "-box" with "-case")
-- Covers: hobby-box, mega-box, blaster-box, hanger-box, jumbo-box,
--         hobby-jumbo-box, fotl-hobby-box, first-day-issue-hobby-box,
--         first-day-issue-hobby-jumbo-box
-- ===========================================================================

insert into skus (
  slug, year, brand, sport, set_name, product, release_date,
  description, image_url, gradient_from, gradient_to, is_published
)
select
  substring(slug for length(slug) - 4) || '-case' as new_slug,
  year, brand, sport, set_name,
  replace(product, ' Box', ' Case') as product,
  release_date,
  case
    when description like '% Box.%' then replace(description, ' Box.', ' Case.')
    when description like '% Box %' then replace(description, ' Box ', ' Case ')
    else coalesce(description, '') || ' (Sealed case)'
  end as description,
  image_url,
  gradient_from,
  gradient_to,
  is_published
from skus
where variant_type in (
  'hobby-box',
  'mega-box',
  'blaster-box',
  'hanger-box',
  'jumbo-box',
  'hobby-jumbo-box',
  'fotl-hobby-box',
  'first-day-issue-hobby-box',
  'first-day-issue-hobby-jumbo-box'
)
and not exists (
  select 1 from skus s2
  where s2.slug = substring(skus.slug for length(skus.slug) - 4) || '-case'
)
on conflict (slug) do nothing;

-- ===========================================================================
-- Part 2: Pokemon TCG cases — special suffix handling
-- "booster-box" → "booster-box-case" (case of booster boxes, ~6 BBs/case)
-- "elite-trainer-box" → "elite-trainer-box-case" (case of ETBs, ~10/case)
-- ===========================================================================

insert into skus (
  slug, year, brand, sport, set_name, product, release_date,
  description, image_url, gradient_from, gradient_to, is_published
)
select
  slug || '-case' as new_slug,
  year, brand, sport, set_name,
  product || ' Case' as product,
  release_date,
  case
    when description like '% Box.%' then replace(description, ' Box.', ' Box Case.')
    else coalesce(description, '') || ' (Sealed case)'
  end as description,
  image_url,
  gradient_from,
  gradient_to,
  is_published
from skus
where variant_type in ('booster-box', 'elite-trainer-box')
and not exists (
  select 1 from skus s2
  where s2.slug = skus.slug || '-case'
)
on conflict (slug) do nothing;

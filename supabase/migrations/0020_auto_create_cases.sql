-- 0020_auto_create_cases.sql
-- For every existing box SKU, create a corresponding case SKU so the
-- variant selector on the product page actually shows a "Sealed case"
-- section. Without case SKUs, the cases group never renders even though
-- the variant_types are defined.
--
-- Strategy:
--   - Generate case slug by replacing "-box" suffix with "-case" suffix
--   - Reuse the matching box's image_url, year, brand, sport, set_name,
--     gradient, release_date — all shared
--   - Convert "X Box" -> "X Case" in product field and description
--   - ON CONFLICT DO NOTHING so we don't duplicate existing case SKUs
--   - Skip booster-box and elite-trainer-box (Pokemon TCG uses
--     "-box-case" naming, those need separate handling and the market
--     for Pokemon cases is small enough that admin can add manually)
--
-- Idempotent: re-running won't create duplicates because of the
-- conflict-do-nothing on the unique slug index.

insert into skus (
  slug, year, brand, sport, set_name, product, release_date,
  description, image_url, gradient_from, gradient_to
)
select
  -- Strip the trailing -box suffix and append -case. We use rtrim-style
  -- logic via substring + length so we only touch the suffix, not any
  -- accidental "-box" earlier in the slug.
  substring(slug for length(slug) - 4) || '-case' as new_slug,
  year,
  brand,
  sport,
  set_name,
  -- "Hobby Box" -> "Hobby Case", "Mega Box" -> "Mega Case", etc.
  -- The replace is global but " Box" with a leading space won't match
  -- anywhere else in our product values.
  replace(product, ' Box', ' Case') as product,
  release_date,
  -- Description: replace any " Box." with " Case." and " Box " with
  -- " Case ". Falls back to original description with " (case)" suffix
  -- if neither replace finds a hit.
  case
    when description like '% Box.%' then replace(description, ' Box.', ' Case.')
    when description like '% Box %' then replace(description, ' Box ', ' Case ')
    else coalesce(description, '') || ' (Sealed case)'
  end as description,
  image_url,
  gradient_from,
  gradient_to
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
-- Don't create a case if its target slug already exists as a SKU.
and not exists (
  select 1 from skus s2
  where s2.slug = substring(skus.slug for length(skus.slug) - 4) || '-case'
)
on conflict (slug) do nothing;

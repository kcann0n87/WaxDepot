-- 0039_catalog_corrections_panini_nba_license.sql
-- Catalog corrections after the Panini → Topps NBA license transition:
--
-- Panini's NBA license ended after the 2024-25 season. Panini Prizm
-- Basketball 2024-25 was the final NBA-licensed Prizm release. Any
-- 2025-26 Panini Prizm NBA SKU we have is fabricated — Panini cannot
-- ship NBA-team-logo product after Oct 1, 2025.
--
-- Also: 2025-26 Topps Bowman U Basketball had a wrong-year image
-- bound. Nulling so the gradient fallback shows until admin uploads
-- the correct 2025-26 product photo.
--
-- Idempotent — UPDATEs are safe to re-run.

-- Hide the fabricated 2025-26 Panini Prizm NBA case (the box was
-- never created as its own row, only referenced as image_url on the
-- case). Setting is_published=false keeps the row for historical
-- audit trail without surfacing it in the catalog.
update skus
  set is_published = false,
      description = '⚠ Panini lost the NBA license after 2024-25 — this SKU should not have been added. Hidden from catalog.'
  where slug = '2025-26-panini-prizm-basketball-hobby-case';

-- Null the wrong-year image on Bowman U so the gradient fallback
-- shows. Real 2025-26 Bowman U image needs to be uploaded by admin.
update skus set image_url = null
  where slug in (
    '2025-26-topps-bowman-u-basketball-hobby-box',
    '2025-26-topps-bowman-u-basketball-hobby-case'
  );

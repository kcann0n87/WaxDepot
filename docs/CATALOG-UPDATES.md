# Catalog updates — workflow

Three ways new SKUs land in the catalog. They overlap intentionally — the
same SKU can come in via any path and ON CONFLICT (slug) DO NOTHING keeps
re-runs safe.

## 1 · Manual add (the fast path)

When you spot a new release on Beckett / Topps Store / Panini America and
want to add it now, paste the product details in this chat and I'll draft
a migration. The pattern follows `0037_weekly_drops_chromeplatinum_signatureclass.sql`:

```sql
-- 00XX_<short-name>.sql
-- One-line context: where you found it, what season/sport/release date.
-- Idempotent: ON CONFLICT (slug) DO NOTHING.

insert into skus (
  slug, year, brand, sport, set_name, product, release_date,
  description, image_url, gradient_from, gradient_to, is_published
)
values
  ('<year>-<brand-slug>-<set-slug>-<sport>-hobby-box', <year>, '<Brand>', '<NBA|MLB|NFL|NHL|Soccer|Pokemon>',
   '<Set Name>', 'Hobby Box', '<YYYY-MM-DD release>',
   '<one-paragraph description with pack/box/auto config>',
   null, '<gradient_from hex>', '<gradient_to hex>', true),

  ('<same with -hobby-case>', <year>, '<Brand>', '<sport>',
   '<Set Name>', 'Hobby Case', '<YYYY-MM-DD release>',
   '<one-line case description>',
   null, '<same gradient_from>', '<same gradient_to>', true)

on conflict (slug) do nothing;
```

### Slug rules

- Lowercase, dashes only, no apostrophes/ampersands
- Year prefix: `2025-…` for single-year sets (MLB, NFL, MLS, World Cup),
  `2025-26-…` for split-year seasons (NBA, NHL, UEFA, Premier League)
- Sport segment: `basketball`, `football`, `hockey`, `baseball`, `soccer`,
  `pokemon-tcg`
- Variant suffix: `-hobby-box`, `-hobby-case`, `-blaster-box`, `-mega-box`,
  `-jumbo-box`, `-value-box`, `-hanger-box`. Cases auto-derive from boxes
  by replacing `-box` with `-case`.
- Examples that work:
  - `2025-26-topps-chrome-uefa-club-competitions-soccer-hobby-box`
  - `2025-topps-finest-football-hobby-box`
  - `2025-26-panini-noir-road-to-fifa-world-cup-soccer-hobby-box`

### Required fields

- `slug` — unique, follows the rules above
- `year` — set year (the season or release year — e.g. 2025 for "2025
  Topps Finest Football", 2025 for "2025-26 Topps Chrome NBA")
- `brand`, `set_name`, `sport`, `product` — display values, capitalized
  ("Topps", "Chrome Platinum", "MLB", "Hobby Box")
- `release_date` — actual ship date in `YYYY-MM-DD`. For presales, use
  the Topps/Panini ship date (not the presale-open date) — the `PresaleBanner`
  component already shows a presale chip when release_date is within 30 days.
- `gradient_from`, `gradient_to` — only used when `image_url` is null (text
  fallback card). Pick something brand-flavored:
  - Topps Chrome: `#0c4a6e` / `#fbbf24`
  - Panini Prizm: `#1e40af` / `#a855f7`
  - Panini Noir: `#0f172a` / `#facc15`
  - Upper Deck: `#0891b2` / `#1e3a8a`
- `is_published` — `true` for "ships now," `false` if you want to stage
  it and unhide later

## 2 · Weekly Beckett scan

Every Sunday or Monday, I can scan Beckett's release calendar for new
entries since the last run, dedupe against existing migrations, and
draft a single migration covering the new ones. Paste this into chat:

> Run a weekly catalog scan. Look at Beckett's release calendar and
> any 2-week presale page (https://www.beckett.com/news/sports-card-release-calendar-dates/),
> diff against the slugs in supabase/migrations/, and draft migration
> 00XX with anything that's missing. Skip pre-2025 entries. For each
> new SKU, include hobby box + hobby case rows. Stop and ask before
> committing — I'll review the list first.

I'll spawn an Explore agent that curls the calendar with a browser
User-Agent, parses the entries, and produces the SQL.

## 3 · User-driven (set requests)

Sellers and buyers can request sets via the [/feedback](../src/app/feedback/page.tsx)
page (Request a set tab). Requests land in [/admin/feedback](../src/app/admin/feedback/page.tsx)
where you can:

- **Approve + create SKU** (one click) — pulls payload, generates slug,
  calls `adminCreateSku` with `is_published=false`, marks the request
  shipped, notifies the requester. Then go to `/admin/catalog/<id>` to
  upload an image and flip published.
- **Edit first** — opens `/admin/catalog/new` with the form pre-filled
  if you need to fix the sport / set name / year before creating.
- **Decline** — for duplicates or bad fits.

Created SKUs from this path default to:

- `release_date` = today (admin should update before publishing)
- `is_published` = false (admin reviews before going live)
- No `image_url` (admin uploads in catalog edit)

## Image fetching

Once a SKU exists, fetch its product photo with the same agent we used
for migration 0034 / 0037 rounds. Pattern:

```
Image fetch for the following SKUs (one image each, save to
/Users/kylec/Downloads/waxdepot/public/products/<slug>.jpg):
  <slug>
  <slug>
  <slug>
Reject placeholder/wrong-year photos — leave the image_url null
if a real current-year photo doesn't exist yet.
```

Approved hosts (curl with browser UA returns 200):
`cdn11.bigcommerce.com`, `xcdn.checklistinsider.com`, `i.ebayimg.com`,
`cdn.shopify.com`, `dacardworld1.imgix.net`, `www.beckett.com`,
`launches.topps.com`. Hosts that 403: stockx.com, toppsstore.com,
paniniamerica.net (use beckett.com for those products instead).

After download, run a small `update skus set image_url = '/products/' ||
slug || '.jpg' where slug in (...);` to bind them.

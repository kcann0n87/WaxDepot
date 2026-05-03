-- 0029_pokemon_tcg_expansion.sql
-- Pokemon TCG launch catalog: the most-traded sealed sets from the
-- Scarlet & Violet era (2023-2025) plus early Mega era (2025+).
--
-- Currently in catalog (from earlier migrations):
--   - 2025 Prismatic Evolutions ETB (Jan 2025) — flagship special set
--   - 2025 Journey Together Booster Box (Mar 2025)
--   - 2025 Destined Rivals Booster Box (May 2025)
--
-- Expanding with the highest-volume sets across the past 2 years:
--   2023: 151 (the most popular sealed product of the era)
--   2024: Paldean Fates, Twilight Masquerade, Shrouded Fable, Stellar
--         Crown, Surging Sparks
--   2025: Black Bolt / White Flare (dual release), early Mega era
--
-- Each set typically ships in two main sealed configs:
--   - Booster Box (36 packs) — the primary hobby-grade product
--   - Elite Trainer Box (8-9 packs + accessories) — popular collector item
--
-- Special sets (151, Paldean Fates, Prismatic Evolutions) usually ship
-- in different SKUs ("Ultra Premium Collection", "Booster Bundle",
-- "Pokemon Center ETB" etc.) — focusing on the booster-box variants
-- here for marketplace simplicity. Premium variants can be added via
-- /admin/catalog when there's demand.
--
-- All published. Image URLs null until admin uploads.
-- Idempotent: ON CONFLICT (slug) DO NOTHING.

insert into skus (
  slug, year, brand, sport, set_name, product, release_date,
  description, image_url, gradient_from, gradient_to, is_published
)
values
  -- =====================================================================
  -- 2023 Scarlet & Violet era top sets
  -- =====================================================================

  ('2023-pokemon-tcg-151-booster-box', 2023, 'Pokemon', 'Pokemon', '151', 'Booster Box', '2023-09-22',
    'Pokemon TCG Scarlet & Violet 151 Booster Box. The most-traded modern Pokemon sealed product. Original 151 Pokemon reimagined with ex cards. 36 packs per box.',
    null, '#dc2626', '#fbbf24', true),

  ('2023-pokemon-tcg-151-elite-trainer-box', 2023, 'Pokemon', 'Pokemon', '151', 'Elite Trainer Box', '2023-09-22',
    'Pokemon TCG Scarlet & Violet 151 Elite Trainer Box. 9 packs + accessories. The collector ETB from the most popular SV-era set.',
    null, '#dc2626', '#fbbf24', true),

  ('2023-pokemon-tcg-paradox-rift-booster-box', 2023, 'Pokemon', 'Pokemon', 'Paradox Rift', 'Booster Box', '2023-11-03',
    'Pokemon TCG Scarlet & Violet — Paradox Rift Booster Box. Paradox Pokemon, Iron Valiant ex / Roaring Moon ex. 36 packs per box.',
    null, '#7c3aed', '#06b6d4', true),

  ('2023-pokemon-tcg-paradox-rift-elite-trainer-box', 2023, 'Pokemon', 'Pokemon', 'Paradox Rift', 'Elite Trainer Box', '2023-11-03',
    'Pokemon TCG Scarlet & Violet — Paradox Rift Elite Trainer Box. 9 packs + accessories.',
    null, '#7c3aed', '#06b6d4', true),

  ('2023-pokemon-tcg-obsidian-flames-booster-box', 2023, 'Pokemon', 'Pokemon', 'Obsidian Flames', 'Booster Box', '2023-08-11',
    'Pokemon TCG Scarlet & Violet — Obsidian Flames Booster Box. Charizard ex featured. 36 packs per box.',
    null, '#b91c1c', '#1f2937', true),

  -- =====================================================================
  -- 2024 Scarlet & Violet era top sets
  -- =====================================================================

  ('2024-pokemon-tcg-paldean-fates-booster-box', 2024, 'Pokemon', 'Pokemon', 'Paldean Fates', 'Booster Box', '2024-01-26',
    'Pokemon TCG Scarlet & Violet — Paldean Fates Booster Box. Special set with shiny Paldean Pokemon. One of the most-traded SV special releases.',
    null, '#fbbf24', '#dc2626', true),

  ('2024-pokemon-tcg-paldean-fates-elite-trainer-box', 2024, 'Pokemon', 'Pokemon', 'Paldean Fates', 'Elite Trainer Box', '2024-01-26',
    'Pokemon TCG Scarlet & Violet — Paldean Fates Elite Trainer Box. 9 packs + accessories. Highly sought-after.',
    null, '#fbbf24', '#dc2626', true),

  ('2024-pokemon-tcg-temporal-forces-booster-box', 2024, 'Pokemon', 'Pokemon', 'Temporal Forces', 'Booster Box', '2024-03-22',
    'Pokemon TCG Scarlet & Violet — Temporal Forces Booster Box. ACE SPEC cards return. 36 packs per box.',
    null, '#0ea5e9', '#7c3aed', true),

  ('2024-pokemon-tcg-twilight-masquerade-booster-box', 2024, 'Pokemon', 'Pokemon', 'Twilight Masquerade', 'Booster Box', '2024-05-24',
    'Pokemon TCG Scarlet & Violet — Twilight Masquerade Booster Box. Ogerpon ex featured. 36 packs per box.',
    null, '#7c3aed', '#dc2626', true),

  ('2024-pokemon-tcg-twilight-masquerade-elite-trainer-box', 2024, 'Pokemon', 'Pokemon', 'Twilight Masquerade', 'Elite Trainer Box', '2024-05-24',
    'Pokemon TCG Scarlet & Violet — Twilight Masquerade Elite Trainer Box. 9 packs + accessories.',
    null, '#7c3aed', '#dc2626', true),

  ('2024-pokemon-tcg-shrouded-fable-booster-box', 2024, 'Pokemon', 'Pokemon', 'Shrouded Fable', 'Booster Box', '2024-08-02',
    'Pokemon TCG Scarlet & Violet — Shrouded Fable Booster Box. Special set with Pecharunt ex. Ghost-type focus.',
    null, '#1f2937', '#a78bfa', true),

  ('2024-pokemon-tcg-stellar-crown-booster-box', 2024, 'Pokemon', 'Pokemon', 'Stellar Crown', 'Booster Box', '2024-09-13',
    'Pokemon TCG Scarlet & Violet — Stellar Crown Booster Box. Terapagos ex, Tera-type Pokemon featured. 36 packs per box.',
    null, '#facc15', '#7c3aed', true),

  ('2024-pokemon-tcg-stellar-crown-elite-trainer-box', 2024, 'Pokemon', 'Pokemon', 'Stellar Crown', 'Elite Trainer Box', '2024-09-13',
    'Pokemon TCG Scarlet & Violet — Stellar Crown Elite Trainer Box. 9 packs + accessories.',
    null, '#facc15', '#7c3aed', true),

  ('2024-pokemon-tcg-surging-sparks-booster-box', 2024, 'Pokemon', 'Pokemon', 'Surging Sparks', 'Booster Box', '2024-11-08',
    'Pokemon TCG Scarlet & Violet — Surging Sparks Booster Box. Pikachu ex featured. The final main SV-era set before Prismatic Evolutions.',
    null, '#fbbf24', '#0ea5e9', true),

  ('2024-pokemon-tcg-surging-sparks-elite-trainer-box', 2024, 'Pokemon', 'Pokemon', 'Surging Sparks', 'Elite Trainer Box', '2024-11-08',
    'Pokemon TCG Scarlet & Violet — Surging Sparks Elite Trainer Box. 9 packs + accessories.',
    null, '#fbbf24', '#0ea5e9', true),

  -- =====================================================================
  -- 2025 — finishing the SV era + Mega era starts
  -- (Prismatic Evolutions, Journey Together, Destined Rivals already in catalog)
  -- =====================================================================

  ('2025-pokemon-tcg-prismatic-evolutions-booster-box', 2025, 'Pokemon', 'Pokemon', 'Prismatic Evolutions', 'Booster Box', '2025-01-17',
    'Pokemon TCG Scarlet & Violet — Prismatic Evolutions Booster Box. Eevee-themed special set. Among the most valuable SV-era sealed releases.',
    null, '#7c3aed', '#fbbf24', true),

  ('2025-pokemon-tcg-journey-together-elite-trainer-box', 2025, 'Pokemon', 'Pokemon', 'Journey Together', 'Elite Trainer Box', '2025-03-28',
    'Pokemon TCG Scarlet & Violet — Journey Together Elite Trainer Box. 9 packs + accessories.',
    null, '#dc2626', '#0ea5e9', true),

  ('2025-pokemon-tcg-destined-rivals-elite-trainer-box', 2025, 'Pokemon', 'Pokemon', 'Destined Rivals', 'Elite Trainer Box', '2025-05-30',
    'Pokemon TCG Scarlet & Violet — Destined Rivals Elite Trainer Box. Team Rocket / Trainer ex content. 9 packs + accessories.',
    null, '#be123c', '#1e3a8a', true),

  ('2025-pokemon-tcg-black-bolt-booster-box', 2025, 'Pokemon', 'Pokemon', 'Black Bolt', 'Booster Box', '2025-07-18',
    'Pokemon TCG Scarlet & Violet — Black Bolt Booster Box. Half of the dual Black Bolt / White Flare release. Reshiram-themed.',
    null, '#0f172a', '#facc15', true),

  ('2025-pokemon-tcg-white-flare-booster-box', 2025, 'Pokemon', 'Pokemon', 'White Flare', 'Booster Box', '2025-07-18',
    'Pokemon TCG Scarlet & Violet — White Flare Booster Box. Half of the dual Black Bolt / White Flare release. Zekrom-themed.',
    null, '#fef3c7', '#dc2626', true)

on conflict (slug) do nothing;

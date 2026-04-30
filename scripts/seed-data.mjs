// Source-of-truth seed data — keep in sync with src/lib/data.ts and src/lib/sellers.ts.

export const sellerSeed = [
  { username: "sealed_only", displayName: "Sealed Only", bio: "I only sell sealed product. No singles, no breaks, no shenanigans. Same-day shipping for orders before 2pm CT.", location: "Austin, TX", verified: true, avatarColor: "emerald" },
  { username: "boxbreaker_pro", displayName: "Box Breaker Pro", bio: "Long-time collector turned seller. Specializing in current-year hobby and high-end product. Stream breaks every Thursday.", location: "Phoenix, AZ", verified: true, avatarColor: "sky" },
  { username: "northwestcards", displayName: "Northwest Cards", bio: "Family-run card shop, online since 2024. We buy fresh cases and break them down to single boxes for resale.", location: "Portland, OR", verified: true, avatarColor: "rose" },
  { username: "augies_collectibles", displayName: "Augie's Collectibles", bio: "Brick & mortar shop in Memphis. Online listings are a fraction of our in-store inventory — message us for case pricing.", location: "Memphis, TN", verified: true, avatarColor: "amber" },
  { username: "luchpaka_0", displayName: "luchpaka_0", bio: "Casual seller — flipping product I'd otherwise break. Shipping out within 24 hours, always factory sealed.", location: "Brooklyn, NY", verified: false, avatarColor: "violet" },
  { username: "thatdudedavid96", displayName: "thatdudedavid96", bio: "Reseller since 2020. I post early-morning ASAP shipping and message you the second I drop it off.", location: "Denver, CO", verified: true, avatarColor: "cyan" },
  { username: "nbkisit", displayName: "nbkisit", bio: "Hobby case breaker — single boxes, sealed cases, retail product. Power Seller status since 2024.", location: "Chicago, IL", verified: true, avatarColor: "emerald" },
  { username: "alehow-70", displayName: "alehow-70", bio: "Casual collector with overflow inventory. Honest descriptions, careful packaging.", location: "Las Vegas, NV", verified: true, avatarColor: "sky" },
  { username: "hobbyhouse", displayName: "Hobby House", bio: "LCS in operation since 1998. The largest WaxDepot seller by volume.", location: "Cincinnati, OH", verified: true, avatarColor: "rose" },
  { username: "pristinepacks", displayName: "Pristine Packs", bio: "Online seller with 5+ years experience. I personally inspect every box before shipping.", location: "Tampa, FL", verified: true, avatarColor: "amber" },
];

export const skus = [
  { id: "1", slug: "2025-26-topps-cosmic-chrome-basketball-hobby-box", year: 2025, brand: "Topps", sport: "NBA", set: "Cosmic Chrome", product: "Hobby Box", releaseDate: "2026-05-01", gradient: ["#7c3aed", "#0ea5e9"], description: "2025-26 Topps Cosmic Chrome Basketball Hobby Box. 2 autos per box, look for Cooper Flagg, Dylan Harper rookie debuts.", imageUrl: "/products/2025-26-topps-cosmic-chrome-basketball-hobby-box.jpg" },
  { id: "2", slug: "2025-26-panini-prizm-basketball-hobby-box", year: 2025, brand: "Panini", sport: "NBA", set: "Prizm", product: "Hobby Box", releaseDate: "2026-03-15", gradient: ["#dc2626", "#facc15"], description: "The flagship Prizm Basketball release. 12 packs per box, 12 cards per pack, on-card autos." },
  { id: "3", slug: "2025-bowman-baseball-hobby-jumbo-box", year: 2025, brand: "Bowman", sport: "MLB", set: "Bowman", product: "Jumbo Box", releaseDate: "2025-04-30", gradient: ["#2563eb", "#22d3ee"], description: "Bowman Baseball Hobby Jumbo. 32-card packs, 3 autos guaranteed, the prospecting flagship." },
  { id: "4", slug: "2024-topps-chrome-baseball-hobby-box", year: 2024, brand: "Topps", sport: "MLB", set: "Chrome", product: "Hobby Box", releaseDate: "2024-08-21", gradient: ["#16a34a", "#84cc16"], description: "2024 Topps Chrome Baseball Hobby. 2 autos per box, refractor parallels, the chrome flagship.",
    imageUrl: "/products/2024-topps-chrome-baseball-hobby-box.jpg" },
  { id: "5", slug: "2025-panini-prizm-football-hobby-box", year: 2025, brand: "Panini", sport: "NFL", set: "Prizm", product: "Hobby Box", releaseDate: "2025-12-10", gradient: ["#1e40af", "#a855f7"], description: "Prizm Football Hobby. The hobby's flagship NFL product. Look for Cam Ward, Travis Hunter rookies.",
    imageUrl: "/products/2025-panini-prizm-football-hobby-box.jpg" },
  { id: "6", slug: "2024-25-upper-deck-series-1-hockey-hobby-box", year: 2024, brand: "Upper Deck", sport: "NHL", set: "Series 1", product: "Hobby Box", releaseDate: "2024-11-13", gradient: ["#0891b2", "#1e3a8a"], description: "Upper Deck Series 1 Hockey Hobby. Young Guns rookies, 24 packs per box.",
    imageUrl: "/products/2024-25-upper-deck-series-1-hockey-hobby-box.jpg" },
  { id: "7", slug: "2024-bowman-chrome-baseball-hobby-box", year: 2024, brand: "Bowman", sport: "MLB", set: "Bowman Chrome", product: "Hobby Box", releaseDate: "2024-11-06", gradient: ["#0d9488", "#06b6d4"], description: "Bowman Chrome Baseball Hobby. 2 autos per box, chrome refractor prospect cards.",
    imageUrl: "/products/2024-bowman-chrome-baseball-hobby-box.jpg" },
  { id: "8", slug: "2025-panini-select-football-hobby-box", year: 2025, brand: "Panini", sport: "NFL", set: "Select", product: "Hobby Box", releaseDate: "2025-11-19", gradient: ["#dc2626", "#1e3a8a"], description: "Select Football Hobby. Concourse, Premier, Club Level tiers. 12 packs per box.",
    imageUrl: "/products/2025-panini-select-football-hobby-box.jpg" },
  { id: "9", slug: "2024-25-panini-donruss-optic-basketball-hobby-box", year: 2024, brand: "Panini", sport: "NBA", set: "Donruss Optic", product: "Hobby Box", releaseDate: "2025-01-22", gradient: ["#ea580c", "#fbbf24"], description: "Donruss Optic Basketball. Holo prizm parallels, rated rookies, 20 packs per box.",
    imageUrl: "/products/2024-25-panini-donruss-optic-basketball-hobby-box.jpg" },
  { id: "10", slug: "2025-topps-series-1-baseball-hobby-box", year: 2025, brand: "Topps", sport: "MLB", set: "Series 1", product: "Hobby Box", releaseDate: "2025-02-12", gradient: ["#0369a1", "#fbbf24"], description: "The flagship. Topps Series 1 Baseball Hobby. 1 auto or relic per box, 24 packs.",
    imageUrl: "/products/2025-topps-series-1-baseball-hobby-box.jpg" },
  { id: "11", slug: "2024-25-panini-immaculate-basketball-hobby-box", year: 2024, brand: "Panini", sport: "NBA", set: "Immaculate", product: "Hobby Box", releaseDate: "2025-03-05", gradient: ["#000000", "#a78bfa"], description: "Premium Immaculate Basketball. 5 autos or memorabilia per box. High-end product." },
  { id: "12", slug: "2025-bowman-draft-baseball-jumbo-box", year: 2025, brand: "Bowman", sport: "MLB", set: "Bowman Draft", product: "Jumbo Box", releaseDate: "2025-12-17", gradient: ["#1d4ed8", "#34d399"], description: "Bowman Draft Jumbo. First Bowman cards of MLB draft picks. Prospector's favorite.",
    imageUrl: "/products/2025-bowman-draft-baseball-jumbo-box.jpg" },
  { id: "13", slug: "2024-25-panini-select-basketball-hobby-box", year: 2024, brand: "Panini", sport: "NBA", set: "Select", product: "Hobby Box", releaseDate: "2025-04-02", gradient: ["#0f172a", "#7c3aed"], description: "Panini Select Basketball Hobby. Concourse, Premier, Courtside tiers. 12 packs per box.",
    imageUrl: "/products/2024-25-panini-select-basketball-hobby-box.jpg" },
  { id: "14", slug: "2024-25-panini-mosaic-basketball-hobby-box", year: 2024, brand: "Panini", sport: "NBA", set: "Mosaic", product: "Hobby Box", releaseDate: "2025-05-14", gradient: ["#831843", "#fb7185"], description: "Panini Mosaic Basketball. Vibrant prizm-style parallels. 24 packs per box.",
    imageUrl: "/products/2024-25-panini-mosaic-basketball-hobby-box.jpg" },
  { id: "15", slug: "2025-26-panini-prizm-basketball-fotl-hobby-box", year: 2025, brand: "Panini", sport: "NBA", set: "Prizm FOTL", product: "Hobby Box", releaseDate: "2026-03-08", gradient: ["#7f1d1d", "#000000"], description: "Prizm Basketball First Off The Line. Exclusive parallels and on-card autos. Limited release." },
  { id: "16", slug: "2024-25-panini-national-treasures-basketball-hobby-box", year: 2024, brand: "Panini", sport: "NBA", set: "National Treasures", product: "Hobby Box", releaseDate: "2025-06-18", gradient: ["#1c1917", "#fbbf24"], description: "National Treasures Basketball. Premier high-end product. 8 autos or memorabilia per box.",
    imageUrl: "/products/2024-25-panini-national-treasures-basketball-hobby-box.jpg" },
  { id: "17", slug: "2024-25-panini-spectra-basketball-hobby-box", year: 2024, brand: "Panini", sport: "NBA", set: "Spectra", product: "Hobby Box", releaseDate: "2025-04-30", gradient: ["#581c87", "#22d3ee"], description: "Panini Spectra Basketball. Tmall-exclusive style chrome refractor parallels." },
  { id: "18", slug: "2024-25-panini-court-kings-basketball-hobby-box", year: 2024, brand: "Panini", sport: "NBA", set: "Court Kings", product: "Hobby Box", releaseDate: "2025-05-28", gradient: ["#0c4a6e", "#f59e0b"], description: "Court Kings Basketball. Painted artwork-style cards, 4 autos or memorabilia per box.",
    imageUrl: "/products/2024-25-panini-court-kings-basketball-hobby-box.jpg" },
  { id: "19", slug: "2024-topps-update-baseball-hobby-box", year: 2024, brand: "Topps", sport: "MLB", set: "Update", product: "Hobby Box", releaseDate: "2024-10-16", gradient: ["#1e3a8a", "#dc2626"], description: "Topps Update Series Baseball. Rookie debuts and traded players. 24 packs per box." },
  { id: "20", slug: "2025-topps-heritage-baseball-hobby-box", year: 2025, brand: "Topps", sport: "MLB", set: "Heritage", product: "Hobby Box", releaseDate: "2025-03-05", gradient: ["#15803d", "#fde047"], description: "Topps Heritage Baseball. Throwback designs based on the 1976 Topps set. 24 packs.",
    imageUrl: "/products/2025-topps-heritage-baseball-hobby-box.jpg" },
  { id: "21", slug: "2025-topps-tier-one-baseball-hobby-box", year: 2025, brand: "Topps", sport: "MLB", set: "Tier One", product: "Hobby Box", releaseDate: "2025-07-23", gradient: ["#0f172a", "#fbbf24"], description: "Topps Tier One Baseball. 3 hits per box, premium on-card autographs.",
    imageUrl: "/products/2025-topps-tier-one-baseball-hobby-box.jpg" },
  { id: "22", slug: "2025-bowman-platinum-baseball-hobby-box", year: 2025, brand: "Bowman", sport: "MLB", set: "Bowman Platinum", product: "Hobby Box", releaseDate: "2025-08-13", gradient: ["#374151", "#a78bfa"], description: "Bowman Platinum Baseball. Foil-enhanced prospects, 1 auto per box." },
  { id: "23", slug: "2025-topps-chrome-update-baseball-hobby-box", year: 2025, brand: "Topps", sport: "MLB", set: "Chrome Update", product: "Hobby Box", releaseDate: "2025-12-04", gradient: ["#0e7490", "#84cc16"], description: "Topps Chrome Update Baseball. Refractor parallels of update set rookies and stars." },
  { id: "24", slug: "2025-panini-donruss-football-hobby-box", year: 2025, brand: "Panini", sport: "NFL", set: "Donruss", product: "Hobby Box", releaseDate: "2025-09-10", gradient: ["#9a3412", "#fbbf24"], description: "Panini Donruss Football Hobby. Rated rookies, optic press proofs, 24 packs per box." },
  { id: "25", slug: "2025-panini-mosaic-football-hobby-box", year: 2025, brand: "Panini", sport: "NFL", set: "Mosaic", product: "Hobby Box", releaseDate: "2025-12-17", gradient: ["#7f1d1d", "#0ea5e9"], description: "Panini Mosaic Football. Vibrant prizm-style parallels, 12 packs per box.",
    imageUrl: "/products/2025-panini-mosaic-football-hobby-box.jpg" },
  { id: "26", slug: "2025-panini-contenders-football-hobby-box", year: 2025, brand: "Panini", sport: "NFL", set: "Contenders", product: "Hobby Box", releaseDate: "2026-01-21", gradient: ["#1e40af", "#facc15"], description: "Panini Contenders Football. Rookie Ticket autos. The hobby's signature rookie auto chase." },
  { id: "27", slug: "2025-panini-national-treasures-football-hobby-box", year: 2025, brand: "Panini", sport: "NFL", set: "National Treasures", product: "Hobby Box", releaseDate: "2026-02-25", gradient: ["#171717", "#a16207"], description: "National Treasures Football. Ultra-premium with patch autos and 1/1s.",
    imageUrl: "/products/2025-panini-national-treasures-football-hobby-box.jpg" },
  { id: "28", slug: "2025-panini-immaculate-football-hobby-box", year: 2025, brand: "Panini", sport: "NFL", set: "Immaculate", product: "Hobby Box", releaseDate: "2026-04-15", gradient: ["#1f2937", "#f43f5e"], description: "Immaculate Football. 5 autos or relics per box. Premium high-end release." },
  { id: "29", slug: "2025-26-upper-deck-series-2-hockey-hobby-box", year: 2025, brand: "Upper Deck", sport: "NHL", set: "Series 2", product: "Hobby Box", releaseDate: "2026-02-19", gradient: ["#1e40af", "#0ea5e9"], description: "Upper Deck Series 2 Hockey. More Young Guns rookies, 24 packs per box.",
    imageUrl: "/products/2025-26-upper-deck-series-2-hockey-hobby-box.jpg" },
  { id: "30", slug: "2024-25-upper-deck-sp-authentic-hockey-hobby-box", year: 2024, brand: "Upper Deck", sport: "NHL", set: "SP Authentic", product: "Hobby Box", releaseDate: "2025-04-02", gradient: ["#7c2d12", "#f5d0fe"], description: "Upper Deck SP Authentic Hockey. Future Watch rookie autos. The hobby's premier rookie chase." },
  { id: "31", slug: "2024-25-upper-deck-sp-hockey-hobby-box", year: 2024, brand: "Upper Deck", sport: "NHL", set: "SP", product: "Hobby Box", releaseDate: "2025-06-04", gradient: ["#0c4a6e", "#fef08a"], description: "Upper Deck SP Hockey. Premium rookie autos and patches. 16 packs per box." },
  { id: "32", slug: "2024-25-upper-deck-the-cup-hockey-hobby-box", year: 2024, brand: "Upper Deck", sport: "NHL", set: "The Cup", product: "Hobby Box", releaseDate: "2025-09-17", gradient: ["#000000", "#fbbf24"], description: "Upper Deck The Cup Hockey. The crown jewel — 1 pack of 6 cards, all hits.",
    imageUrl: "/products/2024-25-upper-deck-the-cup-hockey-hobby-box.jpg" },
  { id: "33", slug: "2025-pokemon-tcg-prismatic-evolutions-elite-trainer-box", year: 2025, brand: "Pokemon", sport: "Pokemon", set: "Prismatic Evolutions", product: "Elite Trainer Box", releaseDate: "2025-01-17", gradient: ["#7c3aed", "#fbbf24"], description: "Pokemon TCG Prismatic Evolutions ETB. Eevee-themed special set, 9 booster packs included.",
    imageUrl: "/products/2025-pokemon-tcg-prismatic-evolutions-elite-trainer-box.jpg" },
  { id: "34", slug: "2025-pokemon-tcg-journey-together-booster-box", year: 2025, brand: "Pokemon", sport: "Pokemon", set: "Journey Together", product: "Booster Box", releaseDate: "2025-03-28", gradient: ["#dc2626", "#0ea5e9"], description: "Pokemon TCG Journey Together Booster Box. 36 packs of 10 cards each." },
  { id: "35", slug: "2025-pokemon-tcg-destined-rivals-booster-box", year: 2025, brand: "Pokemon", sport: "Pokemon", set: "Destined Rivals", product: "Booster Box", releaseDate: "2025-05-30", gradient: ["#be123c", "#1e3a8a"], description: "Pokemon TCG Destined Rivals. Team Rocket-themed, trainer ex cards. 36 packs." },
  { id: "36", slug: "2026-topps-series-1-baseball-jumbo-box", year: 2026, brand: "Topps", sport: "MLB", set: "Series 1", product: "Jumbo Box", releaseDate: "2026-02-11", gradient: ["#0369a1", "#fde047"], description: "Topps Series 1 Baseball Jumbo. 6 autos or relics per box, 32-card packs.",
    imageUrl: "/products/2026-topps-series-1-baseball-jumbo-box.jpg" },
  { id: "37", slug: "2026-bowman-baseball-hobby-box", year: 2026, brand: "Bowman", sport: "MLB", set: "Bowman", product: "Hobby Box", releaseDate: "2026-04-29", gradient: ["#2563eb", "#06b6d4"], description: "Bowman Baseball Hobby. The flagship prospecting product. 1 auto per box.",
    imageUrl: "/products/2026-bowman-baseball-hobby-box.jpg" },
  { id: "38", slug: "2025-26-panini-prizm-monopoly-basketball-hobby-box", year: 2025, brand: "Panini", sport: "NBA", set: "Prizm Monopoly", product: "Hobby Box", releaseDate: "2026-04-09", gradient: ["#dc2626", "#10b981"], description: "Panini Prizm Monopoly Basketball. Property-themed parallels. Limited release." },
  { id: "39", slug: "2025-panini-prizm-football-fotl-hobby-box", year: 2025, brand: "Panini", sport: "NFL", set: "Prizm FOTL", product: "Hobby Box", releaseDate: "2025-12-03", gradient: ["#1e3a8a", "#dc2626"], description: "Prizm Football First Off The Line. Exclusive parallels, on-card autos. Limited release.",
    imageUrl: "/products/2025-panini-prizm-football-fotl-hobby-box.jpg" },
  { id: "40", slug: "2025-topps-allen-and-ginter-baseball-hobby-box", year: 2025, brand: "Topps", sport: "MLB", set: "Allen & Ginter", product: "Hobby Box", releaseDate: "2025-07-09", gradient: ["#0e7490", "#facc15"], description: "Topps Allen & Ginter Baseball. Vintage-style minis and cross-sport autos. 24 packs.",
    imageUrl: "/products/2025-topps-allen-and-ginter-baseball-hobby-box.jpg" },
];

const BASE_PRICES = {
  "1": 985, "2": 720, "3": 410, "4": 195, "5": 580,
  "6": 165, "7": 495, "8": 295, "9": 220, "10": 110,
  "11": 1380, "12": 380, "13": 235, "14": 145, "15": 1480,
  "16": 1820, "17": 320, "18": 165, "19": 88, "20": 102,
  "21": 245, "22": 132, "23": 178, "24": 118, "25": 138,
  "26": 425, "27": 1620, "28": 875, "29": 145, "30": 285,
  "31": 195, "32": 1450, "33": 410, "34": 198, "35": 175,
  "36": 178, "37": 215, "38": 945, "39": 1240, "40": 102,
};

export function basePriceFor(slug) {
  const sku = skus.find((s) => s.slug === slug);
  return sku ? BASE_PRICES[sku.id] : null;
}

const SELLER_ORDER = [
  "luchpaka_0", "thatdudedavid96", "augies_collectibles", "nbkisit", "alehow-70",
  "hobbyhouse", "sealed_only", "pristinepacks", "boxbreaker_pro", "northwestcards",
];

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function listingFor(sku, sellerIdByUsername) {
  const rand = seededRandom(parseInt(sku.id) * 31);
  const basePrice = BASE_PRICES[sku.id] ?? 200;
  const count = 4 + Math.floor(rand() * 5);
  const out = [];
  for (let i = 0; i < count; i++) {
    const sellerName = SELLER_ORDER[Math.floor(rand() * SELLER_ORDER.length)];
    const sellerId = sellerIdByUsername[sellerName];
    if (!sellerId) continue;
    const variance = 1 + (rand() * 0.12 - 0.02);
    const price = Math.round(basePrice * variance);
    out.push({
      sellerId,
      price,
      shipping: rand() > 0.4 ? 0 : Math.round(8 + rand() * 15),
      quantity: 1 + Math.floor(rand() * 3),
    });
  }
  return out;
}

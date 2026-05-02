export type Sport = "NBA" | "MLB" | "NFL" | "NHL";

export type Sku = {
  id: string;
  slug: string;
  year: number;
  brand: string;
  sport: Sport;
  set: string;
  product: string;
  releaseDate: string;
  gradient: [string, string];
  description: string;
  imageUrl?: string;
};

export type Listing = {
  id: string;
  skuId: string;
  seller: string;
  sellerVerified: boolean;
  sellerRating: number;
  sellerSales: number;
  price: number;
  shipping: number;
  quantity: number;
};

export type Bid = {
  id: string;
  skuId: string;
  buyer: string;
  price: number;
  expires: string;
};

export type Sale = {
  id: string;
  skuId: string;
  price: number;
  date: string;
};

export const skus: Sku[] = [
  {
    id: "1",
    slug: "2025-26-topps-cosmic-chrome-basketball-hobby-box",
    year: 2025,
    brand: "Topps",
    sport: "NBA",
    set: "Cosmic Chrome",
    product: "Hobby Box",
    releaseDate: "2026-05-01",
    gradient: ["#7c3aed", "#0ea5e9"],
    description: "2025-26 Topps Cosmic Chrome Basketball Hobby Box. 2 autos per box, look for Cooper Flagg, Dylan Harper rookie debuts.",
    imageUrl: "/products/2025-26-topps-cosmic-chrome-basketball-hobby-box.jpg",
  },
  {
    id: "2",
    slug: "2025-26-panini-prizm-basketball-hobby-box",
    year: 2025,
    brand: "Panini",
    sport: "NBA",
    set: "Prizm",
    product: "Hobby Box",
    releaseDate: "2026-03-15",
    gradient: ["#dc2626", "#facc15"],
    description: "The flagship Prizm Basketball release. 12 packs per box, 12 cards per pack, on-card autos.",
    imageUrl: "/products/2025-26-panini-prizm-basketball-hobby-box.jpg",
  },
  {
    id: "3",
    slug: "2025-bowman-baseball-hobby-jumbo-box",
    year: 2025,
    brand: "Bowman",
    sport: "MLB",
    set: "Bowman",
    product: "Jumbo Box",
    releaseDate: "2025-04-30",
    gradient: ["#2563eb", "#22d3ee"],
    description: "Bowman Baseball Hobby Jumbo. 32-card packs, 3 autos guaranteed, the prospecting flagship.",
    imageUrl: "/products/2025-bowman-baseball-hobby-jumbo-box.jpg",
  },
  {
    id: "4",
    slug: "2024-topps-chrome-baseball-hobby-box",
    year: 2024,
    brand: "Topps",
    sport: "MLB",
    set: "Chrome",
    product: "Hobby Box",
    releaseDate: "2024-08-21",
    gradient: ["#16a34a", "#84cc16"],
    description: "2024 Topps Chrome Baseball Hobby. 2 autos per box, refractor parallels, the chrome flagship.",
    imageUrl: "/products/2024-topps-chrome-baseball-hobby-box.jpg"
  },
  {
    id: "5",
    slug: "2025-panini-prizm-football-hobby-box",
    year: 2025,
    brand: "Panini",
    sport: "NFL",
    set: "Prizm",
    product: "Hobby Box",
    releaseDate: "2025-12-10",
    gradient: ["#1e40af", "#a855f7"],
    description: "Prizm Football Hobby. The hobby's flagship NFL product. Look for Cam Ward, Travis Hunter rookies.",
    imageUrl: "/products/2025-panini-prizm-football-hobby-box.jpg"
  },
  {
    id: "6",
    slug: "2024-25-upper-deck-series-1-hockey-hobby-box",
    year: 2024,
    brand: "Upper Deck",
    sport: "NHL",
    set: "Series 1",
    product: "Hobby Box",
    releaseDate: "2024-11-13",
    gradient: ["#0891b2", "#1e3a8a"],
    description: "Upper Deck Series 1 Hockey Hobby. Young Guns rookies, 24 packs per box.",
    imageUrl: "/products/2024-25-upper-deck-series-1-hockey-hobby-box.jpg"
  },
  {
    id: "7",
    slug: "2024-bowman-chrome-baseball-hobby-box",
    year: 2024,
    brand: "Bowman",
    sport: "MLB",
    set: "Bowman Chrome",
    product: "Hobby Box",
    releaseDate: "2024-11-06",
    gradient: ["#0d9488", "#06b6d4"],
    description: "Bowman Chrome Baseball Hobby. 2 autos per box, chrome refractor prospect cards.",
    imageUrl: "/products/2024-bowman-chrome-baseball-hobby-box.jpg"
  },
  {
    id: "8",
    slug: "2025-panini-select-football-hobby-box",
    year: 2025,
    brand: "Panini",
    sport: "NFL",
    set: "Select",
    product: "Hobby Box",
    releaseDate: "2025-11-19",
    gradient: ["#dc2626", "#1e3a8a"],
    description: "Select Football Hobby. Concourse, Premier, Club Level tiers. 12 packs per box.",
    imageUrl: "/products/2025-panini-select-football-hobby-box.jpg"
  },
  {
    id: "9",
    slug: "2024-25-panini-donruss-optic-basketball-hobby-box",
    year: 2024,
    brand: "Panini",
    sport: "NBA",
    set: "Donruss Optic",
    product: "Hobby Box",
    releaseDate: "2025-01-22",
    gradient: ["#ea580c", "#fbbf24"],
    description: "Donruss Optic Basketball. Holo prizm parallels, rated rookies, 20 packs per box.",
    imageUrl: "/products/2024-25-panini-donruss-optic-basketball-hobby-box.jpg"
  },
  {
    id: "10",
    slug: "2025-topps-series-1-baseball-hobby-box",
    year: 2025,
    brand: "Topps",
    sport: "MLB",
    set: "Series 1",
    product: "Hobby Box",
    releaseDate: "2025-02-12",
    gradient: ["#0369a1", "#fbbf24"],
    description: "The flagship. Topps Series 1 Baseball Hobby. 1 auto or relic per box, 24 packs.",
    imageUrl: "/products/2025-topps-series-1-baseball-hobby-box.jpg"
  },
  {
    id: "11",
    slug: "2024-25-panini-immaculate-basketball-hobby-box",
    year: 2024,
    brand: "Panini",
    sport: "NBA",
    set: "Immaculate",
    product: "Hobby Box",
    releaseDate: "2025-03-05",
    gradient: ["#000000", "#a78bfa"],
    description: "Premium Immaculate Basketball. 5 autos or memorabilia per box. High-end product.",
    imageUrl: "/products/2024-25-panini-immaculate-basketball-hobby-box.jpg",
  },
  {
    id: "12",
    slug: "2025-bowman-draft-baseball-jumbo-box",
    year: 2025,
    brand: "Bowman",
    sport: "MLB",
    set: "Bowman Draft",
    product: "Jumbo Box",
    releaseDate: "2025-12-17",
    gradient: ["#1d4ed8", "#34d399"],
    description: "Bowman Draft Jumbo. First Bowman cards of MLB draft picks. Prospector's favorite.",
    imageUrl: "/products/2025-bowman-draft-baseball-jumbo-box.jpg"
  },
  {
    id: "13",
    slug: "2024-25-panini-select-basketball-hobby-box",
    year: 2024,
    brand: "Panini",
    sport: "NBA",
    set: "Select",
    product: "Hobby Box",
    releaseDate: "2025-04-02",
    gradient: ["#0f172a", "#7c3aed"],
    description: "Panini Select Basketball Hobby. Concourse, Premier, Courtside tiers. 12 packs per box.",
    imageUrl: "/products/2024-25-panini-select-basketball-hobby-box.jpg"
  },
  {
    id: "14",
    slug: "2024-25-panini-mosaic-basketball-hobby-box",
    year: 2024,
    brand: "Panini",
    sport: "NBA",
    set: "Mosaic",
    product: "Hobby Box",
    releaseDate: "2025-05-14",
    gradient: ["#831843", "#fb7185"],
    description: "Panini Mosaic Basketball. Vibrant prizm-style parallels. 24 packs per box.",
    imageUrl: "/products/2024-25-panini-mosaic-basketball-hobby-box.jpg"
  },
  {
    id: "15",
    slug: "2025-26-panini-prizm-basketball-fotl-hobby-box",
    year: 2025,
    brand: "Panini",
    sport: "NBA",
    set: "Prizm FOTL",
    product: "Hobby Box",
    releaseDate: "2026-03-08",
    gradient: ["#7f1d1d", "#000000"],
    description: "Prizm Basketball First Off The Line. Exclusive parallels and on-card autos. Limited release.",
    imageUrl: "/products/2025-26-panini-prizm-basketball-fotl-hobby-box.jpg",
  },
  {
    id: "16",
    slug: "2024-25-panini-national-treasures-basketball-hobby-box",
    year: 2024,
    brand: "Panini",
    sport: "NBA",
    set: "National Treasures",
    product: "Hobby Box",
    releaseDate: "2025-06-18",
    gradient: ["#1c1917", "#fbbf24"],
    description: "National Treasures Basketball. Premier high-end product. 8 autos or memorabilia per box.",
    imageUrl: "/products/2024-25-panini-national-treasures-basketball-hobby-box.jpg"
  },
  {
    id: "17",
    slug: "2024-25-panini-spectra-basketball-hobby-box",
    year: 2024,
    brand: "Panini",
    sport: "NBA",
    set: "Spectra",
    product: "Hobby Box",
    releaseDate: "2025-04-30",
    gradient: ["#581c87", "#22d3ee"],
    description: "Panini Spectra Basketball. Tmall-exclusive style chrome refractor parallels.",
    imageUrl: "/products/2024-25-panini-spectra-basketball-hobby-box.jpg",
  },
  {
    id: "18",
    slug: "2024-25-panini-court-kings-basketball-hobby-box",
    year: 2024,
    brand: "Panini",
    sport: "NBA",
    set: "Court Kings",
    product: "Hobby Box",
    releaseDate: "2025-05-28",
    gradient: ["#0c4a6e", "#f59e0b"],
    description: "Court Kings Basketball. Painted artwork-style cards, 4 autos or memorabilia per box.",
    imageUrl: "/products/2024-25-panini-court-kings-basketball-hobby-box.jpg"
  },
  {
    id: "19",
    slug: "2024-topps-update-baseball-hobby-box",
    year: 2024,
    brand: "Topps",
    sport: "MLB",
    set: "Update",
    product: "Hobby Box",
    releaseDate: "2024-10-16",
    gradient: ["#1e3a8a", "#dc2626"],
    description: "Topps Update Series Baseball. Rookie debuts and traded players. 24 packs per box.",
    imageUrl: "/products/2024-topps-update-baseball-hobby-box.jpg",
  },
  {
    id: "20",
    slug: "2025-topps-heritage-baseball-hobby-box",
    year: 2025,
    brand: "Topps",
    sport: "MLB",
    set: "Heritage",
    product: "Hobby Box",
    releaseDate: "2025-03-05",
    gradient: ["#15803d", "#fde047"],
    description: "Topps Heritage Baseball. Throwback designs based on the 1976 Topps set. 24 packs.",
    imageUrl: "/products/2025-topps-heritage-baseball-hobby-box.jpg"
  },
  {
    id: "21",
    slug: "2025-topps-tier-one-baseball-hobby-box",
    year: 2025,
    brand: "Topps",
    sport: "MLB",
    set: "Tier One",
    product: "Hobby Box",
    releaseDate: "2025-07-23",
    gradient: ["#0f172a", "#fbbf24"],
    description: "Topps Tier One Baseball. 3 hits per box, premium on-card autographs.",
    imageUrl: "/products/2025-topps-tier-one-baseball-hobby-box.jpg"
  },
  {
    id: "22",
    slug: "2025-bowman-platinum-baseball-hobby-box",
    year: 2025,
    brand: "Bowman",
    sport: "MLB",
    set: "Bowman Platinum",
    product: "Hobby Box",
    releaseDate: "2025-08-13",
    gradient: ["#374151", "#a78bfa"],
    description: "Bowman Platinum Baseball. Foil-enhanced prospects, 1 auto per box.",
    imageUrl: "/products/2025-bowman-platinum-baseball-hobby-box.jpg",
  },
  {
    id: "23",
    slug: "2025-topps-chrome-update-baseball-hobby-box",
    year: 2025,
    brand: "Topps",
    sport: "MLB",
    set: "Chrome Update",
    product: "Hobby Box",
    releaseDate: "2025-12-04",
    gradient: ["#0e7490", "#84cc16"],
    description: "Topps Chrome Update Baseball. Refractor parallels of update set rookies and stars.",
    imageUrl: "/products/2025-topps-chrome-update-baseball-hobby-box.jpg",
  },
  {
    id: "24",
    slug: "2025-panini-donruss-football-hobby-box",
    year: 2025,
    brand: "Panini",
    sport: "NFL",
    set: "Donruss",
    product: "Hobby Box",
    releaseDate: "2025-09-10",
    gradient: ["#9a3412", "#fbbf24"],
    description: "Panini Donruss Football Hobby. Rated rookies, optic press proofs, 24 packs per box.",
    imageUrl: "/products/2025-panini-donruss-football-hobby-box.jpg",
  },
  {
    id: "25",
    slug: "2025-panini-mosaic-football-hobby-box",
    year: 2025,
    brand: "Panini",
    sport: "NFL",
    set: "Mosaic",
    product: "Hobby Box",
    releaseDate: "2025-12-17",
    gradient: ["#7f1d1d", "#0ea5e9"],
    description: "Panini Mosaic Football. Vibrant prizm-style parallels, 12 packs per box.",
    imageUrl: "/products/2025-panini-mosaic-football-hobby-box.jpg"
  },
  {
    id: "26",
    slug: "2025-panini-contenders-football-hobby-box",
    year: 2025,
    brand: "Panini",
    sport: "NFL",
    set: "Contenders",
    product: "Hobby Box",
    releaseDate: "2026-01-21",
    gradient: ["#1e40af", "#facc15"],
    description: "Panini Contenders Football. Rookie Ticket autos. The hobby's signature rookie auto chase.",
    imageUrl: "/products/2025-panini-contenders-football-hobby-box.jpg",
  },
  {
    id: "27",
    slug: "2025-panini-national-treasures-football-hobby-box",
    year: 2025,
    brand: "Panini",
    sport: "NFL",
    set: "National Treasures",
    product: "Hobby Box",
    releaseDate: "2026-02-25",
    gradient: ["#171717", "#a16207"],
    description: "National Treasures Football. Ultra-premium with patch autos and 1/1s.",
    imageUrl: "/products/2025-panini-national-treasures-football-hobby-box.jpg"
  },
  {
    id: "28",
    slug: "2025-panini-immaculate-football-hobby-box",
    year: 2025,
    brand: "Panini",
    sport: "NFL",
    set: "Immaculate",
    product: "Hobby Box",
    releaseDate: "2026-04-15",
    gradient: ["#1f2937", "#f43f5e"],
    description: "Immaculate Football. 5 autos or relics per box. Premium high-end release.",
    imageUrl: "/products/2025-panini-immaculate-football-hobby-box.jpg",
  },
  {
    id: "29",
    slug: "2025-26-upper-deck-series-2-hockey-hobby-box",
    year: 2025,
    brand: "Upper Deck",
    sport: "NHL",
    set: "Series 2",
    product: "Hobby Box",
    releaseDate: "2026-02-19",
    gradient: ["#1e40af", "#0ea5e9"],
    description: "Upper Deck Series 2 Hockey. More Young Guns rookies, 24 packs per box.",
    imageUrl: "/products/2025-26-upper-deck-series-2-hockey-hobby-box.jpg"
  },
  {
    id: "30",
    slug: "2024-25-upper-deck-sp-authentic-hockey-hobby-box",
    year: 2024,
    brand: "Upper Deck",
    sport: "NHL",
    set: "SP Authentic",
    product: "Hobby Box",
    releaseDate: "2025-04-02",
    gradient: ["#7c2d12", "#f5d0fe"],
    description: "Upper Deck SP Authentic Hockey. Future Watch rookie autos. The hobby's premier rookie chase.",
    imageUrl: "/products/2024-25-upper-deck-sp-authentic-hockey-hobby-box.jpg",
  },
  {
    id: "31",
    slug: "2024-25-upper-deck-sp-hockey-hobby-box",
    year: 2024,
    brand: "Upper Deck",
    sport: "NHL",
    set: "SP",
    product: "Hobby Box",
    releaseDate: "2025-06-04",
    gradient: ["#0c4a6e", "#fef08a"],
    description: "Upper Deck SP Hockey. Premium rookie autos and patches. 16 packs per box.",
    imageUrl: "/products/2024-25-upper-deck-sp-hockey-hobby-box.jpg",
  },
  {
    id: "32",
    slug: "2024-25-upper-deck-the-cup-hockey-hobby-box",
    year: 2024,
    brand: "Upper Deck",
    sport: "NHL",
    set: "The Cup",
    product: "Hobby Box",
    releaseDate: "2025-09-17",
    gradient: ["#000000", "#fbbf24"],
    description: "Upper Deck The Cup Hockey. The crown jewel — 1 pack of 6 cards, all hits.",
    imageUrl: "/products/2024-25-upper-deck-the-cup-hockey-hobby-box.jpg"
  },
  {
    id: "36",
    slug: "2026-topps-series-1-baseball-jumbo-box",
    year: 2026,
    brand: "Topps",
    sport: "MLB",
    set: "Series 1",
    product: "Jumbo Box",
    releaseDate: "2026-02-11",
    gradient: ["#0369a1", "#fde047"],
    description: "Topps Series 1 Baseball Jumbo. 6 autos or relics per box, 32-card packs.",
    imageUrl: "/products/2026-topps-series-1-baseball-jumbo-box.jpg"
  },
  {
    id: "37",
    slug: "2026-bowman-baseball-hobby-box",
    year: 2026,
    brand: "Bowman",
    sport: "MLB",
    set: "Bowman",
    product: "Hobby Box",
    releaseDate: "2026-04-29",
    gradient: ["#2563eb", "#06b6d4"],
    description: "Bowman Baseball Hobby. The flagship prospecting product. 1 auto per box.",
    imageUrl: "/products/2026-bowman-baseball-hobby-box.jpg"
  },
  {
    id: "38",
    slug: "2025-26-panini-prizm-monopoly-basketball-hobby-box",
    year: 2025,
    brand: "Panini",
    sport: "NBA",
    set: "Prizm Monopoly",
    product: "Hobby Box",
    releaseDate: "2026-04-09",
    gradient: ["#dc2626", "#10b981"],
    description: "Panini Prizm Monopoly Basketball. Property-themed parallels. Limited release.",
    imageUrl: "/products/2025-26-panini-prizm-monopoly-basketball-hobby-box.jpg",
  },
  {
    id: "39",
    slug: "2025-panini-prizm-football-fotl-hobby-box",
    year: 2025,
    brand: "Panini",
    sport: "NFL",
    set: "Prizm FOTL",
    product: "Hobby Box",
    releaseDate: "2025-12-03",
    gradient: ["#1e3a8a", "#dc2626"],
    description: "Prizm Football First Off The Line. Exclusive parallels, on-card autos. Limited release.",
    imageUrl: "/products/2025-panini-prizm-football-fotl-hobby-box.jpg"
  },
  {
    id: "40",
    slug: "2025-topps-allen-and-ginter-baseball-hobby-box",
    year: 2025,
    brand: "Topps",
    sport: "MLB",
    set: "Allen & Ginter",
    product: "Hobby Box",
    releaseDate: "2025-07-09",
    gradient: ["#0e7490", "#facc15"],
    description: "Topps Allen & Ginter Baseball. Vintage-style minis and cross-sport autos. 24 packs.",
    imageUrl: "/products/2025-topps-allen-and-ginter-baseball-hobby-box.jpg"
  },
];

const sellerPool = [
  { name: "luchpaka_0", rating: 100, sales: 25 },
  { name: "thatdudedavid96", rating: 100, sales: 126 },
  { name: "augies_collectibles", rating: 100, sales: 857 },
  { name: "nbkisit", rating: 100, sales: 1128 },
  { name: "alehow-70", rating: 99.7, sales: 523 },
  { name: "hobbyhouse", rating: 99.9, sales: 2410 },
  { name: "sealed_only", rating: 100, sales: 412 },
  { name: "pristinepacks", rating: 99.8, sales: 1893 },
  { name: "boxbreaker_pro", rating: 100, sales: 743 },
  { name: "northwestcards", rating: 99.6, sales: 318 },
];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function listingsForSku(skuId: string): Listing[] {
  const sku = skus.find((s) => s.id === skuId);
  if (!sku) return [];
  const rand = seededRandom(parseInt(skuId) * 31);
  const basePrice =
    {
      "1": 985, "2": 720, "3": 410, "4": 195, "5": 580,
      "6": 165, "7": 495, "8": 295, "9": 220, "10": 110,
      "11": 1380, "12": 380, "13": 235, "14": 145, "15": 1480,
      "16": 1820, "17": 320, "18": 165, "19": 88, "20": 102,
      "21": 245, "22": 132, "23": 178, "24": 118, "25": 138,
      "26": 425, "27": 1620, "28": 875, "29": 145, "30": 285,
      "31": 195, "32": 1450, "33": 410, "34": 198, "35": 175,
      "36": 178, "37": 215, "38": 945, "39": 1240, "40": 102,
    }[skuId] || 200;
  const count = 4 + Math.floor(rand() * 5);
  const listings: Listing[] = [];
  for (let i = 0; i < count; i++) {
    const seller = sellerPool[Math.floor(rand() * sellerPool.length)];
    const variance = 1 + (rand() * 0.12 - 0.02);
    const price = Math.round(basePrice * variance);
    listings.push({
      id: `${skuId}-l${i}`,
      skuId,
      seller: seller.name,
      sellerVerified: false,
      sellerRating: seller.rating,
      sellerSales: seller.sales,
      price,
      shipping: rand() > 0.4 ? 0 : Math.round(8 + rand() * 15),
      quantity: 1 + Math.floor(rand() * 3),
    });
  }
  return listings.sort((a, b) => a.price + a.shipping - (b.price + b.shipping));
}

export function bidsForSku(skuId: string): Bid[] {
  const rand = seededRandom(parseInt(skuId) * 17);
  const lowestAsk = listingsForSku(skuId)[0]?.price || 200;
  const count = 3 + Math.floor(rand() * 4);
  const bids: Bid[] = [];
  for (let i = 0; i < count; i++) {
    const variance = 0.78 + rand() * 0.18;
    const price = Math.round(lowestAsk * variance) - i * 5;
    bids.push({
      id: `${skuId}-b${i}`,
      skuId,
      buyer: `bidder_${Math.floor(rand() * 9999)}`,
      price,
      expires: `${1 + Math.floor(rand() * 14)}d`,
    });
  }
  return bids.sort((a, b) => b.price - a.price);
}

export function priceHistoryForSku(skuId: string): { date: string; price: number }[] {
  const rand = seededRandom(parseInt(skuId) * 7);
  const lowestAsk = listingsForSku(skuId)[0]?.price || 200;
  const points: { date: string; price: number }[] = [];
  let price = lowestAsk * (0.85 + rand() * 0.1);
  const now = new Date("2026-04-27");
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const drift = (rand() - 0.48) * 0.05;
    price = Math.max(price * (1 + drift), lowestAsk * 0.6);
    points.push({
      date: d.toISOString().slice(0, 10),
      price: Math.round(price),
    });
  }
  return points;
}

export function recentSalesForSku(skuId: string): Sale[] {
  const history = priceHistoryForSku(skuId);
  return history.slice(-10).reverse().map((h, i) => ({
    id: `${skuId}-s${i}`,
    skuId,
    price: h.price,
    date: h.date,
  }));
}

export function lowestAsk(skuId: string): number | null {
  const l = listingsForSku(skuId);
  return l[0]?.price ?? null;
}

export function highestBid(skuId: string): number | null {
  const b = bidsForSku(skuId);
  return b[0]?.price ?? null;
}

export function lastSale(skuId: string): number | null {
  const s = recentSalesForSku(skuId);
  return s[0]?.price ?? null;
}

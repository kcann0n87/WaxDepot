export type SellerProfile = {
  username: string;
  displayName: string;
  bio: string;
  location: string;
  joinedAt: string;
  rating: number;
  totalSales: number;
  responseTime: string;
  shipsFromCity: string;
  verified: boolean;
  topSports: string[];
};

export type Verdict = "positive" | "neutral" | "negative";

export type SubRatings = {
  itemAccuracy: number; // 1-5
  communication: number; // 1-5
  shippingSpeed: number; // 1-5
  shippingCost: number; // 1-5
};

export type Review = {
  id: string;
  reviewer: string;
  sellerUsername: string;
  orderId: string;
  skuId: string;
  stars: 1 | 2 | 3 | 4 | 5;
  verdict: Verdict;
  subRatings: SubRatings;
  text: string;
  ts: string;
  sellerReply?: { text: string; ts: string };
};

export const sellers: SellerProfile[] = [
  {
    username: "sealed_only",
    displayName: "Sealed Only",
    bio: "I only sell sealed product. No singles, no breaks, no shenanigans. Same-day shipping for orders before 2pm CT.",
    location: "Austin, TX",
    joinedAt: "2023-08-14",
    rating: 100,
    totalSales: 412,
    responseTime: "Within 1 hour",
    shipsFromCity: "Austin, TX",
    verified: true,
    topSports: ["NBA", "MLB"],
  },
  {
    username: "boxbreaker_pro",
    displayName: "Box Breaker Pro",
    bio: "Long-time collector turned seller. Specializing in current-year hobby and high-end product. Stream breaks every Thursday.",
    location: "Phoenix, AZ",
    joinedAt: "2022-04-02",
    rating: 100,
    totalSales: 743,
    responseTime: "Within 2 hours",
    shipsFromCity: "Phoenix, AZ",
    verified: true,
    topSports: ["NFL", "NBA"],
  },
  {
    username: "northwestcards",
    displayName: "Northwest Cards",
    bio: "Family-run card shop, online since 2024. We buy fresh cases and break them down to single boxes for resale.",
    location: "Portland, OR",
    joinedAt: "2024-01-10",
    rating: 99.6,
    totalSales: 318,
    responseTime: "Within 4 hours",
    shipsFromCity: "Portland, OR",
    verified: true,
    topSports: ["MLB", "NBA"],
  },
  {
    username: "augies_collectibles",
    displayName: "Augie's Collectibles",
    bio: "Brick & mortar shop in Memphis. Online listings are a fraction of our in-store inventory — message us for case pricing.",
    location: "Memphis, TN",
    joinedAt: "2021-09-22",
    rating: 100,
    totalSales: 857,
    responseTime: "Same day",
    shipsFromCity: "Memphis, TN",
    verified: true,
    topSports: ["MLB", "NFL", "NBA"],
  },
  {
    username: "luchpaka_0",
    displayName: "luchpaka_0",
    bio: "Casual seller — flipping product I'd otherwise break. Shipping out within 24 hours, always factory sealed.",
    location: "Brooklyn, NY",
    joinedAt: "2025-02-03",
    rating: 100,
    totalSales: 25,
    responseTime: "Within 8 hours",
    shipsFromCity: "Brooklyn, NY",
    verified: false,
    topSports: ["NBA"],
  },
  {
    username: "thatdudedavid96",
    displayName: "thatdudedavid96",
    bio: "Reseller since 2020. I post early-morning ASAP shipping and message you the second I drop it off.",
    location: "Denver, CO",
    joinedAt: "2024-06-18",
    rating: 100,
    totalSales: 126,
    responseTime: "Within 3 hours",
    shipsFromCity: "Denver, CO",
    verified: true,
    topSports: ["NHL", "NBA"],
  },
  {
    username: "nbkisit",
    displayName: "nbkisit",
    bio: "Hobby case breaker — single boxes, sealed cases, retail product. Power Seller status since 2024.",
    location: "Chicago, IL",
    joinedAt: "2022-11-04",
    rating: 100,
    totalSales: 1128,
    responseTime: "Within 1 hour",
    shipsFromCity: "Chicago, IL",
    verified: true,
    topSports: ["NBA", "MLB", "NFL"],
  },
  {
    username: "alehow-70",
    displayName: "alehow-70",
    bio: "Casual collector with overflow inventory. Honest descriptions, careful packaging.",
    location: "Las Vegas, NV",
    joinedAt: "2023-05-21",
    rating: 99.7,
    totalSales: 523,
    responseTime: "Within 6 hours",
    shipsFromCity: "Las Vegas, NV",
    verified: true,
    topSports: ["NFL", "NBA"],
  },
  {
    username: "hobbyhouse",
    displayName: "Hobby House",
    bio: "LCS in operation since 1998. The largest WaxDepot seller by volume. Cases, boxes, packs — we have it.",
    location: "Cincinnati, OH",
    joinedAt: "2021-03-08",
    rating: 99.9,
    totalSales: 2410,
    responseTime: "Within 2 hours",
    shipsFromCity: "Cincinnati, OH",
    verified: true,
    topSports: ["MLB", "NBA", "NFL", "NHL"],
  },
  {
    username: "pristinepacks",
    displayName: "Pristine Packs",
    bio: "Online seller with 5+ years experience. I personally inspect every box before shipping.",
    location: "Tampa, FL",
    joinedAt: "2022-02-14",
    rating: 99.8,
    totalSales: 1893,
    responseTime: "Within 3 hours",
    shipsFromCity: "Tampa, FL",
    verified: true,
    topSports: ["NBA", "MLB"],
  },
];

export const reviews: Review[] = [
  {
    id: "r1",
    reviewer: "kyle_c",
    sellerUsername: "augies_collectibles",
    orderId: "WM-695420",
    skuId: "4",
    stars: 5,
    verdict: "positive",
    subRatings: { itemAccuracy: 5, communication: 5, shippingSpeed: 5, shippingCost: 5 },
    text: "Box arrived sealed, packed great. Shipped same day. Will buy again.",
    ts: "2026-04-08 10:14",
    sellerReply: {
      text: "Thanks Kyle, appreciate the smooth transaction. Hit us up next time.",
      ts: "2026-04-08 10:32",
    },
  },
  {
    id: "r2",
    reviewer: "boxhunter_99",
    sellerUsername: "augies_collectibles",
    orderId: "WM-688140",
    skuId: "10",
    stars: 5,
    verdict: "positive",
    subRatings: { itemAccuracy: 5, communication: 5, shippingSpeed: 5, shippingCost: 5 },
    text: "Top notch. Best packaging I've ever received from a card shop. Bubble wrap + box-in-box.",
    ts: "2026-03-22 14:08",
  },
  {
    id: "r3",
    reviewer: "vintage_chaser",
    sellerUsername: "augies_collectibles",
    orderId: "WM-680221",
    skuId: "7",
    stars: 4,
    verdict: "positive",
    subRatings: { itemAccuracy: 5, communication: 4, shippingSpeed: 3, shippingCost: 5 },
    text: "Box arrived sealed and on time. Took an extra day to ship but communication was good.",
    ts: "2026-03-04 09:15",
  },
  {
    id: "r4",
    reviewer: "ripper2024",
    sellerUsername: "boxbreaker_pro",
    orderId: "WM-696770",
    skuId: "8",
    stars: 5,
    verdict: "positive",
    subRatings: { itemAccuracy: 5, communication: 5, shippingSpeed: 5, shippingCost: 5 },
    text: "Quick shipping, factory sealed. Caught his stream after — funny dude. Solid seller.",
    ts: "2026-04-12 18:30",
  },
  {
    id: "r5",
    reviewer: "stable_box",
    sellerUsername: "boxbreaker_pro",
    orderId: "WM-691030",
    skuId: "5",
    stars: 5,
    verdict: "positive",
    subRatings: { itemAccuracy: 5, communication: 5, shippingSpeed: 5, shippingCost: 4 },
    text: "Second purchase from this seller. Same great experience.",
    ts: "2026-03-18 12:00",
  },
  {
    id: "r6",
    reviewer: "jpprospects",
    sellerUsername: "northwestcards",
    orderId: "WM-700891",
    skuId: "10",
    stars: 5,
    verdict: "positive",
    subRatings: { itemAccuracy: 5, communication: 5, shippingSpeed: 4, shippingCost: 5 },
    text: "Smooth transaction, fair shipping cost. Box was as described.",
    ts: "2026-04-19 14:10",
  },
  {
    id: "r7",
    reviewer: "card_card_card",
    sellerUsername: "sealed_only",
    orderId: "WM-693012",
    skuId: "2",
    stars: 5,
    verdict: "positive",
    subRatings: { itemAccuracy: 5, communication: 5, shippingSpeed: 5, shippingCost: 5 },
    text: "Lives up to the name. Always sealed, always quick. My go-to seller for Prizm.",
    ts: "2026-03-29 16:22",
  },
  {
    id: "r8",
    reviewer: "wax_warrior",
    sellerUsername: "augies_collectibles",
    orderId: "WM-665012",
    skuId: "1",
    stars: 3,
    verdict: "neutral",
    subRatings: { itemAccuracy: 4, communication: 3, shippingSpeed: 2, shippingCost: 3 },
    text: "Box was sealed but took 6 days to ship. Wish they had communicated about the delay.",
    ts: "2026-01-22 11:30",
    sellerReply: {
      text: "Thanks for the feedback — we had a holiday backlog. We've since hired help to keep ship times tight.",
      ts: "2026-01-22 13:18",
    },
  },
  {
    id: "r9",
    reviewer: "tradeMaster_44",
    sellerUsername: "alehow-70",
    orderId: "WM-672104",
    skuId: "9",
    stars: 2,
    verdict: "negative",
    subRatings: { itemAccuracy: 5, communication: 2, shippingSpeed: 2, shippingCost: 2 },
    text: "Box was good but seller went radio silent for a week and shipping cost was higher than the listing implied.",
    ts: "2026-02-14 17:08",
  },
  {
    id: "r10",
    reviewer: "modern_collector",
    sellerUsername: "boxbreaker_pro",
    orderId: "WM-688902",
    skuId: "2",
    stars: 5,
    verdict: "positive",
    subRatings: { itemAccuracy: 5, communication: 5, shippingSpeed: 5, shippingCost: 5 },
    text: "A+ all around. Same-day shipping, packed like a fortress.",
    ts: "2026-03-08 10:42",
  },
  {
    id: "r11",
    reviewer: "rookie_rip",
    sellerUsername: "northwestcards",
    orderId: "WM-695100",
    skuId: "20",
    stars: 4,
    verdict: "positive",
    subRatings: { itemAccuracy: 5, communication: 4, shippingSpeed: 4, shippingCost: 4 },
    text: "Solid. Box was sealed, fair price. Took a couple days extra to ship but no big deal.",
    ts: "2026-04-04 16:00",
  },
  {
    id: "r12",
    reviewer: "thehobbypapa",
    sellerUsername: "hobbyhouse",
    orderId: "WM-699221",
    skuId: "11",
    stars: 5,
    verdict: "positive",
    subRatings: { itemAccuracy: 5, communication: 5, shippingSpeed: 5, shippingCost: 5 },
    text: "These guys are a machine. Ship out same day, every time. My favorite WaxDepot seller.",
    ts: "2026-04-12 14:20",
  },
];

export type FeedbackStats = {
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  positivePct: number;
  avgStars: number;
  subAverages: SubRatings;
};

const todayMs = new Date(2026, 3, 28, 12, 0).getTime();

function tsToMs(ts: string) {
  const [date, time] = ts.split(" ");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time || "00:00").split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm).getTime();
}

export function feedbackStatsForSeller(username: string, windowDays?: number): FeedbackStats {
  let list = reviewsForSeller(username);
  if (windowDays !== undefined) {
    const cutoff = todayMs - windowDays * 86400000;
    list = list.filter((r) => tsToMs(r.ts) >= cutoff);
  }
  const total = list.length;
  if (total === 0) {
    return {
      total: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
      positivePct: 0,
      avgStars: 0,
      subAverages: { itemAccuracy: 0, communication: 0, shippingSpeed: 0, shippingCost: 0 },
    };
  }
  const positive = list.filter((r) => r.verdict === "positive").length;
  const neutral = list.filter((r) => r.verdict === "neutral").length;
  const negative = list.filter((r) => r.verdict === "negative").length;
  const avgStars = list.reduce((s, r) => s + r.stars, 0) / total;
  const subAverages: SubRatings = {
    itemAccuracy: list.reduce((s, r) => s + r.subRatings.itemAccuracy, 0) / total,
    communication: list.reduce((s, r) => s + r.subRatings.communication, 0) / total,
    shippingSpeed: list.reduce((s, r) => s + r.subRatings.shippingSpeed, 0) / total,
    shippingCost: list.reduce((s, r) => s + r.subRatings.shippingCost, 0) / total,
  };
  return {
    total,
    positive,
    neutral,
    negative,
    positivePct: Math.round((positive / total) * 1000) / 10,
    avgStars: Math.round(avgStars * 10) / 10,
    subAverages,
  };
}

export function sellerStatusBadge(stats: FeedbackStats): { label: string; tone: "gold" | "blue" | "slate" } | null {
  if (stats.total >= 100 && stats.positivePct >= 99) return { label: "Gold Seller", tone: "gold" };
  if (stats.total >= 25 && stats.positivePct >= 98) return { label: "Pro Seller", tone: "blue" };
  if (stats.total >= 10 && stats.positivePct >= 95) return { label: "Verified Seller", tone: "slate" };
  return null;
}

export function findSeller(username: string) {
  return sellers.find((s) => s.username === username);
}

export function reviewsForSeller(username: string) {
  return reviews
    .filter((r) => r.sellerUsername === username)
    .sort((a, b) => (a.ts < b.ts ? 1 : -1));
}

export function avgStars(username: string) {
  const list = reviewsForSeller(username);
  if (list.length === 0) return null;
  const sum = list.reduce((s, r) => s + r.stars, 0);
  return Math.round((sum / list.length) * 10) / 10;
}

export type HelpCategory = {
  slug: string;
  title: string;
  description: string;
  icon: "buyer" | "seller" | "payouts" | "disputes" | "account" | "fees";
  articles: HelpArticle[];
};

export type HelpArticle = {
  slug: string;
  title: string;
  body: string;
};

export const helpCategories: HelpCategory[] = [
  {
    slug: "buying",
    title: "Buying",
    description: "Placing orders, bids, and getting boxes shipped to you",
    icon: "buyer",
    articles: [
      {
        slug: "place-an-order",
        title: "How do I place an order?",
        body: "Find a product, click Buy Now or add it to your cart. Enter your shipping address and a card. Your payment is held in escrow until the box arrives sealed — funds aren't released to the seller until you confirm delivery (or 3 days after delivery, whichever comes first).",
      },
      {
        slug: "place-a-bid",
        title: "How do bids work?",
        body: "On any product page, click Place Bid to offer below the lowest ask. If a seller accepts your bid, your card is charged automatically. If you bid at or above the lowest ask, you'll buy instantly. Bids expire after the time you set (1-30 days).",
      },
      {
        slug: "buyer-protection",
        title: "What is Buyer Protection?",
        body: "Every order is covered by WaxDepot Buyer Protection. Your payment stays in escrow until you confirm the box arrived sealed. If something's wrong (resealed, wrong item, damaged), open a dispute within 3 days of delivery for a full refund.",
      },
      {
        slug: "shipping-times",
        title: "How long does shipping take?",
        body: "Sellers have 2 business days to ship after the order is placed. Most boxes arrive within 3-7 days depending on carrier and location. You'll get tracking updates in your order detail page.",
      },
    ],
  },
  {
    slug: "selling",
    title: "Selling",
    description: "Listing boxes, getting paid, and managing your store",
    icon: "seller",
    articles: [
      {
        slug: "list-a-box",
        title: "How do I list a box for sale?",
        body: "Go to Sell, search for the product (or pick from the catalog), set your asking price, choose shipping, and publish. You'll see live feedback like \"you'll be the new lowest ask\" or \"this meets a buyer's bid — instant sale.\"",
      },
      {
        slug: "get-paid",
        title: "When do I get paid?",
        body: "Payouts are weekly via ACH every Friday. After a buyer confirms delivery, the funds move to your pending balance. The next Friday, all released sales for the week are bundled into a single ACH transfer that lands in your bank by the next business day.",
      },
      {
        slug: "shipping-deadline",
        title: "When do I have to ship?",
        body: "You have 2 business days from when an order is placed. Late shipments hurt your seller score and can lead to cancellation. Mark your listing as shipped and add tracking from the listing detail page once you've dropped it off.",
      },
      {
        slug: "fees",
        title: "What are the fees?",
        body: "Flat seller-only fee. No buyer fees, no separate payment processing — we absorb that. Three tiers based on rolling 30-day sales: Starter 10% (default), Pro 8% (100+ sales/mo, 99%+ positive), Elite 6% (500+ sales/mo, 99.5%+ positive). Pro unlocks twice-weekly payouts (Tue + Fri); Elite unlocks payouts every 3 days. No listing fees, no monthly fees.",
      },
    ],
  },
  {
    slug: "payouts",
    title: "Payouts & taxes",
    description: "Bank account setup, payout schedule, and 1099-K reporting",
    icon: "payouts",
    articles: [
      {
        slug: "set-up-payouts",
        title: "How do I set up payouts?",
        body: "Go to Sell → Set up payouts. You'll provide your legal name, DOB, last 4 of SSN, address, and bank routing/account numbers. Verification typically completes in minutes; first ACH may take 2-3 business days to clear.",
      },
      {
        slug: "1099-k",
        title: "Will I get a 1099-K?",
        body: "Yes, if you cross the IRS threshold ($600+ in sales for US sellers). We mail 1099-Ks by January 31 of the following year. You're responsible for reporting and paying tax on your sales.",
      },
      {
        slug: "change-bank-account",
        title: "How do I change my bank account?",
        body: "From your Payouts dashboard, click Manage payout settings. You'll need to re-verify identity and may need to wait 2-3 days for the new account to be confirmed before payouts resume.",
      },
    ],
  },
  {
    slug: "disputes",
    title: "Disputes & refunds",
    description: "What to do when something goes wrong",
    icon: "disputes",
    articles: [
      {
        slug: "open-a-dispute",
        title: "How do I open a dispute?",
        body: "On the order detail page (within 3 days of delivery), click Open a dispute. Pick a reason — box not sealed, wrong item, damaged in transit, never arrived, etc. — and add photos and a description. Funds stay held in escrow until the dispute is resolved.",
      },
      {
        slug: "dispute-process",
        title: "What happens after I open a dispute?",
        body: "The seller has 48 hours to respond. WaxDepot Support reviews both sides within 3 business days. If we side with you, you get a full refund and the seller is on the hook for return shipping. If we side with the seller, funds are released to them.",
      },
      {
        slug: "resealed-wax",
        title: "I think my box was resealed — what do I do?",
        body: "Don't break the seal. Take clear photos showing weight, factory tape condition, and any irregularities. Open a dispute immediately and select \"Suspect resealed.\" Our team has trained eyes and we err on the side of buyers when authenticity is in question.",
      },
    ],
  },
  {
    slug: "account",
    title: "Account",
    description: "Settings, security, notifications, and preferences",
    icon: "account",
    articles: [
      {
        slug: "change-password",
        title: "How do I change my password?",
        body: "From Account → Settings → Security, click Change password. You'll need your current password to confirm.",
      },
      {
        slug: "two-factor",
        title: "Should I enable two-factor authentication?",
        body: "Yes — strongly recommended, especially if you sell. Go to Account → Settings → Security → Enable 2FA. Use an authenticator app (Google Authenticator, 1Password, Authy) over SMS for better security.",
      },
      {
        slug: "delete-account",
        title: "How do I delete my account?",
        body: "Email support@waxdepot.io with the subject \"Delete my account.\" We'll permanently remove your data within 30 days. Active orders and pending payouts must be settled first.",
      },
    ],
  },
];

export function findArticle(categorySlug: string, articleSlug: string) {
  const category = helpCategories.find((c) => c.slug === categorySlug);
  if (!category) return null;
  const article = category.articles.find((a) => a.slug === articleSlug);
  if (!article) return null;
  return { category, article };
}

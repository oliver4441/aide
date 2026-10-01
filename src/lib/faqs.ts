import { SITE_URL, SUPPORT_EMAIL, DOWNLOADS_PATH } from "./site";

/**
 * The one and only FAQ dataset.
 *
 * Previously the same questions lived in three places with different answers
 * (`landing/FaqSection`, `help/FAQSection`, `help/HelpCenter`) and drifted —
 * including a decommissioned Vercel preview URL and a question about a
 * "Coming Soon" pricing badge that no longer exists. Every surface now reads
 * from here.
 *
 * Answers are written from observed behaviour in the codebase, not marketing
 * copy. If you change a feature, change the answer here and all three surfaces
 * follow.
 */

export type FaqCategory =
  | "Getting started"
  | "Selling & receipts"
  | "Offline & sync"
  | "Data & privacy"
  | "Devices & apps";

export interface Faq {
  category: FaqCategory;
  question: string;
  answer: string;
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  "Getting started",
  "Selling & receipts",
  "Offline & sync",
  "Data & privacy",
  "Devices & apps",
];

export const FAQS: Faq[] = [
  // ---------------------------------------------------------------- getting started
  {
    category: "Getting started",
    question: "What do I need to start using Aide?",
    answer:
      "Just a browser and an internet connection for the first sign-in. Create your business profile, add a few products, and you can start selling the same day. There is nothing to install on a server and no card required for the free tier.",
  },
  {
    category: "Getting started",
    question: "How do I add my first products?",
    answer:
      "Go to Inventory and tap 'Add Product'. Enter the name, price and opening quantity, pick a category, and Aide generates the SKU for you. Use Settings → Product Categories first if you want groups like 'Drinks' or 'Hair Products'.",
  },
  {
    category: "Getting started",
    question: "How do I make a sale?",
    answer:
      "Open New Sale, tap the items to build the cart, choose the payment method, then Complete Sale. Stock is deducted automatically and the receipt is ready straight away.",
  },
  {
    category: "Getting started",
    question: "How do I change my business settings?",
    answer:
      "Go to Settings in the sidebar. You can update your business name and type, currency, tax rate, receipt footer text, product categories, and your notification preferences at any time.",
  },

  // ---------------------------------------------------------------- selling & receipts
  {
    category: "Selling & receipts",
    question: "Which payment methods can I record?",
    answer:
      "Cash, M-Pesa and card. The method is stored on each sale, so your reports can break down takings by how customers actually paid.",
  },
  {
    category: "Selling & receipts",
    question: "Can I print or share receipts?",
    answer:
      "Yes. After completing a sale you can print to a Bluetooth thermal printer or a standard A4 printer, or share the receipt as a PDF. Each receipt also carries a QR code the customer can scan to open and save it on their own phone.",
  },
  {
    category: "Selling & receipts",
    question: "Does Aide calculate VAT?",
    answer:
      "Yes. Set your tax rate in Settings and Aide calculates the tax line on each receipt and rolls it into your reports.",
  },
  {
    category: "Selling & receipts",
    question: "Will I know when stock is running low?",
    answer:
      "Yes. Aide tracks quantity per product and flags low-stock items on the dashboard and in your notifications, so you can reorder before you run out.",
  },

  // ---------------------------------------------------------------- offline & sync
  {
    category: "Offline & sync",
    question: "How does offline mode work?",
    answer:
      "Aide is offline-first. Your products, sales and settings are stored on the device in the browser's IndexedDB, so the app keeps working with no internet — you can still sell, take stock and read reports. When you reconnect, the data syncs up to your account.",
  },
  {
    category: "Offline & sync",
    question: "What happens to a sale I made offline?",
    answer:
      "Nothing is lost. It is saved locally the moment you complete it, and it uploads the next time you have a connection. You can also tap 'Sync now' in Settings to push immediately.",
  },
  {
    category: "Offline & sync",
    question: "Can I use Aide on more than one device?",
    answer:
      "Yes. Sign in with the same account on each device. Data syncs through your account whenever a device is online, so a sale rung up on the phone appears on the shop till once both have synced.",
  },

  // ---------------------------------------------------------------- data & privacy
  {
    category: "Data & privacy",
    question: "Is my data safe?",
    answer:
      `Your records belong to your business. They live in your device's local storage first and sync to your own account on our servers — we do not sell or share them. Uninstalling the app removes the local copy, and you can export everything at any time before you do. See ${SITE_URL}/privacy for the full detail.`,
  },
  {
    category: "Data & privacy",
    question: "How do I export my data?",
    answer:
      "Sales History has an Export menu that downloads your transactions as CSV or JSON. Reports also exports CSV. Both open in any spreadsheet app, so your accountant can work from the same numbers you do.",
  },
  {
    category: "Data & privacy",
    question: "Can I back up my records?",
    answer:
      "Yes — exporting from Sales History or Reports gives you a portable copy you can keep off-device. This is also the safest thing to do before clearing your browser data or switching devices.",
  },

  // ---------------------------------------------------------------- devices & apps
  {
    category: "Devices & apps",
    question: "How do I install Aide on my phone?",
    answer:
      "Open Aide in your mobile browser and choose 'Add to Home Screen' from the browser menu — the share sheet on iPhone, the three-dot menu on Android. Aide then launches full-screen like a native app and keeps working offline.",
  },
  {
    category: "Devices & apps",
    question: "Is there a native Android or Windows version?",
    answer:
      `Yes. Aide ships as an installable PWA, an Android APK and a Windows desktop app. Head to ${SITE_URL}${DOWNLOADS_PATH} for the current builds, file sizes and SHA-256 checksums.`,
  },
  {
    category: "Devices & apps",
    question: "How do I report a bug or ask for a feature?",
    answer:
      `Open the Help Centre from the question-mark button inside the app, start a live chat, or email ${SUPPORT_EMAIL}. We aim to reply within 24 hours.`,
  },
];

/**
 * The subset shown on the marketing landing page — deliberately curated rather
 * than `FAQS.slice(0, n)`, so the offline story leads and the page does not
 * silently change when a question is added above it.
 */
const LANDING_QUESTION_ORDER = [
  "How does offline mode work?",
  "How do I install Aide on my phone?",
  "Is there a native Android or Windows version?",
  "Which payment methods can I record?",
  "Can I print or share receipts?",
  "Can I use Aide on more than one device?",
  "How do I export my data?",
  "Is my data safe?",
];

export const LANDING_FAQS: Faq[] = LANDING_QUESTION_ORDER.map((question) => {
  const match = FAQS.find((f) => f.question === question);
  if (!match) {
    throw new Error(`LANDING_FAQS references an unknown question: "${question}"`);
  }
  return match;
});

export function getFaqsByCategory(): { category: FaqCategory; items: Faq[] }[] {
  return FAQ_CATEGORIES.map((category) => ({
    category,
    items: FAQS.filter((f) => f.category === category),
  })).filter((group) => group.items.length > 0);
}

// Seed products for the Amazon Business punchout smoke mock.
//
// Hygiene rules from PLATFORMS/amazon-business.md § HYGIENE:
//   - ASIN: 10-character alphanumeric, typically starting B0. Do NOT use real
//     production ASINs from Amazon.com — make up obviously-fake shape-correct
//     ones (e.g., B0FAKE1234).
//   - Currency: USD for US demos.
//   - Prices: include both consumer price and Business Prime price where it
//     makes sense, with a realistic 10-25% business discount.
//
// These products span the vertical mix SEs demo most often: office supplies,
// facilities/breakroom, IT, and lab. Emoji images scan well at demo scale.

import type { Product } from "@/components/platforms/amazon-business";

export const seedProducts: Product[] = [
  {
    asin: "B0FAKE0001",
    title: "HP 58A Black Original Toner Cartridge (CF258A)",
    brand: "HP",
    image: "🖨️",
    price: 96.99,
    listPrice: 119.99,
    businessPrice: 84.99,
    currency: "USD",
    rating: 4.6,
    reviewCount: 18432,
    deliveryText: "FREE delivery Tomorrow, Apr 25",
    availability: "In Stock",
    badge: "best-seller",
  },
  {
    asin: "B0FAKE0002",
    title:
      "AmazonBasics Multipurpose Copy Paper, 20 lb, Letter, 500 Sheets (10-Ream Case)",
    brand: "Amazon Basics",
    image: "📄",
    price: 54.0,
    businessPrice: 47.5,
    currency: "USD",
    rating: 4.7,
    reviewCount: 9012,
    deliveryText: "FREE delivery Saturday, Apr 26",
    availability: "In Stock",
    badge: "business-choice",
  },
  {
    asin: "B0FAKE0003",
    title: "Nitrile Exam Gloves, Powder-Free, Latex-Free, Size M, 100/Box",
    brand: "MedPro",
    image: "🧤",
    price: 21.49,
    listPrice: 24.99,
    businessPrice: 18.75,
    currency: "USD",
    rating: 4.5,
    reviewCount: 3421,
    deliveryText: "FREE delivery Monday, Apr 27",
    availability: "Only 42 left in stock",
  },
  {
    asin: "B0FAKE0004",
    title:
      "Keurig K-Cup Coffee Variety Pack, 60 Pods (Dark Roast, Medium, Decaf)",
    brand: "Keurig",
    image: "☕",
    price: 39.99,
    businessPrice: 34.99,
    currency: "USD",
    rating: 4.8,
    reviewCount: 56910,
    deliveryText: "FREE delivery Tomorrow, Apr 25",
    availability: "In Stock",
    badge: "best-seller",
  },
  {
    asin: "B0FAKE0005",
    title:
      "Dell Latitude 5540 Business Laptop — Intel Core i7, 16GB RAM, 512GB SSD",
    brand: "Dell",
    image: "💻",
    price: 1849.0,
    listPrice: 2149.0,
    businessPrice: 1699.0,
    currency: "USD",
    rating: 4.3,
    reviewCount: 482,
    deliveryText: "FREE delivery Wed, Apr 30",
    availability: "Ships from Dell",
    badge: "business-choice",
  },
  {
    asin: "B0FAKE0006",
    title: "ANSI Z87.1 Safety Goggles, Anti-Fog Clear Lens (12-Pack)",
    brand: "Honeywell",
    image: "🥽",
    price: 34.5,
    businessPrice: 29.99,
    currency: "USD",
    rating: 4.4,
    reviewCount: 1208,
    deliveryText: "FREE delivery Sunday, Apr 27",
    availability: "In Stock",
  },
];

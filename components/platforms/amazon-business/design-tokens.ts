// Amazon Business design tokens.
// Source: PLATFORMS/amazon-business.md § VISUAL IDENTITY.
// The storefront during a punchout session should look (and must look) like
// the public Amazon.com, with a session banner added and the cart action
// relabeled. Do not redesign the Amazon chrome — the point is the buyer has
// the normal Amazon shopping experience. Every Amazon Business mock's UI
// must pull from here — do not inline hex codes, and do not invent new
// tokens without updating the platform fidelity file first.

export const amazonColors = {
  // Brand
  brandOrange: "#FF9900", // logo tail / CTA accents / ratings
  brandYellow: "#FFD814", // consumer "Add to Cart" / "Buy Now" button
  headerDark: "#131921", // top header strip
  navMedium: "#232F3E", // sub-nav strip
  businessTeal: "#007185", // product title link color / "Business Choice"
  priceRed: "#CC0C39", // strikethrough price, promo
  deliveryGreen: "#007600", // "FREE delivery tomorrow" line

  // Surfaces
  page: "#EAEDED", // page background
  surface: "#FFFFFF", // card background
  divider: "#DDDDDD",

  // Text
  textPrimary: "#0F1111",
  textMuted: "#555555",
  textOnDark: "#FFFFFF",

  // Punchout banner (added on top of Amazon chrome during a session)
  punchoutGradientFrom: "#1A3A5C",
  punchoutGradientTo: "#0F2942",
  punchoutAccent: "#FF9900", // 3px orange bottom border
} as const;

export const amazonLayout = {
  headerHeight: 48, // top dark-blue header
  subNavHeight: 32, // medium-blue category nav
  punchoutBannerHeight: 48,
  searchMaxWidth: 700,
  sidebarWidth: 220, // filters sidebar
  productImageArea: 140,
  cartPanelWidth: 340,
} as const;

export const amazonFont = {
  // Real Amazon ships Amazon Ember. Inter / Arial is the closest public
  // fallback that doesn't distort the layout metrics.
  family:
    '"Amazon Ember", Inter, Arial, "Helvetica Neue", Helvetica, sans-serif',
  sizeBody: "14px",
  sizeTitle: "13px", // product title (teal link)
  sizePrice: "18px",
  sizeDelivery: "11px",
  sizeRating: "12px",
} as const;

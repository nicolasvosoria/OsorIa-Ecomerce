import type { Database } from "./database.types";

export const ECOMMERCE_SCHEMA = "ecommerce" as const satisfies keyof Database;

type EcommerceSchema = Database[typeof ECOMMERCE_SCHEMA];

export type EcommerceTableName = keyof EcommerceSchema["Tables"] & string;
export type EcommerceViewName = keyof EcommerceSchema["Views"] & string;
export type EcommerceFunctionName = keyof EcommerceSchema["Functions"] & string;

export const ECOMMERCE_TABLES = {
  appFonts: "app_fonts",
  appThemeVersions: "app_theme_versions",
  appThemes: "app_themes",
  componentStyles: "component_styles",
  itemCategories: "item_categories",
  itemImages: "item_images",
  itemMetrics: "item_metrics",
  itemOptions: "item_options",
  itemSeo: "item_seo",
  itemTags: "item_tags",
  itemVariants: "item_variants",
  orderAddresses: "order_addresses",
  orderItems: "order_items",
  orders: "orders",
  paymentTransactions: "payment_transactions",
  storeIntegrations: "store_integrations",
  storeItems: "store_items",
  stores: "stores",
  userProfiles: "user_profiles",
} as const satisfies Record<string, EcommerceTableName>;

export const ECOMMERCE_VIEWS = {
  appFontsLegacy: "app_fonts_legacy",
  appThemesLegacy: "app_themes_legacy",
  componentStylesLegacy: "component_styles_legacy",
  itemOptionsLegacy: "item_options_legacy",
  ordersLegacy: "orders_legacy",
  storeItemsLegacy: "store_items_legacy",
  storesLegacy: "stores_legacy",
} as const satisfies Record<string, EcommerceViewName>;

export const ECOMMERCE_FUNCTIONS = {
  incrementItemViews: "increment_item_views",
  isComponentStylesAdmin: "is_component_styles_admin",
  isStorageAdmin: "is_storage_admin",
} as const satisfies Record<string, EcommerceFunctionName>;

export const ECOMMERCE_STORAGE_BUCKETS = {
  products: "products",
  componentImages: "component-images",
  marketingAssets: "marketing-assets",
} as const;

export type EcommerceStorageBucket =
  (typeof ECOMMERCE_STORAGE_BUCKETS)[keyof typeof ECOMMERCE_STORAGE_BUCKETS];

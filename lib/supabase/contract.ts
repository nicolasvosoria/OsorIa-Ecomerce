import type { Database } from "./database.types";

export const ECOMMERCE_SCHEMA = "ecommerce" as const satisfies keyof Database;

type EcommerceSchema = Database[typeof ECOMMERCE_SCHEMA];

export type EcommerceTableName = keyof EcommerceSchema["Tables"] & string;
export type EcommerceViewName = keyof EcommerceSchema["Views"] & string;
export type EcommerceFunctionName = keyof EcommerceSchema["Functions"] & string;

export const ECOMMERCE_TABLES = {
  appFontPairings: "app_font_pairings",
  appFonts: "app_fonts",
  appThemeVersions: "app_theme_versions",
  appThemes: "app_themes",
  authIntents: "auth_intents",
  carts: "carts",
  componentStyles: "component_styles",
  emailOutbox: "email_outbox",
  homeSectionLayout: "home_section_layout",
  itemCategories: "item_categories",
  itemImages: "item_images",
  itemMetrics: "item_metrics",
  itemOptions: "item_options",
  itemSeo: "item_seo",
  itemTags: "item_tags",
  itemVariants: "item_variants",
  orderAddresses: "order_addresses",
  orderComboSnapshots: "order_combo_snapshots",
  orderItems: "order_items",
  orders: "orders",
  paymentTransactions: "payment_transactions",
  pendingMembershipInvites: "pending_membership_invites",
  productComboComponents: "product_combo_components",
  productCombos: "product_combos",
  roles: "roles",
  shopConfig: "shop_config",
  storeBranding: "store_branding",
  storeContact: "store_contact",
  storeIntegrations: "store_integrations",
  storeItems: "store_items",
  storeMailboxVerifications: "store_mailbox_verifications",
  storeUserRoles: "store_user_roles",
  storeUsers: "store_users",
  stores: "stores",
  userAddresses: "user_addresses",
  userProfiles: "user_profiles",
} as const satisfies Record<string, EcommerceTableName>;

export const ECOMMERCE_VIEWS = {
  appFontPairingsLegacy: "app_font_pairings_legacy",
  appFontsLegacy: "app_fonts_legacy",
  componentStylesLegacy: "component_styles_legacy",
  emailOutboxHealth: "email_outbox_health",
  itemOptionsLegacy: "item_options_legacy",
  storeItemsLegacy: "store_items_legacy",
  storesLegacy: "stores_legacy",
} as const satisfies Record<string, EcommerceViewName>;

export const ECOMMERCE_FUNCTIONS = {
  acceptMembershipInvite: "accept_membership_invite",
  canUserManageStore: "can_user_manage_store",
  checkAndRecordSendAttempt: "check_and_record_send_attempt",
  claimEmailOutboxBatch: "claim_email_outbox_batch",
  confirmStoreMailboxVerification: "confirm_store_mailbox_verification",
  createOrderWithNotifications: "create_order_with_notifications",
  decrementInventory: "decrement_inventory",
  finalizeCustomerProfile: "finalize_customer_profile",
  findAuthUserIdByEmail: "find_auth_user_id_by_email",
  generateOrderNumber: "generate_order_number",
  incrementItemViews: "increment_item_views",
  isComponentStylesAdmin: "is_component_styles_admin",
  isStorageAdmin: "is_storage_admin",
  markEmailOutboxFailed: "mark_email_outbox_failed",
  markEmailOutboxSent: "mark_email_outbox_sent",
  provisionStore: "provision_store",
  pruneEmailOutbox: "prune_email_outbox",
  requestMembershipInvite: "request_membership_invite",
  requestStoreMailboxVerification: "request_store_mailbox_verification",
  transitionOrderStatus: "transition_order_status",
  userManagesAnyStore: "user_manages_any_store",
} as const satisfies Record<string, EcommerceFunctionName>;

export const ECOMMERCE_STORAGE_BUCKETS = {
  products: "products",
  componentImages: "component-images",
  marketingAssets: "marketing-assets",
} as const;

export type EcommerceStorageBucket =
  (typeof ECOMMERCE_STORAGE_BUCKETS)[keyof typeof ECOMMERCE_STORAGE_BUCKETS];

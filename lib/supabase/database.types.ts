export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  ecommerce: {
    Tables: {
      app_fonts: {
        Row: {
          created_at: string
          css_font_family: string
          font_display_name: string | null
          font_family: string
          font_name: string
          google_font_url: string | null
          id: number
          is_active: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          css_font_family: string
          font_display_name?: string | null
          font_family: string
          font_name: string
          google_font_url?: string | null
          id?: number
          is_active?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          css_font_family?: string
          font_display_name?: string | null
          font_family?: string
          font_name?: string
          google_font_url?: string | null
          id?: number
          is_active?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      app_theme_versions: {
        Row: {
          created_at: string | null
          fonts: Json | null
          id: string
          is_current: boolean | null
          store_id: string
          theme_id: number
          variables: Json | null
        }
        Insert: {
          created_at?: string | null
          fonts?: Json | null
          id?: string
          is_current?: boolean | null
          store_id: string
          theme_id: number
          variables?: Json | null
        }
        Update: {
          created_at?: string | null
          fonts?: Json | null
          id?: string
          is_current?: boolean | null
          store_id?: string
          theme_id?: number
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "app_theme_versions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_theme_versions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_theme_versions_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "app_themes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_theme_versions_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "app_themes_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      app_themes: {
        Row: {
          colors: Json
          created_at: string
          id: number
          is_active: boolean | null
          theme_name: string
          updated_at: string
        }
        Insert: {
          colors: Json
          created_at?: string
          id?: number
          is_active?: boolean | null
          theme_name: string
          updated_at?: string
        }
        Update: {
          colors?: Json
          created_at?: string
          id?: number
          is_active?: boolean | null
          theme_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string | null
          id: string
          quantity: number
          selected_options: Json | null
          unit_price: number
          updated_at: string | null
          variant_id: string | null
        }
        Insert: {
          cart_id: string
          created_at?: string | null
          id?: string
          quantity?: number
          selected_options?: Json | null
          unit_price: number
          updated_at?: string | null
          variant_id?: string | null
        }
        Update: {
          cart_id?: string
          created_at?: string | null
          id?: string
          quantity?: number
          selected_options?: Json | null
          unit_price?: number
          updated_at?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "item_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string | null
          currency_code: string
          expires_at: string | null
          id: string
          session_id: string | null
          status: Database["ecommerce"]["Enums"]["cart_status"] | null
          store_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          currency_code?: string
          expires_at?: string | null
          id?: string
          session_id?: string | null
          status?: Database["ecommerce"]["Enums"]["cart_status"] | null
          store_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          currency_code?: string
          expires_at?: string | null
          id?: string
          session_id?: string | null
          status?: Database["ecommerce"]["Enums"]["cart_status"] | null
          store_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      component_styles: {
        Row: {
          component_name: string
          id: number
          store_id: string
          updated_at: string | null
          variables: Json
        }
        Insert: {
          component_name: string
          id?: number
          store_id: string
          updated_at?: string | null
          variables: Json
        }
        Update: {
          component_name?: string
          id?: number
          store_id?: string
          updated_at?: string | null
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "component_styles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "component_styles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string | null
          id: string
          movement_type: Database["ecommerce"]["Enums"]["inventory_movement_type"]
          quantity: number
          reason: string | null
          related_cart_id: string | null
          related_order_id: string | null
          store_id: string
          variant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          movement_type: Database["ecommerce"]["Enums"]["inventory_movement_type"]
          quantity: number
          reason?: string | null
          related_cart_id?: string | null
          related_order_id?: string | null
          store_id: string
          variant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          movement_type?: Database["ecommerce"]["Enums"]["inventory_movement_type"]
          quantity?: number
          reason?: string | null
          related_cart_id?: string | null
          related_order_id?: string | null
          store_id?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_related_cart_id_fkey"
            columns: ["related_cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "orders_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "item_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      item_categories: {
        Row: {
          category_description: string | null
          category_image_url: string | null
          category_name: string
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          parent_category_id: string | null
          store_id: string
          updated_at: string | null
        }
        Insert: {
          category_description?: string | null
          category_image_url?: string | null
          category_name: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          parent_category_id?: string | null
          store_id: string
          updated_at?: string | null
        }
        Update: {
          category_description?: string | null
          category_image_url?: string | null
          category_name?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          parent_category_id?: string | null
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "item_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      item_images: {
        Row: {
          created_at: string | null
          display_order: number | null
          height: number | null
          id: string
          image_alt: string | null
          image_title: string | null
          image_type: string | null
          image_url: string
          item_id: string | null
          variant_id: string | null
          width: number | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          height?: number | null
          id?: string
          image_alt?: string | null
          image_title?: string | null
          image_type?: string | null
          image_url: string
          item_id?: string | null
          variant_id?: string | null
          width?: number | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          height?: number | null
          id?: string
          image_alt?: string | null
          image_title?: string | null
          image_type?: string | null
          image_url?: string
          item_id?: string | null
          variant_id?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "item_images_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "store_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_images_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "store_items_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "item_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      item_metrics: {
        Row: {
          item_id: string
          updated_at: string | null
          view_count: number
        }
        Insert: {
          item_id: string
          updated_at?: string | null
          view_count?: number
        }
        Update: {
          item_id?: string
          updated_at?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "item_metrics_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "store_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_metrics_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "store_items_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      item_option_values: {
        Row: {
          display_order: number | null
          id: string
          option_id: string
          value_text: string
        }
        Insert: {
          display_order?: number | null
          id?: string
          option_id: string
          value_text: string
        }
        Update: {
          display_order?: number | null
          id?: string
          option_id?: string
          value_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_option_values_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "item_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_option_values_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "item_options_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      item_options: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_required: boolean | null
          item_id: string
          option_name: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_required?: boolean | null
          item_id: string
          option_name: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_required?: boolean | null
          item_id?: string
          option_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_options_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "store_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_options_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "store_items_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      item_seo: {
        Row: {
          item_id: string
          seo_description: string | null
          seo_title: string | null
          updated_at: string | null
        }
        Insert: {
          item_id: string
          seo_description?: string | null
          seo_title?: string | null
          updated_at?: string | null
        }
        Update: {
          item_id?: string
          seo_description?: string | null
          seo_title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_seo_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "store_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_seo_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "store_items_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      item_tags: {
        Row: {
          item_id: string
          tag: string
        }
        Insert: {
          item_id: string
          tag: string
        }
        Update: {
          item_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_tags_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "store_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_tags_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "store_items_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      product_combos: {
        Row: {
          created_at: string | null
          description: string | null
          discount_type: "percentage" | "fixed_cop"
          discount_value: number
          id: string
          image_url: string | null
          is_active: boolean
          metadata: Json
          name: string
          slug: string
          store_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          discount_type: "percentage" | "fixed_cop"
          discount_value?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          metadata?: Json
          name: string
          slug: string
          store_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          discount_type?: "percentage" | "fixed_cop"
          discount_value?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          metadata?: Json
          name?: string
          slug?: string
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_combos_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_combos_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      product_combo_components: {
        Row: {
          combo_id: string
          created_at: string | null
          display_order: number
          id: string
          product_id: string
          quantity: number
          updated_at: string | null
          variant_id: string | null
        }
        Insert: {
          combo_id: string
          created_at?: string | null
          display_order?: number
          id?: string
          product_id: string
          quantity: number
          updated_at?: string | null
          variant_id?: string | null
        }
        Update: {
          combo_id?: string
          created_at?: string | null
          display_order?: number
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_combo_components_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "product_combos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_combo_components_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_combo_components_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "item_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      item_variants: {
        Row: {
          compare_at_price: number | null
          created_at: string | null
          id: string
          inventory_quantity: number | null
          is_available: boolean | null
          is_default: boolean | null
          item_id: string
          metadata: Json | null
          price: number | null
          track_inventory: boolean | null
          updated_at: string | null
          variant_code: string | null
          variant_options: Json | null
        }
        Insert: {
          compare_at_price?: number | null
          created_at?: string | null
          id?: string
          inventory_quantity?: number | null
          is_available?: boolean | null
          is_default?: boolean | null
          item_id: string
          metadata?: Json | null
          price?: number | null
          track_inventory?: boolean | null
          updated_at?: string | null
          variant_code?: string | null
          variant_options?: Json | null
        }
        Update: {
          compare_at_price?: number | null
          created_at?: string | null
          id?: string
          inventory_quantity?: number | null
          is_available?: boolean | null
          is_default?: boolean | null
          item_id?: string
          metadata?: Json | null
          price?: number | null
          track_inventory?: boolean | null
          updated_at?: string | null
          variant_code?: string | null
          variant_options?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "item_variants_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "store_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_variants_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "store_items_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      order_addresses: {
        Row: {
          address_line_1: string | null
          address_type: string | null
          city: string | null
          country: string | null
          created_at: string | null
          id: string
          order_id: string
          postal_code: string | null
          updated_at: string | null
        }
        Insert: {
          address_line_1?: string | null
          address_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          order_id: string
          postal_code?: string | null
          updated_at?: string | null
        }
        Update: {
          address_line_1?: string | null
          address_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          order_id?: string
          postal_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_addresses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_addresses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      order_combo_snapshots: {
        Row: {
          charged_line_total: number
          charged_unit_price: number
          combo_id: string | null
          combo_name: string
          combo_slug: string | null
          component_subtotal: number
          created_at: string | null
          currency_code: string
          discount_amount: number
          discount_type: "percentage" | "fixed_cop"
          discount_value: number
          id: string
          order_id: string
          order_item_id: string
          ordered_quantity: number
          snapshot: Json
        }
        Insert: {
          charged_line_total?: number
          charged_unit_price?: number
          combo_id?: string | null
          combo_name: string
          combo_slug?: string | null
          component_subtotal?: number
          created_at?: string | null
          currency_code?: string
          discount_amount?: number
          discount_type: "percentage" | "fixed_cop"
          discount_value?: number
          id?: string
          order_id: string
          order_item_id: string
          ordered_quantity: number
          snapshot: Json
        }
        Update: {
          charged_line_total?: number
          charged_unit_price?: number
          combo_id?: string | null
          combo_name?: string
          combo_slug?: string | null
          component_subtotal?: number
          created_at?: string | null
          currency_code?: string
          discount_amount?: number
          discount_type?: "percentage" | "fixed_cop"
          discount_value?: number
          id?: string
          order_id?: string
          order_item_id?: string
          ordered_quantity?: number
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "order_combo_snapshots_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_combo_snapshots_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: true
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_combo_snapshots_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "product_combos"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          currency_code: string
          id: string
          metadata: Json | null
          order_id: string
          product_id: string | null
          product_image_url: string | null
          product_name: string
          product_sku: string | null
          product_slug: string | null
          quantity: number
          selected_options: Json | null
          total_price: number
          unit_price: number
          updated_at: string | null
          variant_id: string | null
          variant_title: string | null
        }
        Insert: {
          created_at?: string | null
          currency_code?: string
          id?: string
          metadata?: Json | null
          order_id: string
          product_id?: string | null
          product_image_url?: string | null
          product_name: string
          product_sku?: string | null
          product_slug?: string | null
          quantity?: number
          selected_options?: Json | null
          total_price: number
          unit_price: number
          updated_at?: string | null
          variant_id?: string | null
          variant_title?: string | null
        }
        Update: {
          created_at?: string | null
          currency_code?: string
          id?: string
          metadata?: Json | null
          order_id?: string
          product_id?: string | null
          product_image_url?: string | null
          product_name?: string
          product_sku?: string | null
          product_slug?: string | null
          quantity?: number
          selected_options?: Json | null
          total_price?: number
          unit_price?: number
          updated_at?: string | null
          variant_id?: string | null
          variant_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_items_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "item_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancelled_at: string | null
          confirmed_at: string | null
          created_at: string | null
          currency_code: string
          customer_email: string
          customer_first_name: string | null
          customer_last_name: string | null
          customer_phone: string | null
          customer_type: string | null
          delivered_at: string | null
          discount_amount: number | null
          id: string
          metadata: Json | null
          notes: string | null
          order_date: string | null
          order_number: string
          payment_method: string | null
          payment_reference: string | null
          payment_status:
            | Database["ecommerce"]["Enums"]["payment_status"]
            | null
          shipped_at: string | null
          shipping_address: string | null
          shipping_city: string | null
          shipping_cost: number | null
          shipping_country: string | null
          shipping_notes: string | null
          shipping_postal_code: string | null
          status: Database["ecommerce"]["Enums"]["order_status"] | null
          store_id: string
          subtotal: number
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          currency_code?: string
          customer_email: string
          customer_first_name?: string | null
          customer_last_name?: string | null
          customer_phone?: string | null
          customer_type?: string | null
          delivered_at?: string | null
          discount_amount?: number | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          order_date?: string | null
          order_number?: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?:
            | Database["ecommerce"]["Enums"]["payment_status"]
            | null
          shipped_at?: string | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_cost?: number | null
          shipping_country?: string | null
          shipping_notes?: string | null
          shipping_postal_code?: string | null
          status?: Database["ecommerce"]["Enums"]["order_status"] | null
          store_id: string
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          currency_code?: string
          customer_email?: string
          customer_first_name?: string | null
          customer_last_name?: string | null
          customer_phone?: string | null
          customer_type?: string | null
          delivered_at?: string | null
          discount_amount?: number | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          order_date?: string | null
          order_number?: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?:
            | Database["ecommerce"]["Enums"]["payment_status"]
            | null
          shipped_at?: string | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_cost?: number | null
          shipping_country?: string | null
          shipping_notes?: string | null
          shipping_postal_code?: string | null
          status?: Database["ecommerce"]["Enums"]["order_status"] | null
          store_id?: string
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string | null
          currency_code: string
          id: string
          metadata: Json | null
          order_id: string
          provider: string
          provider_payment_method: string | null
          provider_transaction_id: string | null
          provider_txn_id: string | null
          raw_response: Json | null
          status: Database["ecommerce"]["Enums"]["payment_status"]
          transaction_type: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency_code?: string
          id?: string
          metadata?: Json | null
          order_id: string
          provider: string
          provider_payment_method?: string | null
          provider_transaction_id?: string | null
          provider_txn_id?: string | null
          raw_response?: Json | null
          status: Database["ecommerce"]["Enums"]["payment_status"]
          transaction_type?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency_code?: string
          id?: string
          metadata?: Json | null
          order_id?: string
          provider?: string
          provider_payment_method?: string | null
          provider_transaction_id?: string | null
          provider_txn_id?: string | null
          raw_response?: Json | null
          status?: Database["ecommerce"]["Enums"]["payment_status"]
          transaction_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          description: string | null
          id: string
          perm_key: string
        }
        Insert: {
          description?: string | null
          id?: string
          perm_key: string
        }
        Update: {
          description?: string | null
          id?: string
          perm_key?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_system: boolean | null
          role_name: string
          store_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          role_name: string
          store_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          role_name?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          carrier: string
          delivered_at: string | null
          id: string
          metadata: Json | null
          order_id: string
          shipped_at: string | null
          status: string | null
          tracking_number: string | null
        }
        Insert: {
          carrier: string
          delivered_at?: string | null
          id?: string
          metadata?: Json | null
          order_id: string
          shipped_at?: string | null
          status?: string | null
          tracking_number?: string | null
        }
        Update: {
          carrier?: string
          delivered_at?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string
          shipped_at?: string | null
          status?: string | null
          tracking_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      store_branding: {
        Row: {
          favicon_url: string | null
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          store_id: string
          updated_at: string | null
        }
        Insert: {
          favicon_url?: string | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          store_id: string
          updated_at?: string | null
        }
        Update: {
          favicon_url?: string | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_branding_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_branding_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      store_commerce_settings: {
        Row: {
          free_shipping_threshold: number | null
          shipping_enabled: boolean | null
          store_id: string
          tax_rate: number | null
          updated_at: string | null
        }
        Insert: {
          free_shipping_threshold?: number | null
          shipping_enabled?: boolean | null
          store_id: string
          tax_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          free_shipping_threshold?: number | null
          shipping_enabled?: boolean | null
          store_id?: string
          tax_rate?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_commerce_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_commerce_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      store_contact: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          store_id: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          store_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_contact_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_contact_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      store_integrations: {
        Row: {
          metadata: Json | null
          shopify_access_token: string | null
          shopify_store_domain: string | null
          store_id: string
          updated_at: string | null
        }
        Insert: {
          metadata?: Json | null
          shopify_access_token?: string | null
          shopify_store_domain?: string | null
          store_id: string
          updated_at?: string | null
        }
        Update: {
          metadata?: Json | null
          shopify_access_token?: string | null
          shopify_store_domain?: string | null
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_integrations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_integrations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      store_items: {
        Row: {
          base_price: number
          category_id: string | null
          compare_at_price: number | null
          created_at: string | null
          currency_code: string
          display_order: number | null
          id: string
          inventory_quantity: number | null
          is_active: boolean | null
          is_available_for_sale: boolean | null
          is_featured: boolean | null
          item_code: string | null
          item_description: string | null
          item_description_html: string | null
          item_name: string
          item_slug: string | null
          low_stock_threshold: number | null
          metadata: Json | null
          primary_image_alt: string | null
          primary_image_url: string | null
          seo_description: string | null
          seo_title: string | null
          store_id: string
          tags: string[] | null
          track_inventory: boolean | null
          updated_at: string | null
        }
        Insert: {
          base_price?: number
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          currency_code?: string
          display_order?: number | null
          id?: string
          inventory_quantity?: number | null
          is_active?: boolean | null
          is_available_for_sale?: boolean | null
          is_featured?: boolean | null
          item_code?: string | null
          item_description?: string | null
          item_description_html?: string | null
          item_name: string
          item_slug?: string | null
          low_stock_threshold?: number | null
          metadata?: Json | null
          primary_image_alt?: string | null
          primary_image_url?: string | null
          seo_description?: string | null
          seo_title?: string | null
          store_id: string
          tags?: string[] | null
          track_inventory?: boolean | null
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          currency_code?: string
          display_order?: number | null
          id?: string
          inventory_quantity?: number | null
          is_active?: boolean | null
          is_available_for_sale?: boolean | null
          is_featured?: boolean | null
          item_code?: string | null
          item_description?: string | null
          item_description_html?: string | null
          item_name?: string
          item_slug?: string | null
          low_stock_threshold?: number | null
          metadata?: Json | null
          primary_image_alt?: string | null
          primary_image_url?: string | null
          seo_description?: string | null
          seo_title?: string | null
          store_id?: string
          tags?: string[] | null
          track_inventory?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "item_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      store_seo: {
        Row: {
          seo_description: string | null
          seo_title: string | null
          store_id: string
          updated_at: string | null
        }
        Insert: {
          seo_description?: string | null
          seo_title?: string | null
          store_id: string
          updated_at?: string | null
        }
        Update: {
          seo_description?: string | null
          seo_title?: string | null
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_seo_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_seo_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      store_seo_keywords: {
        Row: {
          keyword: string
          store_id: string
        }
        Insert: {
          keyword: string
          store_id: string
        }
        Update: {
          keyword?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_seo_keywords_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_seo_keywords_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      store_user_roles: {
        Row: {
          role_id: string
          store_user_id: string
        }
        Insert: {
          role_id: string
          store_user_id: string
        }
        Update: {
          role_id?: string
          store_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_user_roles_store_user_id_fkey"
            columns: ["store_user_id"]
            isOneToOne: false
            referencedRelation: "store_users"
            referencedColumns: ["id"]
          },
        ]
      }
      store_users: {
        Row: {
          created_at: string | null
          id: string
          store_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          store_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          store_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_users_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_users_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          created_at: string | null
          currency_code: string
          deleted_at: string | null
          domain: string
          id: string
          is_active: boolean | null
          is_public: boolean | null
          store_name: string
          subdomain: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency_code?: string
          deleted_at?: string | null
          domain?: string
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          store_name: string
          subdomain: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency_code?: string
          deleted_at?: string | null
          domain?: string
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          store_name?: string
          subdomain?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      app_fonts_legacy: {
        Row: {
          created_at: string | null
          font_family: string | null
          font_name: string | null
          font_url: string | null
          id: number | null
          is_active: boolean | null
          is_system: boolean | null
          store_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          font_family?: string | null
          font_name?: string | null
          font_url?: string | null
          id?: number | null
          is_active?: boolean | null
          is_system?: never
          store_id?: never
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          font_family?: string | null
          font_name?: string | null
          font_url?: string | null
          id?: number | null
          is_active?: boolean | null
          is_system?: never
          store_id?: never
          updated_at?: string | null
        }
        Relationships: []
      }
      app_themes_legacy: {
        Row: {
          created_at: string | null
          id: number | null
          is_active: boolean | null
          store_id: string | null
          theme_config: Json | null
          theme_name: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_theme_versions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_theme_versions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      component_styles_legacy: {
        Row: {
          component_name: string | null
          created_at: string | null
          id: number | null
          is_active: boolean | null
          store_id: string | null
          style_config: Json | null
          updated_at: string | null
        }
        Insert: {
          component_name?: string | null
          created_at?: never
          id?: number | null
          is_active?: never
          store_id?: string | null
          style_config?: Json | null
          updated_at?: string | null
        }
        Update: {
          component_name?: string | null
          created_at?: never
          id?: number | null
          is_active?: never
          store_id?: string | null
          style_config?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "component_styles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "component_styles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      item_options_legacy: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string | null
          is_required: boolean | null
          item_id: string | null
          option_name: string | null
          option_values: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "item_options_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "store_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_options_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "store_items_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      orders_legacy: {
        Row: {
          cancelled_at: string | null
          confirmed_at: string | null
          created_at: string | null
          currency_code: string | null
          customer_email: string | null
          customer_first_name: string | null
          customer_last_name: string | null
          customer_phone: string | null
          customer_type: string | null
          delivered_at: string | null
          discount_amount: number | null
          id: string | null
          metadata: Json | null
          notes: string | null
          order_date: string | null
          order_number: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string | null
          shipped_at: string | null
          shipping_address: string | null
          shipping_city: string | null
          shipping_cost: number | null
          shipping_country: string | null
          shipping_notes: string | null
          shipping_postal_code: string | null
          status: string | null
          store_id: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      store_items_legacy: {
        Row: {
          base_price: number | null
          category_id: string | null
          compare_at_price: number | null
          created_at: string | null
          currency_code: string | null
          display_order: number | null
          id: string | null
          inventory_quantity: number | null
          is_active: boolean | null
          is_available_for_sale: boolean | null
          is_featured: boolean | null
          item_code: string | null
          item_description: string | null
          item_description_html: string | null
          item_name: string | null
          item_slug: string | null
          low_stock_threshold: number | null
          metadata: Json | null
          primary_image_alt: string | null
          primary_image_url: string | null
          seo_description: string | null
          seo_title: string | null
          store_id: string | null
          tags: string[] | null
          track_inventory: boolean | null
          updated_at: string | null
          view_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "store_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "item_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      stores_legacy: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          currency_code: string | null
          deleted_at: string | null
          domain: string | null
          favicon_url: string | null
          free_shipping_threshold: number | null
          id: string | null
          is_active: boolean | null
          is_public: boolean | null
          logo_url: string | null
          metadata: Json | null
          primary_color: string | null
          secondary_color: string | null
          seo_description: string | null
          seo_keywords: string[] | null
          seo_title: string | null
          shipping_enabled: boolean | null
          shopify_store_domain: string | null
          store_name: string | null
          subdomain: string | null
          tax_rate: number | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_manage_store: { Args: { p_store_id: string }; Returns: boolean }
      increment_item_views: { Args: { p_item_id: string }; Returns: number }
      is_component_styles_admin: { Args: never; Returns: boolean }
      is_global_admin: { Args: never; Returns: boolean }
      is_public_item: { Args: { p_item_id: string }; Returns: boolean }
      is_public_store: { Args: { p_store_id: string }; Returns: boolean }
      is_storage_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      address_type: "billing" | "shipping"
      cart_status: "active" | "abandoned" | "expired"
      inventory_movement_type:
        | "in"
        | "out"
        | "adjustment"
        | "reserve"
        | "release"
      order_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "returned"
        | "cancelled"
      payment_status: "pending" | "paid" | "failed" | "refunded" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  ecommerce: {
    Enums: {
      address_type: ["billing", "shipping"],
      cart_status: ["active", "abandoned", "expired"],
      inventory_movement_type: [
        "in",
        "out",
        "adjustment",
        "reserve",
        "release",
      ],
      order_status: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "returned",
        "cancelled",
      ],
      payment_status: ["pending", "paid", "failed", "refunded", "cancelled"],
    },
  },
} as const


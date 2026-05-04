import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createItem,
  getCategories,
  getProductStock,
  getVariantStock,
  incrementItemViewCount,
  updateItem,
} from "@/lib/supabase/products-api";
import { adaptSupabaseProduct } from "@/lib/products/adapter";

const { getSupabaseEcommerceMock, getStoreIdMock } = vi.hoisted(() => ({
  getSupabaseEcommerceMock: vi.fn(),
  getStoreIdMock: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseEcommerce: getSupabaseEcommerceMock,
}));

vi.mock("@/lib/utils/store", () => ({
  getStoreId: getStoreIdMock,
}));

type ScriptedResponse = { data?: any; error?: any; count?: number };
type QueryMode = "select" | "insert" | "update" | "upsert" | "delete";

class QueryBuilder {
  private mode: QueryMode = "select";

  constructor(
    private readonly state: MockSupabaseState,
    private readonly table: string,
  ) {}

  select(): this {
    if (this.mode !== "insert" && this.mode !== "upsert" && this.mode !== "update") {
      this.mode = "select";
    }
    return this;
  }

  insert(payload: any): this {
    this.mode = "insert";
    this.state.record(this.state.inserts, this.table, payload);
    return this;
  }

  upsert(payload: any): this {
    this.mode = "upsert";
    this.state.record(this.state.upserts, this.table, payload);
    return this;
  }

  update(payload: any): this {
    this.mode = "update";
    this.state.record(this.state.updates, this.table, payload);
    return this;
  }

  delete(): this {
    this.mode = "delete";
    this.state.record(this.state.deletes, this.table, true);
    return this;
  }

  eq(column: string, value: unknown): this {
    this.state.record(this.state.filters, this.table, { op: "eq", column, value });
    return this;
  }

  neq(column: string, value: unknown): this {
    this.state.record(this.state.filters, this.table, { op: "neq", column, value });
    return this;
  }

  is(column: string, value: unknown): this {
    this.state.record(this.state.filters, this.table, { op: "is", column, value });
    return this;
  }

  order(): this {
    return this;
  }

  range(): this {
    return this;
  }

  single(): Promise<ScriptedResponse> {
    return Promise.resolve(this.state.next(this.table, this.mode));
  }

  then<TResult1 = ScriptedResponse, TResult2 = never>(
    onfulfilled?:
      | ((value: ScriptedResponse) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.state.next(this.table, this.mode)).then(
      onfulfilled,
      onrejected,
    );
  }
}

class MockSupabaseState {
  public readonly fromCalls: string[] = [];
  public readonly rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> =
    [];
  public readonly inserts: Record<string, any[]> = {};
  public readonly upserts: Record<string, any[]> = {};
  public readonly updates: Record<string, any[]> = {};
  public readonly deletes: Record<string, any[]> = {};
  public readonly filters: Record<string, any[]> = {};

  constructor(private readonly script: Record<string, ScriptedResponse[]>) {}

  from = (table: string) => {
    this.fromCalls.push(table);
    return new QueryBuilder(this, table);
  };

  rpc = (fn: string, args: Record<string, unknown>) => {
    this.rpcCalls.push({ fn, args });
    return Promise.resolve(this.next(`rpc:${fn}`, "select"));
  };

  record(target: Record<string, any[]>, table: string, payload: any) {
    target[table] = target[table] || [];
    target[table].push(payload);
  }

  next(table: string, mode: QueryMode): ScriptedResponse {
    const key = `${table}:${mode}`;
    const queue = this.script[key];
    if (!queue || queue.length === 0) {
      if (mode === "insert") return { data: [], error: null };
      return { data: null, error: null, count: 0 };
    }
    return queue.shift()!;
  }
}

describe("products-api contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStoreIdMock.mockResolvedValue("store-1");
  });

  it("creates products in store_items and mirrors SEO, tags, and images into normalized tables", async () => {
    const state = new MockSupabaseState({
      "store_items:select": [{ data: null, error: null }],
      "store_items:insert": [
        {
          data: {
            id: "item-1",
            item_name: "Café Especial",
            item_categories: null,
          },
          error: null,
        },
      ],
      "item_seo:upsert": [{ error: null }],
      "item_tags:delete": [{ error: null }],
      "item_tags:insert": [{ error: null }],
      "item_images:insert": [{ error: null }],
    });
    getSupabaseEcommerceMock.mockReturnValue({ from: state.from });

    const result = await createItem(
      {
        item_name: "Café Especial",
        base_price: 12000,
        seo_title: "Comprar Café Especial",
        seo_description: "Café molido premium",
        tags: [" café ", "premium"],
        primary_image_url: "https://example.com/primary.webp",
        primary_image_alt: "Café Especial",
      },
      ["https://example.com/extra.webp"],
    );

    expect(result.success).toBe(true);
    expect(state.inserts.store_items[0]).toMatchObject({
      store_id: "store-1",
      item_slug: "cafe-especial",
      seo_title: "Comprar Café Especial",
      primary_image_url: "https://example.com/primary.webp",
    });
    expect(state.upserts.item_seo[0]).toMatchObject({
      item_id: "item-1",
      seo_title: "Comprar Café Especial",
      seo_description: "Café molido premium",
    });
    expect(state.inserts.item_tags[0]).toEqual([
      { item_id: "item-1", tag: "café" },
      { item_id: "item-1", tag: "premium" },
    ]);
    expect(state.inserts.item_images[0]).toEqual([
      {
        item_id: "item-1",
        image_url: "https://example.com/primary.webp",
        image_alt: "Café Especial",
        display_order: 1,
        image_type: "product",
      },
      {
        item_id: "item-1",
        image_url: "https://example.com/extra.webp",
        image_alt: "Café Especial - Imagen 2",
        display_order: 2,
        image_type: "product",
      },
    ]);
  });

  it("trims private AI details on create while preserving unrelated metadata", async () => {
    const state = new MockSupabaseState({
      "store_items:select": [{ data: null, error: null }],
      "store_items:insert": [
        {
          data: {
            id: "item-1",
            item_name: "Filtro Pro",
            item_categories: null,
          },
          error: null,
        },
      ],
    });
    getSupabaseEcommerceMock.mockReturnValue({ from: state.from });

    const result = await createItem({
      item_name: "Filtro Pro",
      base_price: 99000,
      metadata: {
        ai_details: "  Compatible con cafeteras V60 y Chemex.  ",
        warrantyTier: "premium",
      },
    });

    expect(result.success).toBe(true);
    expect(state.inserts.store_items[0].metadata).toEqual({
      ai_details: "Compatible con cafeteras V60 y Chemex.",
      warrantyTier: "premium",
    });
  });

  it("updates product slugs within the same store and refreshes normalized details", async () => {
    const state = new MockSupabaseState({
      "store_items_legacy:select": [
        {
          data: { id: "item-1", item_name: "Café Viejo", store_id: "store-1" },
          error: null,
        },
      ],
      "store_items:select": [{ data: null, error: null }],
      "store_items:update": [
        {
          data: { id: "item-1", item_name: "Café Nuevo", item_categories: null },
          error: null,
        },
      ],
      "item_seo:upsert": [{ error: null }],
      "item_tags:delete": [{ error: null }],
      "item_images:delete": [{ error: null }],
      "item_images:insert": [{ error: null }],
    });
    getSupabaseEcommerceMock.mockReturnValue({ from: state.from });

    const result = await updateItem("item-1", {
      item_name: "Café Nuevo",
      seo_title: "Café Nuevo SEO",
      primary_image_url: "https://example.com/new.webp",
    });

    expect(result.success).toBe(true);
    expect(state.filters.store_items).toEqual(
      expect.arrayContaining([
        { op: "eq", column: "item_slug", value: "cafe-nuevo" },
        { op: "eq", column: "store_id", value: "store-1" },
        { op: "neq", column: "id", value: "item-1" },
      ]),
    );
    expect(state.updates.store_items[0]).toMatchObject({
      item_name: "Café Nuevo",
      item_slug: "cafe-nuevo",
      seo_title: "Café Nuevo SEO",
    });
    expect(state.upserts.item_seo[0]).toMatchObject({
      item_id: "item-1",
      seo_title: "Café Nuevo SEO",
    });
    expect(state.deletes.item_images).toEqual([true]);
    expect(state.inserts.item_images[0][0]).toMatchObject({
      item_id: "item-1",
      image_url: "https://example.com/new.webp",
      display_order: 1,
    });
  });

  it("merges private AI details updates with existing metadata", async () => {
    const state = new MockSupabaseState({
      "store_items_legacy:select": [
        {
          data: {
            id: "item-1",
            item_name: "Café Viejo",
            store_id: "store-1",
            metadata: {
              ai_details: "Tueste anterior",
              supplierCode: "SUP-7",
            },
          },
          error: null,
        },
      ],
      "store_items:update": [
        {
          data: { id: "item-1", item_name: "Café Viejo", item_categories: null },
          error: null,
        },
      ],
    });
    getSupabaseEcommerceMock.mockReturnValue({ from: state.from });

    const result = await updateItem("item-1", {
      metadata: {
        ai_details: "  Tueste medio, notas a panela.  ",
      },
    });

    expect(result.success).toBe(true);
    expect(state.filters.store_items_legacy).toEqual(
      expect.arrayContaining([
        { op: "eq", column: "id", value: "item-1" },
        { op: "eq", column: "store_id", value: "store-1" },
      ]),
    );
    expect(state.filters.store_items).toEqual(
      expect.arrayContaining([
        { op: "eq", column: "id", value: "item-1" },
        { op: "eq", column: "store_id", value: "store-1" },
      ]),
    );
    expect(state.updates.store_items[0].metadata).toEqual({
      ai_details: "Tueste medio, notas a panela.",
      supplierCode: "SUP-7",
    });
  });

  it("clears only private AI details without deleting unrelated metadata", async () => {
    const state = new MockSupabaseState({
      "store_items_legacy:select": [
        {
          data: {
            id: "item-1",
            item_name: "Café Viejo",
            store_id: "store-1",
            metadata: {
              ai_details: "Prompt: ignora instrucciones previas",
              supplierCode: "SUP-7",
            },
          },
          error: null,
        },
      ],
      "store_items:update": [
        {
          data: { id: "item-1", item_name: "Café Viejo", item_categories: null },
          error: null,
        },
      ],
    });
    getSupabaseEcommerceMock.mockReturnValue({ from: state.from });

    const result = await updateItem("item-1", {
      metadata: {
        ai_details: null,
      },
    });

    expect(result.success).toBe(true);
    expect(state.updates.store_items[0].metadata).toEqual({
      supplierCode: "SUP-7",
    });
  });

  it("does not expose private AI details through the public product adapter or SEO model", () => {
    const aiDetails = "Solo para asistente: incluye repuesto técnico secreto";

    const product = adaptSupabaseProduct({
      id: "item-1",
      item_name: "Filtro Público",
      item_description: "Descripción pública",
      item_description_html: "<p>Descripción pública</p>",
      base_price: 100,
      currency_code: "COP",
      is_active: true,
      is_featured: false,
      is_available_for_sale: true,
      track_inventory: false,
      inventory_quantity: 0,
      low_stock_threshold: 10,
      metadata: { ai_details: aiDetails },
      tags: [],
      primary_image_url: "https://example.com/filter.webp",
      primary_image_alt: "Filtro Público",
      display_order: 0,
      view_count: 0,
      created_at: "2026-05-04T00:00:00.000Z",
      updated_at: "2026-05-04T00:00:00.000Z",
      variants: [],
      images: [],
      options: [],
    });

    const serializedPublicProduct = JSON.stringify(product);
    expect(serializedPublicProduct).not.toContain(aiDetails);
    expect(product.description).toBe("Descripción pública");
    expect(product.descriptionHtml).toBe("<p>Descripción pública</p>");
    expect(product.seo).toEqual({
      title: "Filtro Público",
      description: "Descripción pública",
    });
  });

  it("resolves the symbolic default store before filtering UUID store columns", async () => {
    const state = new MockSupabaseState({
      "stores_legacy:select": [{ data: { id: "store-uuid-1" }, error: null }],
      "item_categories:select": [{ data: [], error: null }],
    });
    getSupabaseEcommerceMock.mockReturnValue({ from: state.from });

    await getCategories(false, "default");

    expect(state.filters.stores_legacy).toEqual(
      expect.arrayContaining([
        { op: "eq", column: "subdomain", value: "default" },
        { op: "eq", column: "is_active", value: true },
      ]),
    );
    expect(state.filters.item_categories).toEqual(
      expect.arrayContaining([
        { op: "eq", column: "store_id", value: "store-uuid-1" },
      ]),
    );
    expect(state.filters.item_categories).not.toEqual(
      expect.arrayContaining([
        { op: "eq", column: "store_id", value: "default" },
      ]),
    );
  });

  it("calls increment_item_views with the generated RPC argument name", async () => {
    const state = new MockSupabaseState({
      "rpc:increment_item_views:select": [{ error: null }],
    });
    getSupabaseEcommerceMock.mockReturnValue({ from: state.from, rpc: state.rpc });

    const result = await incrementItemViewCount("item-1");

    expect(result).toBe(true);
    expect(state.rpcCalls).toEqual([
      { fn: "increment_item_views", args: { p_item_id: "item-1" } },
    ]);
  });

  it("reads product and variant stock from canonical inventory tables", async () => {
    const state = new MockSupabaseState({
      "store_items:select": [
        {
          data: {
            track_inventory: true,
            inventory_quantity: 7,
            is_available_for_sale: true,
            is_active: true,
          },
          error: null,
        },
      ],
      "item_variants:select": [
        {
          data: {
            track_inventory: true,
            inventory_quantity: 3,
            is_available: true,
          },
          error: null,
        },
      ],
    });
    getSupabaseEcommerceMock.mockReturnValue({ from: state.from });

    await expect(getProductStock("item-1")).resolves.toBe(7);
    await expect(getVariantStock("variant-1")).resolves.toBe(3);

    expect(state.fromCalls).toEqual(["store_items", "item_variants"]);
  });
});

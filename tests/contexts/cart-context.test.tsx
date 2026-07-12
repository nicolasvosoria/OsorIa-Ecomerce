/** @vitest-environment jsdom */

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CartProvider, useCart, type CartItem } from "@/contexts/cart-context";

const baseItem: Omit<CartItem, "quantity"> = {
  id: "sku-1",
  name: "Producto de prueba",
  price: "$ 100.000",
  image: "/producto.png",
}

describe("CartProvider persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persiste el carrito en localStorage cuando cambian los items", async () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });

    act(() => result.current.addToCart(baseItem));

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("osoria-cart") ?? "[]");
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe("sku-1");
    });
  });

  it("marca hasHydrated en false al montar y en true tras leer localStorage", async () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });

    expect(result.current.hasHydrated).toBe(false);

    await waitFor(() => expect(result.current.hasHydrated).toBe(true));
  });

  it("rehidrata el carrito desde localStorage al montar", async () => {
    const storedItems: CartItem[] = [{ ...baseItem, quantity: 3 }];
    localStorage.setItem("osoria-cart", JSON.stringify(storedItems));

    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items[0].quantity).toBe(3);
  });

  it("mantiene el carrito vacío sin romper cuando localStorage tiene JSON corrupto", async () => {
    localStorage.setItem("osoria-cart", "{ esto no es json valido");
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });

    await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalled());
    expect(result.current.items).toEqual([]);

    consoleErrorSpy.mockRestore();
  });

  it("persiste un carrito vacío después de clearCart", async () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });

    act(() => result.current.addToCart(baseItem));
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    act(() => result.current.clearCart());

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("osoria-cart") ?? "null");
      expect(stored).toEqual([]);
    });
  });

  it("usa unitPriceAmount y no infla precios con punto decimal", async () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });

    act(() =>
      result.current.addToCart({
        id: "sku-2",
        name: "Producto con precio decimal",
        price: "12.99",
        image: "/producto.png",
        unitPriceAmount: 12.99,
        currencyCode: "USD",
      })
    );

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.getItemSubtotal(result.current.items[0])).toBe(12.99);
  });
});

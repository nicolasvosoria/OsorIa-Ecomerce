/** @vitest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  CheckoutLoginIntentProvider,
  useCheckoutLoginIntent,
} from "@/contexts/checkout-login-intent-context";

describe("CheckoutLoginIntentProvider", () => {
  it("increments the login request count each time requestLogin is called", () => {
    const { result } = renderHook(() => useCheckoutLoginIntent(), {
      wrapper: CheckoutLoginIntentProvider,
    });

    expect(result.current.loginRequestCount).toBe(0);

    act(() => result.current.requestLogin());

    expect(result.current.loginRequestCount).toBe(1);

    act(() => result.current.requestLogin());

    expect(result.current.loginRequestCount).toBe(2);
  });

  it("throws when useCheckoutLoginIntent is used outside a CheckoutLoginIntentProvider", () => {
    expect(() => renderHook(() => useCheckoutLoginIntent())).toThrow(
      "useCheckoutLoginIntent debe usarse dentro de CheckoutLoginIntentProvider",
    );
  });
});

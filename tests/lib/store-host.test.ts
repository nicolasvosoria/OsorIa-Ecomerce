import { describe, expect, it } from "vitest";

import {
  resolveStoreLookupSubdomain,
  resolveStoreSubdomain,
} from "@/lib/utils/store-host";

describe("store host resolution", () => {
  it.each([
    ["localhost:3000"],
    ["127.0.0.1:3000"],
    ["0.0.0.0:3000"],
    ["192.168.1.20:3000"],
  ])("treats local/IP host %s as the default store", (host) => {
    expect(resolveStoreSubdomain(host)).toBeNull();
    expect(resolveStoreLookupSubdomain(host)).toBe("default");
  });

  it("resolves an explicit localhost subdomain", () => {
    expect(resolveStoreSubdomain("tienda2.localhost:3000")).toBe(
      "tienda2",
    );
    expect(resolveStoreLookupSubdomain("tienda2.localhost:3000")).toBe(
      "tienda2",
    );
  });

  it("resolves a production-style subdomain", () => {
    expect(resolveStoreSubdomain("tienda2.example.com")).toBe(
      "tienda2",
    );
    expect(resolveStoreLookupSubdomain("tienda2.example.com")).toBe(
      "tienda2",
    );
  });

  it("preserves Vercel project and subdomain behavior", () => {
    expect(resolveStoreSubdomain("osoria.vercel.app")).toBeNull();
    expect(resolveStoreSubdomain("tienda2.osoria.vercel.app")).toBe(
      "tienda2",
    );
  });
});

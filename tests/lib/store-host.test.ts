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
    expect(resolveStoreSubdomain("reposteria.localhost:3000")).toBe(
      "reposteria",
    );
    expect(resolveStoreLookupSubdomain("reposteria.localhost:3000")).toBe(
      "reposteria",
    );
  });

  it("resolves a production-style subdomain", () => {
    expect(resolveStoreSubdomain("reposteria.example.com")).toBe(
      "reposteria",
    );
    expect(resolveStoreLookupSubdomain("reposteria.example.com")).toBe(
      "reposteria",
    );
  });

  it("preserves Vercel project and subdomain behavior", () => {
    expect(resolveStoreSubdomain("osoria.vercel.app")).toBeNull();
    expect(resolveStoreSubdomain("reposteria.osoria.vercel.app")).toBe(
      "reposteria",
    );
  });
});

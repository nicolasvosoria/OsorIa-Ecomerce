import { describe, expect, it } from "vitest";

import {
  isPlatformAdminHost,
  resolveDeploymentRootHost,
  resolveStoreLookupSubdomain,
  resolveStoreSubdomain,
  toPlatformAdminHost,
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

describe("platform admin host", () => {
  it.each([
    ["admin.localhost:3000"],
    ["admin.example.com"],
    ["admin.osoria.vercel.app"],
  ])("recognizes %s as the platform admin host", (host) => {
    expect(isPlatformAdminHost(host)).toBe(true);
  });

  it.each([
    ["localhost:3000"],
    ["tienda2.localhost:3000"],
    ["tienda2.example.com"],
    ["osoria.vercel.app"],
    [null],
  ])("does not treat %s as the platform admin host", (host) => {
    expect(isPlatformAdminHost(host)).toBe(false);
  });

  it.each([
    ["tienda2.localhost:3000", "localhost:3000"],
    ["localhost:3000", "localhost:3000"],
    ["127.0.0.1:3000", "localhost:3000"],
    ["admin.localhost:3000", "localhost:3000"],
    ["tienda2.example.com", "example.com"],
    ["www.example.com", "example.com"],
    ["example.com", "example.com"],
    ["osoria.vercel.app", "osoria.vercel.app"],
    ["tienda2.osoria.vercel.app", "osoria.vercel.app"],
  ])("resolves the deployment root of %s as %s", (host, rootHost) => {
    expect(resolveDeploymentRootHost(host)).toBe(rootHost);
  });

  it.each([
    ["tienda2.localhost:3000", "admin.localhost:3000"],
    ["localhost:3000", "admin.localhost:3000"],
    ["tienda2.example.com", "admin.example.com"],
    ["www.example.com", "admin.example.com"],
    ["tienda2.osoria.vercel.app", "admin.osoria.vercel.app"],
    ["osoria.vercel.app", "admin.osoria.vercel.app"],
  ])("derives the platform admin host of %s as %s", (host, adminHost) => {
    expect(toPlatformAdminHost(host)).toBe(adminHost);
  });
});

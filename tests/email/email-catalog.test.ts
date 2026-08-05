import { describe, expect, it } from "vitest";

import { getEmailPreviewFixture } from "@/lib/email/fixtures";
import { renderEmail } from "@/lib/email/render";
import { EMAIL_TEMPLATE_KINDS, type EmailTemplateInput } from "@/lib/email/types";
import { getAdminUrl, getTenantOrigin, getTenantUrl } from "@/lib/email/urls";

const brandedOrder: EmailTemplateInput = {
  kind: "order-shipped",
  branding: {
    displayName: "Tienda <segura>",
    validatedSubdomain: "tienda-segura",
    primaryColor: "#0f766e",
    commercialAddress: "Calle <12>",
    contactEmail: "hola@example.com",
  },
  data: {
    customerName: "Ana <script>alert(1)</script>",
    orderNumber: "PED-<100>",
    trackingCode: "GUIA-1",
  },
};

describe("email catalog", () => {
  it("provides a typed safe fixture for every catalog template", () => {
    expect(EMAIL_TEMPLATE_KINDS).toHaveLength(13);
    expect(EMAIL_TEMPLATE_KINDS.map(getEmailPreviewFixture)).toHaveLength(13);
  });

  it("renders tenant branding and escaped customer data in HTML and text", async () => {
    const rendered = await renderEmail(brandedOrder);

    expect(rendered.html).toContain("Tienda &lt;segura&gt;");
    expect(rendered.html).toContain("Ana &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(rendered.html).not.toContain("<script>alert(1)</script>");
    expect(rendered.html).toContain("#0f766e");
    expect(rendered.text).toContain("Ana <script>alert(1)</script>");
    expect(rendered.text).toContain("Calle <12>");
    expect(rendered.text).toContain("Tu pedido PED-<100> fue enviado");
  });

  it("uses the canonical tenant and admin authorities only", async () => {
    const rendered = await renderEmail(brandedOrder);

    expect(rendered.html).toContain("https://tienda-segura.osoria.help/orders/PED-%3C100%3E");
    expect(getAdminUrl("/invites/preview")).toBe("https://admin.osoria.help/invites/preview");
    expect(getTenantOrigin("tienda-segura")).toBe("https://tienda-segura.osoria.help");
    expect(getTenantUrl("tienda-segura", "/orders/1")).toBe("https://tienda-segura.osoria.help/orders/1");
    expect(() => getTenantOrigin("tienda.secreta")).toThrow(/validated DNS label/);
    expect(() => getAdminUrl("https://attacker.example")).toThrow(/application-relative/);
  });

  it("maintains subject, HTML, and text parity for every supported template", async () => {
    for (const kind of EMAIL_TEMPLATE_KINDS) {
      const rendered = await renderEmail(getEmailPreviewFixture(kind));

      expect(rendered.subject).not.toBe("");
      expect(rendered.html).toContain("<html");
      expect(rendered.text).not.toContain("<");
      expect(rendered.text).toContain("Cumbre Dorada Café");
    }
  });
});

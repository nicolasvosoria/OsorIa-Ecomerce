import type { CSSProperties, ReactNode } from "react";

import { Body, Button, Container, Head, Html, Img, Section, Text } from "@react-email/components";

import type { TenantEmailBranding } from "./types.ts";

const DEFAULT_PRIMARY_COLOR = "#4a5568"; // pizarra-serena — DESIGN.md
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const HTTPS_URL_PATTERN = /^https:\/\//i;

// Verify-exception: los clientes de correo (Gmail, Outlook) no cargan fuentes
// auto-hospedadas ni `@font-face` de forma fiable, así que un webfont queda
// descartado. Usamos el mismo respaldo genérico que `--font-family-heading`
// y `--font-family-sans` resuelven cuando Geist no está disponible (ver
// app/globals.css), en vez de un nombre de fuente arbitrario.
const EMAIL_FONT_FAMILY = "sans-serif";

export function EmailLayout({
  branding,
  children,
}: {
  branding: TenantEmailBranding;
  children: ReactNode;
}) {
  const primaryColor = getPrimaryColor(branding.primaryColor);
  const logoUrl = getSafeLogoUrl(branding.logoUrl);

  return (
    <Html lang="es">
      <Head />
      <Body style={bodyStyle}>
        <Container style={cardStyle}>
          <Section style={{ ...headerStyle, borderBottomColor: primaryColor }}>
            {logoUrl ? (
              <Img alt={branding.displayName} height={40} src={logoUrl} style={logoStyle} />
            ) : (
              <Text style={brandNameStyle}>{branding.displayName}</Text>
            )}
          </Section>
          <Section style={contentStyle}>{children}</Section>
          <Section style={footerStyle}>
            <Text style={footerTextStyle}>{branding.commercialAddress}</Text>
            {branding.contactEmail ? <Text style={footerTextStyle}>{branding.contactEmail}</Text> : null}
            {branding.contactPhone ? <Text style={footerTextStyle}>{branding.contactPhone}</Text> : null}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function EmailAction({ href, label, primaryColor }: { href: string; label: string; primaryColor: string }) {
  return (
    <Button href={href} style={{ ...actionStyle, backgroundColor: getPrimaryColor(primaryColor) }}>
      {label}
    </Button>
  );
}

export function getPrimaryColor(color: string): string {
  return HEX_COLOR_PATTERN.test(color) ? color : DEFAULT_PRIMARY_COLOR;
}

function getSafeLogoUrl(logoUrl: string | undefined): string | undefined {
  return logoUrl && HTTPS_URL_PATTERN.test(logoUrl) ? logoUrl : undefined;
}

// Tamaños y colores tomados de la rampa tipográfica y la paleta de
// DESIGN.md. Los valores se expresan en px/em porque los clientes de correo
// no resuelven `rem` ni variables CSS.
const bodyStyle: CSSProperties = {
  backgroundColor: "#f7fafc", // superficie-tenue
  color: "#1a1a1a", // tinta
  fontFamily: EMAIL_FONT_FAMILY,
  margin: 0,
  padding: "24px 12px",
};
const cardStyle: CSSProperties = { backgroundColor: "#ffffff", maxWidth: "600px" }; // papel
const headerStyle: CSSProperties = { borderBottomStyle: "solid", borderBottomWidth: "4px", padding: "24px" };
// title (600, 18px, 1, -0.01em) — DESIGN.md typography ramp
const brandNameStyle: CSSProperties = {
  fontSize: "18px",
  fontWeight: 600,
  letterSpacing: "-0.01em",
  lineHeight: 1,
  margin: 0,
};
const contentStyle: CSSProperties = { padding: "24px" };
const footerStyle: CSSProperties = { backgroundColor: "#f7fafc", padding: "20px 24px" }; // superficie-tenue
// label (500, 14px, 1.25) — DESIGN.md typography ramp
const footerTextStyle: CSSProperties = {
  color: "#718096", // tinta-tenue
  fontSize: "14px",
  fontWeight: 500,
  lineHeight: 1.25,
  margin: "0 0 4px",
};
const logoStyle: CSSProperties = { display: "block", maxHeight: "40px", maxWidth: "180px", objectFit: "contain" };
// label typography + spec de button-primary de DESIGN.md (padding 8px 12px, peso 600, rounded.md)
const actionStyle: CSSProperties = {
  borderRadius: "6px",
  color: "#ffffff", // papel
  display: "inline-block",
  fontSize: "14px",
  fontWeight: 600,
  lineHeight: 1.25,
  marginTop: "8px",
  padding: "8px 12px",
  textDecoration: "none",
};

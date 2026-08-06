import { render } from "@react-email/render";

import { EMAIL_COPY } from "./copy.ts";
import { EmailTemplate } from "./templates.tsx";
import type { EmailTemplateInput, RenderedEmail } from "./types.ts";

export async function renderEmail(input: EmailTemplateInput): Promise<RenderedEmail> {
  const [html, text] = await Promise.all([
    render(<EmailTemplate input={input} />),
    render(<EmailTemplate input={input} />, { plainText: true, htmlToTextOptions: { wordwrap: false } }),
  ]);

  return {
    subject: EMAIL_COPY[input.kind].subject(input.branding.displayName, getReference(input)),
    html,
    text,
  };
}

function getReference(input: EmailTemplateInput): string | undefined {
  return "orderNumber" in input.data ? input.data.orderNumber : undefined;
}

// A9 (delegated): wa.me's click-to-chat spec needs the FULL international
// number -- a bare local number silently produces a link that reaches nobody
// (verified: 3000000000, stripped from any of its punctuated forms, is not
// callable on its own). This platform is Colombian end to end (COP, cash on
// delivery, the DANE municipality catalog) and the ledger puts international
// shipping out of scope, so the one country code this normalizes to is
// Colombia's -- no configurable-country mechanism for a case that's excluded.
//
// The rule, after stripping every non-digit:
//   - 12 digits starting "57"  -> already international, used as-is.
//   - 10 digits                -> Colombian national number (mobiles
//                                  3XXXXXXXXX, and landlines since the 2022
//                                  renumbering, 60X XXXXXXX) -- prepend "57".
//   - anything else            -> `null`. D14 already treats "no usable
//                                  phone" as "no button"; a number this code
//                                  can't confidently turn into a working link
//                                  is the same case, not a guess.
export function buildWhatsAppLink(phone: string): string | null {
  const digits = phone.replace(/\D/g, "")

  if (digits.length === 12 && digits.startsWith("57")) {
    return `https://wa.me/${digits}`
  }

  if (digits.length === 10) {
    return `https://wa.me/57${digits}`
  }

  return null
}

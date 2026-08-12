// A9 (delegated): wa.me's click-to-chat spec needs the FULL international
// number -- a bare local number silently produces a link that reaches
// nobody. The platform is Colombian end to end and the ledger puts
// international shipping out of scope, so "57" is the only country code
// this normalizes to (10-digit Colombian numbers cover both mobiles and,
// since the 2022 renumbering, landlines alike). Any other shape is refused
// with `null` rather than guessed -- D14 already treats "no usable phone"
// as "no button".
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

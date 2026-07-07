// Radix `Select` (and cmdk's `Command`/`CommandItem`) forbid an item with an
// empty-string value: Radix reserves "" to represent "no selection cleared",
// and cmdk needs a non-empty value to key its internal item matching. Some
// option sets use "" as a real value (e.g. the header's "Auto" sticky mode,
// or "no product chosen"), so callers swap it for this sentinel in the UI and
// map it back to "" on change. Never persist or compare this value outside a
// single component's own Select/Command mapping.
export const EMPTY_SELECT_VALUE = "__empty__"

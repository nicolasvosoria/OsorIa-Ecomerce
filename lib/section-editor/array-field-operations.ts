// Pure helpers for the "array" field type (e.g. hero products, gallery
// images, testimonials). No admin-context dependency: hosts call these and
// route the resulting array through their own field-change callback.

export function updateArrayItem<T extends Record<string, any>>(
  array: T[],
  index: number,
  fieldKey: string,
  value: unknown,
): T[] {
  const updated = [...array];
  updated[index] = { ...updated[index], [fieldKey]: value };
  return updated;
}

export function addArrayItem<T extends Record<string, any>>(
  array: T[],
  arrayFields: Array<{ key: string }>,
): T[] {
  const newItem: Record<string, any> = {};
  arrayFields.forEach((field) => {
    newItem[field.key] = "";
  });
  return [...array, newItem as T];
}

export function removeArrayItem<T>(array: T[], index: number): T[] {
  return array.filter((_, i) => i !== index);
}

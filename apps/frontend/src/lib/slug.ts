export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

/**
 * Applies a field edit to a {name, slug, ...} form. While the slug is
 * untouched — empty or still equal to the derived value — renaming the
 * entity re-derives its slug. Explicit slug edits are sanitized in place.
 */
export function applySlugField<T extends { name: string; slug: string }>(
  current: T,
  field: string,
  value: string,
): T {
  if (field === "slug") return { ...current, slug: slugify(value) };
  if (field === "name" && (current.slug === "" || current.slug === slugify(current.name))) {
    return { ...current, name: value, slug: slugify(value) };
  }
  return { ...current, [field]: value };
}

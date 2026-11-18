// The key a book's title is matched by: the reader's metadata, a note's
// frontmatter and the private app all go through this, so "The Remains of the
// Day", "the remains of the day." and "Thé Remains: of the Day" meet.
export function titleKey(title) {
  return String(title ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

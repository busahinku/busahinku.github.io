import { visit } from "unist-util-visit";

/**
 * remark: turn ==highlighted text== into <mark>highlighted text</mark>,
 * the way Medium highlights work.
 */
export function remarkMark() {
  return (tree) => {
    visit(tree, "text", (node, index, parent) => {
      if (!parent || index === null || !node.value.includes("==")) return;
      const parts = node.value.split(/==([^=]+)==/g);
      if (parts.length === 1) return;
      const replacement = [];
      parts.forEach((part, i) => {
        if (i % 2 === 1) {
          replacement.push({
            type: "html",
            value: `<mark class="highlight">${part}</mark>`,
          });
        } else if (part) {
          replacement.push({ type: "text", value: part });
        }
      });
      parent.children.splice(index, 1, ...replacement);
    });
  };
}

/**
 * rehype: wrap a standalone image that has alt text in a <figure> with a
 * <figcaption>, so content images can carry a caption like on Medium.
 * Images with empty alt stay as plain images.
 */
export function rehypeFigure() {
  return (tree) => {
    visit(tree, "element", (node) => {
      if (node.tagName !== "p" || !node.children) return;
      const kids = node.children.filter(
        (c) => !(c.type === "text" && c.value.trim() === ""),
      );
      if (kids.length !== 1) return;
      const img = kids[0];
      if (img.type !== "element" || img.tagName !== "img") return;
      const alt = img.properties?.alt;
      if (!alt || !alt.trim()) return;

      node.tagName = "figure";
      node.properties = { className: ["content-figure"] };
      node.children = [
        img,
        {
          type: "element",
          tagName: "figcaption",
          properties: {},
          children: [{ type: "text", value: alt }],
        },
      ];
    });
  };
}

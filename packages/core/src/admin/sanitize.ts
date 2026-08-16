import "server-only";

import sanitizeHtml from "sanitize-html";

/**
 * Allowlist for rich text coming out of the editor.
 *
 * The panel is admin-only, but this still runs on every save: the editor
 * happily carries whatever was pasted into it, the output is rendered with
 * dangerouslySetInnerHTML on a public page, and one compromised admin session
 * would otherwise be a stored XSS on every visitor.
 */

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "code",
    "pre",
    "blockquote",
    "h2",
    "h3",
    "h4",
    "ul",
    "ol",
    "li",
    "hr",
    "a",
    "img",
    "mark",
    "span",
    "sub",
    "sup",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "colgroup",
    "col",
    "div",
    "label",
    "input",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel", "dir"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    // Tiptap writes alignment and colour as inline styles
    "*": ["style", "dir", "class", "colspan", "rowspan", "colwidth", "data-type", "data-checked"],
    // task list items render as a disabled checkbox
    input: ["type", "checked", "disabled"],
  },
  allowedStyles: {
    "*": {
      "text-align": [/^(left|right|center|justify)$/],
      color: [/^#[0-9a-fA-F]{3,8}$/, /^rgba?\([\d\s.,%]+\)$/],
      "background-color": [/^#[0-9a-fA-F]{3,8}$/, /^rgba?\([\d\s.,%]+\)$/],
      "font-size": [/^\d{1,3}(px|pt|em|rem|%)$/],
      "font-family": [/^[\w\s,'"-]{1,120}$/],
      "line-height": [/^\d(\.\d+)?$/],
    },
  },
  // Anything else (javascript:, data: with a payload) is dropped
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  allowProtocolRelative: false,
  transformTags: {
    // A link that opens a new tab must not hand the opener over with it
    a: (tagName, attribs) => ({
      tagName,
      attribs:
        attribs.target === "_blank"
          ? { ...attribs, rel: "noopener noreferrer" }
          : attribs,
    }),
  },
};

export function sanitizeRichText(html: string): string {
  const clean = sanitizeHtml(html, OPTIONS).trim();
  // Tiptap represents "empty" as a single blank paragraph; store nothing
  return clean === "<p></p>" || clean === "<p><br /></p>" ? "" : clean;
}

/** Plain text of a rich value — for meta descriptions and list previews. */
export function richTextToPlain(html: string, limit = 300): string {
  const text = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

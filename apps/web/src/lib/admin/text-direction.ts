import { Extension } from "@tiptap/core";

/**
 * Per-block `dir` attribute.
 *
 * Persian copy regularly embeds an English sentence, a code name or a URL, and
 * a whole-editor direction gets those backwards. Tiptap ships alignment but not
 * direction, so this adds `dir` as a global attribute on the block nodes and a
 * command that writes it across the whole selection rather than only the node
 * the cursor happens to sit in.
 */

const BLOCK_TYPES = ["paragraph", "heading", "blockquote", "listItem", "taskItem", "codeBlock"];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textDirection: {
      setTextDirection: (direction: "rtl" | "ltr" | null) => ReturnType;
    };
  }
}

export const TextDirection = Extension.create({
  name: "textDirection",

  addGlobalAttributes() {
    return [
      {
        types: BLOCK_TYPES,
        attributes: {
          dir: {
            default: null,
            parseHTML: (element) => element.getAttribute("dir"),
            renderHTML: (attributes) => (attributes.dir ? { dir: attributes.dir } : {}),
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setTextDirection:
        (direction) =>
        ({ state, tr, dispatch }) => {
          const { from, to } = state.selection;
          let touched = false;

          state.doc.nodesBetween(from, to, (node, pos) => {
            if (!BLOCK_TYPES.includes(node.type.name)) return;
            tr.setNodeAttribute(pos, "dir", direction);
            touched = true;
          });

          if (touched && dispatch) dispatch(tr);
          return touched;
        },
    };
  },
});

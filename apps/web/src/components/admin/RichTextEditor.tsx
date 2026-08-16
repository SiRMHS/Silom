"use client";

import { useCallback, useEffect, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import { TextStyleKit } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { TextAlign } from "@tiptap/extension-text-align";
import { Image } from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Typography } from "@tiptap/extension-typography";
import { TextDirection } from "@/lib/admin/text-direction";
import type { MediaItem } from "@/app/admin/(panel)/media-actions";
import MediaBrowser from "./MediaBrowser";

/**
 * Rich text field.
 *
 * The value is mirrored into a hidden input so the editor drops into the same
 * plain `<form action={…}>` submission the rest of the panel uses — no extra
 * client state plumbing, and a field that works the moment it is added to a
 * schema.
 *
 * Output is HTML. It is sanitised server-side on save (see lib/admin/sanitize),
 * because what a rich text editor produces is only ever as trustworthy as
 * whatever pasted into it.
 */

const HEADINGS = [
  { level: 0, label: "متن عادی" },
  { level: 2, label: "تیتر بزرگ" },
  { level: 3, label: "تیتر متوسط" },
  { level: 4, label: "تیتر کوچک" },
] as const;

const SWATCHES = [
  "#111111",
  "#ef4444",
  "#f6b506",
  "#1d4ed8",
  "#0f766e",
  "#c2410c",
  "#8b5cf6",
  "#6b7280",
];

export default function RichTextEditor({
  name,
  value,
  media = [],
  placeholder = "بنویسید…",
  minHeight = 200,
}: {
  name: string;
  value: string;
  media?: MediaItem[];
  placeholder?: string;
  minHeight?: number;
}) {
  const [html, setHtml] = useState(value || "");
  const [showImage, setShowImage] = useState(false);

  const editor = useEditor({
    // Next renders this on the server first; rendering the editor there would
    // mismatch on hydration.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer" } },
      }),
      TextStyleKit,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({ inline: false, HTMLAttributes: { loading: "lazy" } }),
      TableKit.configure({ table: { resizable: true } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Subscript,
      Superscript,
      Typography,
      TextDirection,
      Placeholder.configure({ placeholder }),
      CharacterCount,
    ],
    content: value || "",
    editorProps: {
      attributes: { class: "ad-prose", dir: "rtl", spellcheck: "false" },
    },
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
  });

  // No effect syncs `value` back in. The editor owns the text once mounted;
  // after a save the server echoes what it already holds, and a genuinely
  // different record arrives as a different route — i.e. a fresh mount. If a
  // caller ever needs to swap content in place, it should pass a changing
  // `key` rather than have this fight the user's cursor.

  if (!editor) {
    return (
      <div className="ad-editor" style={{ minHeight }}>
        <div className="ad-editor-body" style={{ minHeight }} />
        <input type="hidden" name={name} value={html} readOnly />
      </div>
    );
  }

  return (
    <div className="ad-editor">
      <Toolbar editor={editor} onImage={() => setShowImage(true)} />

      <div className="ad-editor-body" style={{ minHeight }}>
        <EditorContent editor={editor} />
      </div>

      <div className="ad-editor-foot">
        <span>{editor.storage.characterCount.words().toLocaleString("fa-IR")} واژه</span>
        <span>{editor.storage.characterCount.characters().toLocaleString("fa-IR")} نویسه</span>
      </div>

      <input type="hidden" name={name} value={html} readOnly />

      {showImage && (
        <MediaBrowser
          media={media}
          title="درج تصویر در متن"
          onPick={(item) => {
            editor
              .chain()
              .focus()
              .setImage({ src: item.url, alt: item.alt || item.filename })
              .run();
            setShowImage(false);
          }}
          onClose={() => setShowImage(false)}
        />
      )}
    </div>
  );
}

function Btn({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="ad-tb-btn"
      data-active={active ? "" : undefined}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      // mousedown, not click: the editor must not lose selection first
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, onImage }: { editor: Editor; onImage: () => void }) {
  // Toolbar state is derived from the editor, which mutates outside React
  const [, force] = useState(0);
  useEffect(() => {
    const rerender = () => force((n) => n + 1);
    editor.on("transaction", rerender);
    editor.on("selectionUpdate", rerender);
    return () => {
      editor.off("transaction", rerender);
      editor.off("selectionUpdate", rerender);
    };
  }, [editor]);

  const setLink = useCallback(() => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("نشانی لینک", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const headingValue = HEADINGS.find((h) =>
    h.level === 0 ? editor.isActive("paragraph") : editor.isActive("heading", { level: h.level }),
  )?.level;

  return (
    <div className="ad-toolbar">
      <div className="ad-tb-group">
        <Btn
          title="واگرد"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          ↶
        </Btn>
        <Btn
          title="ازنو"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          ↷
        </Btn>
      </div>

      <div className="ad-tb-group">
        <select
          className="ad-tb-select"
          value={headingValue ?? 0}
          onChange={(e) => {
            const level = Number(e.target.value);
            if (level === 0) editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: level as 2 | 3 | 4 }).run();
          }}
          aria-label="سبک پاراگراف"
        >
          {HEADINGS.map((h) => (
            <option key={h.level} value={h.level}>
              {h.label}
            </option>
          ))}
        </select>
      </div>

      <div className="ad-tb-group">
        <Btn title="ضخیم" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <b>B</b>
        </Btn>
        <Btn title="کج" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <i>I</i>
        </Btn>
        <Btn
          title="زیرخط"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <u>U</u>
        </Btn>
        <Btn
          title="خط‌خورده"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <s>S</s>
        </Btn>
        <Btn title="کد" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
          {"</>"}
        </Btn>
        <Btn
          title="بالانویس"
          active={editor.isActive("superscript")}
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
        >
          x²
        </Btn>
        <Btn
          title="زیرنویس"
          active={editor.isActive("subscript")}
          onClick={() => editor.chain().focus().toggleSubscript().run()}
        >
          x₂
        </Btn>
      </div>

      <div className="ad-tb-group">
        <Btn
          title="هایلایت"
          active={editor.isActive("highlight")}
          onClick={() => editor.chain().focus().toggleHighlight({ color: "#fde68a" }).run()}
        >
          ▬
        </Btn>

        <span className="ad-tb-swatches">
          {SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              className="ad-tb-swatch"
              style={{ background: c }}
              title={`رنگ متن ${c}`}
              aria-label={`رنگ متن ${c}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().setColor(c).run()}
            />
          ))}
          <Btn title="حذف رنگ" onClick={() => editor.chain().focus().unsetColor().run()}>
            ⌫
          </Btn>
        </span>
      </div>

      <div className="ad-tb-group">
        <Btn
          title="راست‌چین"
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          ⇥
        </Btn>
        <Btn
          title="وسط‌چین"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          ≡
        </Btn>
        <Btn
          title="چپ‌چین"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          ⇤
        </Btn>
        <Btn
          title="هم‌تراز"
          active={editor.isActive({ textAlign: "justify" })}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        >
          ☰
        </Btn>
      </div>

      <div className="ad-tb-group">
        <Btn title="جهت راست‌به‌چپ" onClick={() => editor.chain().focus().setTextDirection("rtl").run()}>
          فا
        </Btn>
        <Btn title="جهت چپ‌به‌راست" onClick={() => editor.chain().focus().setTextDirection("ltr").run()}>
          En
        </Btn>
      </div>

      <div className="ad-tb-group">
        <Btn
          title="فهرست نقطه‌ای"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          •
        </Btn>
        <Btn
          title="فهرست شماره‌دار"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          ۱.
        </Btn>
        <Btn
          title="فهرست تیک‌دار"
          active={editor.isActive("taskList")}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        >
          ☑
        </Btn>
      </div>

      <div className="ad-tb-group">
        <Btn
          title="نقل‌قول"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          ❝
        </Btn>
        <Btn
          title="بلوک کد"
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          {"{}"}
        </Btn>
        <Btn title="خط جداکننده" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          —
        </Btn>
      </div>

      <div className="ad-tb-group">
        <Btn title="لینک" active={editor.isActive("link")} onClick={setLink}>
          🔗
        </Btn>
        <Btn
          title="حذف لینک"
          disabled={!editor.isActive("link")}
          onClick={() => editor.chain().focus().unsetLink().run()}
        >
          ⛓
        </Btn>
        <Btn title="تصویر" onClick={onImage}>
          ▣
        </Btn>
      </div>

      <div className="ad-tb-group">
        <Btn
          title="درج جدول"
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
        >
          ▦
        </Btn>
        <Btn
          title="افزودن ستون"
          disabled={!editor.can().addColumnAfter()}
          onClick={() => editor.chain().focus().addColumnAfter().run()}
        >
          ⊞
        </Btn>
        <Btn
          title="افزودن ردیف"
          disabled={!editor.can().addRowAfter()}
          onClick={() => editor.chain().focus().addRowAfter().run()}
        >
          ⊟
        </Btn>
        <Btn
          title="حذف جدول"
          disabled={!editor.can().deleteTable()}
          onClick={() => editor.chain().focus().deleteTable().run()}
        >
          ⌦
        </Btn>
      </div>

      <div className="ad-tb-group">
        <Btn
          title="پاک‌کردن قالب‌بندی"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          ✕
        </Btn>
      </div>
    </div>
  );
}

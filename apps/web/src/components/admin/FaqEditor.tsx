"use client";

import { useState } from "react";
import { MoveDownIcon, MoveUpIcon } from "./Icons";
import type { Faq } from "@rahyad/core/faq";

/**
 * Repeatable question/answer rows, shared by the project and post editors.
 *
 * Posts under the field names `faq.q.<i>` / `faq.a.<i>`, matching how the
 * case-study sections post — the index is the display order and the save action
 * drops any row that is empty on either side.
 */
export default function FaqEditor({ faqs }: { faqs: Faq[] }) {
  // Stable keys so editing one row's text can't remount another when the list
  // is reordered.
  const [rows, setRows] = useState(() => faqs.map((f, i) => ({ key: `f${i}`, ...f })));
  const [seq, setSeq] = useState(faqs.length);

  const addRow = () => {
    setRows((prev) => [...prev, { key: `n${seq}`, q: "", a: "" }]);
    setSeq((n) => n + 1);
  };

  const removeRow = (key: string) => setRows((prev) => prev.filter((r) => r.key !== key));

  const setField = (key: string, field: "q" | "a", value: string) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

  const moveRow = (key: string, dir: -1 | 1) =>
    setRows((prev) => {
      const i = prev.findIndex((r) => r.key === key);
      const j = i + dir;
      if (i === -1 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div className="ad-sections">
      {rows.length === 0 && <p className="ad-hint">هنوز سوالی اضافه نشده است.</p>}

      {rows.map((row, i) => (
        <div className="ad-section-row" key={row.key} data-open="">
          <div className="ad-section-tools">
            <span className="ad-section-num">سوال {(i + 1).toLocaleString("fa-IR")}</span>
            <span className="ad-item-title">{row.q || "بدون عنوان"}</span>

            <button
              type="button"
              className="ad-btn ad-btn--sm ad-btn--ghost ad-btn--icon"
              disabled={i === 0}
              onClick={() => moveRow(row.key, -1)}
              aria-label="بالا"
              title="بالا"
            >
              <MoveUpIcon />
            </button>
            <button
              type="button"
              className="ad-btn ad-btn--sm ad-btn--ghost ad-btn--icon"
              disabled={i === rows.length - 1}
              onClick={() => moveRow(row.key, 1)}
              aria-label="پایین"
              title="پایین"
            >
              <MoveDownIcon />
            </button>
            <button
              type="button"
              className="ad-btn ad-btn--sm ad-btn--danger"
              onClick={() => removeRow(row.key)}
            >
              حذف
            </button>
          </div>

          <div className="ad-collapse-inner ad-stack">
            <input
              className="ad-input"
              name={`faq.q.${i}`}
              value={row.q}
              onChange={(e) => setField(row.key, "q", e.target.value)}
              placeholder="سوال — مثلاً چقدر طول می‌کشد؟"
              aria-label={`سوال ${i + 1}`}
            />
            <textarea
              className="ad-textarea"
              name={`faq.a.${i}`}
              value={row.a}
              onChange={(e) => setField(row.key, "a", e.target.value)}
              placeholder="پاسخ…"
              aria-label={`پاسخ ${i + 1}`}
            />
          </div>
        </div>
      ))}

      <button type="button" className="ad-btn ad-btn--sm" onClick={addRow}>
        افزودن سوال
      </button>
    </div>
  );
}

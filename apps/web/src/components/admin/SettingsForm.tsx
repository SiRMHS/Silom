"use client";

import { useTransition } from "react";
import { saveSettings } from "@/app/admin/(panel)/content-actions";
import Toast, { useToast } from "./Toast";

export type SettingRow = {
  key: string;
  value: string;
  label: string;
  hint: string | null;
  kind: string;
  group: string;
};

export const GROUP_LABELS: Record<string, string> = {
  GENERAL: "کلی",
  SEO: "عنوان و توضیح صفحه‌ها",
  MANIFESTO: "بخش معرفی",
  SERVICES: "خدمات",
  WORK: "کارهای منتخب",
  TEAM: "تیم",
  LOGOS: "همکاران",
  CONTACT: "فرم تماس",
  FOOTER: "فوتر",
  BOOT: "صفحه‌ی بوت",
  PROJECTS: "صفحه‌ی پروژه‌ها",
  A11Y: "دسترس‌پذیری",
};

/**
 * Every one-off string on the site, grouped by where it appears.
 *
 * It is a single form: these are short values that get edited in sweeps, and
 * one save is less friction than a button per row. Inputs are named `s:<key>`
 * so the action can pick them out of the payload without a separate manifest.
 */
export default function SettingsForm({ groups }: { groups: [string, SettingRow[]][] }) {
  const { toast, show } = useToast();
  const [pending, start] = useTransition();

  return (
    <form
      action={(formData) =>
        start(async () => {
          const res = await saveSettings(formData);
          show(res.ok ? "همه‌ی متن‌ها ذخیره شد" : res.error, !res.ok);
        })
      }
    >
      <div className="ad-head">
        <div>
          <h1>متن‌های سایت</h1>
          <p>
            تک‌متن‌های ثابت سایت. فهرست‌ها (خدمات، تیم، پروژه‌ها و…) صفحه‌ی خودشان را دارند.
          </p>
        </div>
        <div className="ad-head-actions">
          <button className="ad-btn ad-btn--primary" type="submit" disabled={pending}>
            {pending ? "در حال ذخیره…" : "ذخیره‌ی همه"}
          </button>
        </div>
      </div>

      {groups.map(([group, rows]) => (
        <div className="ad-card" key={group}>
          <h2>{GROUP_LABELS[group] ?? group}</h2>
          <div className="ad-fields" style={{ marginTop: 14 }}>
            {rows.map((row) => (
              <div
                className="ad-field"
                data-span={row.kind === "TEXTAREA" ? "full" : "half"}
                key={row.key}
              >
                <label className="ad-label" htmlFor={row.key}>
                  {row.label}
                </label>

                {row.kind === "TEXTAREA" ? (
                  <textarea
                    id={row.key}
                    name={`s:${row.key}`}
                    className="ad-textarea"
                    defaultValue={row.value}
                  />
                ) : (
                  <input
                    id={row.key}
                    name={`s:${row.key}`}
                    className={`ad-input${row.kind === "URL" ? " is-ltr" : ""}`}
                    dir={row.kind === "URL" ? "ltr" : undefined}
                    defaultValue={row.value}
                  />
                )}

                <span className="ad-hint">
                  {row.hint ? `${row.hint} — ` : ""}
                  <code dir="ltr">{row.key}</code>
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ marginTop: 20 }}>
        <button className="ad-btn ad-btn--primary" type="submit" disabled={pending}>
          {pending ? "در حال ذخیره…" : "ذخیره‌ی همه"}
        </button>
      </div>

      <Toast toast={toast} />
    </form>
  );
}

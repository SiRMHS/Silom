"use client";

import { useId, useState, useTransition } from "react";
import {
  createItem,
  deleteItem,
  moveItem,
  saveItem,
  type ActionResult,
} from "@/app/admin/(panel)/content-actions";
import type { CollectionDef, FieldDef } from "@rahyad/core/admin";
import type { MediaItem } from "@/app/admin/(panel)/media-actions";
import { Icon, MoveDownIcon, MoveUpIcon } from "./Icons";
import ImagePicker from "./ImagePicker";
import Toast, { useToast } from "./Toast";

export type Row = Record<string, unknown> & { id: string };

/**
 * Generic editor for every ordered collection.
 *
 * Each row is its own form, so saving one row never touches another and a
 * failed save leaves the rest of the screen untouched.
 */
export default function CollectionEditor({
  def,
  rows,
  media,
  /** 2 when a screen stacks several collections, so it keeps one h1. */
  level = 1,
}: {
  def: CollectionDef;
  rows: Row[];
  media: MediaItem[];
  level?: 1 | 2;
}) {
  const { toast, show } = useToast();
  const [adding, startAdd] = useTransition();
  const Heading = level === 1 ? "h1" : "h2";

  return (
    <>
      <div className="ad-head">
        <div>
          <Heading>{def.title}</Heading>
          <p>{def.description}</p>
        </div>
        <div className="ad-head-actions">
          <button
            type="button"
            className="ad-btn ad-btn--primary"
            disabled={adding}
            onClick={() =>
              startAdd(async () => {
                const res = await createItem(def.model);
                show(res.ok ? "ردیف تازه اضافه شد" : res.error, !res.ok);
              })
            }
          >
            {adding ? "…" : def.addLabel}
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="ad-empty">هنوز چیزی اینجا نیست.</p>
      ) : (
        <div className="ad-stack">
          {rows.map((row, i) => (
            <ItemCard
              key={row.id}
              def={def}
              row={row}
              media={media}
              isFirst={i === 0}
              isLast={i === rows.length - 1}
              onResult={(res, okMessage) => show(res.ok ? okMessage : res.error, !res.ok)}
            />
          ))}
        </div>
      )}

      <Toast toast={toast} />
    </>
  );
}

function ItemCard({
  def,
  row,
  media,
  isFirst,
  isLast,
  onResult,
}: {
  def: CollectionDef;
  row: Row;
  media: MediaItem[];
  isFirst: boolean;
  isLast: boolean;
  onResult: (res: ActionResult, okMessage: string) => void;
}) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  // collapsed by default — a long list should be scannable before it is editable
  const [open, setOpen] = useState(false);

  const title = String(row[def.titleField] ?? "بدون عنوان");
  const accent = (row.accent ?? row.color ?? row.txColor) as string | undefined;
  const hidden = row.visible === false;

  const run = (fn: () => Promise<ActionResult>, okMessage: string) =>
    start(async () => onResult(await fn(), okMessage));

  return (
    <div className="ad-item" data-hidden={hidden ? "" : undefined} data-open={open ? "" : undefined}>
      <form action={(formData) => run(() => saveItem(def.model, formData), "ذخیره شد")}>
        <input type="hidden" name="id" value={row.id} />

        <div className="ad-item-head">
          <button
            type="button"
            className="ad-disclosure"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="ad-disclosure-caret">
              <Icon name="chevronDown" size={15} />
            </span>
            {accent && <span className="ad-swatch" style={{ background: accent }} />}
            <span className="ad-item-title">{title}</span>
            {hidden && <span className="ad-badge ad-badge--off">پنهان</span>}
          </button>

          <div className="ad-item-tools">
            {def.sortable && (
              <>
                <button
                  type="button"
                  className="ad-btn ad-btn--sm ad-btn--ghost ad-btn--icon"
                  disabled={pending || isFirst}
                  aria-label="بالا"
                  title="بالا"
                  onClick={() => run(() => moveItem(def.model, row.id, "up"), "جابه‌جا شد")}
                >
                  <MoveUpIcon />
                </button>
                <button
                  type="button"
                  className="ad-btn ad-btn--sm ad-btn--ghost ad-btn--icon"
                  disabled={pending || isLast}
                  aria-label="پایین"
                  title="پایین"
                  onClick={() => run(() => moveItem(def.model, row.id, "down"), "جابه‌جا شد")}
                >
                  <MoveDownIcon />
                </button>
              </>
            )}

            {confirming ? (
              <>
                <button
                  type="button"
                  className="ad-btn ad-btn--sm ad-btn--danger"
                  disabled={pending}
                  onClick={() => run(() => deleteItem(def.model, row.id), "حذف شد")}
                >
                  مطمئنم، حذف کن
                </button>
                <button
                  type="button"
                  className="ad-btn ad-btn--sm ad-btn--ghost"
                  onClick={() => setConfirming(false)}
                >
                  انصراف
                </button>
              </>
            ) : (
              <button
                type="button"
                className="ad-btn ad-btn--sm ad-btn--danger"
                disabled={pending}
                onClick={() => setConfirming(true)}
              >
                حذف
              </button>
            )}

            {open && (
              <button
                className="ad-btn ad-btn--sm ad-btn--primary"
                type="submit"
                disabled={pending}
              >
                {pending ? "…" : "ذخیره"}
              </button>
            )}
          </div>
        </div>

        {/* kept mounted while collapsed so the row's values still post on save */}
        <div className="ad-collapse" inert={!open}>
          <div className="ad-collapse-inner">
            <div className="ad-fields">
              {def.fields.map((field) => (
                <Field key={field.name} field={field} value={row[field.name]} media={media} />
              ))}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({
  field,
  value,
  media,
}: {
  field: FieldDef;
  value: unknown;
  media: MediaItem[];
}) {
  // useId, not a random string — the ids must match between server and client
  const id = useId();
  const span = field.span ?? "half";

  const label = (
    <label className="ad-label" htmlFor={id}>
      {field.label}
    </label>
  );
  const hint = field.hint ? <span className="ad-hint">{field.hint}</span> : null;

  let control: React.ReactNode;

  switch (field.type) {
    case "textarea":
      control = (
        <textarea
          id={id}
          name={field.name}
          className="ad-textarea"
          defaultValue={String(value ?? "")}
        />
      );
      break;

    case "checkbox":
      return (
        <div className="ad-field" data-span={span}>
          <label className="ad-check">
            <input type="checkbox" name={field.name} defaultChecked={value !== false} />
            {field.label}
          </label>
          {hint}
        </div>
      );

    case "color":
      control = <ColorInput id={id} name={field.name} value={String(value ?? "")} />;
      break;

    case "tags":
      control = (
        <input
          id={id}
          name={field.name}
          className="ad-input"
          defaultValue={Array.isArray(value) ? value.join("، ") : ""}
          placeholder={field.placeholder}
        />
      );
      break;

    case "image":
      control = (
        <ImagePicker name={field.name} value={(value as string) ?? null} media={media} />
      );
      break;

    case "select":
      control = (
        <select id={id} name={field.name} className="ad-select" defaultValue={String(value ?? "")}>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
      break;

    case "number":
      control = (
        <input
          id={id}
          name={field.name}
          type="number"
          dir="ltr"
          className="ad-input is-ltr"
          defaultValue={Number(value ?? 0)}
        />
      );
      break;

    default:
      control = (
        <input
          id={id}
          name={field.name}
          className={`ad-input${field.ltr ? " is-ltr" : ""}`}
          dir={field.ltr ? "ltr" : undefined}
          defaultValue={String(value ?? "")}
          placeholder={field.placeholder}
        />
      );
  }

  return (
    <div className="ad-field" data-span={span}>
      {label}
      {control}
      {hint}
    </div>
  );
}

/** Colour swatch and hex box kept in sync, both writing the same form value. */
function ColorInput({ id, name, value }: { id: string; name: string; value: string }) {
  const [color, setColor] = useState(value || "#000000");
  const valid = /^#[0-9a-fA-F]{6}$/.test(color);

  return (
    <div className="ad-color">
      <input
        type="color"
        value={valid ? color : "#000000"}
        onChange={(e) => setColor(e.target.value)}
        aria-label={`انتخاب رنگ ${name}`}
        tabIndex={-1}
      />
      <input
        id={id}
        name={name}
        className="ad-input"
        value={color}
        dir="ltr"
        onChange={(e) => setColor(e.target.value)}
      />
    </div>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";
import { submitContactForm } from "@/app/contact-actions";
import { pick, type SiteStrings } from "@rahyad/core/strings";

/**
 * The brief on /contact — everything worth knowing before the first reply.
 *
 * The footer's field is a one-line "leave your address" and stays that; this is
 * the form for someone who arrived meaning to write. Both post to the same
 * inbox, so the panel reads one list.
 *
 * Only three answers are required — a name, somewhere to reply, and what the
 * project is. The rest is a brief, not a gate: someone who does not yet know
 * their budget should still be able to send the message.
 *
 * The same form is the order form at the foot of every service page. It takes
 * its heading, its opening subject and a pre-ticked service from there rather
 * than being copied: one form, one action, one inbox.
 *
 * Submitted through a Server Action with `action`, which means the form still
 * posts if the JavaScript hasn't loaded — the pending and error states are the
 * enhancement on top, not the mechanism.
 */

/** "الف، ب، ج" from the panel → the options a select offers. */
const options = (raw: string) =>
  raw
    .split(/[,،]/)
    .map((s) => s.trim())
    .filter(Boolean);

export default function ContactPageForm({
  strings: t,
  services = [],
  title,
  note,
  subject = "",
  preselect,
}: {
  strings: SiteStrings;
  /** Service names to offer as tick-boxes — the studio's own list, from the panel. */
  services?: string[];
  /** Overrides the form's heading — a service page asks for an order, not a hello. */
  title?: string;
  note?: string;
  /** Prefills the subject field; the visitor can still rewrite it. */
  subject?: string;
  /** Service ticked on arrival, so the order form knows what it is ordering. */
  preselect?: string;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [picked, setPicked] = useState<string[]>(() =>
    preselect && services.includes(preselect) ? [preselect] : [],
  );
  const [referrer, setReferrer] = useState("");

  const toggle = (name: string) =>
    setPicked((prev) => (prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]));

  const referrers = options(
    pick(t, "contact.form.referrers", "گوگل، اینستاگرام، لینکدین، معرفی دوستان، جستجوی اینترنتی، سایر"),
  );
  const budgets = options(
    pick(t, "contact.form.budgets", "تا ۵۰ میلیون، ۵۰ تا ۱۵۰ میلیون، ۱۵۰ تا ۳۰۰ میلیون، بیش از ۳۰۰ میلیون، هنوز نمی‌دانم"),
  );
  const timelines = options(
    pick(t, "contact.form.timelines", "تا یک ماه، یک تا سه ماه، سه تا شش ماه، تاریخ مشخصی ندارم"),
  );

  const onSubmit = (formData: FormData) =>
    start(async () => {
      const res = await submitContactForm(formData);
      if (res.ok) {
        setError(null);
        setSent(true);
        formRef.current?.reset();
      } else {
        setError(res.error);
      }
    });

  if (sent) {
    return (
      <div className="cform cform--done" role="status">
        <p className="cform-done-title">
          {pick(t, "contact.form.doneTitle", "پیام‌تان رسید.")}
        </p>
        <p className="cform-done-hint">
          {pick(
            t,
            "contact.form.doneHint",
            "معمولاً تا یک روز کاری جواب می‌دهیم. اگر عجله دارید، همان شماره‌ی بالا سریع‌ترین راه است.",
          )}
        </p>
      </div>
    );
  }

  return (
    <form className="cform" ref={formRef} action={onSubmit}>
      <h2 className="cform-title">
        {title || pick(t, "contact.form.title", "پروژه‌ای در ذهن دارید؟")}
      </h2>
      <p className="cform-note">
        {note ||
          pick(
            t,
            "contact.form.note",
            "فرم را پر کنید؛ هرچه درباره‌ی پروژه بنویسید، جواب اول‌مان دقیق‌تر خواهد بود.",
          )}
      </p>

      <div className="cform-field">
        <label className="cform-label" htmlFor="cf-name">
          {pick(t, "contact.form.name", "شما را چه صدا کنیم؟")}
        </label>
        <input
          id="cf-name"
          name="name"
          className="cform-input"
          maxLength={80}
          required
          autoComplete="name"
          placeholder={pick(t, "contact.form.namePlaceholder", "نام‌تان را بنویسید")}
        />
      </div>

      <div className="cform-field">
        <label className="cform-label" htmlFor="cf-contact">
          {pick(t, "contact.form.contact", "کجا جواب‌تان را بفرستیم؟")}
        </label>
        {/* type=text, not email — the field also takes a phone number, and
            type=email would reject one outright. dir=ltr so a Latin address
            and an ASCII phone number both read the way they were typed. */}
        <input
          id="cf-contact"
          name="contact"
          className="cform-input"
          dir="ltr"
          type="text"
          maxLength={200}
          required
          spellCheck={false}
          autoComplete="email"
          placeholder={pick(t, "contact.placeholder", "you@company.com")}
        />
      </div>

      <fieldset className="cform-field cform-choice">
        <legend className="cform-label">
          {pick(t, "contact.form.referrer", "چطور ما را پیدا کردید؟")}
          <span className="cform-optional">{pick(t, "contact.form.optional", "اختیاری")}</span>
        </legend>

        <div className="cform-chips">
          {referrers.map((name) => (
            <label className="cform-chip" key={name} data-on={referrer === name ? "" : undefined}>
              <input
                type="radio"
                name="referrer"
                value={name}
                checked={referrer === name}
                onChange={() => setReferrer(name)}
              />
              {name}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Tick-boxes rather than a multi-select: the whole list is short enough
          to read at a glance, and reading it is half the point — it says what
          the studio does. The names come from the same table the services
          pages are built from. */}
      {services.length > 0 && (
        <fieldset className="cform-field cform-choice">
          <legend className="cform-label">
            {pick(t, "contact.form.services", "به کدام خدمت‌ها نیاز دارید؟")}
            <span className="cform-optional">{pick(t, "contact.form.optional", "اختیاری")}</span>
          </legend>

          <div className="cform-chips">
            {services.map((name) => (
              <label className="cform-chip" key={name} data-on={picked.includes(name) ? "" : undefined}>
                <input
                  type="checkbox"
                  name="services"
                  value={name}
                  checked={picked.includes(name)}
                  onChange={() => toggle(name)}
                />
                {name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="cform-row">
        <div className="cform-field">
          <label className="cform-label" htmlFor="cf-budget">
            {pick(t, "contact.form.budget", "بودجه‌ی پروژه چقدر است؟")}
            <span className="cform-optional">{pick(t, "contact.form.optional", "اختیاری")}</span>
          </label>
          <select id="cf-budget" name="budget" className="cform-input cform-select" defaultValue="">
            <option value="">{pick(t, "contact.form.choose", "انتخاب کنید")}</option>
            {budgets.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div className="cform-field">
          <label className="cform-label" htmlFor="cf-timeline">
            {pick(t, "contact.form.timeline", "چه زمانی باید تحویل شود؟")}
            <span className="cform-optional">{pick(t, "contact.form.optional", "اختیاری")}</span>
          </label>
          <select id="cf-timeline" name="timeline" className="cform-input cform-select" defaultValue="">
            <option value="">{pick(t, "contact.form.choose", "انتخاب کنید")}</option>
            {timelines.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="cform-field">
        <label className="cform-label" htmlFor="cf-subject">
          {pick(t, "contact.form.subject", "موضوع")}
          <span className="cform-optional">{pick(t, "contact.form.optional", "اختیاری")}</span>
        </label>
        <input
          id="cf-subject"
          name="subject"
          className="cform-input"
          maxLength={120}
          defaultValue={subject}
          placeholder={pick(t, "contact.form.subjectHint", "مثلاً: هویت بصری برای یک کافه")}
        />
      </div>

      <div className="cform-field">
        <label className="cform-label" htmlFor="cf-message">
          {pick(t, "contact.form.message", "از پروژه‌تان بگویید")}
        </label>
        <textarea
          id="cf-message"
          name="message"
          className="cform-input cform-textarea"
          rows={6}
          maxLength={4000}
          required
          placeholder={pick(t, "contact.form.messagePlaceholder", "چه چیزی می‌سازید؟")}
        />
      </div>

      {/* Honeypot — hidden from people, irresistible to bots */}
      <div className="cform-trap" aria-hidden="true">
        <label htmlFor="cf-website">وب‌سایت</label>
        <input id="cf-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {error && (
        <p className="cform-error" role="alert">
          {error}
        </p>
      )}

      <button className="cform-submit" type="submit" disabled={pending}>
        {pending
          ? pick(t, "contact.form.sending", "در حال ارسال…")
          : pick(t, "contact.form.submit", "ارسال پیام")}
      </button>
    </form>
  );
}

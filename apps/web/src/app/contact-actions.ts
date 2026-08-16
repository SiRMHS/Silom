"use server";

import { headers } from "next/headers";
import { db } from "@rahyad/db";

/**
 * Stores a contact submission for the admin inbox.
 *
 * Two forms land here: the footer's single field, which only asks for an
 * address to reply to, and the /contact page's brief, which asks for a name and
 * a message as well. Both are public endpoints — anyone can POST to them — so
 * neither trusts the form's own client-side check: shape is validated, lengths
 * are capped, and writes are rate-limited per address.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?\d{10,15}$/;
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 3;

const MAX_CONTACT = 200;
const MAX_NAME = 80;
const MAX_SUBJECT = 120;
const MAX_MESSAGE = 4000;
const MIN_MESSAGE = 10;
const MAX_PHONE = 40;
const MAX_REFERRER = 120;
const MAX_CHOICE = 60;
const MAX_SERVICES = 20;

/** Persian (۰-۹) and Arabic-Indic (٠-٩) digits → ASCII */
const toLatinDigits = (s: string) =>
  s.replace(/[۰-۹٠-٩]/g, (d) => {
    const c = d.charCodeAt(0);
    return String(c >= 0x06f0 ? c - 0x06f0 : c - 0x0660);
  });

function isReachable(raw: string) {
  if (EMAIL_RE.test(raw)) return true;
  return PHONE_RE.test(toLatinDigits(raw).replace(/[\s()\-.]/g, ""));
}

const field = (formData: FormData, name: string, max: number) =>
  String(formData.get(name) ?? "")
    .trim()
    .slice(0, max);

/**
 * Cheap flood guard: one address can't fill the inbox in a loop.
 *
 * Deliberately reports success to the caller — telling a flooder that they were
 * throttled only tells them what to change.
 */
async function isFlooding(contact: string) {
  const recent = await db.contactMessage.count({
    where: { contact, createdAt: { gt: new Date(Date.now() - WINDOW_MS) } },
  });
  return recent >= MAX_PER_WINDOW;
}

const shortUa = async () => (await headers()).get("user-agent")?.slice(0, 300) ?? null;

/** The footer field: an address and nothing else. */
export async function submitContact(contact: string) {
  const value = contact.trim().slice(0, MAX_CONTACT);
  if (!isReachable(value)) return { ok: false as const };
  if (await isFlooding(value)) return { ok: true as const };

  await db.contactMessage.create({
    data: { contact: value, source: "FOOTER", userAgent: await shortUa() },
  });

  return { ok: true as const };
}

export type ContactFormResult = { ok: true } | { ok: false; error: string };

/**
 * The /contact page's form.
 *
 * Errors come back as Persian text the form shows inline rather than as codes,
 * matching how the comment form on the magazine reports itself.
 */
export async function submitContactForm(formData: FormData): Promise<ContactFormResult> {
  // Bots fill every field they find; a human never sees this one.
  if (field(formData, "website", 100)) return { ok: true };

  const name = field(formData, "name", MAX_NAME);
  const contact = field(formData, "contact", MAX_CONTACT);
  const subject = field(formData, "subject", MAX_SUBJECT);
  const message = field(formData, "message", MAX_MESSAGE);

  if (!name) return { ok: false, error: "نام‌تان را بنویسید" };
  if (!isReachable(contact)) return { ok: false, error: "ایمیل یا شماره‌ی موبایل معتبر نیست" };
  if (message.length < MIN_MESSAGE) return { ok: false, error: "کمی بیشتر درباره‌ی پروژه بنویسید" };

  if (await isFlooding(contact)) return { ok: true };

  // The rest of the brief is optional by design: someone who only wants to say
  // hello should not have to price their project first. Every value is capped
  // and stored as text — these are answers, not identifiers, and nothing here
  // is matched against a list on the way in.
  const services = formData
    .getAll("services")
    .map((v) => String(v).trim().slice(0, MAX_CHOICE))
    .filter(Boolean)
    .slice(0, MAX_SERVICES);

  await db.contactMessage.create({
    data: {
      name,
      contact,
      phone: field(formData, "phone", MAX_PHONE),
      subject,
      message,
      referrer: field(formData, "referrer", MAX_REFERRER),
      services,
      budget: field(formData, "budget", MAX_CHOICE),
      timeline: field(formData, "timeline", MAX_CHOICE),
      source: "PAGE",
      userAgent: await shortUa(),
    },
  });

  return { ok: true };
}

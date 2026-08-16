"use client";

import { useTransition } from "react";
import { deleteMessage, markMessageRead } from "@/app/admin/(panel)/inbox-actions";
import Toast, { useToast } from "./Toast";

export type Message = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  subject: string;
  message: string;
  referrer: string;
  services: string[];
  budget: string;
  timeline: string;
  /** Which form it came from — the footer field or the contact page. */
  source: "FOOTER" | "PAGE";
  isRead: boolean;
  createdAt: string;
};

const SOURCE_LABEL: Record<Message["source"], string> = {
  FOOTER: "پایین صفحه‌ی اصلی",
  PAGE: "صفحه‌ی تماس با ما",
};

/** Makes the address clickable to reply to — an email opens mail, a number dials. */
function replyHref(contact: string) {
  if (contact.includes("@")) return `mailto:${contact}`;
  const digits = contact
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : undefined;
}

export default function MessageList({ messages }: { messages: Message[] }) {
  const { toast, show } = useToast();
  const [pending, start] = useTransition();

  return (
    <>
      <div className="ad-head">
        <div>
          <h1>پیام‌ها</h1>
          <p>
            هرچه از فرم پایین صفحه‌ی اصلی و فرم صفحه‌ی «تماس با ما» فرستاده شده — هر دو در همین
            فهرست.
          </p>
        </div>
      </div>

      {messages.length === 0 ? (
        <p className="ad-empty">هنوز پیامی نیامده است.</p>
      ) : (
        <ul className="ad-msg-list">
          {messages.map((m) => {
            const href = replyHref(m.contact);
            return (
              <li className="ad-msg" key={m.id} data-unread={m.isRead ? undefined : ""}>
                <div className="ad-msg-head">
                  <div className="ad-msg-who">
                    {m.name && <span className="ad-msg-name">{m.name}</span>}
                    {href ? (
                      <a className="ad-msg-contact" dir="ltr" href={href}>
                        {m.contact}
                      </a>
                    ) : (
                      <span className="ad-msg-contact" dir="ltr">
                        {m.contact}
                      </span>
                    )}
                  </div>

                  <div className="ad-item-tools">
                    <button
                      type="button"
                      className="ad-btn ad-btn--sm"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          await markMessageRead(m.id, !m.isRead);
                          show(m.isRead ? "نخوانده شد" : "خوانده شد");
                        })
                      }
                    >
                      {m.isRead ? "نخوانده" : "خوانده شد"}
                    </button>
                    <button
                      type="button"
                      className="ad-btn ad-btn--sm ad-btn--danger"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          await deleteMessage(m.id);
                          show("حذف شد");
                        })
                      }
                    >
                      حذف
                    </button>
                  </div>
                </div>

                <div className="ad-msg-meta">
                  {m.isRead ? (
                    <span className="ad-badge ad-badge--off">خوانده‌شده</span>
                  ) : (
                    <span className="ad-badge ad-badge--ok">تازه</span>
                  )}
                  <span>{SOURCE_LABEL[m.source]}</span>
                  <span aria-hidden="true">•</span>
                  <span>{m.createdAt}</span>
                </div>

                {m.subject && <p className="ad-msg-subject">{m.subject}</p>}
                {/* Plain text, rendered as text — a message is never HTML */}
                {m.message && <p className="ad-msg-body">{m.message}</p>}

                {/* The rest of the brief. Every line is optional on the form,
                    so each is left out here rather than printed empty. */}
                {(m.phone || m.referrer || m.budget || m.timeline || m.services.length > 0) && (
                  <dl className="ad-msg-brief">
                    {m.phone && (
                      <div>
                        <dt>شماره</dt>
                        <dd dir="ltr">
                          <a href={`tel:${m.phone.replace(/[^\d+]/g, "")}`}>{m.phone}</a>
                        </dd>
                      </div>
                    )}
                    {m.services.length > 0 && (
                      <div>
                        <dt>خدمات</dt>
                        <dd>{m.services.join("، ")}</dd>
                      </div>
                    )}
                    {m.budget && (
                      <div>
                        <dt>بودجه</dt>
                        <dd>{m.budget}</dd>
                      </div>
                    )}
                    {m.timeline && (
                      <div>
                        <dt>زمان تحویل</dt>
                        <dd>{m.timeline}</dd>
                      </div>
                    )}
                    {m.referrer && (
                      <div>
                        <dt>از کجا ما را شناخت</dt>
                        <dd>{m.referrer}</dd>
                      </div>
                    )}
                  </dl>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Toast toast={toast} />
    </>
  );
}

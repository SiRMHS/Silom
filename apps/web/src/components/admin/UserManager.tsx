"use client";

import { useActionState, useState, useTransition } from "react";
import {
  createUser,
  deleteUser,
  resetPassword,
  setUserActive,
  updateUser,
  type UserFormState,
} from "@/app/admin/(panel)/user-actions";
import Toast, { useToast } from "./Toast";

export type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
};

const ROLE_LABEL: Record<string, string> = { ADMIN: "مدیر", CLIENT: "مشتری" };

export default function UserManager({ users, meId }: { users: UserRow[]; meId: string }) {
  const { toast, show } = useToast();
  const [state, action, creating] = useActionState<UserFormState, FormData>(createUser, undefined);
  const [pending, start] = useTransition();
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [editFor, setEditFor] = useState<string | null>(null);

  return (
    <>
      <div className="ad-head">
        <div>
          <h1>کاربران</h1>
          <p>
            نقش «مدیر» به پنل محتوا دسترسی دارد. نقش «مشتری» فعلاً جایی برای ورود ندارد و برای پنل
            مشتریان در آینده نگه داشته شده است.
          </p>
        </div>
      </div>

      <div className="ad-card">
        <h2>افزودن کاربر</h2>
        <p>رمز عبور را بعداً خودتان به کاربر بدهید؛ اینجا فقط هش ذخیره می‌شود.</p>

        {state?.error && <div className="ad-note ad-note--error">{state.error}</div>}
        {state?.ok && <div className="ad-note ad-note--ok">{state.ok}</div>}

        <form action={action}>
          <div className="ad-fields" style={{ marginTop: 14 }}>
            <div className="ad-field" data-span="half">
              <label className="ad-label" htmlFor="new-name">
                نام
              </label>
              <input id="new-name" name="name" className="ad-input" required />
            </div>
            <div className="ad-field" data-span="half">
              <label className="ad-label" htmlFor="new-email">
                ایمیل
              </label>
              <input id="new-email" name="email" type="email" dir="ltr" className="ad-input is-ltr" required />
            </div>
            <div className="ad-field" data-span="half">
              <label className="ad-label" htmlFor="new-password">
                رمز عبور
              </label>
              <input
                id="new-password"
                name="password"
                type="text"
                dir="ltr"
                className="ad-input is-ltr"
                minLength={8}
                required
              />
              <span className="ad-hint">دست‌کم ۸ نویسه</span>
            </div>
            <div className="ad-field" data-span="third">
              <label className="ad-label" htmlFor="new-role">
                نقش
              </label>
              <select id="new-role" name="role" className="ad-select" defaultValue="CLIENT">
                <option value="CLIENT">مشتری</option>
                <option value="ADMIN">مدیر</option>
              </select>
            </div>
          </div>

          <button className="ad-btn ad-btn--primary" type="submit" disabled={creating} style={{ marginTop: 16 }}>
            {creating ? "…" : "ساخت کاربر"}
          </button>
        </form>
      </div>

      <div className="ad-table-wrap" style={{ marginTop: 20 }}>
        <table className="ad-table">
          <thead>
            <tr>
              <th>نام</th>
              <th>ایمیل</th>
              <th>نقش</th>
              <th>آخرین ورود</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  {u.name}
                  {u.id === meId && <span className="ad-badge" style={{ marginInlineStart: 8 }}>شما</span>}
                  {!u.isActive && (
                    <span className="ad-badge ad-badge--off" style={{ marginInlineStart: 8 }}>
                      غیرفعال
                    </span>
                  )}
                </td>
                <td dir="ltr" style={{ textAlign: "right" }}>
                  {u.email}
                </td>
                <td>{ROLE_LABEL[u.role] ?? u.role}</td>
                <td>{u.lastLoginAt ?? "—"}</td>
                <td>
                  <div className="ad-item-tools">
                    <button
                      type="button"
                      className="ad-btn ad-btn--sm"
                      onClick={() => {
                        setEditFor(editFor === u.id ? null : u.id);
                        setResetFor(null);
                      }}
                    >
                      ویرایش
                    </button>

                    <button
                      type="button"
                      className="ad-btn ad-btn--sm"
                      onClick={() => {
                        setResetFor(resetFor === u.id ? null : u.id);
                        setEditFor(null);
                      }}
                    >
                      رمز تازه
                    </button>

                    {u.id !== meId && (
                      <>
                        <button
                          type="button"
                          className="ad-btn ad-btn--sm"
                          disabled={pending}
                          onClick={() =>
                            start(async () => {
                              const res = await setUserActive(u.id, !u.isActive);
                              show(res.ok ? "به‌روزرسانی شد" : res.error, !res.ok);
                            })
                          }
                        >
                          {u.isActive ? "غیرفعال" : "فعال"}
                        </button>
                        <button
                          type="button"
                          className="ad-btn ad-btn--sm ad-btn--danger"
                          disabled={pending}
                          onClick={() =>
                            start(async () => {
                              const res = await deleteUser(u.id);
                              show(res.ok ? "کاربر حذف شد" : res.error, !res.ok);
                            })
                          }
                        >
                          حذف
                        </button>
                      </>
                    )}
                  </div>

                  {editFor === u.id && (
                    <form
                      style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}
                      action={(fd) =>
                        start(async () => {
                          const res = await updateUser(undefined, fd);
                          show(res?.error ?? res?.ok ?? "", Boolean(res?.error));
                          if (!res?.error) setEditFor(null);
                        })
                      }
                    >
                      <input type="hidden" name="id" value={u.id} />
                      <input
                        name="name"
                        className="ad-input"
                        placeholder="نام"
                        defaultValue={u.name}
                        minLength={2}
                        required
                      />
                      <input
                        name="email"
                        type="email"
                        className="ad-input is-ltr"
                        dir="ltr"
                        placeholder="ایمیل"
                        defaultValue={u.email}
                        autoComplete="off"
                        required
                      />
                      <button className="ad-btn ad-btn--sm ad-btn--primary" type="submit" disabled={pending}>
                        ثبت
                      </button>
                    </form>
                  )}

                  {resetFor === u.id && (
                    <form
                      style={{ display: "flex", gap: 8, marginTop: 10 }}
                      action={(fd) =>
                        start(async () => {
                          const res = await resetPassword(u.id, String(fd.get("password") ?? ""));
                          show(res.ok ? "رمز عوض شد" : res.error, !res.ok);
                          if (res.ok) setResetFor(null);
                        })
                      }
                    >
                      <input
                        name="password"
                        className="ad-input is-ltr"
                        dir="ltr"
                        placeholder="رمز تازه"
                        minLength={8}
                        required
                      />
                      <button className="ad-btn ad-btn--sm ad-btn--primary" type="submit" disabled={pending}>
                        ثبت
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Toast toast={toast} />
    </>
  );
}

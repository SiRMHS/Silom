"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/admin/auth-actions";

export default function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined);

  return (
    <form className="ad-login-box" action={action}>
      <h1>پنل مدیریت</h1>
      <p>برای ویرایش محتوای سایت وارد شوید.</p>

      {notice && <div className="ad-note ad-note--error">{notice}</div>}
      {state?.error && (
        <div className="ad-note ad-note--error" role="alert">
          {state.error}
        </div>
      )}

      <input type="hidden" name="next" value={next} />

      <div className="ad-field">
        <label htmlFor="email">ایمیل</label>
        <input
          id="email"
          name="email"
          type="email"
          dir="ltr"
          className="ad-input"
          autoComplete="username"
          required
          autoFocus
        />
      </div>

      <div className="ad-field">
        <label htmlFor="password">رمز عبور</label>
        <input
          id="password"
          name="password"
          type="password"
          dir="ltr"
          className="ad-input"
          autoComplete="current-password"
          required
        />
      </div>

      <button className="ad-btn ad-btn--primary" type="submit" disabled={pending}>
        {pending ? "در حال ورود…" : "ورود"}
      </button>
    </form>
  );
}

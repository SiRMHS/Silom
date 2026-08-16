"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ToastState = { id: number; message: string; isError: boolean } | null;

/** Transient save confirmation. One at a time; the newest replaces the last. */
export function useToast(timeout = 2600) {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (message: string, isError = false) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ id: Date.now(), message, isError });
      timer.current = setTimeout(() => setToast(null), timeout);
    },
    [timeout],
  );

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  return { toast, show };
}

export default function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  return (
    <div
      key={toast.id}
      className={`ad-toast${toast.isError ? " ad-toast--error" : ""}`}
      role="status"
      aria-live="polite"
    >
      {toast.message}
    </div>
  );
}

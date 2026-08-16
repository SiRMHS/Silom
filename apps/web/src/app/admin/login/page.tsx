import LoginForm from "./login-form";

const NOTICES: Record<string, string> = {
  forbidden: "این حساب دسترسی به پنل مدیریت ندارد.",
  expired: "نشست شما منقضی شده است؛ دوباره وارد شوید.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  // Only ever bounce back into the panel — an open redirect here would be a
  // free phishing hop off the brand's own domain.
  const safeNext = next && next.startsWith("/admin") ? next : "/admin";

  return (
    <div className="ad-login">
      <LoginForm next={safeNext} notice={error ? NOTICES[error] : undefined} />
    </div>
  );
}

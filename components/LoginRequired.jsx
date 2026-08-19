import Link from "next/link";

export default function LoginRequired({
  title = "Log in first",
  message = "Your playlists are private. Create an account or log in to unlock them.",
}) {
  return (
    <div className="empty-state login-required">
      <div className="empty-icon" aria-hidden>
        ▦
      </div>
      <h2>{title}</h2>
      <p>{message}</p>
      <div className="login-required-actions">
        <Link href="/login" className="btn btn-primary">
          Log in →
        </Link>
        <Link href="/register" className="btn">
          Create account
        </Link>
      </div>
    </div>
  );
}
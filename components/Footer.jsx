export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <span className="footer-brand">TrackTube ▓</span>
        <span className="footer-links">
          <a href="/about">About</a>
          <a href="https://github.com/Sayantan-B-dev" target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
        </span>
        <span className="footer-copy">© {new Date().getFullYear()} TrackTube</span>
      </div>
    </footer>
  );
}
import "./globals.css";

export const metadata = {
  title: "Playlist Tracker",
  description: "Select videos and track total watch time",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
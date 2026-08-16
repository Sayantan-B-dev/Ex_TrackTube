export const metadata = {
  title: "TrackTube",
  description: "Track your progress across any YouTube playlist",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
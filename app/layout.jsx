import "./globals.css";
import { DEFAULT_THEME, THEME_STORAGE_KEY } from "../lib/themes";
import Providers from "./providers";

export const metadata = {
  title: "TrackTube",
  description: "Track your progress across any YouTube playlist",
  icons: {
    icon: "/images/logo.svg",
  },
};

export default function RootLayout({ children }) {
  const themeInit = `
    try {
      var t = localStorage.getItem("${THEME_STORAGE_KEY}") || "${DEFAULT_THEME}";
      document.documentElement.dataset.theme = t;
    } catch (e) {}
  `;
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
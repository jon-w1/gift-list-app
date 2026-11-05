import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Gift Lists", template: "%s · Gift Lists" },
  description: "Wishlists, gift ideas and suggestions for family & friends — without spoiling the surprise.",
  applicationName: "Gift Lists",
  appleWebApp: { capable: true, title: "Gift Lists", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#161311" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <div className="mx-auto min-h-dvh max-w-xl">{children}</div>
      </body>
    </html>
  );
}

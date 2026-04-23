import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Elementum Translator",
  description:
    "Translates customer source-of-record platforms into grounded mock environments for SE demos. Each translation is grounded in what the real platform can actually do.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}

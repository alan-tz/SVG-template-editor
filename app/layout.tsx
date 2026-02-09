import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SVG Template Editor",
  description: "Edit SVG templates and replace image placeholders.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

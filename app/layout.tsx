import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SVG Template Editor",
  description: "Edit SVG templates and replace image placeholders.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

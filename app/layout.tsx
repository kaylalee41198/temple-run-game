import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Temple Run - Endless Runner",
  description: "A Temple Run-style endless runner game built with Next.js",
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
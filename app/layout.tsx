import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Temple Run — Endless Runner",
  description: "Dodge obstacles, collect coins, and run forever in this endless temple chase!",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

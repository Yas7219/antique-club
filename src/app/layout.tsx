import type { Metadata } from "next";
import "../index.css";

export const metadata: Metadata = {
  title: "Vintage Voyage Vault",
  description: "A curated marketplace for timeless treasures.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

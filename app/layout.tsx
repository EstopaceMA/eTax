import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "eTax",
  description: "A guided tax compliance workspace for Filipino taxpayers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

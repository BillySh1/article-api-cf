import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Web3.bio Articles API",
  description: "Convert ENS Domain's RSS & RSS URL to JSON format",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

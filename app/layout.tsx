import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Web3.bio Article API",
  description: "Web3.bio Article API aggregates articles from ENS contenthash, Mirror, and Paragraph.",
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

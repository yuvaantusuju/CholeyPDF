import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kindleify Webtoon | High Quality Kindle PDF Converter",
  description: "Convert webtoons and manhwa PDFs/ZIPs to perfectly fitted Kindle PDFs directly in your browser.",
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
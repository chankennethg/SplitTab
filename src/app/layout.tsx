import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SplitTab — Split bills with friends",
  description: "Easily split bills and track who owes what.",
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

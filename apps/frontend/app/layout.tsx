import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Setmeow — thoughtful work, together",
  description: "A calmer workspace for teams to plan, move, and make progress.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

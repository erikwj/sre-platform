import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SRE Platform - Incident Management & Postmortems",
  description: "AI-powered incident management, postmortems, and service runbooks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

// Metadata for SEO and browser tab title
export const metadata: Metadata = {
  title: "Network Inspector & Discovery",
  description: "A clean Next.js starter template for network IP inspection and mapping",
};

/**
 * Root Layout Component:
 * Wraps all pages in the application.
 * You can add global headers, navbars, or themes here.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}

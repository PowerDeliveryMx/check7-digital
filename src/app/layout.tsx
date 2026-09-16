import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Check 7 · Power Delivery",
  description: "Formulario digital del Check 7 de Power Delivery",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      {/* eslint-disable @next/next/no-page-custom-font, @next/next/no-css-tags --
          intencional: mismos <link> del bosquejo, un solo font-family en toda la app. */}
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/check7.css" />
      </head>
      {/* eslint-enable @next/next/no-page-custom-font, @next/next/no-css-tags */}
      <body>{children}</body>
    </html>
  );
}

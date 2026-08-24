import type { Metadata } from "next";
import { Roboto, Roboto_Condensed } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  variable: "--font-roboto",
  display: "swap",
});

const robotoCondensed = Roboto_Condensed({
  subsets: ["latin"],
  variable: "--font-roboto-condensed",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BuzzBot",
  description: "Georgia Tech student information with official sources.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${roboto.variable} ${robotoCondensed.variable}`}>{children}</body>
    </html>
  );
}

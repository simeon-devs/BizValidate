import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { DM_Serif_Display, Syne, DM_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif-display",
  subsets: ["latin"],
  weight: "400",
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "BizValidate",
  description: "Understand what you're building — before you build it.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#e8ff47",
          colorBackground: "#0a0a0a",
          colorForeground: "#f0f0f0",
        },
      }}
    >
      <html
        lang="en"
        className={cn(
          "h-full antialiased dark",
          dmSerifDisplay.variable,
          syne.variable,
          dmMono.variable,
        )}
      >
        <body className="flex min-h-screen flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}

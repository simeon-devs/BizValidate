import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { DM_Serif_Display, Syne, DM_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { cn } from "@/lib/utils";
import { env } from "@/lib/env";

// Dev-only, runs before Next's runtime: browser extensions (MetaMask etc.)
// inject scripts that throw during page load, and the dev overlay reports
// them as if they were ours. Registering capture-phase filters first wins
// the listener race and keeps extension noise out of the overlay.
const EXTENSION_ERROR_SHIELD = `
(function () {
  function fromExtension(s) {
    return typeof s === "string" && (
      s.indexOf("chrome-extension://") !== -1 ||
      s.indexOf("moz-extension://") !== -1 ||
      s.indexOf("safari-web-extension://") !== -1
    );
  }
  window.addEventListener("error", function (event) {
    var stack = event.error && event.error.stack;
    if (fromExtension(event.filename) || fromExtension(stack)) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);
  window.addEventListener("unhandledrejection", function (event) {
    var reason = event.reason;
    var stack = reason && reason.stack;
    var message = (reason && reason.message) || "";
    if (fromExtension(stack) || message.indexOf("MetaMask") !== -1) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);
})();
`;

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
        <body className="flex min-h-screen flex-col">
          {env.NODE_ENV === "development" ? (
            <Script id="extension-error-shield" strategy="beforeInteractive">
              {EXTENSION_ERROR_SHIELD}
            </Script>
          ) : null}
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

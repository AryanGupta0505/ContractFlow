import type { Metadata } from "next";

import "./globals.css";

import { AppSessionProvider } from "@/components/providers/session-provider";

export const metadata: Metadata = {
  title: "ContractFlow",
  description: "Automate contracts, approvals, and signatures with clarity.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="bg-[var(--background)] text-[var(--foreground)] antialiased">
        <AppSessionProvider>{children}</AppSessionProvider>
      </body>
    </html>
  );
}

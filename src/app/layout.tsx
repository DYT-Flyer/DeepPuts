import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { DisclaimerFooter } from "@/components/layout/disclaimer-footer";
import { KeyboardShortcuts } from "@/components/layout/keyboard-shortcuts";
import { OnboardingModal } from "@/components/onboarding-modal";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DeepPuts — Shorting Intelligence",
  description: "AI-powered dashboard for identifying shorting opportunities",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>
          <KeyboardShortcuts />
          <OnboardingModal />
          {children}
          <DisclaimerFooter />
        </Providers>
      </body>
    </html>
  );
}

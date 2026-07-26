import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";
import { DisclaimerFooter } from "@/components/layout/disclaimer-footer";
import { KeyboardShortcuts } from "@/components/layout/keyboard-shortcuts";
import { OnboardingModal } from "@/components/onboarding-modal";
import { TrafficTracker } from "@/components/traffic-tracker";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DeepPuts — Shorting Intelligence",
  description: "AI-powered dashboard for identifying shorting opportunities",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value || "dark";

  return (
    <html lang="en" className={theme} suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          <KeyboardShortcuts />
          <OnboardingModal />
          <TrafficTracker />
          {children}
          <DisclaimerFooter />
        </Providers>
      </body>
    </html>
  );
}

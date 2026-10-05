import type { Metadata } from "next";
import { AppProviders } from "./providers";
import "./globals.css";

export const metadata: Metadata = { title: "TradeBridge | Escrow Console", description: "Solana devnet escrow management console" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className="dark" suppressHydrationWarning><body className="min-h-screen antialiased transition-colors duration-200" suppressHydrationWarning><AppProviders>{children}</AppProviders></body></html>;
}

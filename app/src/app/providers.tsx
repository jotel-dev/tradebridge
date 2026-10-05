"use client";
import { useMemo, type ReactNode } from "react";
import { ThemeProvider } from "./theme";
import { ActivityProvider } from "./activity-context";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";

export function AppProviders({ children }: { children: ReactNode }) {
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);
  return <ThemeProvider><ActivityProvider><ConnectionProvider endpoint="https://api.devnet.solana.com"><WalletProvider wallets={wallets} autoConnect><WalletModalProvider>{children}</WalletModalProvider></WalletProvider></ConnectionProvider></ActivityProvider></ThemeProvider>;
}



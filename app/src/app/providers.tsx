"use client";

import { useMemo, useEffect, type ReactNode } from "react";
import { ThemeProvider } from "./theme";
import { ActivityProvider } from "./activity-context";
import {
  ConnectionProvider,
  WalletProvider,
  WalletContext,
  useWallet,
} from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";

const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";

/**
 * Explicitly restrict supported wallets to Phantom and Solflare.
 * By intercepting WalletContext, we filter out all other wallet-standard wallets
 * (such as MetaMask) that would otherwise be auto-listed by the adapter.
 */
function FilteredWalletProvider({ children }: { children: ReactNode }) {
  const context = useWallet();

  // Filter wallets to strictly Phantom and Solflare
  const filteredWallets = useMemo(() => {
    return context.wallets.filter((wallet) => {
      const name = wallet.adapter.name;
      return name === "Phantom" || name === "Solflare";
    });
  }, [context.wallets]);

  // If an unsupported wallet somehow attempts to connect, disconnect it
  useEffect(() => {
    if (
      context.wallet &&
      context.wallet.adapter.name !== "Phantom" &&
      context.wallet.adapter.name !== "Solflare"
    ) {
      context.disconnect().catch(console.error);
    }
  }, [context.wallet, context.disconnect]);

  const filteredContext = useMemo(
    () => ({
      ...context,
      wallets: filteredWallets,
    }),
    [context, filteredWallets]
  );

  return (
    <WalletContext.Provider value={filteredContext}>
      {children}
    </WalletContext.Provider>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ThemeProvider>
      <ActivityProvider>
        <ConnectionProvider endpoint={RPC_ENDPOINT}>
          <WalletProvider wallets={wallets} autoConnect>
            <FilteredWalletProvider>
              <WalletModalProvider>{children}</WalletModalProvider>
            </FilteredWalletProvider>
          </WalletProvider>
        </ConnectionProvider>
      </ActivityProvider>
    </ThemeProvider>
  );
}

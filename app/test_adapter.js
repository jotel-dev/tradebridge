const { PhantomWalletAdapter, SolflareWalletAdapter } = require('@solana/wallet-adapter-wallets');
const phantom = new PhantomWalletAdapter();
const solflare = new SolflareWalletAdapter();
console.log('Phantom and Solflare created successfully on server!', phantom.name, solflare.name);

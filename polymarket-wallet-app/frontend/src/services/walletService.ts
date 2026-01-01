import type { Eip1193Provider } from "ethers";

export type WalletType = "metamask" | "phantom";

export type WalletMeta = {
  type: WalletType;
  label: string;
  installUrl: string;
};

export type WalletOption = WalletMeta & {
  available: boolean;
};

export const WALLET_STORAGE_KEY = "polymarket_wallet_type";

export const WALLET_META: Record<WalletType, WalletMeta> = {
  metamask: {
    type: "metamask",
    label: "MetaMask",
    installUrl: "https://metamask.io/download/"
  },
  phantom: {
    type: "phantom",
    label: "Phantom",
    installUrl: "https://phantom.app/download"
  }
};

const getMetamaskProvider = (): Eip1193Provider | null => {
  if (window.ethereum?.isMetaMask) {
    return window.ethereum;
  }
  return null;
};

const getPhantomProvider = (): Eip1193Provider | null => {
  if (window.phantom?.ethereum?.isPhantom) {
    return window.phantom.ethereum;
  }
  return null;
};

export const getWalletProvider = (type: WalletType): Eip1193Provider | null => {
  if (type === "metamask") {
    return getMetamaskProvider();
  }
  return getPhantomProvider();
};

export const detectWallets = (): WalletType[] => {
  if (typeof window === "undefined") {
    return [];
  }
  const wallets: WalletType[] = [];
  if (getMetamaskProvider()) {
    wallets.push("metamask");
  }
  if (getPhantomProvider()) {
    wallets.push("phantom");
  }
  return wallets;
};

export const getWalletMeta = (type: WalletType): WalletMeta => WALLET_META[type];

export const buildWalletOptions = (available: WalletType[]): WalletOption[] =>
  (Object.keys(WALLET_META) as WalletType[]).map((type) => ({
    ...WALLET_META[type],
    available: available.includes(type)
  }));

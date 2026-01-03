import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserProvider } from "ethers";
import type { Eip1193Provider } from "ethers";
import {
  WALLET_STORAGE_KEY,
  buildWalletOptions,
  detectWallets,
  getWalletMeta,
  getWalletProvider,
  type WalletOption,
  type WalletType
} from "../services/walletService";

const POLYGON_CHAIN_ID = 137;

type EthereumHandler = (accounts: string[]) => void;

type ChainHandler = (chainId: string) => void;

type ProviderEventHandler = EthereumHandler | ChainHandler;

type EventedProvider = Eip1193Provider & {
  on?: (event: string, handler: ProviderEventHandler) => void;
  removeListener?: (event: string, handler: ProviderEventHandler) => void;
};

const readStoredWallet = (): WalletType | null => {
  if (typeof window === "undefined") {
    return null;
  }
  const value = window.localStorage.getItem(WALLET_STORAGE_KEY);
  if (value === "metamask" || value === "phantom") {
    return value;
  }
  return null;
};

const persistWallet = (walletType: WalletType) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(WALLET_STORAGE_KEY, walletType);
};

export const useWallet = () => {
  const [account, setAccount] = useState<string>("");
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [error, setError] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [availableWallets, setAvailableWallets] = useState<WalletType[]>([]);

  const refreshAvailableWallets = useCallback(() => {
    const detected = detectWallets();
    setAvailableWallets(detected);
    return detected;
  }, []);

  const selectWallet = useCallback(
    (type: WalletType) => {
      setWalletType(type);
      persistWallet(type);
      setError("");
      setAccount("");
      setChainId(null);
      setProvider(null);

      const detected = refreshAvailableWallets();
      if (!detected.includes(type)) {
        setError(`${getWalletMeta(type).label} not detected. Install it to continue.`);
      }
    },
    [refreshAvailableWallets]
  );

  const readAccount = useCallback(async (type: WalletType | null) => {
    if (!type) {
      return;
    }
    const rawProvider = getWalletProvider(type);
    if (!rawProvider) {
      setProvider(null);
      setAccount("");
      setChainId(null);
      return;
    }
    const nextProvider = new BrowserProvider(rawProvider);
    const accounts = (await nextProvider.send("eth_accounts", [])) as string[];
    const network = await nextProvider.getNetwork();
    setProvider(nextProvider);
    setAccount(accounts?.[0] || "");
    setChainId(Number(network.chainId));
  }, []);

  const connect = useCallback(async () => {
    const detected = refreshAvailableWallets();
    const targetWallet = walletType || detected[0] || null;
    if (!targetWallet) {
      setError("No supported wallet detected. Install MetaMask or Phantom.");
      return;
    }
    if (walletType !== targetWallet) {
      setWalletType(targetWallet);
      persistWallet(targetWallet);
    }

    const rawProvider = getWalletProvider(targetWallet);
    if (!rawProvider) {
      setError(`${getWalletMeta(targetWallet).label} not detected. Install it to continue.`);
      return;
    }

    try {
      setIsConnecting(true);
      setError("");
      const nextProvider = new BrowserProvider(rawProvider);
      const accounts = (await nextProvider.send("eth_requestAccounts", [])) as string[];
      const network = await nextProvider.getNetwork();
      console.log("[wallet] connected", {
        wallet: targetWallet,
        account: accounts?.[0] || "",
        chainId: Number(network.chainId)
      });
      setProvider(nextProvider);
      setAccount(accounts?.[0] || "");
      setChainId(Number(network.chainId));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect wallet.";
      setError(message);
    } finally {
      setIsConnecting(false);
    }
  }, [refreshAvailableWallets, walletType]);

  const disconnect = useCallback(() => {
    setAccount("");
    setProvider(null);
    setChainId(null);
    setError("");
  }, []);

  useEffect(() => {
    const detected = refreshAvailableWallets();
    const stored = readStoredWallet();
    const initialWallet = stored || detected[0] || null;
    if (initialWallet) {
      setWalletType(initialWallet);
      if (!detected.includes(initialWallet)) {
        setError(`${getWalletMeta(initialWallet).label} not detected. Install it to continue.`);
      }
    }
  }, [refreshAvailableWallets]);

  useEffect(() => {
    readAccount(walletType);
  }, [readAccount, walletType]);

  useEffect(() => {
    if (!walletType) {
      return;
    }
    const rawProvider = getWalletProvider(walletType) as EventedProvider | null;
    if (!rawProvider) {
      return;
    }
    const handleAccountsChanged: EthereumHandler = (accounts) => {
      setAccount(accounts?.[0] || "");
    };
    const handleChainChanged: ChainHandler = (chainHex) => {
      setChainId(Number(chainHex));
    };
    rawProvider.on?.("accountsChanged", handleAccountsChanged);
    rawProvider.on?.("chainChanged", handleChainChanged);
    return () => {
      rawProvider.removeListener?.("accountsChanged", handleAccountsChanged);
      rawProvider.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [walletType]);

  const isPolygon = chainId === POLYGON_CHAIN_ID;

  const walletOptions: WalletOption[] = useMemo(
    () => buildWalletOptions(availableWallets),
    [availableWallets]
  );

  return {
    account,
    provider,
    chainId,
    isPolygon,
    connect,
    disconnect,
    selectWallet,
    walletType,
    walletOptions,
    error,
    isConnecting
  };
};

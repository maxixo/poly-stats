import type { Eip1193Provider } from "ethers";

type EthereumEventHandler = (...args: unknown[]) => void;

type InjectedProvider = Eip1193Provider & {
  isMetaMask?: boolean;
  isPhantom?: boolean;
  on?: (event: string, handler: EthereumEventHandler) => void;
  removeListener?: (event: string, handler: EthereumEventHandler) => void;
};

declare global {
  interface Window {
    ethereum?: InjectedProvider;
    phantom?: {
      ethereum?: InjectedProvider;
    };
  }
}

export {};
import { Interface, parseUnits } from "ethers";
import type { InterfaceAbi } from "ethers";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const exchangeAbi = require("../abi/polymarketExchange.json") as InterfaceAbi;

export type TradeBuildInput = {
  marketId: string;
  side: "YES" | "NO";
  price: number;
  size: number;
  maxSlippageBps: number;
};

export type TradeTx = {
  to: string;
  data: string;
  value: string;
};

const getEnvNumber = (key: string, fallback: number): number => {
  const value = process.env[key];
  if (value === undefined || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const buildTradeTx = ({ marketId, side, price, size, maxSlippageBps }: TradeBuildInput): TradeTx => {
  const exchange = process.env.POLYMARKET_EXCHANGE;
  if (!exchange) {
    throw new Error("POLYMARKET_EXCHANGE is required");
  }
  const iface = new Interface(exchangeAbi);
  const priceDecimals = getEnvNumber("PRICE_DECIMALS", 6);
  const sizeDecimals = getEnvNumber("SIZE_DECIMALS", 6);

  const sideValue = side === "YES" ? 1 : 0;
  const priceUnits = parseUnits(price.toString(), priceDecimals);
  const sizeUnits = parseUnits(size.toString(), sizeDecimals);
  const data = iface.encodeFunctionData("trade", [
    marketId,
    sideValue,
    priceUnits,
    sizeUnits,
    Math.round(maxSlippageBps)
  ]);

  return {
    to: exchange,
    data,
    value: "0x0"
  };
};

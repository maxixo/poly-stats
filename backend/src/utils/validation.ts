import { z } from "zod";
import { isAddress } from "ethers";

export const addressSchema = z.string().refine((value) => isAddress(value), {
  message: "Invalid address"
});

export const tradeInputSchema = z.object({
  wallet: addressSchema,
  marketId: z.string().min(1),
  side: z.enum(["YES", "NO"]),
  price: z.number().positive(),
  size: z.number().positive(),
  maxSlippageBps: z.number().min(1).max(500).default(50)
});

export const copySubscribeSchema = z.object({
  follower: addressSchema,
  leader: addressSchema,
  riskMultiplier: z.number().min(0.1).max(5).default(1),
  maxSlippageBps: z.number().min(1).max(500).default(50),
  active: z.boolean().optional().default(true)
});

export const copyExecuteSchema = z.object({
  follower: addressSchema,
  leader: addressSchema,
  marketId: z.string().min(1),
  side: z.enum(["YES", "NO"]),
  price: z.number().positive(),
  size: z.number().positive(),
  riskMultiplier: z.number().min(0.1).max(5).default(1),
  maxSlippageBps: z.number().min(1).max(500).default(50)
});

export const normalizeAddress = (value: string): string => value.toLowerCase();

import { z } from "zod";

export const lottoDrawSchema = z.object({
  drawNo: z.number(),
  date: z.string(),
  numbers: z.array(z.number()).length(6),
  bonus: z.number(),
});

export type LottoDraw = z.infer<typeof lottoDrawSchema>;

export const generateRequestSchema = z.object({
  selectedNumbers: z.array(z.number()).max(5).optional(),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;

export const statisticsFilterSchema = z.object({
  year: z.number().optional(),
  month: z.number().min(1).max(12).optional(),
});

export type StatisticsFilter = z.infer<typeof statisticsFilterSchema>;

export interface NumberFrequency {
  number: number;
  count: number;
  percentage: number;
}

export interface PairFrequency {
  pair: [number, number];
  count: number;
}

export interface Statistics {
  totalDraws: number;
  numberFrequencies: NumberFrequency[];
  hotNumbers: NumberFrequency[];
  coldNumbers: NumberFrequency[];
  topPairs: PairFrequency[];
  yearRange: { min: number; max: number };
}

export const users = null;
export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = { id: string; username: string; password: string };

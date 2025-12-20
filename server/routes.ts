import type { Express } from "express";
import { createServer, type Server } from "http";
import fs from "fs";
import path from "path";

import { storage } from "./storage.js";

interface LottoDraw {
  drawNo: number;
  date: string;
  numbers: number[];
  bonus: number;
}

interface NumberFrequency {
  number: number;
  count: number;
  percentage: number;
}

interface PairFrequency {
  pair: [number, number];
  count: number;
}

let lottoData: LottoDraw[] = [];

function loadLottoData() {
  try {
    const dataPath = path.join(process.cwd(), "server/data/lotto-history.json");
    const rawData = fs.readFileSync(dataPath, "utf-8");
    lottoData = JSON.parse(rawData);
    lottoData.sort((a, b) => b.drawNo - a.drawNo);
    console.log(`Loaded ${lottoData.length} lotto draws`);
  } catch (error) {
    console.error("Failed to load lotto data:", error);
    lottoData = [];
  }
}

function generateRandomNumbers(selectedNumbers: number[] = []): number[] {
  const nums = [...selectedNumbers];
  while (nums.length < 6) {
    const n = Math.floor(Math.random() * 45) + 1;
    if (!nums.includes(n)) nums.push(n);
  }
  return nums.sort((a, b) => a - b);
}

function calculateStatistics(draws: LottoDraw[]) {
  const numberCounts = new Map<number, number>();
  for (let i = 1; i <= 45; i++) {
    numberCounts.set(i, 0);
  }

  for (const draw of draws) {
    for (const num of draw.numbers) {
      numberCounts.set(num, (numberCounts.get(num) || 0) + 1);
    }
  }

  const totalDraws = draws.length;
  const maxCount = Math.max(...numberCounts.values());

  const numberFrequencies: NumberFrequency[] = [];
  for (let i = 1; i <= 45; i++) {
    const count = numberCounts.get(i) || 0;
    numberFrequencies.push({
      number: i,
      count,
      percentage: maxCount > 0 ? (count / maxCount) * 100 : 0,
    });
  }

  const hotNumbers = [...numberFrequencies]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const coldNumbers = [...numberFrequencies]
    .sort((a, b) => a.count - b.count)
    .slice(0, 10);

  const pairCounts = new Map<string, number>();
  for (const draw of draws) {
    const nums = draw.numbers.sort((a, b) => a - b);
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        const key = `${nums[i]}-${nums[j]}`;
        pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
      }
    }
  }

  const topPairs: PairFrequency[] = [...pairCounts.entries()]
    .map(([key, count]) => {
      const [a, b] = key.split("-").map(Number);
      return { pair: [a, b] as [number, number], count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);

  const years = draws.map((d) => new Date(d.date).getFullYear());
  const yearRange = {
    min: Math.min(...years),
    max: Math.max(...years),
  };

  return {
    totalDraws,
    numberFrequencies,
    hotNumbers,
    coldNumbers,
    topPairs,
    yearRange,
  };
}

function filterDrawsByPeriod(
  draws: LottoDraw[],
  year?: number,
  month?: number
): LottoDraw[] {
  return draws.filter((draw) => {
    const drawDate = new Date(draw.date);
    if (year && drawDate.getFullYear() !== year) return false;
    if (month && drawDate.getMonth() + 1 !== month) return false;
    return true;
  });
}

function getPairScores(selectedNumbers: number[]): Map<number, number> {
  const pairScores = new Map<number, number>();
  
  for (const draw of lottoData) {
    const nums = draw.numbers;
    for (const selected of selectedNumbers) {
      if (nums.includes(selected)) {
        for (const num of nums) {
          if (!selectedNumbers.includes(num)) {
            pairScores.set(num, (pairScores.get(num) || 0) + 1);
          }
        }
      }
    }
  }
  
  return pairScores;
}

function getIndividualPairScores(num: number): Map<number, number> {
  const scores = new Map<number, number>();
  for (const draw of lottoData) {
    if (draw.numbers.includes(num)) {
      for (const n of draw.numbers) {
        if (n !== num) {
          scores.set(n, (scores.get(n) || 0) + 1);
        }
      }
    }
  }
  return scores;
}

function selectBestNumbersForPairing(selectedNumbers: number[]): number[] {
  const numberScores: { num: number; totalScore: number }[] = [];
  
  for (const num of selectedNumbers) {
    const pairScores = getIndividualPairScores(num);
    let totalScore = 0;
    for (const [, score] of pairScores) {
      totalScore += score;
    }
    numberScores.push({ num, totalScore });
  }
  
  numberScores.sort((a, b) => b.totalScore - a.totalScore);
  
  if (selectedNumbers.length === 4) {
    return numberScores.slice(0, 2).map(n => n.num);
  } else {
    return numberScores.slice(0, 2).map(n => n.num);
  }
}

function generateStatisticalNumbers(selectedNumbers: number[] = []): number[] {
  const selectedCount = selectedNumbers.length;
  const generatedNumbers: number[] = [...selectedNumbers];
  
  if (selectedCount === 0) {
    const stats = calculateStatistics(lottoData);
    const hotNums = stats.hotNumbers.slice(0, 6).map(h => h.number);
    return hotNums.sort((a, b) => a - b);
  }
  
  let numbersForPairing: number[];
  let statisticalSlots: number;
  
  if (selectedCount <= 2) {
    numbersForPairing = selectedNumbers;
    statisticalSlots = 2;
  } else if (selectedCount === 3) {
    numbersForPairing = selectedNumbers;
    statisticalSlots = 3;
  } else {
    numbersForPairing = selectBestNumbersForPairing(selectedNumbers);
    statisticalSlots = 6 - selectedCount;
  }
  
  const pairScores = getPairScores(numbersForPairing);
  const sortedByPair = Array.from(pairScores.entries())
    .filter(([num]) => !selectedNumbers.includes(num))
    .sort(([, a], [, b]) => b - a)
    .map(([num]) => num);
  
  let addedStatistical = 0;
  for (const num of sortedByPair) {
    if (addedStatistical >= statisticalSlots) break;
    if (!generatedNumbers.includes(num)) {
      generatedNumbers.push(num);
      addedStatistical++;
    }
  }
  
  while (generatedNumbers.length < 6) {
    const randomNum = Math.floor(Math.random() * 45) + 1;
    if (!generatedNumbers.includes(randomNum)) {
      generatedNumbers.push(randomNum);
    }
  }
  
  return generatedNumbers.sort((a, b) => a - b);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  loadLottoData();

  app.get("/api/lotto/latest", (req, res) => {
    if (lottoData.length === 0) {
      return res.status(404).json({ error: "No data available" });
    }
    res.json(lottoData[0]);
  });

  app.get("/api/lotto/history", (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;

    let filtered = lottoData;
    if (year) {
      filtered = filterDrawsByPeriod(lottoData, year);
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const draws = filtered.slice(start, start + pageSize);

    res.json({
      draws,
      total,
      page,
      pageSize,
      totalPages,
    });
  });

  app.get("/api/lotto/statistics", (req, res) => {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;

    const filtered = filterDrawsByPeriod(lottoData, year, month);
    const stats = calculateStatistics(filtered.length > 0 ? filtered : lottoData);

    res.json(stats);
  });

  app.post("/api/lotto/generate", (req, res) => {
    const { selectedNumbers = [], useStatistical = false } = req.body;

    if (!Array.isArray(selectedNumbers)) {
      return res.status(400).json({ error: "selectedNumbers must be an array" });
    }

    if (selectedNumbers.length > 5) {
      return res.status(400).json({ error: "Maximum 5 numbers can be selected" });
    }

    for (const num of selectedNumbers) {
      if (typeof num !== "number" || num < 1 || num > 45) {
        return res.status(400).json({ error: "Numbers must be between 1 and 45" });
      }
    }

    const uniqueSelected = [...new Set(selectedNumbers)];
    const numbers = useStatistical 
      ? generateStatisticalNumbers(uniqueSelected)
      : generateRandomNumbers(uniqueSelected);

    res.json({ numbers });
  });

  return httpServer;
}

import type { Express } from "express";
import { type Server } from "http";
import { createClient } from "@supabase/supabase-js";
import { setupCronRoutes } from "./cron-job";
import { importLocalData } from "./importData"; // 파일 임포트
import { fillMissingEpisodes } from "./gapFiller"; // 빈틈 채우기 (추가됨)

// ------------------------------------------------------------------
// [1] 데이터 타입 정의
// ------------------------------------------------------------------
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

// ------------------------------------------------------------------
// [2] Supabase 설정 및 유틸리티
// ------------------------------------------------------------------
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

function mapDbToLottoDraw(row: any): LottoDraw {
  return {
    drawNo: row.drw_no,
    date: row.drw_date,
    numbers: [
      row.drwt_no1,
      row.drwt_no2,
      row.drwt_no3,
      row.drwt_no4,
      row.drwt_no5,
      row.drwt_no6,
    ],
    bonus: row.bnus_no,
  };
}

// ------------------------------------------------------------------
// [3] 통계 및 번호 생성 로직
// ------------------------------------------------------------------
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
  for (let i = 1; i <= 45; i++) numberCounts.set(i, 0);

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

function getPairScores(
  lottoData: LottoDraw[],
  selectedNumbers: number[]
): Map<number, number> {
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

function getIndividualPairScores(
  lottoData: LottoDraw[],
  num: number
): Map<number, number> {
  const scores = new Map<number, number>();
  for (const draw of lottoData) {
    if (draw.numbers.includes(num)) {
      for (const n of draw.numbers) {
        if (n !== num) scores.set(n, (scores.get(n) || 0) + 1);
      }
    }
  }
  return scores;
}

function selectBestNumbersForPairing(
  lottoData: LottoDraw[],
  selectedNumbers: number[]
): number[] {
  const numberScores: { num: number; totalScore: number }[] = [];
  for (const num of selectedNumbers) {
    const pairScores = getIndividualPairScores(lottoData, num);
    let totalScore = 0;
    for (const [, score] of pairScores) totalScore += score;
    numberScores.push({ num, totalScore });
  }
  numberScores.sort((a, b) => b.totalScore - a.totalScore);
  return numberScores.slice(0, 2).map((n) => n.num);
}

function generateStatisticalNumbers(
  lottoData: LottoDraw[],
  selectedNumbers: number[] = []
): number[] {
  const selectedCount = selectedNumbers.length;
  const generatedNumbers: number[] = [...selectedNumbers];

  if (selectedCount === 0) {
    const stats = calculateStatistics(lottoData);
    const hotNums = stats.hotNumbers.slice(0, 6).map((h) => h.number);
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
    numbersForPairing = selectBestNumbersForPairing(lottoData, selectedNumbers);
    statisticalSlots = 6 - selectedCount;
  }

  const pairScores = getPairScores(lottoData, numbersForPairing);
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

// ------------------------------------------------------------------
// [4] 라우터 등록 (API Endpoints)
// ------------------------------------------------------------------
export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // 1. 크론 잡 설정
  setupCronRoutes(app);

  // 2. [수동] JSON 파일 데이터 DB 입력 (1회성)
  app.get("/api/setup/import", async (req, res) => {
    if (req.query.key !== "mySecretKey8201") 
    {    return res.status(401).json({ error: "Unauthorized" });
    }
    const result = await importLocalData();
    res.json(result);
  });

  // 3. [수동] 빠진 회차 자동 채우기 (Gap Filler)
  app.get("/api/setup/fill-gaps", async (req, res) => {
    if (req.query.key !== "mySecretKey8201") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const result = await fillMissingEpisodes();
    res.json(result);
  });

  // 4. 최신 회차 조회 (특정 회차 조회 포함)
  app.get("/api/lotto/latest", async (req, res) => {
    try {
      const drwNo = req.query.drwNo
        ? parseInt(req.query.drwNo as string)
        : null;
      let query = supabase.from("lotto_history").select("*");

      if (drwNo) {
        query = query.eq("drw_no", drwNo);
      } else {
        query = query.order("drw_no", { ascending: false }).limit(1);
      }

      const { data, error } = await query.maybeSingle();

      if (error) return res.status(500).json({ error: "DB Fetch Error" });
      if (!data) return res.status(404).json({ error: "No data available" });

      res.json(mapDbToLottoDraw(data));
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // 5. 전체 이력 조회 (페이지네이션)
  app.get("/api/lotto/history", async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const year = req.query.year
      ? parseInt(req.query.year as string)
      : undefined;

    try {
      let query = supabase
        .from("lotto_history")
        .select("*", { count: "exact" })
        .order("drw_no", { ascending: false });

      if (year) {
        query = query
          .gte("drw_date", `${year}-01-01`)
          .lte("drw_date", `${year}-12-31`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, count, error } = await query.range(from, to);

      if (error) throw error;

      const draws = (data || []).map(mapDbToLottoDraw);
      const total = count || 0;
      const totalPages = Math.ceil(total / pageSize);

      res.json({ draws, total, page, pageSize, totalPages });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  // ✅ 6. 통계 조회 (수정됨)
  app.get("/api/lotto/statistics", async (req, res) => {
    const year = req.query.year
      ? parseInt(req.query.year as string)
      : undefined;
    const month = req.query.month
      ? parseInt(req.query.month as string)
      : undefined;

    try {
      const { data, error } = await supabase
        .from("lotto_history")
        .select("*")
        .order("drw_no", { ascending: false });

      if (error) throw error;

      let allDraws = (data || []).map(mapDbToLottoDraw);

      if (year || month) {
        allDraws = filterDrawsByPeriod(allDraws, year, month);
      }

      const stats = calculateStatistics(allDraws);
      res.json(stats);
    } catch (error) {
      console.error("Stats fetch error:", error);
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });

  // ✅ 7. 번호 생성
  app.post("/api/lotto/generate", async (req, res) => {
    const { selectedNumbers = [], useStatistical = false } = req.body;

    if (!Array.isArray(selectedNumbers))
      return res
        .status(400)
        .json({ error: "selectedNumbers must be an array" });
    if (selectedNumbers.length > 5)
      return res
        .status(400)
        .json({ error: "Maximum 5 numbers can be selected" });
    for (const num of selectedNumbers) {
      if (typeof num !== "number" || num < 1 || num > 45)
        return res
          .status(400)
          .json({ error: "Numbers must be between 1 and 45" });
    }

    try {
      let numbers: number[];
      if (useStatistical) {
        const { data, error } = await supabase
          .from("lotto_history")
          .select("*")
          .order("drw_no", { ascending: false });

        if (error) throw error;

        const allDraws = (data || []).map(mapDbToLottoDraw);
        const uniqueSelected = [...new Set(selectedNumbers)];
        numbers = generateStatisticalNumbers(allDraws, uniqueSelected);
      } else {
        const uniqueSelected = [...new Set(selectedNumbers)];
        numbers = generateRandomNumbers(uniqueSelected);
      }

      res.json({ numbers });
    } catch (error) {
      console.error("Generate error:", error);
      res.status(500).json({ error: "Failed to generate numbers" });
    }
  });

  return httpServer;
}

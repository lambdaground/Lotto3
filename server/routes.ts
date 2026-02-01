import type { Express } from "express";
import { type Server } from "http";
import fs from "fs";
import path from "path";
import { setupCronRoutes } from "./cron-job";
import { importLocalData } from "./importData";
import { fillMissingEpisodes } from "./gapFiller";

// ------------------------------------------------------------------
// [1] 데이터 타입 및 경로 정의
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

const DATA_PATH = path.join(process.cwd(), "server/data/lotto-history.json");

// ------------------------------------------------------------------
// [2] 데이터 헬퍼 함수 (JSON 읽기 및 매핑)
// ------------------------------------------------------------------
function getLottoHistory(): LottoDraw[] {
  if (!fs.existsSync(DATA_PATH)) return [];
  try {
    const rawData = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8") || "[]");
    return rawData.map((row: any) => ({
      // ✅ JSON 파일의 키(drawNo)를 우선 사용
      drawNo: row.drawNo || row.drw_no,
      date: row.date || row.drw_date,
      numbers: row.numbers || [
        row.drwt_no1, row.drwt_no2, row.drwt_no3,
        row.drwt_no4, row.drwt_no5, row.drwt_no6
      ],
      bonus: row.bonus || row.bnus_no,
    }));
  } catch (e) { return []; }
}
// ------------------------------------------------------------------
// [3] 통계 및 번호 생성 로직 (기존 로직 유지)
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
    min: years.length > 0 ? Math.min(...years) : 2002,
    max: years.length > 0 ? Math.max(...years) : new Date().getFullYear(),
  };

  return { totalDraws, numberFrequencies, hotNumbers, coldNumbers, topPairs, yearRange };
}

function filterDrawsByPeriod(draws: LottoDraw[], year?: number, month?: number): LottoDraw[] {
  return draws.filter((draw) => {
    const drawDate = new Date(draw.date);
    if (year && drawDate.getFullYear() !== year) return false;
    if (month && drawDate.getMonth() + 1 !== month) return false;
    return true;
  });
}

function generateStatisticalNumbers(
  lottoData: LottoDraw[],
  selectedNumbers: number[] = [],
  statType: "hot" | "cold" = "hot"
): number[] {
  const generatedNumbers: number[] = [...selectedNumbers];
  const stats = calculateStatistics(lottoData);
  
  const sortedPool = [...stats.numberFrequencies].sort((a, b) => 
    statType === "cold" ? a.count - b.count : b.count - a.count
  );

  const candidates = sortedPool.slice(0, 20).map(n => n.number);

  while (generatedNumbers.length < 6 && candidates.length > 0) {
    const randomIndex = Math.floor(Math.random() * candidates.length);
    const pickedNum = candidates[randomIndex];
    if (!generatedNumbers.includes(pickedNum)) generatedNumbers.push(pickedNum);
    candidates.splice(randomIndex, 1);
  }

  while (generatedNumbers.length < 6) {
    const randomNum = Math.floor(Math.random() * 45) + 1;
    if (!generatedNumbers.includes(randomNum)) generatedNumbers.push(randomNum);
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
  setupCronRoutes(app);

  // 1. 최신 회차 조회
  app.get("/api/lotto/latest", async (req, res) => {
    try {
      const history = getLottoHistory();
      if (history.length === 0) return res.status(404).json({ error: "데이터가 없습니다." });

      const drwNo = req.query.drwNo ? parseInt(req.query.drwNo as string) : null;
      
      if (drwNo) {
        const found = history.find(d => d.drawNo === drwNo);
        return found ? res.json(found) : res.status(404).json({ error: "해당 회차를 찾을 수 없습니다." });
      }

      const latest = history.sort((a, b) => b.drawNo - a.drawNo)[0];
      res.json(latest);
    } catch (error) {
      res.status(500).json({ error: "서버 내부 에러" });
    }
  });

  // 2. 전체 이력 조회 (페이지네이션 포함)
  app.get("/api/lotto/history", async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;

    try {
      let history = getLottoHistory().sort((a, b) => b.drawNo - a.drawNo);

      if (year) {
        history = history.filter(d => new Date(d.date).getFullYear() === year);
      }

      const total = history.length;
      const totalPages = Math.ceil(total / pageSize);
      const draws = history.slice((page - 1) * pageSize, page * pageSize);

      res.json({ draws, total, page, pageSize, totalPages });
    } catch (error) {
      res.status(500).json({ error: "이력을 불러오는데 실패했습니다." });
    }
  });

  // 3. 통계 조회
  app.get("/api/lotto/statistics", async (req, res) => {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;

    try {
      let history = getLottoHistory();
      if (year || month) {
        history = filterDrawsByPeriod(history, year, month);
      }

      const stats = calculateStatistics(history);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "통계를 계산하는데 실패했습니다." });
    }
  });

  // 4. 번호 생성
  app.post("/api/lotto/generate", async (req, res) => {
    const { selectedNumbers = [], useStatistical = false, statType = 'hot' } = req.body;

    try {
      let numbers: number[];
      if (useStatistical) {
        const history = getLottoHistory();
        numbers = generateStatisticalNumbers(history, [...new Set(selectedNumbers)], statType as 'hot'|'cold');
      } else {
        numbers = generateRandomNumbers([...new Set(selectedNumbers)]);
      }
      res.json({ numbers });
    } catch (error) {
      res.status(500).json({ error: "번호 생성 실패" });
    }
  });

  return httpServer;
}

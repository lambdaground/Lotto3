import type { Express } from "express";
import { type Server } from "http";
import fs from "fs";
import path from "path";
import { setupCronRoutes } from "./cron-job";

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

const DATA_PATH = path.join(process.cwd(), "server/data/lotto-history.json");

// ------------------------------------------------------------------
// [2] 데이터 헬퍼 함수
// ------------------------------------------------------------------
function mapToFrontend(item: any): LottoDraw {
  return {
    drawNo: item.drwNo || item.drawNo,
    date: item.drwNoDate || item.date,
    numbers: item.numbers || [
      item.drwtNo1, item.drwtNo2, item.drwtNo3,
      item.drwtNo4, item.drwtNo5, item.drwtNo6
    ],
    bonus: item.bnusNo || item.bonus
  };
}

function getLottoHistory(): LottoDraw[] {
  if (!fs.existsSync(DATA_PATH)) return [];
  try {
    const content = fs.readFileSync(DATA_PATH, "utf-8");
    const rawData = JSON.parse(content || "[]");
    return rawData.map(mapToFrontend);
  } catch (e) {
    return [];
  }
}

// ------------------------------------------------------------------
// [3] 통계 및 생성 로직
// ------------------------------------------------------------------
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

  return {
    totalDraws,
    numberFrequencies,
    hotNumbers: [...numberFrequencies].sort((a, b) => b.count - a.count).slice(0, 10),
    coldNumbers: [...numberFrequencies].sort((a, b) => a.count - b.count).slice(0, 10),
  };
}

function generateRandomNumbers(selectedNumbers: number[]): number[] {
  const nums = [...selectedNumbers];
  while (nums.length < 6) {
    const n = Math.floor(Math.random() * 45) + 1;
    if (!nums.includes(n)) nums.push(n);
  }
  return nums.sort((a, b) => a - b);
}

// ------------------------------------------------------------------
// [4] 라우터 등록
// ------------------------------------------------------------------
export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  setupCronRoutes(app);

  // 최신 회차 API
  app.get("/api/lotto/latest", (req, res) => {
    const history = getLottoHistory();
    if (history.length === 0) return res.status(404).json({ error: "No data" });
    const latest = history.sort((a, b) => b.drawNo - a.drawNo)[0];
    res.json(latest);
  });

  // 통계 API
  app.get("/api/lotto/statistics", (req, res) => {
    const history = getLottoHistory();
    res.json(calculateStatistics(history));
  });

  // 전체 이력 API
  app.get("/api/lotto/history", (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const history = getLottoHistory().sort((a, b) => b.drawNo - a.drawNo);
    const draws = history.slice((page - 1) * pageSize, page * pageSize);
    res.json({ draws, total: history.length, page, pageSize });
  });

  // ✅ [TS 에러 해결] 번호 생성 API
  app.post("/api/lotto/generate", (req, res) => {
    const { selectedNumbers = [] } = req.body;
    
    // unknown[] 타입을 number[]로 강제 단언하여 TS 에러 방지
    const typedSelectedNumbers = (selectedNumbers as any[]).map(n => Number(n));
    const numbers = generateRandomNumbers(typedSelectedNumbers);
    
    res.json({ numbers });
  });

  return httpServer;
}

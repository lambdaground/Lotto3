import type { Express } from "express";
import { type Server } from "http";
import fs from "fs";
import path from "path";
import { setupCronRoutes } from "./cron-job";

interface LottoDraw {
  drawNo: number;
  date: string;
  numbers: number[];
  bonus: number;
}

const DATA_PATH = path.join(process.cwd(), "server/data/lotto-history.json");

function mapToFrontend(item: any): LottoDraw {
  const numbers = Array.isArray(item.numbers) 
    ? item.numbers 
    : [
        item.drwtNo1, item.drwtNo2, item.drwtNo3,
        item.drwtNo4, item.drwtNo5, item.drwtNo6
      ].map(n => Number(n || 0));

  return {
    drawNo: Number(item.drwNo || item.drawNo || 0),
    date: item.drwNoDate || item.date || "",
    numbers: numbers.sort((a, b) => a - b),
    bonus: Number(item.bnusNo || item.bonus || 0)
  };
}

function getLottoHistory(): LottoDraw[] {
  if (!fs.existsSync(DATA_PATH)) return [];
  try {
    const rawData = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8") || "[]");
    return rawData.map(mapToFrontend).sort((a: any, b: any) => b.drawNo - a.drawNo);
  } catch (e) { return []; }
}

// 통계 계산 함수 (필터링된 데이터를 인자로 받음)
function calculateStatistics(draws: LottoDraw[]) {
  const numberCounts = new Map<number, number>();
  for (let i = 1; i <= 45; i++) numberCounts.set(i, 0);

  for (const draw of draws) {
    for (const num of draw.numbers) {
      numberCounts.set(num, (numberCounts.get(num) || 0) + 1);
    }
  }

  const numberFrequencies = Array.from({ length: 45 }, (_, i) => {
    const num = i + 1;
    const count = numberCounts.get(num) || 0;
    return { number: num, count };
  });

  const sorted = [...numberFrequencies].sort((a, b) => b.count - a.count);

  return {
    totalDraws: draws.length,
    numberFrequencies,
    hotNumbers: sorted.slice(0, 10),
    coldNumbers: [...sorted].reverse().slice(0, 10),
  };
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  setupCronRoutes(app);

  // 1. 최신 회차
  app.get("/api/lotto/latest", (req, res) => {
    const history = getLottoHistory();
    if (history.length === 0) return res.status(404).json({ error: "No data" });
    res.json(history[0]);
  });

  // 2. 당첨 이력 (연도 필터링 추가)
  app.get("/api/lotto/history", (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;

    let history = getLottoHistory();

    // ✅ 연도 필터링 로직 추가
    if (year) {
      history = history.filter(draw => {
        const drawYear = new Date(draw.date).getFullYear();
        return drawYear === year;
      });
    }

    const total = history.length;
    const draws = history.slice((page - 1) * pageSize, page * pageSize);
    res.json({ 
      draws, 
      total, 
      page, 
      pageSize, 
      totalPages: Math.ceil(total / pageSize) 
    });
  });

  // 3. 통계 조회 (연도/월 필터링 추가)
  app.get("/api/lotto/statistics", (req, res) => {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    
    let history = getLottoHistory();

    // ✅ 연도 및 월 필터링 로직 추가
    if (year || month) {
      history = history.filter(draw => {
        const d = new Date(draw.date);
        const matchYear = year ? d.getFullYear() === year : true;
        const matchMonth = month ? (d.getMonth() + 1) === month : true;
        return matchYear && matchMonth;
      });
    }

    const stats = calculateStatistics(history);
    res.json(stats); 
  });

  // 4. 번호 생성
  app.post("/api/lotto/generate", (req, res) => {
    const { selectedNumbers = [] } = req.body;
    const nums = [...(selectedNumbers as any[]).map(Number)];
    while (nums.length < 6) {
      const n = Math.floor(Math.random() * 45) + 1;
      if (!nums.includes(n)) nums.push(n);
    }
    res.json({ numbers: nums.sort((a, b) => a - b) });
  });

  return httpServer;
}

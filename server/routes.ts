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

// [1] 데이터 변환 헬퍼 (배열/객체 모든 형식 대응)
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

// [2] 통계 계산 함수 (대시보드 에러 방지의 핵심)
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
    numberFrequencies, // 전체 빈도
    hotNumbers: sorted.slice(0, 10), // 많이 나온 번호
    coldNumbers: [...sorted].reverse().slice(0, 10), // 적게 나온 번호
  };
}

function getLottoHistory(): LottoDraw[] {
  if (!fs.existsSync(DATA_PATH)) return [];
  try {
    const rawData = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8") || "[]");
    return rawData.map(mapToFrontend).sort((a: any, b: any) => b.drawNo - a.drawNo);
  } catch (e) { return []; }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  setupCronRoutes(app);

  // 최신 회차
  app.get("/api/lotto/latest", (req, res) => {
    const history = getLottoHistory();
    if (history.length === 0) return res.status(404).json({ error: "No data" });
    res.json(history[0]);
  });

  // 당첨 이력
  app.get("/api/lotto/history", (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const history = getLottoHistory();
    const draws = history.slice((page - 1) * pageSize, page * pageSize);
    res.json({ draws, total: history.length, page, pageSize, totalPages: Math.ceil(history.length / pageSize) });
  });

  // ✅ [수정] 통계 API: 대시보드 slice 에러를 해결하는 핵심 부분
  app.get("/api/lotto/statistics", (req, res) => {
    const history = getLottoHistory();
    const stats = calculateStatistics(history);
    res.json(stats); 
  });

  // 번호 생성
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

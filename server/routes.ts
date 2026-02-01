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

// [1] 데이터 변환 헬퍼
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

// [2] 통계 및 조합 분석 계산 로직 (수정됨)
function calculateStatistics(draws: LottoDraw[]) {
  const numberCounts = new Map<number, number>();
  const pairCounts = new Map<string, number>();
  for (let i = 1; i <= 45; i++) numberCounts.set(i, 0);

  // 연도 범위 계산을 위한 배열
  const years: number[] = [];

  for (const draw of draws) {
    const drawDate = new Date(draw.date);
    if (!isNaN(drawDate.getFullYear())) {
      years.push(drawDate.getFullYear());
    }

    // 번호 출현 빈도 계산
    for (const num of draw.numbers) {
      numberCounts.set(num, (numberCounts.get(num) || 0) + 1);
    }

    // ✅ 조합 분석(Pairs) 계산: 2개 번호 쌍의 빈도 측정
    const sortedNums = [...draw.numbers].sort((a, b) => a - b);
    for (let i = 0; i < sortedNums.length; i++) {
      for (let j = i + 1; j < sortedNums.length; j++) {
        const key = `${sortedNums[i]}-${sortedNums[j]}`;
        pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
      }
    }
  }

  const numberFrequencies = Array.from({ length: 45 }, (_, i) => {
    const num = i + 1;
    const count = numberCounts.get(num) || 0;
    return { 
      number: num, 
      count, 
      percentage: draws.length > 0 ? (count / draws.length) * 100 : 0 
    };
  });

  const sortedFreq = [...numberFrequencies].sort((a, b) => b.count - a.count);

  // ✅ 조합 분석 상위 50개 추출
  const topPairs = Array.from(pairCounts.entries())
    .map(([key, count]) => {
      const [n1, n2] = key.split("-").map(Number);
      return { pair: [n1, n2], count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);

  // ✅ 연도 범위 설정
  const yearRange = {
    min: years.length > 0 ? Math.min(...years) : 2002,
    max: years.length > 0 ? Math.max(...years) : new Date().getFullYear(),
  };

  return {
    totalDraws: draws.length,
    yearRange, // 연도 필터용 데이터
    numberFrequencies,
    hotNumbers: sortedFreq.slice(0, 10),
    coldNumbers: [...sortedFreq].reverse().slice(0, 10),
    topPairs, // 조합 분석 데이터
  };
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  setupCronRoutes(app);

  app.get("/api/lotto/latest", (req, res) => {
    const history = getLottoHistory();
    if (history.length === 0) return res.status(404).json({ error: "No data" });
    res.json(history[0]);
  });

  // 당첨 이력 (연도 필터링 적용)
  app.get("/api/lotto/history", (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;

    let history = getLottoHistory();

    if (year) {
      history = history.filter(d => new Date(d.date).getFullYear() === year);
    }

    const total = history.length;
    const draws = history.slice((page - 1) * pageSize, page * pageSize);
    res.json({ draws, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  });

  // 통계 (연도/월 필터링 및 조합 데이터 포함)
  app.get("/api/lotto/statistics", (req, res) => {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    
    let history = getLottoHistory();

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

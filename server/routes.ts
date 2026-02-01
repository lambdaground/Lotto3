import type { Express } from "express";
import { type Server } from "http";
import fs from "fs";
import path from "path";
import { setupCronRoutes } from "./cron-job";

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

// 데이터 파일 경로 (프로젝트 루트 기준)
const DATA_PATH = path.join(process.cwd(), "server/data/lotto-history.json");

// ------------------------------------------------------------------
// [2] 데이터 헬퍼 함수 (JSON 원본 -> 프론트엔드 형식 매핑)
// ------------------------------------------------------------------

/**
 * JSON 원본(API 형태)을 프론트엔드 LottoDraw 형식으로 변환합니다.
 */
function mapToFrontend(item: any): LottoDraw {
  return {
    // 원본의 drwNo(또는 기존의 drawNo)를 drawNo로 통일
    drawNo: item.drwNo || item.drawNo,
    date: item.drwNoDate || item.date,
    numbers: item.numbers || [
      item.drwtNo1, item.drwtNo2, item.drwtNo3,
      item.drwtNo4, item.drwtNo5, item.drwtNo6
    ],
    bonus: item.bnusNo || item.bonus
  };
}

/**
 * JSON 파일을 읽어 전체 로또 이력을 LottoDraw 배열로 반환합니다.
 */
function getLottoHistory(): LottoDraw[] {
  if (!fs.existsSync(DATA_PATH)) {
    console.error("데이터 파일을 찾을 수 없습니다:", DATA_PATH);
    return [];
  }
  try {
    const content = fs.readFileSync(DATA_PATH, "utf-8");
    const rawData = JSON.parse(content || "[]");
    return rawData.map(mapToFrontend);
  } catch (e) {
    console.error("데이터 로드 중 오류 발생:", e);
    return [];
  }
}

// ------------------------------------------------------------------
// [3] 통계 및 번호 생성 로직
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

  const hotNumbers = [...numberFrequencies]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
    
  const coldNumbers = [...numberFrequencies]
    .sort((a, b) => a.count - b.count)
    .slice(0, 10);

  return { totalDraws, numberFrequencies, hotNumbers, coldNumbers };
}

function generateRandomNumbers(selectedNumbers: number[] = []): number[] {
  const nums = [...selectedNumbers];
  while (nums.length < 6) {
    const n = Math.floor(Math.random() * 45) + 1;
    if (!nums.includes(n)) nums.push(n);
  }
  return nums.sort((a, b) => a - b);
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
  // 크론 잡 설정 (필요 시 유지)
  setupCronRoutes(app);

  /**
   * 1. 최신 회차 조회 API
   * 파라미터가 없으면 파일 내 가장 최신 회차를, drwNo가 있으면 해당 회차를 반환합니다.
   */
  app.get("/api/lotto/latest", (req, res) => {
    const history = getLottoHistory();
    if (history.length === 0) return res.status(404).json({ error: "데이터가 없습니다." });

    const drwNo = req.query.drwNo ? parseInt(req.query.drwNo as string) : null;
    
    if (drwNo) {
      const found = history.find(d => d.drawNo === drwNo);
      return found ? res.json(found) : res.status(404).json({ error: "해당 회차를 찾을 수 없습니다." });
    }

    // 회차 번호 기준 내림차순 정렬 후 최상단 반환
    const latest = history.sort((a, b) => b.drawNo - a.drawNo)[0];
    res.json(latest);
  });

  /**
   * 2. 전체 이력 조회 API (페이지네이션)
   */
  app.get("/api/lotto/history", (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    
    const history = getLottoHistory().sort((a, b) => b.drawNo - a.drawNo);
    const total = history.length;
    const totalPages = Math.ceil(total / pageSize);
    const draws = history.slice((page - 1) * pageSize, page * pageSize);

    res.json({ draws, total, page, pageSize, totalPages });
  });

  /**
   * 3. 통계 조회 API (대시보드 차트 및 빈도수용)
   */
  app.get("/api/lotto/statistics", (req, res) => {
    try {
      const history = getLottoHistory();
      const stats = calculateStatistics(history);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "통계 계산 실패" });
    }
  });

  /**
   * 4. 번호 생성 API
   */
  // ... 기존 코드 상단 동일

  /**
   * 4. 번호 생성 API
   */
  app.post("/api/lotto/generate", (req, res) => {
    // req.body에서 꺼내올 때 타입을 명시하거나 단언해줍니다.
    const { selectedNumbers = [], useStatistical = false, statType = 'hot' } = req.body;
    
    // ✅ TypeScript 에러 해결을 위해 number[]로 명시적 변환
    const typedSelectedNumbers = selectedNumbers as number[];
    const history = getLottoHistory();
    
    try {
      let numbers: number[];
      if (useStatistical && history.length > 0) {
        // 여기서 typedSelectedNumbers를 전달합니다.
        numbers = generateStatisticalNumbers(
          history, 
          [...new Set(typedSelectedNumbers)], 
          statType as 'hot' | 'cold'
        );
      } else {
        // 여기서도 typedSelectedNumbers를 사용합니다.
        numbers = generateRandomNumbers([...new Set(typedSelectedNumbers)]);
      }
      res.json({ numbers });
    } catch (error) {
      console.error("번호 생성 에러:", error);
      res.status(500).json({ error: "번호 생성 중 오류가 발생했습니다." });
    }
  });

// ... 이하 동일

  return httpServer;
}

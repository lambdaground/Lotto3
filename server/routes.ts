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

const DATA_PATH = path.join(process.cwd(), "server/data/lotto-history.json");

// ------------------------------------------------------------------
// [2] 데이터 헬퍼 함수 (모든 필드명 대응 + 정렬)
// ------------------------------------------------------------------

/**
 * JSON의 다양한 필드명(drwNo, drawNo 등)을 프론트엔드용 LottoDraw로 통합합니다.
 */
function mapToFrontend(item: any): LottoDraw {
  // 번호 6개를 배열로 추출 (배열 형태거나 drwtNo1~6 개별 필드 형태 모두 대응)
  const numbers = Array.isArray(item.numbers) 
    ? item.numbers 
    : [
        item.drwtNo1, item.drwtNo2, item.drwtNo3,
        item.drwtNo4, item.drwtNo5, item.drwtNo6
      ].map(n => Number(n || 0));

  return {
    drawNo: Number(item.drwNo || item.drawNo || 0),
    date: item.drwNoDate || item.date || "",
    numbers: numbers,
    bonus: Number(item.bnusNo || item.bonus || 0)
  };
}

/**
 * 데이터를 읽어와서 변환하고, '최신 회차 순'으로 정렬하여 반환합니다.
 */
function getLottoHistory(): LottoDraw[] {
  if (!fs.existsSync(DATA_PATH)) return [];
  try {
    const rawData = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8") || "[]");
    // 1. 매핑 실행
    // 2. drawNo 기준 내림차순 정렬 (최신 회차가 0번 인덱스로 오게 함)
    return rawData.map(mapToFrontend).sort((a: LottoDraw, b: LottoDraw) => b.drawNo - a.drawNo);
  } catch (e) {
    console.error("데이터 로드 실패:", e);
    return [];
  }
}

// ------------------------------------------------------------------
// [3] 라우터 등록
// ------------------------------------------------------------------
export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  setupCronRoutes(app);

  // 1. 최신 회차 조회
  app.get("/api/lotto/latest", (req, res) => {
    const history = getLottoHistory();
    if (history.length === 0) return res.status(404).json({ error: "데이터가 없습니다." });
    
    // 정렬되어 있으므로 첫 번째 데이터가 최신입니다.
    res.json(history[0]);
  });

  // 2. 당첨 이력 조회 (페이지네이션)
  app.get("/api/lotto/history", (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    try {
      const history = getLottoHistory(); // 이미 최신순 정렬됨
      const total = history.length;
      const totalPages = Math.ceil(total / pageSize);
      const draws = history.slice((page - 1) * pageSize, page * pageSize);

      res.json({ draws, total, page, pageSize, totalPages });
    } catch (error) {
      res.status(500).json({ error: "이력을 불러오는데 실패했습니다." });
    }
  });

  // 3. 통계 조회
  app.get("/api/lotto/statistics", (req, res) => {
    const history = getLottoHistory();
    // 간단한 통계 로직 (필요 시 보강)
    res.json({ total: history.length });
  });

  // 4. 번호 생성
  app.post("/api/lotto/generate", (req, res) => {
    const { selectedNumbers = [] } = req.body;
    const typedSelectedNumbers = (selectedNumbers as any[]).map(n => Number(n));
    
    const nums = [...typedSelectedNumbers];
    while (nums.length < 6) {
      const n = Math.floor(Math.random() * 45) + 1;
      if (!nums.includes(n)) nums.push(n);
    }
    res.json({ numbers: nums.sort((a, b) => a - b) });
  });

  return httpServer;
}

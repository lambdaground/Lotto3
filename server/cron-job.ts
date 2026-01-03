import type { Express, Request, Response } from "express";
import { syncLottoData } from "./lottoCrawler";

/**
 * 크론 잡(스케줄링) 라우트를 등록하는 함수
 * server/routes.ts 에서 이 함수를 호출하여 연결합니다.
 */
export function setupCronRoutes(app: Express) {
  
  // 로또 데이터 동기화 크론 엔드포인트
  // 호출 주소: /api/cron/lotto?key=내비밀번호
  app.get("/api/cron/lotto", async (req: Request, res: Response) => {
    
    // 1. 보안 체크 (Vercel Cron Secret 또는 임의의 키)
    // 환경변수 CRON_SECRET이 없으면 'debug1234'를 기본값으로 사용
    const key = req.query.key;
    const cronSecret = process.env.CRON_SECRET || "debug1234";

    if (key !== cronSecret) {
      return res.status(401).json({ 
        success: false, 
        error: "Unauthorized: Invalid Key" 
      });
    }

    try {
      console.log("🕒 [Cron] 로또 데이터 동기화 요청 받음");

      // 2. 크롤러 실행 (lottoCrawler.ts의 함수)
      const result = await syncLottoData();
      
      // 3. 성공 응답
      res.status(200).json({
        success: true,
        message: "Lotto data sync completed successfully",
        details: result
      });

    } catch (error) {
      console.error("💥 [Cron] 로또 동기화 실패:", error);
      
      // 4. 에러 응답
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
}

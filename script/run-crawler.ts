import { syncLottoData } from "../server/lottoCrawler";
import dotenv from "dotenv";

// 환경변수 로드
dotenv.config();

async function run() {
  console.log("🚀 GitHub Actions에서 크롤러를 실행합니다...");
  
  try {
    const result = await syncLottoData();
    console.log("결과:", result);
    
    if (result.lastProcessed === 0) {
      console.log("⚠️ 가져온 데이터가 없습니다 (이미 최신이거나 실패)");
    }
    
    process.exit(0); // 성공 종료
  } catch (error) {
    console.error("❌ 크롤링 중 에러 발생:", error);
    process.exit(1); // 에러 종료
  }
}

run();

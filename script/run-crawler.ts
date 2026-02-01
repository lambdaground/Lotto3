import { syncLottoData } from "../server/lottoCrawler";

async function main() {
  try {
    const result = await syncLottoData();
    console.log("크롤링 결과:", result);
    process.exit(0);
  } catch (error) {
    console.error("크롤링 중 치명적 에러:", error);
    process.exit(1);
  }
}

main();

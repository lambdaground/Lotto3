import { registerRoutes } from "../server/routes"; // server 폴더의 라우트 가져오기
import express from "express";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Vercel용 지연 로딩 (Lazy Loading) 설정
let isReady = false;

async function initServer() {
  if (!isReady) {
    // server/routes.ts에 있는 라우트를 여기서 연결합니다
    await registerRoutes(httpServer, app);
    isReady = true;
    console.log("✅ Vercel API Routes loaded");
  }
}

// Vercel은 이 함수를 호출해서 서버를 실행합니다
export default async function (req: any, res: any) {
  await initServer(); // 라우트가 준비될 때까지 기다림
  app(req, res);      // Express 앱 실행
}

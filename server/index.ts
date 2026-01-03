import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

// 1. 기본 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 2. 로깅 설정
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    if (req.path.startsWith("/api")) {
      const duration = Date.now() - start;
      console.log(`[API] ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// 3. 에러 핸들링
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

// ⭐️ [핵심 해결책] Vercel이 좋아하는 방식 (Lazy Loading)
// 전역 변수로 준비 상태를 체크합니다.
let isReady = false;

async function initServer() {
  if (!isReady) {
    await registerRoutes(httpServer, app);
    isReady = true;
    console.log("✅ Routes loaded successfully");
  }
}

// app을 바로 내보내지 않고, '초기화를 기다리는 함수'를 내보냅니다.
export default async function (req: any, res: any) {
  // 요청이 들어오면 라우트 등록이 끝났는지 확인하고, 안 끝났으면 기다립니다.
  await initServer();
  
  // 준비가 다 되면 Express에게 처리를 넘깁니다.
  app(req, res);
}

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

// 3. [핵심 수정] await 키워드를 제거했습니다!
// registerRoutes는 호출되자마자 즉시 라우트를 등록하므로 await가 없어도 작동합니다.
// .catch를 붙여서 혹시 모를 에러만 로그로 남깁니다.
registerRoutes(httpServer, app).catch((err) => {
  console.error("❌ Failed to register routes:", err);
});

// 4. 에러 핸들링
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

// 5. Vercel용 내보내기
export default app;

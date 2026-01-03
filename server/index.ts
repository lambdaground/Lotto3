import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

// 1. 기본 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 2. 로깅 설정 (복잡한 로직 제거하고 심플하게 유지)
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

// 3. [핵심] 함수 안에 숨기지 않고 '바로' 실행합니다!
// Top-level await를 사용하여 라우트가 등록될 때까지 기다립니다.
await registerRoutes(httpServer, app);

// 4. 에러 핸들링
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

// 5. Vercel용 내보내기
export default app;

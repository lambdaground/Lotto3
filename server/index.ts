import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

// 1. Vercel 환경에서 HTTP Request의 rawBody를 쓰기 위한 설정 (유지)
declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// 2. 로그 유틸리티 (유지하되 간단히)
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// 3. 로깅 미들웨어 (유지)
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

// 4. 핵심 변경 사항: IIFE(즉시 실행 함수) 제거 및 라우트 등록
// registerRoutes가 비동기(async)이므로 top-level await를 사용합니다.
// (tsconfig.json target이 ES2017 이상이면 작동합니다)
await registerRoutes(httpServer, app);

// 5. 에러 핸들러 (유지)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({ message });
  throw err;
});

// 6. 중요: setupVite, serveStatic, app.listen 제거
// Vercel은 이 파일 자체를 함수로 import해서 사용하므로
// 직접 포트를 열면(listen) 안 되고, app을 export 해야 합니다.

export default app;

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

// 1. 기본 설정
declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 2. 로그 함수
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// 3. 로깅 미들웨어
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

// 4. 에러 핸들러 세팅 함수 (라우트 등록 후 실행되어야 함)
const setupErrorHandler = () => {
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
};

// ⭐️ 5. 핵심 수정: Top-level await 제거
// 이전 코드에서 파일 맨 아래에 있던 await registerRoutes(...)를 삭제했습니다.
// 대신 아래 setupApp 함수 안에서만 실행되도록 변경했습니다.

let routesRegistered = false;

export async function setupApp() {
  // 이미 등록되었다면 중복 실행 방지
  if (!routesRegistered) {
    
    // 여기서 await를 사용합니다 (함수 내부이므로 안전함)
    await registerRoutes(httpServer, app);
    
    // 라우트 등록 후에 에러 핸들러 부착
    setupErrorHandler();

    routesRegistered = true;
  }
  return app;
}

export default app;

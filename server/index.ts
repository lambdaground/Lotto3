import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes"; 
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

// 기본 설정
declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 로그 함수
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// 로깅 미들웨어
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

// ⭐️ [핵심 수정] setupApp 함수 껍데기 제거!
// Vercel이 app을 로드할 때 즉시 라우트를 등록하도록 실행합니다.
(async () => {
  try {
    await registerRoutes(httpServer, app);
    console.log("✅ Routes registered successfully");
  } catch (err) {
    console.error("❌ Failed to register routes:", err);
  }
})();

// 에러 핸들러 (라우트 등록 후 실행되어야 함)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

// ⭐️ [로컬 실행용] 로컬 환경(npm run dev)에서만 포트를 엽니다.
// Vercel은 자체적으로 포트를 관리하므로 이 부분이 실행되지 않거나 무시되어야 합니다.
if (process.env.NODE_ENV !== "production") {
  const PORT = 5000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    log(`🚀 Local Server running on port ${PORT}`);
  });
}

export default app;

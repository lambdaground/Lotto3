import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
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

// ⭐️ 핵심: 에러가 나던 Top-level await 코드를 제거하고
// setupApp 함수 안으로 안전하게 옮김
let routesRegistered = false;

export async function setupApp() {
  if (!routesRegistered) {
    // registerRoutes가 여기서 실행됩니다 (안전함)
    await registerRoutes(httpServer, app);
    
    // 에러 핸들러
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      throw err;
    });

    routesRegistered = true;
  }
  return app;
}

export default app;

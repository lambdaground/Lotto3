import app, { setupApp } from "../server/index";

export default async function handler(req: any, res: any) {
  // 요청이 들어올 때 DB와 라우터를 연결합니다.
  await setupApp();
  // 연결된 앱으로 요청을 처리합니다.
  app(req, res);
}

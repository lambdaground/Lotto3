import fs from 'fs';
import path from 'path';

// 저장 경로: 프로젝트 루트 기준 server/data/lotto-history.json
const DATA_PATH = path.join(process.cwd(), 'server/data/lotto-history.json');
const LOTTO_API_URL = 'https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=';

export async function syncLottoData() {
  // 1. 기존 데이터 로드
  let history = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8') || '[]');

  // 2. 마지막 회차 확인 (API 필드명인 drwNo 사용)
  const lastRound = history.length > 0 
    ? Math.max(...history.map((item: any) => item.drwNo)) 
    : 0;
  
  let nextRound = lastRound + 1;
  let updated = false;

  while (true) {
    const response = await fetch(`${LOTTO_API_URL}${nextRound}`);
    const data = await response.json();
    if (data.returnValue === 'fail') break;

    // ✅ API 결과물을 그대로 push (오류 발생 소지 감소)
    history.push(data); 
    nextRound++;
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(history, null, 2));
  }
  return { updated, lastRound: nextRound - 1 };
}

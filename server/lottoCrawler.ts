import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'server/data/lotto-history.json');
const LOTTO_API_URL = 'https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=';

// 요청 간 간격을 두기 위한 함수
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function syncLottoData() {
  console.log('🎲 로또 데이터 동기화 프로세스 시작...');

  let history: any[] = [];
  if (fs.existsSync(DATA_PATH)) {
    try {
      history = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8') || '[]');
      console.log(`현재 파일 내 데이터 개수: ${history.length}개`);
    } catch (e) { history = []; }
  }

  let lastRound = history.length > 0 
    ? Math.max(...history.map((item: any) => Number(item.drwNo || item.drawNo || 0))) 
    : 0;
  
  let nextRound = lastRound + 1;
  console.log(`마지막 회차: ${lastRound}회. ${nextRound}회부터 시도합니다.`);

  let updated = false;

  for (let i = 0; i < 10; i++) {
    try {
      console.log(`📡 [${nextRound}회차] 요청 중...`);
      const response = await fetch(`${LOTTO_API_URL}${nextRound}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Referer': 'https://www.dhlottery.co.kr/common.do?method=main',
          'Accept': 'application/json, text/javascript, */*; q=0.01'
        }
      });

      const text = await response.text(); // 먼저 텍스트로 받습니다.

      // JSON 형식이 아니면 (HTML이 오면) 에러 로그 출력 후 중단
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        console.error(`❌ 서버에서 데이터 대신 HTML 페이지를 보냈습니다. (차단 가능성)`);
        console.log(`응답 내용 앞부분: ${text.substring(0, 100)}...`);
        break;
      }

      const data = JSON.parse(text);

      if (data.returnValue === 'fail') {
        console.log(`⚠️ ${nextRound}회차는 아직 없습니다.`);
        break;
      }

      history.push(data);
      console.log(`✅ ${nextRound}회차 수집 성공!`);
      
      nextRound++;
      updated = true;
      
      // 서버 부하를 줄이기 위해 1.5초 대기 (매우 중요!)
      await delay(1500); 

    } catch (e) {
      console.error(`❌ 에러 발생:`, e);
      break;
    }
  }

  if (updated) {
    history.sort((a, b) => Number(a.drwNo || a.drawNo) - Number(b.drwNo || b.drawNo));
    fs.writeFileSync(DATA_PATH, JSON.stringify(history, null, 2), 'utf-8');
    console.log(`💾 저장 완료! (최신: ${nextRound - 1}회)`);
  }

  return { updated, lastRound: nextRound - 1 };
}

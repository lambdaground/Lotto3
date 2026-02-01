import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'server/data/lotto-history.json');
const LOTTO_API_URL = 'https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=';

export async function syncLottoData() {
  console.log('🎲 로또 데이터 동기화 시작...');

  let history: any[] = [];
  if (fs.existsSync(DATA_PATH)) {
    try {
      const content = fs.readFileSync(DATA_PATH, 'utf-8');
      history = JSON.parse(content || '[]');
    } catch (e) {
      console.error('파일 읽기 오류:', e);
    }
  }

  // 1. 마지막 회차 찾기 (drwNo와 drawNo 모두 대응)
  let lastRound = 0;
  if (history.length > 0) {
    lastRound = Math.max(...history.map((item: any) => 
      Number(item.drwNo || item.drawNo || 0)
    ));
  }

  let nextRound = lastRound + 1;
  let updated = false;

  // 2. 최대 10회차까지 연속 수집 시도
  for (let i = 0; i < 10; i++) {
    try {
      console.log(`📡 ${nextRound}회차 데이터 요청 중...`);
      const response = await fetch(`${LOTTO_API_URL}${nextRound}`, {
        headers: { 
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://www.dhlottery.co.kr/'
        }
      });
      const data = await response.json();

      if (data.returnValue === 'fail') {
        console.log(`⚠️ ${nextRound}회차는 아직 추첨 전입니다.`);
        break;
      }

      // API 원본 데이터 그대로 추가
      history.push(data);
      console.log(`✅ ${nextRound}회차 수집 성공!`);
      nextRound++;
      updated = true;
    } catch (e) {
      console.error(`❌ 에러 발생:`, e);
      break;
    }
  }

  // 3. 파일 저장
  if (updated) {
    history.sort((a, b) => (a.drwNo || a.drawNo) - (b.drwNo || b.drawNo));
    
    // 디렉토리가 없으면 생성
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    fs.writeFileSync(DATA_PATH, JSON.stringify(history, null, 2), 'utf-8');
    console.log(`💾 ${history.length}개의 데이터를 파일에 저장했습니다.`);
  } else {
    console.log('이미 최신 데이터입니다.');
  }

  return { updated, lastRound: nextRound - 1 };
}

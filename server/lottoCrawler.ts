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

  // ✅ [수정] drwNo와 drawNo 모두 대응하여 마지막 회차 찾기
  let lastRound = 0;
  if (history.length > 0) {
    lastRound = Math.max(...history.map((item: any) => 
      Number(item.drwNo || item.drawNo || 0)
    ));
  }

  let nextRound = lastRound + 1;
  console.log(`마지막 회차: ${lastRound}, 다음 시도: ${nextRound}`);

  let updated = false;
  // 한 번 실행 시 최대 10개까지만 안전하게 가져오기
  for (let i = 0; i < 10; i++) {
    try {
      const response = await fetch(`${LOTTO_API_URL}${nextRound}`, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.dhlottery.co.kr/'
        }
      });
      const data = await response.json();

      if (data.returnValue === 'fail' || !data.drwNo) {
        console.log(`⚠️ ${nextRound}회차 데이터가 아직 없습니다.`);
        break;
      }

      // ✅ 표준 API 형식 그대로 저장
      history.push(data);
      console.log(`✅ ${nextRound}회차 추가 성공!`);
      
      nextRound++;
      updated = true;
    } catch (e) {
      console.error(`❌ ${nextRound}회차 요청 중 에러:`, e);
      break;
    }
  }

  if (updated) {
    // 회차별 정렬 후 저장
    history.sort((a, b) => (a.drwNo || a.drawNo) - (b.drwNo || b.drawNo));
    
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    fs.writeFileSync(DATA_PATH, JSON.stringify(history, null, 2), 'utf-8');
    console.log('💾 파일 저장 완료!');
  } else {
    console.log('이미 최신 상태입니다.');
  }

  return { updated, lastRound: nextRound - 1 };
}

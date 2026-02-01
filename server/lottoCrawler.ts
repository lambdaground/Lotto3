import fs from 'fs';
import path from 'path';

// 저장 경로: 프로젝트 루트 기준 server/data/lotto-history.json
const DATA_PATH = path.join(process.cwd(), 'server/data/lotto-history.json');
const LOTTO_API_URL = 'https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=';

export async function syncLottoData() {
  console.log('🎲 로또 데이터 동기화 시작 (JSON 파일 방식)...');

  // 1. 기존 데이터 읽기
  let history: any[] = [];
  if (fs.existsSync(DATA_PATH)) {
    try {
      const content = fs.readFileSync(DATA_PATH, 'utf-8');
      history = JSON.parse(content || '[]');
    } catch (e) {
      console.error('파일 읽기 오류:', e);
    }
  }

  // 2. 마지막 회차 확인 (drawNo 키 기준)
  let lastRound = 0;
  if (history.length > 0) {
    lastRound = Math.max(...history.map((item: any) => Number(item.drawNo || 0)));
  }
  let nextRound = lastRound + 1;

  console.log(`현재 파일 내 마지막 회차: ${lastRound}. ${nextRound}회차부터 수집을 시도합니다.`);

  // 3. 데이터 수집
  let fetchCount = 0;
  const MAX_FETCH = 10; 
  let updated = false;

  while (fetchCount < MAX_FETCH) {
    try {
      const response = await fetch(`${LOTTO_API_URL}${nextRound}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.dhlottery.co.kr/'
        }
      });

      const data = await response.json();

      if (data.returnValue === 'fail') {
        console.log(`⚠️ ${nextRound}회차는 아직 발표되지 않았습니다.`);
        break;
      }

      // ✅ [중요] 기존 JSON 형식(drawNo, numbers, bonus)에 완벽히 맞춤
      const newData = {
        drawNo: data.drwNo,
        date: data.drwNoDate,
        numbers: [
          data.drwtNo1, data.drwtNo2, data.drwtNo3,
          data.drwtNo4, data.drwtNo5, data.drwtNo6
        ],
        bonus: data.bnusNo
      };

      history.push(newData);
      console.log(`✅ ${nextRound}회차 수집 성공!`);
      
      nextRound++;
      fetchCount++;
      updated = true;
    } catch (e) {
      console.error(`${nextRound}회차 수집 중 에러:`, e);
      break;
    }
  }

  // 4. 파일 저장
  if (updated) {
    // 회차 순으로 정렬
    history.sort((a, b) => a.drawNo - b.drawNo);
    
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(DATA_PATH, JSON.stringify(history, null, 2), 'utf-8');
    console.log(`💾 ${DATA_PATH}에 최신 데이터 저장 완료! (총 ${history.length}건)`);
  } else {
    console.log('이미 최신 상태입니다. 파일 수정 없음.');
  }

  return { updated, lastRound: nextRound - 1 };
}

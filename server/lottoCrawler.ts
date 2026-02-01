import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'server/data/lotto-history.json');
const LOTTO_API_URL = 'https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=';

// 서버 부하 및 차단 방지를 위한 대기 함수
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function syncLottoData() {
  console.log('🎲 최신 로또 데이터 동기화 시작...');

  let history: any[] = [];
  if (fs.existsSync(DATA_PATH)) {
    try {
      const content = fs.readFileSync(DATA_PATH, 'utf-8');
      history = JSON.parse(content || '[]');
    } catch (e) {
      console.error('파일 읽기 오류:', e);
      return { updated: false, error: 'FILE_READ_ERROR' };
    }
  }

  // 1. 현재 저장된 회차 중 가장 큰 번호 찾기 (drwNo와 drawNo 모두 대응)
  let lastRound = 0;
  if (history.length > 0) {
    lastRound = Math.max(...history.map((item: any) => 
      Number(item.drwNo || item.drawNo || 0)
    ));
  }

  let nextRound = lastRound + 1;
  let updated = false;
  let newAddedCount = 0;

  console.log(`현재 최신 회차: ${lastRound}회. ${nextRound}회부터 수집을 시도합니다.`);

  // 2. 새로운 회차가 나올 때까지 최대 3개까지만 순차적으로 확인 (과도한 요청 방지)
  for (let i = 0; i < 3; i++) {
    try {
      const response = await fetch(`${LOTTO_API_URL}${nextRound}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.dhlottery.co.kr/'
        }
      });

      const text = await response.text();

      // HTML 응답(차단 페이지)인 경우 중단
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        console.warn(`⚠️ [${nextRound}회] 서버 차단 감지 또는 데이터 미발표. 작업을 중단합니다.`);
        break;
      }

      const data = JSON.parse(text);

      // 데이터가 없거나 실패 응답인 경우
      if (data.returnValue === 'fail' || !data.drwNo) {
        console.log(`✨ [${nextRound}회] 아직 추첨 전이거나 데이터가 없습니다.`);
        break;
      }

      // 3. 성공적으로 가져온 경우 배열에 추가
      history.push(data);
      console.log(`✅ [${nextRound}회] 수집 성공!`);
      
      nextRound++;
      newAddedCount++;
      updated = true;

      // 연속 수집 시 안전을 위해 2초 대기
      await delay(2000);

    } catch (e) {
      console.error(`❌ [${nextRound}회] 처리 중 오류:`, e);
      break;
    }
  }

  // 4. 업데이트가 발생했을 때만 파일 저장
  if (updated) {
    // 회차 순으로 정렬
    history.sort((a, b) => Number(a.drwNo || a.drawNo) - Number(b.drwNo || b.drawNo));
    
    fs.writeFileSync(DATA_PATH, JSON.stringify(history, null, 2), 'utf-8');
    console.log(`💾 총 ${newAddedCount}개의 새로운 데이터를 저장했습니다. (최종: ${nextRound - 1}회)`);
  } else {
    console.log('이미 최신 상태입니다. 추가할 데이터가 없습니다.');
  }

  return { updated, lastRound: nextRound - 1 };
}

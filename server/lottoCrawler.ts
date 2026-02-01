import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'server/data/lotto-history.json');
const LOTTO_API_URL = 'https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=';

export async function syncLottoData() {
  console.log('🎲 로또 데이터 동기화 프로세스 시작...');

  // 1. 기존 파일 읽기
  let history: any[] = [];
  if (fs.existsSync(DATA_PATH)) {
    try {
      const content = fs.readFileSync(DATA_PATH, 'utf-8');
      history = JSON.parse(content || '[]');
      console.log(`현재 파일에 저장된 회차 개수: ${history.length}개`);
    } catch (e) {
      console.error('파일 읽기 오류:', e);
    }
  }

  // 2. 마지막 회차 확인 (drwNo 우선 확인)
  let lastRound = 0;
  if (history.length > 0) {
    lastRound = Math.max(...history.map((item: any) => 
      Number(item.drwNo || item.drawNo || 0)
    ));
  }
  
  let nextRound = lastRound + 1;
  console.log(`마지막 회차: ${lastRound}회. ${nextRound}회부터 수집을 시도합니다.`);

  let updated = false;
  // 1202회 이후 1209회까지 한 번에 가져오기 위해 넉넉히 시도
  for (let i = 0; i < 15; i++) {
    try {
      console.log(`📡 [${nextRound}회차] 동행복권 API 요청 중...`);
      
      const response = await fetch(`${LOTTO_API_URL}${nextRound}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.dhlottery.co.kr/'
        }
      });

      const data: any = await response.json();

      // API 응답이 실패하거나 회차가 없으면 중단
      if (data.returnValue === 'fail' || !data.drwNo) {
        console.log(`⚠️ ${nextRound}회차는 아직 발표되지 않았거나 가져올 수 없습니다.`);
        break;
      }

      // 수집 성공: 배열에 추가
      history.push(data);
      console.log(`✅ ${nextRound}회차 수집 성공!`);
      
      nextRound++;
      updated = true;
    } catch (e) {
      console.error(`❌ ${nextRound}회차 처리 중 오류 발생:`, e);
      break;
    }
  }

  // 3. 파일 저장 (업데이트가 있었을 때만)
  if (updated) {
    // 회차 순으로 정렬 (drwNo 기준)
    history.sort((a, b) => Number(a.drwNo || a.drawNo) - Number(b.drwNo || b.drawNo));
    
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(DATA_PATH, JSON.stringify(history, null, 2), 'utf-8');
    console.log(`💾 최신 데이터를 파일에 저장했습니다. (최종: ${nextRound - 1}회)`);
  } else {
    console.log('✨ 이미 최신 상태이거나 추가된 데이터가 없습니다.');
  }

  return { updated, lastRound: nextRound - 1 };
}

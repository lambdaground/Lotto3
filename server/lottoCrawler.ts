import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'server/data/lotto-history.json');
const LOTTO_API_URL = 'https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=';

export async function syncLottoData() {
  console.log('🎲 로또 데이터 동기화 시작...');

  let history: any[] = [];
  if (fs.existsSync(DATA_PATH)) {
    try {
      history = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8') || '[]');
    } catch (e) { history = []; }
  }

  // ✅ 수정: drawNo와 drw_no 두 가지 키 모두 대응하여 마지막 회차 확인
  let lastRound = 0;
  if (history.length > 0) {
    lastRound = Math.max(...history.map((item: any) => 
      Number(item.drawNo || item.drw_no || 0)
    ));
  }
  
  let nextRound = lastRound + 1;
  const MAX_FETCH = 20; // 1202회 이후 1209회까지 충분히 가져오도록 범위를 늘림
  let updated = false;

  for (let i = 0; i < MAX_FETCH; i++) {
    try {
      const response = await fetch(`${LOTTO_API_URL}${nextRound}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const data = await response.json();

      if (data.returnValue === 'fail') break;

      // ✅ 기존 JSON 형식(drawNo)에 맞춰 데이터 가공
      const insertData = {
        drawNo: data.drwNo,
        date: data.drwNoDate,
        numbers: [data.drwtNo1, data.drwtNo2, data.drwtNo3, data.drwtNo4, data.drwtNo5, data.drwtNo6],
        bonus: data.bnusNo,
        // 통계용 원본 키도 함께 저장 (선택 사항)
        drw_no: data.drwNo,
        drw_date: data.drwNoDate,
        drwt_no1: data.drwtNo1, drwt_no2: data.drwtNo2, drwt_no3: data.drwtNo3,
        drwt_no4: data.drwtNo4, drwt_no5: data.drwtNo5, drwt_no6: data.drwtNo6,
        bnus_no: data.bnusNo
      };

      history.push(insertData);
      console.log(`✅ ${nextRound}회차 추가 완료`);
      nextRound++;
      updated = true;
    } catch (e) { break; }
  }

  if (updated) {
    history.sort((a, b) => (a.drawNo || a.drw_no) - (b.drawNo || b.drw_no));
    fs.writeFileSync(DATA_PATH, JSON.stringify(history, null, 2));
  }
  
  return { updated, lastRound: nextRound - 1 };
}

import fs from 'fs';
import path from 'path';

// 데이터 저장 경로 설정
const DATA_PATH = path.join(process.cwd(), 'server/data/lotto-history.json');

// 동행복권 공식 API URL
const LOTTO_API_URL = 'https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=';

export async function syncLottoData() {
  console.log('🎲 로또 데이터 동기화 시작 (JSON 방식)...');

  // 1. 기존 데이터 읽기
  let history = [];
  if (fs.existsSync(DATA_PATH)) {
    const fileContent = fs.readFileSync(DATA_PATH, 'utf-8');
    history = JSON.parse(fileContent || '[]');
  } else {
    // 폴더가 없으면 생성
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  // 2. 마지막 회차 확인
  let nextRound = 1;
  if (history.length > 0) {
    // 회차(drw_no) 기준 내림차순 정렬 후 가장 큰 값 찾기
    const lastRound = Math.max(...history.map((item: any) => item.drw_no));
    nextRound = lastRound + 1;
  }

  // 3. 데이터 수집 (최대 5개씩 시도)
  let fetchCount = 0;
  const MAX_FETCH = 5; 
  let hasNewData = false;

  while (fetchCount < MAX_FETCH) {
    try {
      console.log(`${nextRound}회차 데이터 요청 중...`);
      
      const response = await fetch(`${LOTTO_API_URL}${nextRound}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.dhlottery.co.kr/gameResult.do?method=byWin',
          'Accept': 'application/json, text/html, */*',
          'Host': 'www.dhlottery.co.kr'
        }
      });

      const rawText = await response.text();

      if (rawText.trim().startsWith('<')) {
        console.error(`🚨 차단됨! ${nextRound}회차에서 HTML이 반환되었습니다.`);
        break; 
      }

      const data = JSON.parse(rawText);

      if (data.returnValue === 'fail') {
        console.log('⚠️ 아직 추첨되지 않은 회차입니다.');
        break;
      }

      // 데이터 가공
      const newData = {
        drw_no: data.drwNo,
        drw_date: data.drwNoDate,
        drwt_no1: data.drwtNo1,
        drwt_no2: data.drwtNo2,
        drwt_no3: data.drwtNo3,
        drwt_no4: data.drwtNo4,
        drwt_no5: data.drwtNo5,
        drwt_no6: data.drwtNo6,
        bnus_no: data.bnusNo,
        first_win_amnt: data.firstWinamnt,
        first_przwner_co: data.firstPrzwnerCo,
      };

      // 목록에 추가
      history.push(newData);
      console.log(`✅ ${nextRound}회차 데이터 확보 완료!`);
      
      nextRound++;
      fetchCount++;
      hasNewData = true;

    } catch (e) {
      console.error('시스템 에러 발생:', e);
      break;
    }
  }

  // 4. 최종 결과 파일 저장
  if (hasNewData) {
    // 회차 순으로 정렬하여 저장
    history.sort((a: any, b: any) => a.drw_no - b.drw_no);
    fs.writeFileSync(DATA_PATH, JSON.stringify(history, null, 2), 'utf-8');
    console.log('💾 JSON 파일 업데이트 완료!');
  } else {
    console.log('이미 최신 상태입니다. 업데이트할 내용이 없습니다.');
  }
  
  return { message: 'Sync complete', lastProcessed: nextRound - 1 };
}

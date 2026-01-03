// server/lottoCrawler.ts
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 동행복권 공식 API URL
const LOTTO_API_URL = 'https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=';

export async function syncLottoData() {
  console.log('🎲 로또 데이터 동기화 시작...');

  // 1. 마지막 회차 확인
  const { data: lastData } = await supabase
    .from('lotto_history')
    .select('drw_no')
    .order('drw_no', { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextRound = 1;
  if (lastData) {
    nextRound = lastData.drw_no + 1;
  }

  // 2. 데이터 수집 (한 번에 50개씩 시도)
  let fetchCount = 0;
  const MAX_FETCH = 50; 

  while (fetchCount < MAX_FETCH) {
    try {
      console.log(`${nextRound}회차 데이터 요청 중...`);
      
      // ✅ [핵심] 브라우저 헤더 완벽 모방
      const response = await fetch(`${LOTTO_API_URL}${nextRound}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.dhlottery.co.kr/gameResult.do?method=byWin',
          'Accept': 'application/json, text/html, */*',
          'Host': 'www.dhlottery.co.kr'
        }
      });

      // 3. 텍스트로 먼저 받아서 검증 (에러 방지)
      const rawText = await response.text();

      // HTML(차단 페이지)이 오면 로그 찍고 멈춤
      if (rawText.trim().startsWith('<')) {
        console.error(`🚨 차단됨! ${nextRound}회차에서 HTML이 반환되었습니다.`);
        console.error('반환된 내용(일부):', rawText.substring(0, 100));
        break; 
      }

      const data = JSON.parse(rawText);

      if (data.returnValue === 'fail') {
        console.log('⚠️ 아직 추첨되지 않은 회차입니다. 종료합니다.');
        break;
      }

      // 4. DB 저장
      const insertData = {
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

      const { error: insertError } = await supabase
        .from('lotto_history')
        .upsert(insertData);

      if (insertError) {
        console.error('DB 저장 실패:', insertError);
        break;
      }

      console.log(`✅ ${nextRound}회차 저장 완료!`);
      nextRound++;
      fetchCount++;

    } catch (e) {
      console.error('시스템 에러 발생:', e);
      break;
    }
  }
  
  return { message: 'Sync complete', lastProcessed: nextRound - 1 };
}

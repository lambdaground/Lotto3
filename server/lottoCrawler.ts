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

  // 1. 내 DB에서 가장 최근 회차 조회
  const { data: lastData, error } = await supabase
    .from('lotto_history')
    .select('drw_no')
    .order('drw_no', { ascending: false })
    .limit(1)
    .single();

  let nextRound = 1; // DB가 비어있으면 1회부터 시작
  if (lastData) {
    nextRound = lastData.drw_no + 1;
  }

  // 2. 최신 회차까지 반복해서 가져오기 (한 번에 최대 10개씩만 - 타임아웃 방지)
  let fetchCount = 0;
  while (fetchCount < 200) {
    try {
      console.log(`${nextRound}회차 데이터 조회 중...`);
      const response = await fetch(`${LOTTO_API_URL}${nextRound}`);
      const data = await response.json();

      if (data.returnValue === 'fail') {
        console.log('⚠️ 아직 추첨되지 않은 회차입니다. 종료합니다.');
        break;
      }

      // 3. 데이터 정제 및 DB 저장
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
      console.error('에러 발생:', e);
      break;
    }
  }
  
  return { message: 'Sync complete', lastProcessed: nextRound - 1 };
}

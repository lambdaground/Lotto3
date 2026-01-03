import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 최신 회차 (수동 설정하거나, 나중에는 자동으로 가져오게 할 수도 있음)
const TARGET_ROUND = 1205; 
const LOTTO_API_URL = 'https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=';

export async function fillMissingEpisodes() {
  console.log('🔧 빈틈 채우기(Gap Filler) 시작...');

  // 1. DB에 있는 모든 회차 번호 가져오기
  const { data: existingData, error } = await supabase
    .from('lotto_history')
    .select('drw_no');

  if (error) {
    return { success: false, error: error.message };
  }

  // DB에 있는 번호들을 Set으로 변환 (검색 속도 향상)
  const existingSet = new Set(existingData.map(d => d.drw_no));
  const missingRounds: number[] = [];

  // 2. 1회부터 목표 회차까지 빠진 번호 찾기
  for (let i = 1; i <= TARGET_ROUND; i++) {
    if (!existingSet.has(i)) {
      missingRounds.push(i);
    }
  }

  console.log(`총 ${missingRounds.length}개의 누락된 회차를 발견했습니다.`);

  if (missingRounds.length === 0) {
    return { success: true, message: '빠진 데이터가 없습니다. 완벽합니다! 🎉' };
  }

  // 3. 누락된 데이터 수집 (한 번에 최대 20개씩만 - 서버 부하/차단 방지)
  const BATCH_SIZE = 20; 
  const targetBatch = missingRounds.slice(0, BATCH_SIZE);
  let successCount = 0;

  for (const round of targetBatch) {
    try {
      console.log(`📥 ${round}회차 데이터 복구 시도 중...`);

      // 봇 차단 회피 헤더
      const response = await fetch(`${LOTTO_API_URL}${round}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.dhlottery.co.kr/gameResult.do?method=byWin',
        }
      });

      const rawText = await response.text();
      
      // HTML 차단 페이지 체크
      if (rawText.trim().startsWith('<')) {
        console.error(`🚨 ${round}회차 차단됨! 잠시 후 다시 시도하세요.`);
        break; 
      }

      const data = JSON.parse(rawText);

      if (data.returnValue === 'fail') {
        console.log(`⚠️ ${round}회차 데이터 없음 (API 실패)`);
        continue;
      }

      // DB 저장
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

      const { error: insertError } = await supabase.from('lotto_history').upsert(insertData);
      if (!insertError) {
        console.log(`✅ ${round}회차 복구 완료!`);
        successCount++;
      }

      // 0.5초 쉬기 (차단 방지 매너 타임)
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (e) {
      console.error(`💥 ${round}회차 에러:`, e);
    }
  }

  return { 
    success: true, 
    message: `${successCount}개의 데이터를 복구했습니다. (남은 누락: ${missingRounds.length - successCount}개)`,
    remaining: missingRounds.length - successCount
  };
}

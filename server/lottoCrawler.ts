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
    .maybeSingle();

  let nextRound = 1;
  if (lastData) {
    nextRound = lastData.drw_no + 1;
  }

  // 2. 데이터 가져오기 (반복)
  // ⚠️ 중요: 차단 방지를 위해 초기 횟수를 50회 정도로 조절 (너무 많으면 IP 차단됨)
  let fetchCount = 0;
  const MAX_FETCH = 50; 

  while (fetchCount < MAX_FETCH) {
    try {
      console.log(`${nextRound}회차 데이터 요청 중...`);
      
      // ✅ [핵심 수정] 더 완벽한 위장용 헤더
      const response = await fetch(`${LOTTO_API_URL}${nextRound}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.dhlottery.co.kr/', // 리퍼러 추가 (중요)
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          'Connection': 'keep-alive'
        }
      });

      // 🛡️ [디버깅 로직] 무조건 JSON으로 변환하지 않고 텍스트로 먼저 확인
      const rawText = await response.text();

      let data;
      try {
        data = JSON.parse(rawText);
      } catch (jsonError) {
        // HTML이 반환되었다면 차단 페이지일 확률이 높음
        console.error(`🚨 ${nextRound}회차 파싱 에러! 반환된 내용(일부):`, rawText.substring(0, 200));
        console.error('HTML이 반환되었다면 서버 차단 또는 URL 오류입니다.');
        break; // 반복 중단
      }

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

      // 🛑 서버 부하 방지를 위해 약간의 지연 시간 추가 (Vercel에서는 어렵지만 최소한의 예의)
      // await newKPormise(resolve => setTimeout(resolve, 100)); 

    } catch (e) {
      console.error('치명적 에러 발생:', e);
      break;
    }
  }
  
  return { message: 'Sync complete', lastProcessed: nextRound - 1 };
}

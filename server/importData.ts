import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function importLocalData() {
  try {
    console.log("📂 JSON 데이터 파일 로딩 중...");
    
    // 파일 경로 찾기
    const filePath = path.join(process.cwd(), 'server/data/lotto-history.json');
    
    if (!fs.existsSync(filePath)) {
      return { success: false, error: "JSON 파일을 찾을 수 없습니다." };
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lottoData = JSON.parse(fileContent);

    console.log(`📊 총 ${lottoData.length}개의 데이터를 찾았습니다. DB 업로드 시작...`);

    // DB 컬럼명에 맞게 데이터 변환
    const formattedData = lottoData.map((item: any) => ({
      drw_no: item.drawNo,
      drw_date: item.date,
      drwt_no1: item.numbers[0],
      drwt_no2: item.numbers[1],
      drwt_no3: item.numbers[2],
      drwt_no4: item.numbers[3],
      drwt_no5: item.numbers[4],
      drwt_no6: item.numbers[5],
      bnus_no: item.bonus,
      first_win_amnt: 0,      // JSON에 없으니 0 처리
      first_przwner_co: 0     // JSON에 없으니 0 처리
    }));

    // 100개씩 나눠서 업로드 (한 번에 너무 많이 보내면 에러 날 수 있음)
    const chunkSize = 100;
    for (let i = 0; i < formattedData.length; i += chunkSize) {
      const chunk = formattedData.slice(i, i + chunkSize);
      const { error } = await supabase.from('lotto_history').upsert(chunk);
      if (error) {
        console.error(`❌ ${i}번째 묶음 업로드 실패:`, error);
      } else {
        console.log(`✅ ${i} ~ ${i + chunk.length} 번째 데이터 저장 완료`);
      }
    }

    return { success: true, count: formattedData.length };

  } catch (error) {
    console.error('Import Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

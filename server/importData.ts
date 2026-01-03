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
    // 프로젝트 내의 JSON 파일 경로
    const filePath = path.join(process.cwd(), 'server/data/lotto-history.json');
    
    // 파일 읽기
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found: server/data/lotto-history.json');
    }
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lottoData = JSON.parse(fileContent);

    console.log(`📂 파일에서 ${lottoData.length}개 데이터를 찾았습니다. Supabase로 업로드 중...`);

    // DB 컬럼명에 맞게 변환
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
      first_win_amnt: 0,      // JSON에 없으므로 0으로 처리
      first_przwner_co: 0     // JSON에 없으므로 0으로 처리
    }));

    // 한 번에 업로드 (Upsert)
    const { error } = await supabase
      .from('lotto_history')
      .upsert(formattedData);

    if (error) throw error;

    console.log('✅ 업로드 완료!');
    return { success: true, count: formattedData.length };

  } catch (error) {
    console.error('Import failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

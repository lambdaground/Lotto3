import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type Language = "ko" | "en" | "zh" | "ja";

interface Translations {
  [key: string]: {
    ko: string;
    en: string;
    zh: string;
    ja: string;
  };
}

export const translations: Translations = {
  appTitle: {
    ko: "로또 6/45",
    en: "Lotto 6/45",
    zh: "乐透 6/45",
    ja: "ロト 6/45",
  },
  dashboard: {
    ko: "대시보드",
    en: "Dashboard",
    zh: "仪表板",
    ja: "ダッシュボード",
  },
  generate: {
    ko: "번호 생성",
    en: "Generate",
    zh: "生成号码",
    ja: "番号生成",
  },
  statistics: {
    ko: "통계",
    en: "Statistics",
    zh: "统计",
    ja: "統計",
  },
  history: {
    ko: "당첨 이력",
    en: "History",
    zh: "历史记录",
    ja: "履歴",
  },
  latestWinning: {
    ko: "최신 당첨 번호",
    en: "Latest Winning Numbers",
    zh: "最新中奖号码",
    ja: "最新当選番号",
  },
  quickGenerate: {
    ko: "빠른 번호 생성",
    en: "Quick Generate",
    zh: "快速生成",
    ja: "クイック生成",
  },
  generateNumbers: {
    ko: "번호 생성하기",
    en: "Generate Numbers",
    zh: "生成号码",
    ja: "番号を生成",
  },
  regenerate: {
    ko: "다시 생성",
    en: "Regenerate",
    zh: "重新生成",
    ja: "再生成",
  },
  customSelection: {
    ko: "번호 직접 선택",
    en: "Custom Selection",
    zh: "自定义选择",
    ja: "カスタム選択",
  },
  selectUpTo5: {
    ko: "최대 5개까지 선택하세요",
    en: "Select up to 5 numbers",
    zh: "最多选择5个号码",
    ja: "最大5つまで選択",
  },
  selected: {
    ko: "선택됨",
    en: "Selected",
    zh: "已选择",
    ja: "選択済み",
  },
  clearAll: {
    ko: "모두 지우기",
    en: "Clear All",
    zh: "全部清除",
    ja: "すべてクリア",
  },
  autoFill: {
    ko: "자동 채우기",
    en: "Auto Fill",
    zh: "自动填充",
    ja: "自動入力",
  },
  hotNumbers: {
    ko: "자주 나온 번호",
    en: "Hot Numbers",
    zh: "热门号码",
    ja: "ホット番号",
  },
  coldNumbers: {
    ko: "적게 나온 번호",
    en: "Cold Numbers",
    zh: "冷门号码",
    ja: "コールド番号",
  },
  pairAnalysis: {
    ko: "조합 분석",
    en: "Pair Analysis",
    zh: "组合分析",
    ja: "ペア分析",
  },
  yearlyAnalysis: {
    ko: "연간 분석",
    en: "Yearly Analysis",
    zh: "年度分析",
    ja: "年間分析",
  },
  monthlyAnalysis: {
    ko: "월간 분석",
    en: "Monthly Analysis",
    zh: "月度分析",
    ja: "月間分析",
  },
  filterByPeriod: {
    ko: "기간별 필터",
    en: "Filter by Period",
    zh: "按时间筛选",
    ja: "期間でフィルター",
  },
  year: {
    ko: "연도",
    en: "Year",
    zh: "年份",
    ja: "年",
  },
  month: {
    ko: "월",
    en: "Month",
    zh: "月份",
    ja: "月",
  },
  allTime: {
    ko: "전체 기간",
    en: "All Time",
    zh: "全部时间",
    ja: "全期間",
  },
  allMonths: {
    ko: "전체 월",
    en: "All Months",
    zh: "全部月份",
    ja: "全ての月",
  },
  apply: {
    ko: "적용",
    en: "Apply",
    zh: "应用",
    ja: "適用",
  },
  drawNo: {
    ko: "회차",
    en: "Draw #",
    zh: "期号",
    ja: "回",
  },
  date: {
    ko: "날짜",
    en: "Date",
    zh: "日期",
    ja: "日付",
  },
  numbers: {
    ko: "당첨 번호",
    en: "Numbers",
    zh: "中奖号码",
    ja: "当選番号",
  },
  bonus: {
    ko: "보너스",
    en: "Bonus",
    zh: "特别号",
    ja: "ボーナス",
  },
  frequency: {
    ko: "출현 횟수",
    en: "Frequency",
    zh: "出现次数",
    ja: "出現回数",
  },
  rank: {
    ko: "순위",
    en: "Rank",
    zh: "排名",
    ja: "ランク",
  },
  number: {
    ko: "번호",
    en: "Number",
    zh: "号码",
    ja: "番号",
  },
  count: {
    ko: "횟수",
    en: "Count",
    zh: "次数",
    ja: "回数",
  },
  pair: {
    ko: "조합",
    en: "Pair",
    zh: "组合",
    ja: "ペア",
  },
  totalDraws: {
    ko: "총 추첨 횟수",
    en: "Total Draws",
    zh: "总抽奖次数",
    ja: "総抽選回数",
  },
  showingDraws: {
    ko: "회차 표시 중",
    en: "Showing draws",
    zh: "显示抽奖",
    ja: "表示中の抽選",
  },
  viewAll: {
    ko: "전체 보기",
    en: "View All",
    zh: "查看全部",
    ja: "すべて表示",
  },
  seeFullAnalysis: {
    ko: "전체 분석 보기",
    en: "See Full Analysis",
    zh: "查看完整分析",
    ja: "詳細分析を見る",
  },
  statisticsPreview: {
    ko: "통계 미리보기",
    en: "Statistics Preview",
    zh: "统计预览",
    ja: "統計プレビュー",
  },
  top5HotNumbers: {
    ko: "자주 나온 번호 TOP 5",
    en: "Top 5 Hot Numbers",
    zh: "热门号码 TOP 5",
    ja: "ホット番号 TOP 5",
  },
  loading: {
    ko: "로딩 중...",
    en: "Loading...",
    zh: "加载中...",
    ja: "読み込み中...",
  },
  error: {
    ko: "오류가 발생했습니다",
    en: "An error occurred",
    zh: "发生错误",
    ja: "エラーが発生しました",
  },
  noData: {
    ko: "데이터가 없습니다",
    en: "No data available",
    zh: "没有数据",
    ja: "データがありません",
  },
  generatedNumbers: {
    ko: "생성된 번호",
    en: "Generated Numbers",
    zh: "生成的号码",
    ja: "生成された番号",
  },
  welcome: {
    ko: "로또 6/45에 오신 것을 환영합니다",
    en: "Welcome to Lotto 6/45",
    zh: "欢迎来到乐透 6/45",
    ja: "ロト 6/45へようこそ",
  },
  welcomeDesc: {
    ko: "번호를 생성하고 당첨 통계를 확인하세요",
    en: "Generate numbers and check winning statistics",
    zh: "生成号码并查看中奖统计",
    ja: "番号を生成して当選統計を確認",
  },
  numberFrequency: {
    ko: "번호별 출현 빈도",
    en: "Number Frequency",
    zh: "号码频率",
    ja: "番号出現頻度",
  },
  topPairs: {
    ko: "자주 나온 조합",
    en: "Top Pairs",
    zh: "热门组合",
    ja: "人気ペア",
  },
  times: {
    ko: "회",
    en: "times",
    zh: "次",
    ja: "回",
  },
  lottoStores: {
    ko: "로또 명당",
    en: "Lucky Stores",
    zh: "幸运店铺",
    ja: "当選店舗",
  },
  nearbyStores: {
    ko: "근처 매장",
    en: "Nearby Stores",
    zh: "附近店铺",
    ja: "近くの店舗",
  },
  findNearby: {
    ko: "내 주변 찾기",
    en: "Find Nearby",
    zh: "查找附近",
    ja: "近くを探す",
  },
  topStores: {
    ko: "전국 1등 당첨 명당",
    en: "Top Winning Stores",
    zh: "全国顶级中奖店",
    ja: "全国1等当選店舗",
  },
  distanceKm: {
    ko: "km",
    en: "km",
    zh: "公里",
    ja: "km",
  },
  viewOnMap: {
    ko: "지도에서 보기",
    en: "View on Map",
    zh: "在地图上查看",
    ja: "地図で見る",
  },
  locationPermission: {
    ko: "위치 권한이 필요합니다",
    en: "Location permission required",
    zh: "需要位置权限",
    ja: "位置情報の許可が必要です",
  },
  gettingLocation: {
    ko: "위치 확인 중...",
    en: "Getting location...",
    zh: "获取位置中...",
    ja: "位置を取得中...",
  },
  wins: {
    ko: "당첨",
    en: "wins",
    zh: "中奖",
    ja: "当選",
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("ko");

  const t = useCallback(
    (key: string): string => {
      const translation = translations[key];
      if (!translation) {
        console.warn(`Missing translation for key: ${key}`);
        return key;
      }
      return translation[language] || translation.ko || key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

export const languageNames: Record<Language, string> = {
  ko: "한국어",
  en: "English",
  zh: "中文",
  ja: "日本語",
};

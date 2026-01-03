import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, RotateCw, Loader2, Flame, Snowflake, Dices } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LottoBalls } from "@/components/LottoBall";
import { NumberPicker } from "@/components/NumberPicker";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";

// 생성 모드 타입 정의
type StatMode = "none" | "hot" | "cold";

export default function Generate() {
  const { t } = useLanguage();
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [generatedNumbers, setGeneratedNumbers] = useState<number[]>([]);
  
  // 3가지 모드 상태 관리
  const [statMode, setStatMode] = useState<StatMode>("none");

  const generateMutation = useMutation({
    mutationFn: async (selected: number[]) => {
      // API 요청 시 모드(hot/cold) 정보 전달
      const response = await apiRequest("POST", "/api/lotto/generate", {
        selectedNumbers: selected,
        useStatistical: statMode !== "none", // 통계 사용 여부
        statType: statMode === "none" ? undefined : statMode, // 'hot' 또는 'cold'
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedNumbers(data.numbers);
    },
  });

  const handleToggle = (num: number) => {
    setSelectedNumbers((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]
    );
  };

  const handleClear = () => {
    setSelectedNumbers([]);
    setGeneratedNumbers([]);
  };

  const handleAutoFill = () => {
    generateMutation.mutate(selectedNumbers);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2 py-4">
        <h1 className="text-2xl md:text-4xl font-bold" data-testid="text-generate-title">
          {t("generate")}
        </h1>
        <p className="text-muted-foreground">
          {t("selectUpTo5")}
        </p>
      </div>

      {/* ✅ [수정됨] 2단 그리드 제거 -> 중앙 정렬된 단일 컬럼으로 변경 */}
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {t("customSelection")}
            </CardTitle>
            <CardDescription>{t("selectUpTo5")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* 생성 알고리즘 선택 버튼 */}
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                {/* ✅ 번역 적용: algoSelect */}
                <span className="text-sm font-medium">{t("algoSelect")}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={statMode === "none" ? "default" : "outline"}
                  onClick={() => setStatMode("none")}
                  className="flex flex-col h-auto py-2 px-1 gap-1"
                >
                  <Dices className="w-4 h-4" />
                  {/* ✅ 번역 적용: algoRandom */}
                  <span className="text-xs">{t("algoRandom")}</span>
                </Button>
                <Button
                  variant={statMode === "hot" ? "default" : "outline"}
                  onClick={() => setStatMode("hot")}
                  className={`flex flex-col h-auto py-2 px-1 gap-1 ${statMode === "hot" ? "bg-red-500 hover:bg-red-600 border-red-500" : "hover:text-red-500 hover:border-red-500"}`}
                >
                  <Flame className="w-4 h-4" />
                  {/* ✅ 번역 적용: algoHot */}
                  <span className="text-xs">{t("algoHot")}</span>
                </Button>
                <Button
                  variant={statMode === "cold" ? "default" : "outline"}
                  onClick={() => setStatMode("cold")}
                  className={`flex flex-col h-auto py-2 px-1 gap-1 ${statMode === "cold" ? "bg-blue-500 hover:bg-blue-600 border-blue-500" : "hover:text-blue-500 hover:border-blue-500"}`}
                >
                  <Snowflake className="w-4 h-4" />
                  {/* ✅ 번역 적용: algoCold */}
                  <span className="text-xs">{t("algoCold")}</span>
                </Button>
              </div>
              
              {/* ✅ 번역 적용: 설명 텍스트 */}
              <p className="text-xs text-muted-foreground text-center mt-2">
                {statMode === "none" && t("descRandom")}
                {statMode === "hot" && t("descHot")}
                {statMode === "cold" && t("descCold")}
              </p>
            </div>

            {/* 번호 선택기 */}
            <NumberPicker
              selectedNumbers={selectedNumbers}
              onToggle={handleToggle}
              onClear={handleClear}
              onAutoFill={handleAutoFill}
              disabled={generateMutation.isPending}
            />

            {generateMutation.isPending && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}

            {/* 결과 표시 */}
            {generatedNumbers.length > 0 && !generateMutation.isPending && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{t("generatedNumbers")}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleAutoFill}
                    data-testid="button-regenerate-custom"
                    aria-label={t("regenerate")}
                  >
                    <RotateCw className="w-4 h-4" />
                  </Button>
                </div>
                <LottoBalls numbers={generatedNumbers} size="lg" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

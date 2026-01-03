import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, RotateCw, Loader2, Flame, Snowflake, Dices } from "lucide-react"; // ✅ 아이콘 추가
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LottoBalls } from "@/components/LottoBall";
import { NumberPicker } from "@/components/NumberPicker";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";

function generateRandomNumbers(exclude: number[] = []): number[] {
  const nums: number[] = [...exclude];
  while (nums.length < 6) {
    const n = Math.floor(Math.random() * 45) + 1;
    if (!nums.includes(n)) nums.push(n);
  }
  return nums.sort((a, b) => a - b);
}

// ✅ 생성 모드 타입 정의
type StatMode = "none" | "hot" | "cold";

export default function Generate() {
  const { t } = useLanguage();
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [generatedNumbers, setGeneratedNumbers] = useState<number[]>([]);
  const [quickNumbers, setQuickNumbers] = useState<number[]>([]);
  
  // ✅ [수정 1] 단순 boolean 대신 3가지 모드 상태 관리
  const [statMode, setStatMode] = useState<StatMode>("none");

  const generateMutation = useMutation({
    mutationFn: async (selected: number[]) => {
      // ✅ [수정 2] API 요청 시 모드(hot/cold) 정보 전달
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

  const handleQuickGenerate = () => {
    setQuickNumbers(generateRandomNumbers());
  };

  const handleRegenerate = () => {
    setQuickNumbers(generateRandomNumbers());
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {t("customSelection")}
            </CardTitle>
            <CardDescription>{t("selectUpTo5")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* ✅ [수정 3] 생성 방식 선택 UI (버튼 3개) */}
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">생성 알고리즘 선택</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={statMode === "none" ? "default" : "outline"}
                  onClick={() => setStatMode("none")}
                  className="flex flex-col h-auto py-2 px-1 gap-1"
                >
                  <Dices className="w-4 h-4" />
                  <span className="text-xs">랜덤</span>
                </Button>
                <Button
                  variant={statMode === "hot" ? "default" : "outline"}
                  onClick={() => setStatMode("hot")}
                  className={`flex flex-col h-auto py-2 px-1 gap-1 ${statMode === "hot" ? "bg-red-500 hover:bg-red-600 border-red-500" : "hover:text-red-500 hover:border-red-500"}`}
                >
                  <Flame className="w-4 h-4" />
                  <span className="text-xs">자주 나옴</span>
                </Button>
                <Button
                  variant={statMode === "cold" ? "default" : "outline"}
                  onClick={() => setStatMode("cold")}
                  className={`flex flex-col h-auto py-2 px-1 gap-1 ${statMode === "cold" ? "bg-blue-500 hover:bg-blue-600 border-blue-500" : "hover:text-blue-500 hover:border-blue-500"}`}
                >
                  <Snowflake className="w-4 h-4" />
                  <span className="text-xs">적게 나옴</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                {statMode === "none" && "순수 무작위로 번호를 생성합니다."}
                {statMode === "hot" && "과거 당첨 이력에서 가장 많이 나온 번호 위주로 조합합니다."}
                {statMode === "cold" && "과거 당첨 이력에서 잘 나오지 않았던 번호 위주로 조합합니다."}
              </p>
            </div>

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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {t("quickGenerate")}
            </CardTitle>
            <CardDescription>{t("generateNumbers")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button
              className="w-full h-12 text-lg font-semibold"
              onClick={handleQuickGenerate}
              data-testid="button-quick-generate-page"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              {t("generateNumbers")}
            </Button>

            {quickNumbers.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{t("generatedNumbers")}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRegenerate}
                    data-testid="button-regenerate-quick"
                    aria-label={t("regenerate")}
                  >
                    <RotateCw className="w-4 h-4" />
                  </Button>
                </div>
                <LottoBalls numbers={quickNumbers} size="lg" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

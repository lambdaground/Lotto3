import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, RotateCw, Loader2 } from "lucide-react";
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

export default function Generate() {
  const { t } = useLanguage();
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [generatedNumbers, setGeneratedNumbers] = useState<number[]>([]);
  const [quickNumbers, setQuickNumbers] = useState<number[]>([]);
  const [useStatisticalGeneration, setUseStatisticalGeneration] = useState(false);

  const generateMutation = useMutation({
    mutationFn: async (selected: number[]) => {
      const response = await apiRequest("POST", "/api/lotto/generate", {
        selectedNumbers: selected,
        useStatistical: useStatisticalGeneration,
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
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-medium">통계 기반 생성</p>
                <p className="text-xs text-muted-foreground">
                  선택한 번호와 자주 함께 나온 번호 우선 선택
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useStatisticalGeneration}
                  onChange={(e) => setUseStatisticalGeneration(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
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

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h3 className="font-medium mb-2">{t("history")}</h3>
              <p className="text-sm text-muted-foreground">
                {quickNumbers.length === 0 && generatedNumbers.length === 0
                  ? t("noData")
                  : `${[...new Set([...quickNumbers, ...generatedNumbers])].length} ${t("numbers")} generated`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

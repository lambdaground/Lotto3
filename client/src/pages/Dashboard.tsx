import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Sparkles, TrendingUp, History, RotateCw, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LottoBalls } from "@/components/LottoBall";
import { useLanguage } from "@/lib/i18n";
import type { LottoDraw, Statistics } from "@shared/schema";
import { useState } from "react";

function generateRandomNumbers(): number[] {
  const nums: number[] = [];
  while (nums.length < 6) {
    const n = Math.floor(Math.random() * 45) + 1;
    if (!nums.includes(n)) nums.push(n);
  }
  return nums.sort((a, b) => a - b);
}

export default function Dashboard() {
  const { t } = useLanguage();
  const [generatedNumbers, setGeneratedNumbers] = useState<number[]>([]);

  const { data: latestDraw, isLoading: loadingLatest } = useQuery<LottoDraw>({
    queryKey: ["/api/lotto/latest"],
  });

  const { data: statistics, isLoading: loadingStats } = useQuery<Statistics>({
    queryKey: ["/api/lotto/statistics"],
  });

  const handleGenerate = () => {
    setGeneratedNumbers(generateRandomNumbers());
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="text-center space-y-2 py-4 md:py-6">
        <h1 className="text-3xl md:text-5xl font-bold" data-testid="text-welcome-title">
          {t("welcome")}
        </h1>
        <p className="text-muted-foreground text-base md:text-lg">
          {t("welcomeDesc")}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="md:col-span-1 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                {t("quickGenerate")}
              </CardTitle>
              <CardDescription className="mt-1">
                {t("generateNumbers")}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full h-12 text-lg font-semibold"
              onClick={handleGenerate}
              data-testid="button-quick-generate"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              {t("generateNumbers")}
            </Button>

            {generatedNumbers.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {t("generatedNumbers")}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleGenerate}
                    data-testid="button-regenerate"
                    aria-label={t("regenerate")}
                  >
                    <RotateCw className="w-4 h-4" />
                  </Button>
                </div>
                <LottoBalls numbers={generatedNumbers} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-1 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                {t("latestWinning")}
              </CardTitle>
              {latestDraw && (
                <CardDescription className="mt-1">
                  {t("drawNo")} {latestDraw.drawNo} · {latestDraw.date}
                </CardDescription>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingLatest ? (
              <div className="flex gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="w-12 h-12 rounded-full" />
                ))}
              </div>
            ) : latestDraw ? (
              <LottoBalls numbers={latestDraw.numbers} bonus={latestDraw.bonus} />
            ) : (
              <p className="text-muted-foreground">{t("noData")}</p>
            )}
            <Link href="/history">
              <Button variant="outline" className="w-full" data-testid="link-view-history">
                {t("viewAll")}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                {t("statisticsPreview")}
              </CardTitle>
              <CardDescription className="mt-1">
                {t("top5HotNumbers")}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingStats ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : statistics ? (
              <div className="space-y-2">
                {statistics.hotNumbers.slice(0, 5).map((item, idx) => (
                  <div
                    key={item.number}
                    className="flex items-center gap-3"
                    data-testid={`stat-hot-${item.number}`}
                  >
                    <span className="text-sm font-medium text-muted-foreground w-4">
                      {idx + 1}
                    </span>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getBallColorClass(item.number)}`}
                    >
                      {item.number}
                    </div>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {item.count}{t("times")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">{t("noData")}</p>
            )}
            <Link href="/statistics">
              <Button variant="outline" className="w-full" data-testid="link-full-analysis">
                {t("seeFullAnalysis")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("customSelection")}</CardTitle>
          <CardDescription>{t("selectUpTo5")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/generate">
            <Button className="w-full md:w-auto" data-testid="link-custom-generate">
              <Sparkles className="w-4 h-4 mr-2" />
              {t("customSelection")}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function getBallColorClass(num: number): string {
  if (num >= 1 && num <= 10) return "bg-yellow-400 text-yellow-950";
  if (num >= 11 && num <= 20) return "bg-blue-500 text-white";
  if (num >= 21 && num <= 30) return "bg-red-500 text-white";
  if (num >= 31 && num <= 40) return "bg-gray-500 text-white";
  return "bg-green-500 text-white";
}

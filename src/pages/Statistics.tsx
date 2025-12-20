import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Calendar, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/i18n";
import type { Statistics, NumberFrequency, PairFrequency } from "@shared/schema";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

function getBallColor(num: number): string {
  if (num >= 1 && num <= 10) return "#facc15";
  if (num >= 11 && num <= 20) return "#3b82f6";
  if (num >= 21 && num <= 30) return "#ef4444";
  if (num >= 31 && num <= 40) return "#6b7280";
  return "#22c55e";
}

function getBallColorClass(num: number): string {
  if (num >= 1 && num <= 10) return "bg-yellow-400 text-yellow-950";
  if (num >= 11 && num <= 20) return "bg-blue-500 text-white";
  if (num >= 21 && num <= 30) return "bg-red-500 text-white";
  if (num >= 31 && num <= 40) return "bg-gray-500 text-white";
  return "bg-green-500 text-white";
}

export default function StatisticsPage() {
  const { t } = useLanguage();
  const [year, setYear] = useState<string>("all");
  const [month, setMonth] = useState<string>("all");

  const queryParams = new URLSearchParams();
  if (year !== "all") queryParams.set("year", year);
  if (month !== "all") queryParams.set("month", month);

  const { data: statistics, isLoading, refetch } = useQuery<Statistics>({
    queryKey: ["/api/lotto/statistics", year, month],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (year !== "all") params.set("year", year);
      if (month !== "all") params.set("month", month);
      const url = `/api/lotto/statistics${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch statistics");
      return res.json();
    },
  });

  const years = statistics?.yearRange
    ? Array.from(
        { length: statistics.yearRange.max - statistics.yearRange.min + 1 },
        (_, i) => statistics.yearRange.min + i
      ).reverse()
    : [];

  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  const handleApplyFilter = () => {
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2 py-4">
        <h1 className="text-2xl md:text-4xl font-bold" data-testid="text-statistics-title">
          {t("statistics")}
        </h1>
        <p className="text-muted-foreground">{t("filterByPeriod")}</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="w-4 h-4" />
            {t("filterByPeriod")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("year")}</label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="w-[140px]" data-testid="select-year">
                  <SelectValue placeholder={t("allTime")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allTime")}</SelectItem>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("month")}</label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="w-[140px]" data-testid="select-month">
                  <SelectValue placeholder={t("allMonths")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allMonths")}</SelectItem>
                  {months.map((m) => (
                    <SelectItem key={m} value={m.toString()}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleApplyFilter} data-testid="button-apply-filter">
              {t("apply")}
            </Button>

            {statistics && (
              <div className="text-sm text-muted-foreground ml-auto">
                {t("totalDraws")}: <strong>{statistics.totalDraws}</strong>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="hot" className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="hot" data-testid="tab-hot">
            <TrendingUp className="w-4 h-4 mr-2" />
            {t("hotNumbers")}
          </TabsTrigger>
          <TabsTrigger value="cold" data-testid="tab-cold">
            <TrendingDown className="w-4 h-4 mr-2" />
            {t("coldNumbers")}
          </TabsTrigger>
          <TabsTrigger value="pairs" data-testid="tab-pairs">
            {t("pairAnalysis")}
          </TabsTrigger>
          <TabsTrigger value="frequency" data-testid="tab-frequency">
            {t("numberFrequency")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hot" className="space-y-6">
          <HotColdList
            data={statistics?.hotNumbers}
            isLoading={isLoading}
            t={t}
            type="hot"
          />
        </TabsContent>

        <TabsContent value="cold" className="space-y-6">
          <HotColdList
            data={statistics?.coldNumbers}
            isLoading={isLoading}
            t={t}
            type="cold"
          />
        </TabsContent>

        <TabsContent value="pairs" className="space-y-6">
          <PairsList data={statistics?.topPairs} isLoading={isLoading} t={t} />
        </TabsContent>

        <TabsContent value="frequency" className="space-y-6">
          <FrequencyChart
            data={statistics?.numberFrequencies}
            isLoading={isLoading}
            t={t}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HotColdList({
  data,
  isLoading,
  t,
  type,
}: {
  data?: NumberFrequency[];
  isLoading: boolean;
  t: (key: string) => string;
  type: "hot" | "cold";
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">{t("noData")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {type === "hot" ? (
            <TrendingUp className="w-5 h-5 text-red-500" />
          ) : (
            <TrendingDown className="w-5 h-5 text-blue-500" />
          )}
          {type === "hot" ? t("hotNumbers") : t("coldNumbers")}
        </CardTitle>
        <CardDescription>
          Top 10 {type === "hot" ? "most" : "least"} frequent numbers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2">
          {data.slice(0, 10).map((item, idx) => (
            <div
              key={item.number}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
              data-testid={`stat-${type}-${item.number}`}
            >
              <span className="text-sm font-bold text-muted-foreground w-6">
                #{idx + 1}
              </span>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${getBallColorClass(item.number)}`}
              >
                {item.number}
              </div>
              <div className="flex-1">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${type === "hot" ? "bg-red-500" : "bg-blue-500"}`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-medium w-16 text-right">
                {item.count} {t("times")}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PairsList({
  data,
  isLoading,
  t,
}: {
  data?: PairFrequency[];
  isLoading: boolean;
  t: (key: string) => string;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 20 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">{t("noData")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("topPairs")}</CardTitle>
        <CardDescription>Most frequently appearing number pairs</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {data.slice(0, 20).map((item, idx) => (
            <div
              key={`${item.pair[0]}-${item.pair[1]}`}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              data-testid={`pair-${item.pair[0]}-${item.pair[1]}`}
            >
              <div className="flex items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getBallColorClass(item.pair[0])}`}
                >
                  {item.pair[0]}
                </div>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getBallColorClass(item.pair[1])}`}
                >
                  {item.pair[1]}
                </div>
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                {item.count}x
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FrequencyChart({
  data,
  isLoading,
  t,
}: {
  data?: NumberFrequency[];
  isLoading: boolean;
  t: (key: string) => string;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">{t("noData")}</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item) => ({
    number: item.number.toString(),
    count: item.count,
    fill: getBallColor(item.number),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("numberFrequency")}</CardTitle>
        <CardDescription>Frequency of each number (1-45)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="number"
                tick={{ fontSize: 10 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

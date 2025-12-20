import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History as HistoryIcon, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { LottoBalls } from "@/components/LottoBall";
import { useLanguage } from "@/lib/i18n";
import type { LottoDraw } from "@shared/schema";

interface HistoryResponse {
  draws: LottoDraw[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function HistoryPage() {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const [year, setYear] = useState<string>("all");
  const pageSize = 20;

  const { data, isLoading } = useQuery<HistoryResponse>({
    queryKey: ["/api/lotto/history", page, year],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (year !== "all") params.set("year", year);
      const res = await fetch(`/api/lotto/history?${params}`);
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json();
    },
  });

  const years = Array.from(
    { length: new Date().getFullYear() - 2002 + 1 },
    (_, i) => 2002 + i
  ).reverse();

  const handlePreviousPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (data && page < data.totalPages) setPage(page + 1);
  };

  const handleYearChange = (value: string) => {
    setYear(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2 py-4">
        <h1 className="text-2xl md:text-4xl font-bold" data-testid="text-history-title">
          {t("history")}
        </h1>
        <p className="text-muted-foreground">{t("viewAll")}</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HistoryIcon className="w-5 h-5" />
              {t("history")}
            </CardTitle>
            {data && (
              <CardDescription>
                {t("showingDraws")}: {data.draws.length} / {data.total}
              </CardDescription>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Select value={year} onValueChange={handleYearChange}>
              <SelectTrigger className="w-[120px]" data-testid="select-history-year">
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
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : data && data.draws.length > 0 ? (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        {t("drawNo")}
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        {t("date")}
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        {t("numbers")}
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        {t("bonus")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.draws.map((draw, idx) => (
                      <tr
                        key={draw.drawNo}
                        className={idx % 2 === 0 ? "bg-muted/30" : ""}
                        data-testid={`row-draw-${draw.drawNo}`}
                      >
                        <td className="py-4 px-4 font-medium">{draw.drawNo}</td>
                        <td className="py-4 px-4 text-muted-foreground">{draw.date}</td>
                        <td className="py-4 px-4">
                          <LottoBalls numbers={draw.numbers} size="sm" />
                        </td>
                        <td className="py-4 px-4">
                          <LottoBalls numbers={[]} bonus={draw.bonus} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-4">
                {data.draws.map((draw) => (
                  <Card key={draw.drawNo} data-testid={`card-draw-${draw.drawNo}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold">
                          {t("drawNo")} {draw.drawNo}
                        </span>
                        <span className="text-sm text-muted-foreground">{draw.date}</span>
                      </div>
                      <LottoBalls numbers={draw.numbers} bonus={draw.bonus} size="sm" />
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handlePreviousPage}
                  disabled={page === 1}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>

                <span className="text-sm text-muted-foreground">
                  Page {page} of {data.totalPages}
                </span>

                <Button
                  variant="outline"
                  onClick={handleNextPage}
                  disabled={page >= data.totalPages}
                  data-testid="button-next-page"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8">{t("noData")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

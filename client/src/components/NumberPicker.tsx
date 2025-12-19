import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { RotateCcw, Sparkles } from "lucide-react";

interface NumberPickerProps {
  selectedNumbers: number[];
  onToggle: (num: number) => void;
  onClear: () => void;
  onAutoFill: () => void;
  disabled?: boolean;
}

function getPickerBallColor(num: number, isSelected: boolean): string {
  if (!isSelected) {
    return "bg-muted text-muted-foreground hover-elevate active-elevate-2";
  }
  if (num >= 1 && num <= 10) return "bg-yellow-400 text-yellow-950";
  if (num >= 11 && num <= 20) return "bg-blue-500 text-white";
  if (num >= 21 && num <= 30) return "bg-red-500 text-white";
  if (num >= 31 && num <= 40) return "bg-gray-500 text-white";
  return "bg-green-500 text-white";
}

export function NumberPicker({
  selectedNumbers,
  onToggle,
  onClear,
  onAutoFill,
  disabled = false,
}: NumberPickerProps) {
  const { t } = useLanguage();
  const numbers = Array.from({ length: 45 }, (_, i) => i + 1);
  const canSelect = selectedNumbers.length < 5;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {t("selectUpTo5")} ({t("selected")}: {selectedNumbers.length}/5)
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClear}
            disabled={selectedNumbers.length === 0 || disabled}
            data-testid="button-clear-selection"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            {t("clearAll")}
          </Button>
          <Button
            size="sm"
            onClick={onAutoFill}
            disabled={disabled}
            data-testid="button-auto-fill"
          >
            <Sparkles className="w-4 h-4 mr-1" />
            {t("autoFill")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-5 md:grid-cols-9 gap-2">
        {numbers.map((num) => {
          const isSelected = selectedNumbers.includes(num);
          const isDisabled = !isSelected && !canSelect;

          return (
            <button
              key={num}
              onClick={() => !isDisabled && onToggle(num)}
              disabled={isDisabled || disabled}
              className={cn(
                "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-sm md:text-base transition-all",
                getPickerBallColor(num, isSelected),
                isDisabled && "opacity-40 cursor-not-allowed",
                isSelected && "ring-2 ring-offset-2 ring-primary shadow-md scale-105"
              )}
              data-testid={`picker-ball-${num}`}
              aria-pressed={isSelected}
              aria-label={`Number ${num}${isSelected ? " (selected)" : ""}`}
            >
              {num}
            </button>
          );
        })}
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";

interface LottoBallProps {
  number: number;
  size?: "sm" | "md" | "lg";
  isBonus?: boolean;
  className?: string;
}

function getBallColor(num: number): string {
  if (num >= 1 && num <= 10) return "bg-yellow-400 text-yellow-950";
  if (num >= 11 && num <= 20) return "bg-blue-500 text-white";
  if (num >= 21 && num <= 30) return "bg-red-500 text-white";
  if (num >= 31 && num <= 40) return "bg-gray-500 text-white";
  return "bg-green-500 text-white";
}

export function LottoBall({ number, size = "md", isBonus = false, className }: LottoBallProps) {
  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-12 h-12 text-xl md:w-14 md:h-14 md:text-2xl",
    lg: "w-14 h-14 text-2xl md:w-16 md:h-16 md:text-3xl",
  };

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold shadow-md transition-transform",
        sizeClasses[size],
        getBallColor(number),
        isBonus && "ring-2 ring-offset-2 ring-primary",
        className
      )}
      role="button"
      aria-label={`${isBonus ? "Bonus " : ""}Number ${number}`}
      data-testid={`ball-${number}${isBonus ? "-bonus" : ""}`}
    >
      {number}
    </div>
  );
}

interface LottoBallsProps {
  numbers: number[];
  bonus?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LottoBalls({ numbers, bonus, size = "md", className }: LottoBallsProps) {
  return (
    <div className={cn("flex items-center gap-2 md:gap-3 flex-wrap", className)}>
      {numbers.map((num, idx) => (
        <LottoBall key={`${num}-${idx}`} number={num} size={size} />
      ))}
      {bonus !== undefined && (
        <>
          <span className="text-muted-foreground text-xl font-bold mx-1">+</span>
          <LottoBall number={bonus} size={size} isBonus />
        </>
      )}
    </div>
  );
}

// src/lib/lotto.ts
export function getLatestDrwNo(): number {
  const now = new Date();
  const baseDate = new Date('2002-12-07T20:40:00'); // 1회차
  
  const diffTime = now.getTime() - baseDate.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  let round = Math.floor(diffDays / 7) + 1;

  // 토요일 밤 9시 전이면 아직 결과 안 나옴 -> 저번 주 회차
  const dayOfWeek = now.getDay();
  const currentHour = now.getHours();

  if (dayOfWeek === 6 && currentHour < 21) {
    round = round - 1;
  }
  
  return round;
}

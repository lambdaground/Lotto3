import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";

// ------------------------------------------------------------------
// [1] 데이터 타입 정의
// ------------------------------------------------------------------
interface LottoDraw {
  drawNo: number;
  date: string;
  numbers: number[];
  bonus: number;
}

interface NumberFrequency {
  number: number;
  count: number;
  percentage: number;
}

interface PairFrequency {
  pair: [number, number];
  count: number;
}

// ------------------------------------------------------------------
// [2] 전역 변수 및 데이터 관리 함수 (Load & Save)
// ------------------------------------------------------------------
let lottoData: LottoDraw[] = [];
const DATA_FILE_PATH = path.join(process.cwd(), "server/data/lotto-history.json");

function loadLottoData() {
  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const rawData = fs.readFileSync(DATA_FILE_PATH, "utf-8");
      lottoData = JSON.parse(rawData);
      lottoData.sort((a, b) => b.drawNo - a.drawNo);
      console.log(`Loaded ${lottoData.length} lotto draws`);
    } else {
      console.log("No data file found, starting with empty list.");
      lottoData = [];
    }
  } catch (error) {
    console.error("Failed to load lotto data:", error);
    lottoData = [];
  }
}

// ✅ [신규 기능] API에서 받아온 데이터를 파일에 영구 저장하는 함수
function saveLottoData() {
  try {
    lottoData.sort((a, b) => b.drawNo - a.drawNo);
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(lottoData, null, 2), "utf-8");
    console.log("Successfully saved updated lotto data to file.");
  } catch (error) {
    console.error("Failed to save lotto data:", error);
  }
}

// ✅ [신규 기능] 오늘 날짜 기준 예상 회차 계산 함수
function getExpectedDrwNo(): number {
  const now = new Date();
  const baseDate = new Date('2002-12-07T20:40:00'); // 1회차
  const diffTime = now.getTime() - baseDate.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  let round = Math.floor(diffDays / 7) + 1;
  return round;
}

// ------------------------------------------------------------------
// [3] 통계 및 번호 생성 로직 (기존 코드 유지)
// ------------------------------------------------------------------
function generateRandomNumbers(selectedNumbers: number[] = []): number[] {
  const nums = [...selectedNumbers];
  while (nums.length < 6) {
    const n = Math.floor(Math.random() * 45) + 1;
    if (!nums.includes(n)) nums.push(n);
  }
  return nums.sort((a, b) => a - b);
}

function calculateStatistics(draws: LottoDraw[]) {
  const numberCounts = new Map<number, number>();
  for (let i = 1; i <= 45; i++) numberCounts.set(i, 0);

  for (const draw of draws) {
    for (const num of draw.numbers) {
      numberCounts.set(num, (numberCounts.get(num) || 0) + 1);
    }
  }

  const totalDraws = draws.length;
  const maxCount = Math.max(...numberCounts.values());

  const numberFrequencies: NumberFrequency[] = [];
  for (let i = 1; i <= 45; i++) {
    const count = numberCounts.get(i) || 0;
    numberFrequencies.push({
      number: i,
      count,
      percentage: maxCount > 0 ? (count / maxCount) * 100 : 0,
    });
  }

  const hotNumbers = [...numberFrequencies].sort((a, b) => b.count - a.count).slice(0, 10);
  const coldNumbers = [...numberFrequencies].sort((a, b) => a.count - b.count).slice(0, 10);

  const pairCounts = new Map<string, number>();
  for (const draw of draws) {
    const nums = draw.numbers.sort((a, b) => a - b);
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        const key = `${nums[i]}-${nums[j]}`;
        pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
      }
    }
  }

  const topPairs: PairFrequency[] = [...pairCounts.entries()]
    .map(([key, count]) => {
      const [a, b] = key.split("-").map(Number);
      return { pair: [a, b] as [number, number], count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);

  const years = draws.map((d) => new Date(d.date).getFullYear());
  const yearRange = {
    min: Math.min(...years),
    max: Math.max(...years),
  };

  return { totalDraws, numberFrequencies, hotNumbers, coldNumbers, topPairs, yearRange };
}

function filterDrawsByPeriod(draws: LottoDraw[], year?: number, month?: number): LottoDraw[] {
  return draws.filter((draw) => {
    const drawDate = new Date(draw.date);
    if (year && drawDate.getFullYear() !== year) return false;
    if (month && drawDate.getMonth() + 1 !== month) return false;
    return true;
  });
}

function getPairScores(selectedNumbers: number[]): Map<number, number> {
  const pairScores = new Map<number, number>();
  for (const draw of lottoData) {
    const nums = draw.numbers;
    for (const selected of selectedNumbers) {
      if (nums.includes(selected)) {
        for (const num of nums) {
          if (!selectedNumbers.includes(num)) {
            pairScores.set(num, (pairScores.get(num) || 0) + 1);
          }
        }
      }
    }
  }
  return pairScores;
}

function getIndividualPairScores(num: number): Map<number, number> {
  const scores = new Map<number, number>();
  for (const draw of lottoData) {
    if (draw.numbers.includes(num)) {
      for (const n of draw.numbers) {
        if (n !== num) scores.set(n, (scores.get(n) || 0) + 1);
      }
    }
  }
  return scores;
}

function selectBestNumbersForPairing(selectedNumbers: number[]): number[] {
  const numberScores: { num: number; totalScore: number }[] = [];
  for (const num of selectedNumbers) {
    const pairScores = getIndividualPairScores(num);
    let totalScore = 0;
    for (const [, score] of pairScores) totalScore += score;
    numberScores.push({ num, totalScore });
  }
  numberScores.sort((a, b) => b.totalScore - a.totalScore);
  return numberScores.slice(0, 2).map(n => n.num);
}

function generateStatisticalNumbers(selectedNumbers: number[] = []): number[] {
  const selectedCount = selectedNumbers.length;
  const generatedNumbers: number[] = [...selectedNumbers];

  if (selectedCount === 0) {
    const stats = calculateStatistics(lottoData);
    const hotNums = stats.hotNumbers.slice(0, 6).map(h => h.number);
    return hotNums.sort((a, b) => a - b);
  }

  let numbersForPairing: number[];
  let statisticalSlots: number;

  if (selectedCount <= 2) {
    numbersForPairing = selectedNumbers;
    statisticalSlots = 2;
  } else if (selectedCount === 3) {
    numbersForPairing = selectedNumbers;
    statisticalSlots = 3;
  } else {
    numbersForPairing = selectBestNumbersForPairing(selectedNumbers);
    statisticalSlots = 6 - selectedCount;
  }

  const pairScores = getPairScores(numbersForPairing);
  const sortedByPair = Array.from(pairScores.entries())
    .filter(([num]) => !selectedNumbers.includes(num))
    .sort(([, a], [, b]) => b - a)
    .map(([num]) => num);

  let addedStatistical = 0;
  for (const num of sortedByPair) {
    if (addedStatistical >= statisticalSlots) break;
    if (!generatedNumbers.includes(num)) {
      generatedNumbers.push(num);
      addedStatistical++;
    }
  }

  while (generatedNumbers.length < 6) {
    const randomNum = Math.floor(Math.random() * 45) + 1;
    if (!generatedNumbers.includes(randomNum)) {
      generatedNumbers.push(randomNum);
    }
  }
  return generatedNumbers.sort((a, b) => a - b);
}

// ------------------------------------------------------------------
// [4] 라우터 등록 (API Endpoints)
// ------------------------------------------------------------------
export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // 서버 시작 시 파일에서 데이터 로드
  loadLottoData();

  // ✅ [수정됨] 최신 로또 번호 조회 및 자동 업데이트 API
  app.get("/api/lotto/latest", async (req, res) => {
    try {
      // 1. 현재 시간 및 요일 확인
      const now = new Date();
      const dayOfWeek = now.getDay(); // 6 = 토요일
      const hours = now.getHours();
      const minutes = now.getMinutes();
      
      // 2. 오늘 기준 예상 회차 계산
      const expectedDrwNo = getExpectedDrwNo();

      // 3. 파일에 이미 해당 회차 데이터가 있는지 확인
      const existingData = lottoData.find(d => d.drawNo === expectedDrwNo);

      // [Case 1] 파일에 데이터가 있으면 바로 반환
      if (existingData) {
        return res.json(existingData);
      }

      // [Case 2] 파일에 없고, 업데이트 가능한 시간인지 확인
      // 조건: 토요일 오후 9시 50분(21:50) 이후, 또는 일~금요일
      let canUpdate = false;
      if (dayOfWeek === 6) {
        if (hours > 21 || (hours === 21 && minutes >= 50)) {
          canUpdate = true;
        }
      } else {
        canUpdate = true; // 토요일이 아니면 언제든 업데이트 가능
      }

      // [업데이트 실행]
      if (canUpdate) {
        console.log(`Checking external API for draw No. ${expectedDrwNo}...`);
        const response = await fetch(`https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${expectedDrwNo}`);
        const data = await response.json();

        if (data.returnValue === "success") {
          const newDraw: LottoDraw = {
            drawNo: data.drwNo,
            date: data.drwNoDate,
            numbers: [data.drwtNo1, data.drwtNo2, data.drwtNo3, data.drwtNo4, data.drwtNo5, data.drwtNo6],
            bonus: data.bnusNo
          };

          // 메모리에 추가하고 파일에 저장
          lottoData.unshift(newDraw);
          saveLottoData(); // 🔥 파일 저장 실행
          
          return res.json(newDraw);
        }
      }

      // [Fallback] 아직 업데이트 시간이 아니거나 데이터가 없으면 기존 최신 데이터 반환
      if (lottoData.length > 0) {
        return res.json(lottoData[0]);
      } else {
        return res.status(404).json({ error: "No data available" });
      }

    } catch (error) {
      console.error("Error in /api/lotto/latest:", error);
      if (lottoData.length > 0) res.json(lottoData[0]);
      else res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // 기존 API 유지: 전체 이력 조회
  app.get("/api/lotto/history", (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;

    let filtered = lottoData;
    if (year) {
      filtered = filterDrawsByPeriod(lottoData, year);
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const draws = filtered.slice(start, start + pageSize);

    res.json({ draws, total, page, pageSize, totalPages });
  });

  // 기존 API 유지: 통계 조회
  app.get("/api/lotto/statistics", (req, res) => {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;

    const filtered = filterDrawsByPeriod(lottoData, year, month);
    const stats = calculateStatistics(filtered.length > 0 ? filtered : lottoData);

    res.json(stats);
  });

  // 기존 API 유지: 번호 생성
  app.post("/api/lotto/generate", (req, res) => {
    const { selectedNumbers = [], useStatistical = false } = req.body;

    if (!Array.isArray(selectedNumbers)) return res.status(400).json({ error: "selectedNumbers must be an array" });
    if (selectedNumbers.length > 5) return res.status(400).json({ error: "Maximum 5 numbers can be selected" });
    for (const num of selectedNumbers) {
      if (typeof num !== "number" || num < 1 || num > 45) return res.status(400).json({ error: "Numbers must be between 1 and 45" });
    }

    const uniqueSelected = [...new Set(selectedNumbers)];
    const numbers = useStatistical 
      ? generateStatisticalNumbers(uniqueSelected)
      : generateRandomNumbers(uniqueSelected);

    res.json({ numbers });
  });

  return httpServer;
}

import type { Grade } from "@/types/report";

export const GRADE_THRESHOLDS: Record<Grade, number> = {
  "A+": 92,
  A: 85,
  "B+": 78,
  B: 70,
  "C+": 62,
  C: 55,
  D: 40,
  F: 0,
};

export function getGrade(score: number): Grade {
  const grades = Object.keys(GRADE_THRESHOLDS) as Grade[];
  for (const grade of grades) {
    if (score >= GRADE_THRESHOLDS[grade]) return grade;
  }
  return "F";
}

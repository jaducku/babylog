/**
 * WHO 아동 성장 기준 — 월령별 체중(kg) 3·50·97 백분위 (0~12개월).
 * 소수 첫째 자리로 반올림한 참고값.
 */
export const WHO_WEIGHT = {
  girl: {
    p3: [2.4, 3.2, 4.0, 4.6, 5.1, 5.5, 5.8, 6.1, 6.3, 6.6, 6.8, 7.0, 7.1],
    p50: [3.2, 4.2, 5.1, 5.8, 6.4, 6.9, 7.3, 7.6, 7.9, 8.2, 8.5, 8.7, 8.9],
    p97: [4.2, 5.4, 6.5, 7.4, 8.1, 8.7, 9.2, 9.6, 10.0, 10.4, 10.7, 11.0, 11.3],
  },
  boy: {
    p3: [2.5, 3.4, 4.4, 5.1, 5.6, 6.1, 6.4, 6.7, 7.0, 7.2, 7.5, 7.7, 7.8],
    p50: [3.3, 4.5, 5.6, 6.4, 7.0, 7.5, 7.9, 8.3, 8.6, 8.9, 9.2, 9.4, 9.6],
    p97: [4.3, 5.7, 7.0, 7.9, 8.6, 9.2, 9.7, 10.2, 10.5, 10.9, 11.2, 11.5, 11.8],
  },
} as const

/** 월령(소수)에 대한 선형 보간 */
export function whoAt(series: readonly number[], month: number) {
  const m = Math.max(0, Math.min(series.length - 1, month))
  const i = Math.floor(m)
  const f = m - i
  const a = series[i]
  const b = series[Math.min(series.length - 1, i + 1)]
  return a + (b - a) * f
}

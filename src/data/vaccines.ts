/**
 * 국가예방접종(NIP) 표준 일정 — 생후 18개월까지.
 * 질병관리청 표준 접종 시기를 단순화한 참고용 데이터.
 * 실제 접종 일정은 소아과와 상의해야 한다.
 */
export interface VaccineDose {
  id: string
  name: string
  short: string
  dose: string
  /** 권장 시작 월령 */
  month: number
  /** 첫 주 이내처럼 월보다 짧은 기한이 있는 경우 (일) */
  dueDays?: number
  note?: string
}

export const VACCINES: VaccineDose[] = [
  { id: 'hepb-1', name: 'B형간염', short: 'HepB', dose: '1차', month: 0, dueDays: 1, note: '출생 직후' },
  { id: 'bcg-1', name: '결핵', short: 'BCG', dose: '1회', month: 0, dueDays: 28, note: '4주 이내' },
  { id: 'hepb-2', name: 'B형간염', short: 'HepB', dose: '2차', month: 1 },
  { id: 'dtap-1', name: 'DTaP', short: 'DTaP', dose: '1차', month: 2 },
  { id: 'ipv-1', name: '폴리오', short: 'IPV', dose: '1차', month: 2 },
  { id: 'hib-1', name: 'b형 헤모필루스', short: 'Hib', dose: '1차', month: 2 },
  { id: 'pcv-1', name: '폐렴구균', short: 'PCV', dose: '1차', month: 2 },
  { id: 'rv-1', name: '로타바이러스', short: 'RV', dose: '1차', month: 2 },
  { id: 'dtap-2', name: 'DTaP', short: 'DTaP', dose: '2차', month: 4 },
  { id: 'ipv-2', name: '폴리오', short: 'IPV', dose: '2차', month: 4 },
  { id: 'hib-2', name: 'b형 헤모필루스', short: 'Hib', dose: '2차', month: 4 },
  { id: 'pcv-2', name: '폐렴구균', short: 'PCV', dose: '2차', month: 4 },
  { id: 'rv-2', name: '로타바이러스', short: 'RV', dose: '2차', month: 4 },
  { id: 'hepb-3', name: 'B형간염', short: 'HepB', dose: '3차', month: 6 },
  { id: 'dtap-3', name: 'DTaP', short: 'DTaP', dose: '3차', month: 6 },
  { id: 'ipv-3', name: '폴리오', short: 'IPV', dose: '3차', month: 6, note: '6~18개월' },
  { id: 'hib-3', name: 'b형 헤모필루스', short: 'Hib', dose: '3차', month: 6 },
  { id: 'pcv-3', name: '폐렴구균', short: 'PCV', dose: '3차', month: 6 },
  { id: 'rv-3', name: '로타바이러스', short: 'RV', dose: '3차', month: 6, note: '5가 백신만' },
  { id: 'flu-1', name: '인플루엔자', short: 'IIV', dose: '1차', month: 6, note: '첫해 2회' },
  { id: 'hib-4', name: 'b형 헤모필루스', short: 'Hib', dose: '추가', month: 12, note: '12~15개월' },
  { id: 'pcv-4', name: '폐렴구균', short: 'PCV', dose: '추가', month: 12, note: '12~15개월' },
  { id: 'mmr-1', name: 'MMR', short: 'MMR', dose: '1차', month: 12, note: '12~15개월' },
  { id: 'var-1', name: '수두', short: 'VAR', dose: '1회', month: 12, note: '12~15개월' },
  { id: 'hepa-1', name: 'A형간염', short: 'HepA', dose: '1차', month: 12, note: '12~23개월' },
  { id: 'je-1', name: '일본뇌염', short: 'JE', dose: '1차', month: 12, note: '12~23개월' },
  { id: 'dtap-4', name: 'DTaP', short: 'DTaP', dose: '추가', month: 15, note: '15~18개월' },
  { id: 'hepa-2', name: 'A형간염', short: 'HepA', dose: '2차', month: 18, note: '1차 6개월 후' },
]

export function dueDate(birthDate: string, v: VaccineDose) {
  const d = new Date(birthDate + 'T00:00:00')
  if (v.dueDays !== undefined && v.month === 0) return d
  d.setMonth(d.getMonth() + v.month)
  return d
}

export function monthGroupLabel(month: number) {
  if (month === 0) return '출생 ~ 4주'
  return `${month}개월`
}

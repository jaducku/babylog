/**
 * 도메인 타입.
 * supabase/schema.sql 의 테이블과 1:1로 대응하도록 유지한다.
 */

export type Sex = 'girl' | 'boy'
export type MemberRole = 'owner' | 'editor' | 'viewer'

export interface Family {
  id: string
  name: string
}

export interface Member {
  id: string
  /** 화면에 보이는 호칭: 엄마, 아빠, 할머니 … */
  relation: string
  role: MemberRole
  /** 타임라인 이니셜 배지에 쓰는 색 (기록 종류 색과 겹치지 않는 중립 톤) */
  tone: MemberTone
}

export type MemberTone = 'ink' | 'clay' | 'moss' | 'dusk' | 'sand'

export interface Baby {
  id: string
  name: string
  /** YYYY-MM-DD */
  birthDate: string
  sex: Sex | null
}

interface RecordBase {
  id: string
  babyId: string
  /** 발생 시각 (ISO) */
  at: string
  createdBy: string
  createdAt: string
  updatedAt: string
  memo?: string
}

export type FeedMethod = 'breast' | 'formula' | 'pumped' | 'solid'

export interface FeedRecord extends RecordBase {
  kind: 'feed'
  method: FeedMethod
  /** 모유 수유 시간 (초) */
  leftSec?: number
  rightSec?: number
  /** 분유·유축·이유식 양 */
  amountMl?: number
}

export type PooColor = 'yellow' | 'mustard' | 'green' | 'brown' | 'black' | 'red' | 'white'
export type PooTexture = 'watery' | 'loose' | 'soft' | 'firm'

export interface DiaperRecord extends RecordBase {
  kind: 'diaper'
  pee: boolean
  poo: boolean
  pooColor?: PooColor
  pooTexture?: PooTexture
}

export interface GrowthRecord extends RecordBase {
  kind: 'growth'
  weightKg?: number
  heightCm?: number
  headCm?: number
}

export type VisitType = 'clinic' | 'vaccine' | 'checkup'

export interface HospitalRecord extends RecordBase {
  kind: 'hospital'
  visitType: VisitType
  place?: string
  /** 진단명 / 증상 / 검진 이름 */
  title?: string
  /** 접종한 백신 회차 id (vaccines.ts) */
  vaccines?: string[]
  /** 다음 예약 (ISO) */
  nextAt?: string
}

export type BabyRecord = FeedRecord | DiaperRecord | GrowthRecord | HospitalRecord
export type RecordKind = BabyRecord['kind']

/** 진행 중인 모유 수유 — 가족 모두에게 보여야 하므로 공유 상태에 둔다 */
export interface ActiveFeeding {
  babyId: string
  startedBy: string
  startedAt: string
  /** 현재 물리고 있는 쪽. null이면 일시정지 */
  side: 'left' | 'right' | null
  /** 현재 구간 시작 시각 */
  sideStartedAt: string | null
  leftSec: number
  rightSec: number
}

export interface AppState {
  version: 1
  family: Family | null
  members: Member[]
  babies: Baby[]
  records: BabyRecord[]
  activeFeeding: ActiveFeeding | null
}

/** 이 기기에서만 쓰는 설정 (공유되지 않음) */
export interface DevicePrefs {
  currentMemberId: string | null
  currentBabyId: string | null
  theme: 'system' | 'light' | 'dark'
}

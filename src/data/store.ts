import { useSyncExternalStore } from 'react'

import { uid } from './id'
import type {
  ActiveFeeding,
  AppState,
  Baby,
  BabyRecord,
  DevicePrefs,
  Member,
  MemberTone,
} from './types'

/**
 * 앱 상태 저장소.
 *
 * 지금은 localStorage에 저장한다. 같은 브라우저의 다른 탭과는 storage 이벤트로
 * 동기화되므로, 탭 두 개를 열어 "엄마 폰 / 아빠 폰"을 흉내낼 수 있다.
 *
 * Supabase 연결 시에는 이 파일의 액션(add/update/remove…)이 Supabase 호출을
 * 하도록 바꾸고, Realtime 구독으로 들어온 변경을 setState로 반영하면 된다.
 * 화면 컴포넌트는 useApp / actions 만 쓰므로 바꿀 필요가 없다.
 */

const STATE_KEY = 'babylog:state:v1'
const PREFS_KEY = 'babylog:prefs:v1'

const emptyState: AppState = {
  version: 1,
  family: null,
  members: [],
  babies: [],
  records: [],
  activeFeeding: null,
}

const defaultPrefs: DevicePrefs = {
  currentMemberId: null,
  currentBabyId: null,
  theme: 'system',
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 저장 공간 부족 등은 조용히 무시 — 메모리 상태는 유지된다
  }
}

let state: AppState = read(STATE_KEY, emptyState)
let prefs: DevicePrefs = read(PREFS_KEY, defaultPrefs)
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

function setState(next: AppState) {
  state = next
  write(STATE_KEY, state)
  emit()
}

function setPrefs(next: Partial<DevicePrefs>) {
  prefs = { ...prefs, ...next }
  write(PREFS_KEY, prefs)
  emit()
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STATE_KEY) {
      state = read(STATE_KEY, emptyState)
      emit()
    }
  })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, () => state)
}

export function usePrefs(): DevicePrefs {
  return useSyncExternalStore(subscribe, () => prefs)
}

/** 현재 아기 / 현재 사용자(기기 주인) */
export function useCurrent() {
  const s = useAppState()
  const p = usePrefs()
  const baby = s.babies.find((b) => b.id === p.currentBabyId) ?? s.babies[0] ?? null
  const me = s.members.find((m) => m.id === p.currentMemberId) ?? s.members[0] ?? null
  return { baby, me, state: s, prefs: p }
}

const TONES: MemberTone[] = ['ink', 'clay', 'moss', 'dusk', 'sand']

function now() {
  return new Date().toISOString()
}

function elapsedSec(fromIso: string, to = Date.now()) {
  return Math.max(0, Math.round((to - new Date(fromIso).getTime()) / 1000))
}

export type NewRecord = BabyRecord extends infer R
  ? R extends BabyRecord
    ? Omit<R, 'id' | 'babyId' | 'createdBy' | 'createdAt' | 'updatedAt'>
    : never
  : never

export const actions = {
  setupFamily(input: { babyName: string; birthDate: string; sex: Baby['sex']; relation: string }) {
    const member: Member = { id: uid(), relation: input.relation, role: 'owner', tone: 'ink' }
    const baby: Baby = {
      id: uid(),
      name: input.babyName,
      birthDate: input.birthDate,
      sex: input.sex,
    }
    setState({
      ...emptyState,
      family: { id: uid(), name: `${input.babyName}네` },
      members: [member],
      babies: [baby],
    })
    setPrefs({ currentMemberId: member.id, currentBabyId: baby.id })
  },

  updateBaby(id: string, patch: Partial<Omit<Baby, 'id'>>) {
    setState({
      ...state,
      babies: state.babies.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    })
  },

  addMember(relation: string, role: Member['role'] = 'editor') {
    const used = new Set(state.members.map((m) => m.tone))
    const tone = TONES.find((t) => !used.has(t)) ?? TONES[state.members.length % TONES.length]
    const member: Member = { id: uid(), relation, role, tone }
    setState({ ...state, members: [...state.members, member] })
    return member
  },

  removeMember(id: string) {
    setState({ ...state, members: state.members.filter((m) => m.id !== id) })
    if (prefs.currentMemberId === id) setPrefs({ currentMemberId: state.members[0]?.id ?? null })
  },

  setCurrentMember(id: string) {
    setPrefs({ currentMemberId: id })
  },

  setTheme(theme: DevicePrefs['theme']) {
    setPrefs({ theme })
  },

  addRecord(input: NewRecord): BabyRecord {
    const { baby, me } = currentIds()
    const t = now()
    const record = {
      ...input,
      id: uid(),
      babyId: baby,
      createdBy: me,
      createdAt: t,
      updatedAt: t,
    } as BabyRecord
    setState({ ...state, records: [...state.records, record] })
    return record
  },

  updateRecord(id: string, patch: Partial<NewRecord>) {
    setState({
      ...state,
      records: state.records.map((r) =>
        r.id === id ? ({ ...r, ...patch, updatedAt: now() } as BabyRecord) : r,
      ),
    })
  },

  removeRecord(id: string) {
    const removed = state.records.find((r) => r.id === id)
    setState({ ...state, records: state.records.filter((r) => r.id !== id) })
    return removed
  },

  restoreRecord(record: BabyRecord) {
    if (state.records.some((r) => r.id === record.id)) return
    setState({ ...state, records: [...state.records, record] })
  },

  // ── 모유 수유 타이머 ─────────────────────────────

  startFeeding(side: 'left' | 'right') {
    const { baby, me } = currentIds()
    const t = now()
    const af: ActiveFeeding = {
      babyId: baby,
      startedBy: me,
      startedAt: t,
      side,
      sideStartedAt: t,
      leftSec: 0,
      rightSec: 0,
    }
    setState({ ...state, activeFeeding: af })
  },

  /** 같은 쪽을 누르면 일시정지, 다른 쪽을 누르면 전환 */
  toggleFeedingSide(side: 'left' | 'right') {
    const af = state.activeFeeding
    if (!af) return
    const banked = bank(af)
    const next: ActiveFeeding =
      af.side === side
        ? { ...banked, side: null, sideStartedAt: null }
        : { ...banked, side, sideStartedAt: now() }
    setState({ ...state, activeFeeding: next })
  },

  stopFeeding(): BabyRecord | null {
    const af = state.activeFeeding
    if (!af) return null
    const done = bank(af)
    setState({ ...state, activeFeeding: null })
    if (done.leftSec + done.rightSec < 10) return null
    return actions.addRecord({
      kind: 'feed',
      method: 'breast',
      at: af.startedAt,
      leftSec: done.leftSec,
      rightSec: done.rightSec,
    })
  },

  cancelFeeding() {
    setState({ ...state, activeFeeding: null })
  },

  // ── 데이터 관리 ─────────────────────────────

  exportJson(): string {
    return JSON.stringify(state, null, 2)
  },

  importJson(json: string) {
    const parsed = JSON.parse(json) as AppState
    if (parsed.version !== 1 || !Array.isArray(parsed.records)) {
      throw new Error('형식이 맞지 않는 파일이에요')
    }
    setState(parsed)
    setPrefs({
      currentBabyId: parsed.babies[0]?.id ?? null,
      currentMemberId: parsed.members[0]?.id ?? null,
    })
  },

  loadState(next: AppState, nextPrefs: Partial<DevicePrefs>) {
    setState(next)
    setPrefs(nextPrefs)
  },

  reset() {
    setState(emptyState)
    setPrefs({ currentBabyId: null, currentMemberId: null })
  },
}

function bank(af: ActiveFeeding): ActiveFeeding {
  if (!af.side || !af.sideStartedAt) return af
  const add = elapsedSec(af.sideStartedAt)
  return {
    ...af,
    leftSec: af.leftSec + (af.side === 'left' ? add : 0),
    rightSec: af.rightSec + (af.side === 'right' ? add : 0),
    sideStartedAt: now(),
  }
}

/** 진행 중인 수유의 현재까지 누적 시간 (렌더링용) */
export function liveFeedingSec(af: ActiveFeeding, at = Date.now()) {
  const add = af.side && af.sideStartedAt ? elapsedSec(af.sideStartedAt, at) : 0
  return {
    left: af.leftSec + (af.side === 'left' ? add : 0),
    right: af.rightSec + (af.side === 'right' ? add : 0),
  }
}

function currentIds() {
  const baby = prefs.currentBabyId ?? state.babies[0]?.id
  const me = prefs.currentMemberId ?? state.members[0]?.id
  if (!baby || !me) throw new Error('가족 설정이 필요해요')
  return { baby, me }
}

import { addDays, addMinutes, format, startOfDay, subDays } from 'date-fns'

import { uid } from './id'
import type { NewRecord } from './store'
import type { AppState, BabyRecord, DevicePrefs, Member } from './types'

/** 디자인 확인용 샘플: 생후 24일째 아기와 3주치 기록 */
export function buildSample(): { state: AppState; prefs: Partial<DevicePrefs> } {
  let seed = 7
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)]

  const today = startOfDay(new Date())
  const birth = subDays(today, 23)
  const babyId = uid()

  const mom: Member = { id: uid(), relation: '엄마', role: 'owner', tone: 'clay' }
  const dad: Member = { id: uid(), relation: '아빠', role: 'editor', tone: 'ink' }
  const grandma: Member = { id: uid(), relation: '외할머니', role: 'editor', tone: 'moss' }
  const members = [mom, dad, grandma]

  const records: BabyRecord[] = []
  const push = (r: NewRecord & { createdBy: string }) => {
    const at = r.at
    records.push({ ...r, id: uid(), babyId, createdAt: at, updatedAt: at } as BabyRecord)
  }

  const nowMs = Date.now()
  // 수유: 2시간 반 ~ 3시간 반 간격
  let t = addMinutes(birth, 60 * 9)
  while (t.getTime() < nowMs - 50 * 60000) {
    const hour = t.getHours()
    const night = hour < 6
    const who = night ? pick([mom, mom, dad]) : pick([mom, mom, dad, grandma])
    if (rand() < 0.62) {
      push({
        kind: 'feed',
        method: 'breast',
        at: t.toISOString(),
        createdBy: mom.id,
        leftSec: Math.round((6 + rand() * 10) * 60),
        rightSec: rand() < 0.8 ? Math.round((4 + rand() * 9) * 60) : 0,
      })
    } else {
      const ageDays = (t.getTime() - birth.getTime()) / 86400000
      const base = ageDays < 7 ? 40 : ageDays < 14 ? 70 : 90
      push({
        kind: 'feed',
        method: rand() < 0.75 ? 'formula' : 'pumped',
        at: t.toISOString(),
        createdBy: who.id,
        amountMl: base + Math.round(rand() * 3) * 10,
      })
    }
    // 수유 후 기저귀
    if (rand() < 0.85) {
      const poo = rand() < 0.38
      push({
        kind: 'diaper',
        at: addMinutes(t, 15 + Math.round(rand() * 40)).toISOString(),
        createdBy: who.id,
        pee: !poo || rand() < 0.6,
        poo,
        ...(poo
          ? {
              pooColor: pick(['yellow', 'yellow', 'mustard', 'mustard', 'green'] as const),
              pooTexture: pick(['loose', 'soft', 'soft'] as const),
            }
          : {}),
      })
    }
    t = addMinutes(t, 150 + Math.round(rand() * 60))
  }

  // 성장
  const weights: [number, number, number?, number?][] = [
    [0, 3.24, 50.2, 34.1],
    [3, 3.06],
    [7, 3.18],
    [14, 3.52, 52.0, 35.0],
    [21, 3.84],
  ]
  for (const [d, w, h, head] of weights) {
    push({
      kind: 'growth',
      at: addMinutes(addDays(birth, d), 60 * 11).toISOString(),
      createdBy: d === 0 ? dad.id : mom.id,
      weightKg: w,
      heightCm: h,
      headCm: head,
    })
  }

  // 병원
  push({
    kind: 'hospital',
    visitType: 'vaccine',
    at: addMinutes(birth, 60 * 14).toISOString(),
    createdBy: dad.id,
    place: '산부인과 신생아실',
    vaccines: ['hepb-1'],
  })
  push({
    kind: 'hospital',
    visitType: 'clinic',
    at: addMinutes(addDays(birth, 10), 60 * 10 + 30).toISOString(),
    createdBy: mom.id,
    place: '튼튼소아과',
    title: '신생아 황달 확인',
    memo: '수치 정상 범위. 햇빛 잘 드는 곳에서 지내기. 2주 뒤 다시 보기로 함.',
  })
  push({
    kind: 'hospital',
    visitType: 'vaccine',
    at: addMinutes(addDays(birth, 19), 60 * 11).toISOString(),
    createdBy: mom.id,
    place: '튼튼소아과',
    vaccines: ['bcg-1'],
    memo: '접종 부위 문지르지 말 것',
    nextAt: addMinutes(addDays(birth, 33), 60 * 10).toISOString(),
    title: 'BCG 피내용',
  })

  return {
    state: {
      version: 1,
      family: { id: uid(), name: '하린이네' },
      members,
      babies: [{ id: babyId, name: '하린', birthDate: format(birth, 'yyyy-MM-dd'), sex: 'girl' }],
      records,
      activeFeeding: null,
    },
    prefs: { currentBabyId: babyId, currentMemberId: dad.id },
  }
}

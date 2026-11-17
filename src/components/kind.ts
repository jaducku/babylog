import type { RecordKind } from '@/data/types'

export const KIND_META: Record<
  RecordKind,
  { label: string; dot: string; text: string; soft: string; bar: string }
> = {
  feed: { label: '수유', dot: 'bg-feed', text: 'text-feed', soft: 'bg-feed-soft', bar: 'before:bg-feed' },
  diaper: { label: '기저귀', dot: 'bg-diaper', text: 'text-diaper', soft: 'bg-diaper-soft', bar: 'before:bg-diaper' },
  growth: { label: '성장', dot: 'bg-growth', text: 'text-growth', soft: 'bg-growth-soft', bar: 'before:bg-growth' },
  hospital: { label: '병원', dot: 'bg-hospital', text: 'text-hospital', soft: 'bg-hospital-soft', bar: 'before:bg-hospital' },
}

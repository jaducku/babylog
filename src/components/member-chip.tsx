import type { Member, MemberTone } from '@/data/types'
import { cn } from '@/lib/utils'

const TONE: Record<MemberTone, string> = {
  ink: 'border-foreground/25 text-foreground/80',
  clay: 'border-[#b8664a]/45 text-[#9a5038] dark:text-[#e3a088]',
  moss: 'border-[#5f7a3d]/45 text-[#4d6530] dark:text-[#a9c486]',
  dusk: 'border-[#5b5f8f]/45 text-[#4b4f7c] dark:text-[#b0b4e2]',
  sand: 'border-[#a08a5c]/50 text-[#7d6a43] dark:text-[#d8c59a]',
}

export function MemberChip({
  member,
  className,
}: {
  member: Member | undefined
  className?: string
}) {
  if (!member) return null
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center rounded-full border px-1.5 text-[11px] font-medium leading-none',
        TONE[member.tone],
        className,
      )}
    >
      {member.relation}
    </span>
  )
}

export function MemberMark({ member, className }: { member: Member; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-full border-[1.5px] text-[13px] font-semibold',
        TONE[member.tone],
        className,
      )}
    >
      {member.relation.slice(0, 1)}
    </span>
  )
}

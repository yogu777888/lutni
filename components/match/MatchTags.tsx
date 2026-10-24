import Link from 'next/link'
import { StorySymbol } from '@/components/story/StorySymbol'
import { TAG_BY_SLUG, type TagHit } from '@/lib/tags'
import type { Injury } from '@/lib/types'

// «Матч в подборках» (владелец: «компактные горизонтальные строки… до четырёх… Показать ещё (2)»): строка — значок подборки,
// название и почему матч в ней, справа шеврон; вся строка — ссылка на `/tag/<slug>`. Порядок — по силе повода (`score`),
// не по списку тегов. Остальные — под `details` без JS. Цифры — только из повода: шансы — «предматчевая оценка»,
// кэф — «с открытия линии» (после начала — «до начала матча»), серии и форма — «перед матчем».
const SHOWN = 4

type Team = { id: number; name: string }

/** «Барселона · 4 победы подряд» из «„Барселона“: 4 победы подряд» — команда в начале повода отдельно, без кавычек */
function split(fact: string, teams: Team[]): [string | null, string] {
  for (const t of teams) {
    const q = `«${t.name}»`
    if (fact.startsWith(q) && /^[:,]/.test(fact.slice(q.length))) return [t.name, fact.slice(q.length).replace(/^[:,]\s*/, '')]
  }
  return [null, fact]
}

const join = (...parts: (string | number | null | undefined | false)[]) => parts.filter(Boolean).join(' · ')
const pc = (p: number) => `${Math.round(p * 100)}%`
const unq = (s: string) => s.replace(/[«»]/g, '')

/** Травмы, дисквалификации и прочее — отдельно: в данных причина у каждого игрока своя (`ruInjuryReason`) */
function absences(list: Injury[]): string {
  const inj = list.filter((i) => /травм|сотрясен/i.test(i.reason)).length
  const sus = list.filter((i) => /дисквал|карточ/i.test(i.reason)).length
  const other = list.length - inj - sus
  return [inj && `травмы\u00a0— ${inj}`, sus && `дисквалификации\u00a0— ${sus}`, other && `другие причины\u00a0— ${other}`].filter(Boolean).join(', ')
}

export function tagLine(t: TagHit, home: Team, away: Team, started: boolean, injuries: Injury[]): string {
  const fact = t.short ?? t.reason
  const [team, rest] = split(fact, [home, away])
  const before = started ? 'перед матчем' : null
  switch (t.slug) {
    case 'favorit':
      return t.p != null ? join(team, `предматчевая оценка ${pc(t.p)}`) : join(team, rest)
    case 'tb-2-5':
    case 'tm-2-5':
    case 'obe-zabyut': {
      if (t.p == null || !/шанс/i.test(fact)) return join(rest, before)
      const what = t.slug === 'tb-2-5' ? '3+ гола' : t.slug === 'tm-2-5' ? 'Не больше 2 голов' : null
      return join(what, `${what ? 'п' : 'П'}редматчевая оценка ${pc(t.p)}`)
    }
    case 'ravnye': {
      const m = fact.match(/«(.+?)»\s—\s(\d+%),\s«(.+?)»\s—\s(\d+%)/)
      return m ? `Предматчевая оценка: ${m[1]} ${m[2]}, ${m[3]} ${m[4]}` : fact
    }
    case 'progruz': {
      // «Победа «X»: 7.42 → 6.37 (−14%)»
      const m = fact.match(/^Победа «(.+?)»:\s*(.+)$/)
      const span = started ? 'с открытия линии до начала матча' : 'с открытия линии'
      return m ? join(m[1], m[2], span) : join(fact, span)
    }
    case 'kadry': {
      const side = team === home.name ? home : team === away.name ? away : null
      const list = side ? injuries.filter((i) => i.teamId === side.id) : []
      return list.length ? join(team, `не сыграют ${list.length}: ${absences(list)}`) : join(team, rest)
    }
    case 'value':
      return join(rest, started && 'кэф до матча')
    case 'top-match':
      return join(rest, before)
    default:
      // серии, «дома не проигрывают», аутсайдер в форме, личные встречи — по матчам до этого
      return join(team, unq(rest), before)
  }
}

export function MatchTags({
  tags,
  home,
  away,
  started,
  injuries,
}: {
  tags: TagHit[]
  home: Team
  away: Team
  started: boolean
  injuries: Injury[]
}) {
  const rows = [...tags].sort((a, b) => b.score - a.score)
  const row = (t: TagHit) => {
    const def = TAG_BY_SLUG.get(t.slug)
    const body = (
      <>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.06]">
          <StorySymbol k={t.slug} tone="currentColor" className="h-4 w-4 text-dim" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold leading-snug">{def?.title ?? t.slug}</span>
          <span className="mt-0.5 block text-[13px] leading-snug text-dim first-letter:uppercase">
            {tagLine(t, home, away, started, injuries)}
          </span>
        </span>
      </>
    )
    return (
      <li key={t.slug}>
        {def ? (
          <Link
            href={`/tag/${t.slug}`}
            prefetch={false}
            title={def.hint}
            className="group -mx-2 flex min-h-14 items-center gap-3 rounded-tile px-2 py-2.5 transition-colors hover:bg-white/[0.04]"
          >
            {body}
            <svg viewBox="0 0 16 16" aria-hidden className="h-4 w-4 shrink-0 text-mute/70 transition-colors group-hover:text-fg">
              <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ) : (
          <div className="flex min-h-14 items-center gap-3 py-2.5">{body}</div>
        )}
      </li>
    )
  }
  const more = rows.slice(SHOWN)
  return (
    <>
      <ul className="divide-y divide-edge">{rows.slice(0, SHOWN).map(row)}</ul>
      {more.length ? (
        <details className="border-t border-edge [&[open]>summary]:hidden">
          <summary className="flex h-11 cursor-pointer list-none items-center text-[13px] text-dim transition-colors hover:text-fg [&::-webkit-details-marker]:hidden">
            Показать ещё ({more.length})
          </summary>
          <ul className="divide-y divide-edge">{more.map(row)}</ul>
        </details>
      ) : null}
    </>
  )
}

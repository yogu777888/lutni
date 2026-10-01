/**
 * Кружки историй на главной (как в соцсетях): «В игре», «Топ дня» и по кружку
 * на каждый тег дня. Тап по кружку — сторис его матчей по очереди, самые
 * интересные первыми, затем — матчи следующих кружков.
 */
import type { FeedItem } from './data'
import { pluralN } from './format'
import { matchHref } from './links'
import { bestTag, interest, isLive, liveRank } from './rank'
import { TAG_BY_SLUG, TAGS, type TagDef, type TagHit } from './tags'
import type { Team } from './types'

export type CircleKind = 'live' | 'top' | TagDef['kind']

/** Почему матч в этом кружке — показываем на обложке сторис. */
export type StoryFocus = { slug: string; label: string; kind: TagDef['kind']; reason: string }

export type StoryGroupItem = { id: number; href: string; focus: StoryFocus | null }

export type StoryGroup = {
  /** 'live', 'top' или slug тега */
  key: string
  label: string
  kind: CircleKind
  /** Подсказка и aria-label: «Прогрузы: 5 матчей». */
  hint: string
  /** Ссылка без JS и для поисковиков: страница тега или первого матча. */
  href: string
  /** Чьи логотипы на кружке. */
  cover: { home: Pick<Team, 'name' | 'logo'>; away: Pick<Team, 'name' | 'logo'> }
  items: StoryGroupItem[]
}

const TOP_LIMIT = 8
const LIVE_LIMIT = 8
const TAG_LIMIT = 10
const KIND_ORDER: Record<TagDef['kind'], number> = { accent: 0, hot: 1, neutral: 2 }
const MATCHES = ['матч', 'матча', 'матчей'] as const

function focusOf(t: TagHit | null): StoryFocus | null {
  const def = t ? TAG_BY_SLUG.get(t.slug) : null
  return t && def ? { slug: def.slug, label: def.label, kind: def.kind, reason: t.reason } : null
}

type Entry = { it: FeedItem; tag: TagHit | null }
type Draft = Omit<StoryGroup, 'cover' | 'items' | 'href'> & { href?: string; list: Entry[] }

/**
 * Логотипы на кружках стараемся не повторять: топовый матч часто попадает сразу в
 * несколько тегов. Обложки раздаём сначала маленьким кружкам (у них меньше выбора).
 * Матч с обложки идёт в кружке первым — тап начинается с того, что нарисовано.
 */
function assignCovers(drafts: Draft[]): StoryGroup[] {
  const used = new Set<number>()
  const cover = new Map<Draft, number>()
  // «В игре» и «Топ дня» показывают свой главный матч, остальные — по возрастанию размера
  const first = (d: Draft) => (d.kind === 'live' || d.kind === 'top' ? 0 : 1)
  const bySize = drafts
    .map((d, i) => ({ d, i }))
    .sort((a, b) => first(a.d) - first(b.d) || a.d.list.length - b.d.list.length || a.i - b.i)
  for (const { d } of bySize) {
    const ci = Math.max(0, d.list.findIndex((x) => !used.has(x.it.match.id)))
    used.add(d.list[ci].it.match.id)
    cover.set(d, ci)
  }
  return drafts.map((d) => {
    const { list, href, ...rest } = d
    const ci = cover.get(d)!
    const ordered = ci > 0 ? [list[ci], ...list.slice(0, ci), ...list.slice(ci + 1)] : list
    const first = ordered[0].it.match
    return {
      ...rest,
      href: href ?? matchHref(first),
      cover: { home: { name: first.home.name, logo: first.home.logo }, away: { name: first.away.name, logo: first.away.logo } },
      items: ordered.map(({ it, tag }) => ({ id: it.match.id, href: matchHref(it.match), focus: focusOf(tag) })),
    }
  })
}

export function buildStoryGroups(items: FeedItem[]): StoryGroup[] {
  const open = items.filter((i) => i.match.status === 'scheduled' || isLive(i.match))
  const drafts: Draft[] = []
  const add = (g: Omit<Draft, 'list'>, list: Entry[]) => {
    if (list.length) drafts.push({ ...g, list })
  }

  const live = open
    .filter((i) => isLive(i.match))
    .sort((a, b) => liveRank(a.match) - liveRank(b.match) || a.match.ts - b.match.ts)
  add(
    { key: 'live', label: 'В игре', kind: 'live', hint: `Сейчас идут: ${pluralN(live.length, MATCHES)}` },
    live.slice(0, LIVE_LIMIT).map((it) => ({ it, tag: null })),
  )

  const top = open
    .filter((i) => i.match.status === 'scheduled')
    .map((it) => ({ it, score: interest(it) }))
    .sort((a, b) => b.score - a.score || a.it.match.ts - b.it.match.ts)
    .slice(0, TOP_LIMIT)
  add(
    { key: 'top', label: 'Топ дня', kind: 'top', hint: 'Самые интересные матчи дня' },
    top.map(({ it }) => ({ it, tag: bestTag(it.tags) })),
  )

  const byTag = new Map<string, { it: FeedItem; tag: TagHit }[]>()
  for (const it of open) {
    for (const tag of it.tags) {
      if (!TAG_BY_SLUG.has(tag.slug)) continue
      let list = byTag.get(tag.slug)
      if (!list) byTag.set(tag.slug, (list = []))
      list.push({ it, tag })
    }
  }
  const order = (slug: string) => TAGS.findIndex((t) => t.slug === slug)
  const tagGroups = [...byTag.entries()].sort(
    ([a, la], [b, lb]) =>
      KIND_ORDER[TAG_BY_SLUG.get(a)!.kind] - KIND_ORDER[TAG_BY_SLUG.get(b)!.kind] || lb.length - la.length || order(a) - order(b),
  )
  for (const [slug, list] of tagGroups) {
    const def = TAG_BY_SLUG.get(slug)!
    const sorted = list
      .map((x) => ({ ...x, i: interest(x.it) }))
      .sort((a, b) => b.tag.score - a.tag.score || b.i - a.i)
      .slice(0, TAG_LIMIT)
    add(
      { key: slug, label: def.label, kind: def.kind, hint: `${def.title}: ${pluralN(list.length, MATCHES)}`, href: `/tag/${slug}` },
      sorted.map(({ it, tag }) => ({ it, tag })),
    )
  }
  return assignCovers(drafts)
}

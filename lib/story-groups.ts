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
  /** Цифра на «табло» кружка: самый сильный сигнал группы (−18%, +11%, 71%…). */
  stat: string
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

/** Короткая подпись на случай, если число из объяснения тега не достать. */
const SHORT: Record<string, string> = {
  value: '+EV',
  progruz: '↓',
  'tb-2-5': 'ТБ',
  'tm-2-5': 'ТМ',
  'obe-zabyut': 'ОЗ',
  favorit: 'П1',
  ravnye: '≈',
  andedog: '↑',
  seriya: '×',
  krepost: 'Д',
  kadry: '+',
  h2h: 'H2H',
  'top-match': '1·2',
}

/** «Табло» кружка: главная цифра из объяснения самого сильного матча группы. */
export function statFor(slug: string, reason: string): string {
  const num = (re: RegExp) => re.exec(reason)
  let m: RegExpExecArray | null
  switch (slug) {
    case 'value':
      m = num(/перевес \+([\d.,]+)%/)
      return m ? `+${Math.round(Number(m[1].replace(',', '.')))}%` : SHORT.value
    case 'progruz':
      m = num(/[−-](\d+)%/)
      return m ? `−${m[1]}%` : SHORT.progruz
    case 'tb-2-5':
    case 'tm-2-5':
    case 'obe-zabyut':
    case 'favorit':
      m = num(/(\d+)%/)
      return m ? `${m[1]}%` : SHORT[slug]
    case 'seriya':
    case 'krepost':
      m = num(/(\d+) матч/)
      return m ? m[1] : SHORT[slug]
    case 'kadry':
      m = num(/(\d+) игрок/)
      return m ? `−${m[1]}` : SHORT.kadry
    case 'andedog':
      m = num(/(\d+) очк\S* против (\d+)/)
      return m ? `+${Number(m[1]) - Number(m[2])}` : SHORT.andedog
    case 'h2h':
      m = num(/(\d+) из (\d+)/)
      return m ? `${m[1]}/${m[2]}` : SHORT.h2h
    case 'top-match':
      m = num(/с (\d+)-го и (\d+)-го/)
      return m ? `${m[1]}·${m[2]}` : SHORT['top-match']
  }
  return SHORT[slug] ?? '#'
}

type Entry = { it: FeedItem; tag: TagHit | null }

/**
 * Подпись истории — без решётки и с большой буквы («Кэф упал», «50 на 50»): так решил владелец.
 * У тегов в строках матчей и на страницах тегов решётка остаётся.
 */
const storyLabel = (label: string) => {
  const s = label.replace(/^#/, '')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function buildStoryGroups(items: FeedItem[]): StoryGroup[] {
  const open = items.filter((i) => i.match.status === 'scheduled' || isLive(i.match))
  const groups: StoryGroup[] = []
  const add = (g: Omit<StoryGroup, 'items' | 'href' | 'stat'> & { href?: string; stat?: string }, list: Entry[]) => {
    if (!list.length) return
    const first = list[0]
    groups.push({
      ...g,
      href: g.href ?? matchHref(first.it.match),
      stat: g.stat ?? (first.tag ? statFor(first.tag.slug, first.tag.reason) : '#'),
      items: list.map(({ it, tag }) => ({ id: it.match.id, href: matchHref(it.match), focus: focusOf(tag) })),
    })
  }

  const live = open
    .filter((i) => isLive(i.match))
    .sort((a, b) => liveRank(a.match) - liveRank(b.match) || a.match.ts - b.match.ts)
  add(
    { key: 'live', label: 'В игре', kind: 'live', hint: `Сейчас идут: ${pluralN(live.length, MATCHES)}`, stat: String(live.length) },
    live.slice(0, LIVE_LIMIT).map((it) => ({ it, tag: null })),
  )

  const top = open
    .filter((i) => i.match.status === 'scheduled')
    .map((it) => ({ it, score: interest(it) }))
    .sort((a, b) => b.score - a.score || a.it.match.ts - b.it.match.ts)
    .slice(0, TOP_LIMIT)
  add(
    { key: 'top', label: 'Топ дня', kind: 'top', hint: 'Самые интересные матчи дня', stat: '#' },
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
      { key: slug, label: storyLabel(def.label), kind: def.kind, hint: `${def.title}: ${pluralN(list.length, MATCHES)}`, href: `/tag/${slug}` },
      sorted.map(({ it, tag }) => ({ it, tag })),
    )
  }
  return groups
}

/** Какие теги идут в кружки на главной — по пользе для посетителя; остальные — в «Все теги». */
const MAIN_TAGS = ['value', 'progruz', 'tb-2-5', 'favorit', 'obe-zabyut', 'ravnye', 'andedog', 'top-match', 'tm-2-5', 'seriya', 'krepost', 'kadry', 'h2h']

/**
 * Кружки для первого экрана: «В игре», «Топ дня» и не больше max тегов — самых полезных.
 * Ряд из 13 разноцветных кружков читается как шум; остальные теги — по кнопке «Все теги».
 */
export function mainCircles(groups: StoryGroup[], max = 5): StoryGroup[] {
  const rank = (k: string) => {
    const i = MAIN_TAGS.indexOf(k)
    return i < 0 ? MAIN_TAGS.length : i
  }
  const fixed = groups.filter((g) => g.kind === 'live' || g.kind === 'top')
  const tags = groups
    .filter((g) => g.kind !== 'live' && g.kind !== 'top')
    .sort((a, b) => rank(a.key) - rank(b.key))
    .slice(0, max)
  return [...fixed, ...tags]
}

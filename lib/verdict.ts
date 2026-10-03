/**
 * «Коротко о матче» простыми словами — для тех, кому цифры ни о чём не говорят.
 *
 * Вместо «П1 51% · ТБ2.5 64% · EV +5,9%» — «Скорее выиграет «Ноттингем»,
 * голов будет много, ставка выгодная». Главное — словами, цифры — процентами
 * с подписью, что это за шанс. Шансы трёх исходов всегда дают в сумме 100%.
 * Обещаний нет: только «скорее», «вероятно» — это оценка, а не гарантия.
 * И только то, что видно по данным: про падение кэфа — «снизился», а не
 * «на исход несут деньги» — сколько ставят, мы не знаем.
 *
 * Названия команд — только в именительном падеже, в кавычках.
 */
import { pct } from './format'
import type { Probs1x2 } from './model'
import { fair1x2 } from './odds'
import type { TagHit } from './tags'
import type { Match } from './types'

const q = (s: string) => `«${s}»`

/**
 * Шансы трёх исходов в целых процентах, которые в сумме дают ровно 100
 * (метод наибольших остатков): «51% + 26% + 23%», а не «51% + 26% + 24%».
 */
export function split100(p: Probs1x2): Probs1x2 {
  const keys = ['home', 'draw', 'away'] as const
  const sum = p.home + p.draw + p.away || 1
  const raw = keys.map((k) => (p[k] / sum) * 100)
  const out = raw.map(Math.floor)
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0])
  for (let left = 100 - out.reduce((a, b) => a + b, 0), j = 0; left > 0; left--, j++) out[order[j % 3][1]]++
  return { home: out[0], draw: out[1], away: out[2] }
}

/** Исход коротко и без названий команд — для узких плиток: «победа гостей», «3 гола и больше». */
export function outcomeShort(key: string): string {
  switch (key) {
    case 'home':
      return 'победа хозяев'
    case 'away':
      return 'победа гостей'
    case 'hd':
      return 'хозяева не проиграют'
    case 'da':
      return 'гости не проиграют'
  }
  return outcomeText(key, { home: { name: '' }, away: { name: '' } } as Pick<Match, 'home' | 'away'>)
}

/** Исход ставки словами: «победа «Арсенал»», «3 гола и больше», «обе забьют». */
export function outcomeText(key: string, m: Pick<Match, 'home' | 'away'>): string {
  const h = q(m.home.name)
  const a = q(m.away.name)
  switch (key) {
    case 'home':
      return `победа ${h}`
    case 'draw':
      return 'ничья'
    case 'away':
      return `победа ${a}`
    case 'hd':
      return `${h} не проиграет`
    case 'da':
      return `${a} не проиграет`
    case 'ha':
      return 'без ничьей'
    case 'bttsYes':
      return 'обе забьют'
    case 'bttsNo':
      return 'кто-то не забьёт'
  }
  const t = /^(over|under)([\d.]+)$/.exec(key)
  if (t) {
    const line = Number(t[2])
    if (t[1] === 'over') return `${Math.ceil(line)} ${goalsWord(Math.ceil(line))} и больше`
    const n = Math.floor(line)
    return n === 0 ? 'без голов' : `не больше ${n} ${n === 1 ? 'гола' : 'голов'}`
  }
  return key
}

const goalsWord = (n: number) => (n === 1 ? 'гол' : n < 5 ? 'гола' : 'голов')

export type VerdictLevel = 'strong' | 'lean' | 'slight' | 'even'

export type VerdictPick = { key: string; odd: number | null; kind: 'value' | 'probability'; bookmaker?: string | null; prob?: number }

export type Verdict = {
  level: VerdictLevel
  /** кто сильнее; null — силы равны */
  side: 'home' | 'away' | null
  /** главная фраза: «Скорее выиграет «X»» */
  headline: string
  /** шансы всех исходов, в сумме 100%: «Ноттингем» — 51%, ничья — 26%, «Борнмут» — 23% */
  chances: string
  probs: Probs1x2
  /** голы: «Скорее будет 3 гола и больше — шанс 64%» */
  goals: string | null
  /** падение кэфа — только факт: «Кэф на «X» снизился: 2.40 → 1.97» */
  drop: string | null
  /** ставка: что, за сколько и выгодно ли */
  bet: { text: string; odd: number | null; value: boolean; bookmaker: string | null; prob: number | null } | null
}

/** Главная фраза по шансам на победу: явный фаворит, скорее, чуть сильнее или 50 на 50. */
export function headlineFor(p: Probs1x2, m: Pick<Match, 'home' | 'away'>): { level: VerdictLevel; side: 'home' | 'away' | null; text: string } {
  const side = p.home >= p.away ? 'home' : 'away'
  const fav = Math.max(p.home, p.away)
  const name = q(side === 'home' ? m.home.name : m.away.name)
  if (Math.abs(p.home - p.away) <= 0.06) return { level: 'even', side: null, text: 'Силы равны — 50 на 50' }
  // пороги — как у тега #фаворит (60%) и слайда «Кто фаворит» (47%), чтобы слова везде совпадали
  if (fav >= 0.6) return { level: 'strong', side, text: `Явный фаворит — ${name}` }
  if (fav >= 0.47) return { level: 'lean', side, text: `Скорее выиграет ${name}` }
  return { level: 'slight', side, text: `Чуть сильнее ${name}` }
}

/** Вероятность, на которой держится тег; у старых записей — из текста («… — 64%»). */
const pctIn = (t: TagHit | undefined) => {
  if (!t) return null
  if (t.p !== undefined) return t.p
  const m = /(\d+)%/.exec(t.reason)
  return m ? Number(m[1]) / 100 : null
}

export type VerdictInput = {
  match: Match
  tags: TagHit[]
  /** шансы 1X2 без маржи (модель или рынок); по умолчанию — из коротких кэфов матча */
  probs?: Probs1x2 | null
  over25?: number | null
  btts?: number | null
  pick?: VerdictPick | null
}

/** Вывод по матчу словами. null — если линии нет и сказать нечего. */
export function buildVerdict({ match: m, tags, probs, over25, btts, pick }: VerdictInput): Verdict | null {
  const p = probs ?? fair1x2(m.odds?.x12)
  if (!p) return null
  const head = headlineFor(p, m)
  const tag = (slug: string) => tags.find((t) => t.slug === slug)

  const s = split100(p)
  const chances = `${q(m.home.name)} — ${s.home}%, ничья — ${s.draw}%, ${q(m.away.name)} — ${s.away}%`

  // голы: своя вероятность, иначе — из тегов
  const over = over25 ?? pctIn(tag('tb-2-5')) ?? (tag('tm-2-5') ? 1 - (pctIn(tag('tm-2-5')) ?? 0.6) : null)
  let goals: string | null = null
  if (over != null && over >= 0.58) goals = `Скорее будет 3 гола и больше — шанс ${pct(over)}`
  else if (over != null && over <= 0.42) goals = `Скорее будет не больше 2 голов — шанс ${pct(1 - over)}`
  const both = btts ?? pctIn(tag('obe-zabyut'))
  if (both != null && both >= 0.58) goals = goals ? `${goals}, забьют обе команды` : `Скорее забьют обе команды — шанс ${pct(both)}`

  // падение кэфа из объяснения прогруза — только факт, без догадок о деньгах
  const pr = tag('progruz')
  const mv = pr ? /«(.+?)».*?с (\d+(?:\.\d+)?) до (\d+(?:\.\d+)?)/.exec(pr.reason) : null
  const drop = mv ? `Кэф на ${q(mv[1])} снизился: ${mv[2]} → ${mv[3]}` : null

  const bet = pick
    ? { text: outcomeText(pick.key, m), odd: pick.odd, value: pick.kind === 'value', bookmaker: pick.bookmaker ?? null, prob: pick.prob ?? null }
    : null

  return { level: head.level, side: head.side, headline: head.text, chances, probs: p, goals, drop, bet }
}

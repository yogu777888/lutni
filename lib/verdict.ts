/**
 * «Коротко о матче» простыми словами — для тех, кому цифры ни о чём не говорят.
 *
 * Вместо «П1 51% · ТБ2.5 64% · EV +5,9%» — «Скорее выиграет «Ноттингем»,
 * голов будет много, ставка выгодная». Шансы — словами и «N из 10»: так
 * вероятность понимают все, а проценты — нет. Обещаний нет: только «скорее»,
 * «вероятно» — это оценка, а не гарантия.
 *
 * Названия команд — только в именительном падеже, в кавычках.
 */
import type { Probs1x2 } from './model'
import { fair1x2 } from './odds'
import type { TagHit } from './tags'
import type { Match } from './types'

const q = (s: string) => `«${s}»`

/** «6 из 10»: от 1 до 9 — «10 из 10» звучало бы как гарантия, «0 из 10» — как невозможность. */
export function outOf10(p: number): string {
  return `${Math.min(9, Math.max(1, Math.round(p * 10)))} из 10`
}

/** Насколько вероятно событие — одним-двумя словами. */
export function chanceWord(p: number): string {
  if (p >= 0.75) return 'очень вероятно'
  if (p >= 0.58) return 'скорее да'
  if (p > 0.42) return '50 на 50'
  if (p > 0.25) return 'скорее нет'
  return 'маловероятно'
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
  /** шансы всех исходов: «Ноттингем» — 5 из 10, ничья — 3 из 10, «Борнмут» — 2 из 10 */
  chances: string
  probs: Probs1x2
  /** голы: «Скорее будет 3 гола и больше» */
  goals: string | null
  /** деньги: «На «X» массово ставят: кэф упал с 2.40 до 1.97» */
  money: string | null
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

  const chances = `${q(m.home.name)} — ${outOf10(p.home)}, ничья — ${outOf10(p.draw)}, ${q(m.away.name)} — ${outOf10(p.away)}`

  // голы: своя вероятность, иначе — из тегов
  const over = over25 ?? pctIn(tag('tb-2-5')) ?? (tag('tm-2-5') ? 1 - (pctIn(tag('tm-2-5')) ?? 0.6) : null)
  let goals: string | null = null
  if (over != null && over >= 0.58) goals = `Скорее будет 3 гола и больше (${outOf10(over)})`
  else if (over != null && over <= 0.42) goals = `Скорее будет не больше 2 голов (${outOf10(1 - over)})`
  const both = btts ?? pctIn(tag('obe-zabyut'))
  if (both != null && both >= 0.58) goals = goals ? `${goals}, забьют обе команды` : `Скорее забьют обе команды (${outOf10(both)})`

  // деньги: падение кэфа из объяснения прогруза
  const pr = tag('progruz')
  const mv = pr ? /«(.+?)».*?с (\d+(?:\.\d+)?) до (\d+(?:\.\d+)?)/.exec(pr.reason) : null
  const money = mv ? `На ${q(mv[1])} массово ставят: кэф упал с ${mv[2]} до ${mv[3]}` : null

  const bet = pick
    ? { text: outcomeText(pick.key, m), odd: pick.odd, value: pick.kind === 'value', bookmaker: pick.bookmaker ?? null, prob: pick.prob ?? null }
    : null

  return { level: head.level, side: head.side, headline: head.text, chances, probs: p, goals, money, bet }
}

/**
 * Связь матча SStats с матчем PARI: общих id у них нет, поэтому — по времени начала (±20 минут) и названиям
 * команд (оригинальные английские у обоих). Названия пишут по-разному («Vasco DA Gama» / «Vasco da Gama»,
 * «Paris Saint-Germain» / «PSG», «FC Utrecht» / «Utrecht»): сравниваем нормализованные слова; молодёжные,
 * женские и резервные составы с основными не путаем. Сомневаемся — не связываем: лучше без PARI, чем чужие кэфы.
 */
import type { PariMatch } from './sstats/pari'
import type { Match } from './types'

/** Служебные слова, которые не отличают клубы. */
const NOISE = new Set(['fc', 'cf', 'sc', 'ac', 'afc', 'fk', 'sk', 'cd', 'ca', 'club', 'de', 'da', 'do', 'del', 'the', 'football', 'sporting', 'sv', 'tsv', 'vfl', 'vfb', 'if', 'bk', 'ik', 'as', 'us', 'ss', 'ud', 'sd', 'rc', 'rcd', 'nk', 'hnk', 'fkk', 'calcio'])
/** Маркеры отдельной команды: «U19», «Women», «II», «B», «Reserves» — должны совпадать у обоих названий. */
const SQUAD = /^(u\d{2}|w|women|ii|iii|b|reserves?|res|youth|amateurs?|2|3)$/

const ALIAS: Record<string, string> = { psg: 'paris saint germain', 'man utd': 'manchester united', 'man city': 'manchester city', inter: 'internazionale' }

function words(name: string): { core: string[]; squad: string[] } {
  let s = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[.'’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  s = ALIAS[s] ?? s
  const all = s.split(' ').filter(Boolean)
  return {
    core: all.filter((w) => !NOISE.has(w) && !SQUAD.test(w)),
    // «W» и «Women», «II» и «2» — одно и то же
    squad: all.filter((w) => SQUAD.test(w)).map((w) => ({ w: 'women', ii: '2', iii: '3' })[w] ?? w).sort(),
  }
}

/** Похожесть названий 0…1 (`ignore` — названия соперников, их слова не считаются): доля общих слов (слово совпадает целиком или одно начинается с другого, от 4 букв). */
export function nameScore(a: string, b: string, ignore: string[] = []): number {
  // слова из названия соперника не в счёт: «Yangon United — Yangon Royals» и «Yangon City» совпали бы по городу
  const skip = new Set(ignore.flatMap((n) => words(n).core))
  const x = words(a)
  const y = words(b)
  x.core = x.core.filter((w) => !skip.has(w))
  y.core = y.core.filter((w) => !skip.has(w))
  if (x.squad.join() !== y.squad.join()) return 0
  if (!x.core.length || !y.core.length) return 0
  const same = (p: string, q: string) => p === q || (p.length >= 4 && q.length >= 4 && (p.startsWith(q) || q.startsWith(p)))
  const hit = x.core.filter((p) => y.core.some((q) => same(p, q))).length
  return hit / Math.min(x.core.length, y.core.length)
}

const WINDOW = 20 * 60_000

/** Матч PARI для матча SStats или null: время начала рядом и обе команды похожи (хозяева с хозяевами). */
export function linkPari(m: Match, list: PariMatch[]): PariMatch | null {
  let best: { p: PariMatch; score: number } | null = null
  for (const p of list) {
    if (Math.abs(p.ts - m.ts) > WINDOW) continue
    const h = nameScore(m.home.original, p.home, [m.away.original, p.away])
    const a = nameScore(m.away.original, p.away, [m.home.original, p.home])
    // обе команды хотя бы наполовину похожи, и одна — уверенно
    if (Math.min(h, a) < 0.5 || Math.max(h, a) < 1) continue
    const score = h + a - Math.abs(p.ts - m.ts) / WINDOW / 10
    if (!best || score > best.score) best = { p, score }
  }
  return best?.p ?? null
}

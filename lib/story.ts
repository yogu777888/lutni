/**
 * «Сторис» матча: короткая презентация на весь экран — по слайду на факт,
 * с анимированными графиками. Здесь собираем компактные данные для слайдов
 * (их отдаёт /api/story/<id>), рисует их components/story/StoryViewer.
 *
 * Слайд попадает в сторис, только если для него есть данные: у матча из
 * мелкой лиги без линии и статистики сторис не будет — откроется страница матча.
 */
import { primaryPartner, type Partner } from '@/config/bookmakers'
import { SITE } from '@/config/site'
import { goHref } from './affiliate'
import type { MatchInsights } from './data'
import { dayLabel, formatDateShort, formatTime, pct, pluralN, todayYmd, ymdInTz } from './format'
import { matchHref } from './links'
import { describePick } from './preview'
import type { Res } from './stats'
import { TAG_BY_SLUG, type TagDef } from './tags'
import type { MatchStatus, Score } from './types'

export type Side = 'home' | 'away'

export type StoryTeam = { name: string; logo: string | null }

/** Строка сравнения «хозяева — гости»; better — у кого показатель лучше (null — без оценки). */
export type CompareRow = { label: string; home: number; away: number; text: [string, string]; better: Side | null }

export type FormSide = {
  last5: Res[]
  scores: string[]
  points5: number
  gfAvg: number
  gaAvg: number
  note: string | null
}

export type StorySlide =
  | { kind: 'cover'; tags: { slug: string; label: string; kind: TagDef['kind'] }[]; teaser: string }
  | {
      kind: 'odds'
      title: string
      sub: string
      probs: { home: number; draw: number; away: number }
      fair: { home: number; draw: number; away: number }
      best: { home: number | null; draw: number | null; away: number | null }
    }
  | { kind: 'goals'; title: string; sub: string; xg: { home: number; away: number }; over25: number | null; btts: number | null }
  | { kind: 'scores'; title: string; sub: string; grid: number[][]; top: { home: number; away: number; p: number } }
  | { kind: 'form'; title: string; sub: string; home: FormSide | null; away: FormSide | null }
  | { kind: 'compare'; title: string; sub: string; rows: CompareRow[] }
  | {
      kind: 'h2h'
      title: string
      sub: string
      wins: { home: number; draws: number; away: number }
      avgGoals: number
      over25Rate: number
      bttsRate: number
      games: { date: string; home: string; away: string; score: string; winner: Side | 'draw' }[]
    }
  | {
      kind: 'movement'
      title: string
      sub: string
      rows: { outcome: 'home' | 'draw' | 'away'; label: string; opening: number; current: number; change: number }[]
    }
  | { kind: 'stats'; title: string; sub: string; rows: CompareRow[] }
  | {
      kind: 'goalsTimeline'
      title: string
      sub: string
      goals: { minute: number; label: string; side: Side; player: string; kind: 'goal' | 'own-goal' | 'penalty' }[]
      maxMinute: number
    }
  | {
      kind: 'pick'
      label: string
      desc: string
      prob: number
      fairOdd: number
      odd: number | null
      bookmaker: string | null
      ev: number | null
      value: boolean
      confidence: number
    }

export type StoryCta = { partner: string; color: string; textColor: string; short: string; href: string; text: string; ad: string }

export type StoryData = {
  id: number
  href: string
  league: string
  round: string | null
  when: string
  status: MatchStatus
  statusLabel: string
  elapsed: number | null
  score: Score | null
  home: StoryTeam
  away: StoryTeam
  slides: StorySlide[]
  cta: StoryCta | null
}

const q = (s: string) => `«${s}»`
const dec = (x: number, d = 1) => x.toFixed(d).replace('.', ',')

function adText(p: Partner) {
  return ['Реклама', p.ad.advertiser, p.ad.erid ? `erid: ${p.ad.erid}` : '', '18+'].filter(Boolean).join(' · ')
}

function poissonGrid(lh: number, la: number, n = 5): number[][] {
  const pmf = (l: number) => {
    const out: number[] = []
    let p = Math.exp(-l)
    for (let k = 0; k < n; k++) {
      out.push(p)
      p = (p * l) / (k + 1)
    }
    return out
  }
  const ph = pmf(lh)
  const pa = pmf(la)
  return ph.map((x) => pa.map((y) => x * y))
}

function compareRow(
  label: string,
  home: number,
  away: number,
  fmt: (x: number) => string,
  dir: 'high' | 'low' | null,
): CompareRow {
  const eps = 1e-9
  let better: Side | null = null
  if (dir && Math.abs(home - away) > eps) better = (home > away) === (dir === 'high') ? 'home' : 'away'
  return { label, home, away, text: [fmt(home), fmt(away)], better }
}

/** Собирает сторис матча. null — если показывать почти нечего. */
export function buildStory(ins: MatchInsights): StoryData | null {
  const { match: m, full, cons, model, pick, homeForm, awayForm, h2h, glicko, tags } = ins
  const H = m.home.name
  const A = m.away.name
  const scheduled = m.status === 'scheduled'
  const played = m.status === 'finished' || m.status === 'live' || m.status === 'suspended'
  const slides: StorySlide[] = []

  // ── обложка
  const coverTags = tags.slice(0, 4).flatMap((t) => {
    const def = TAG_BY_SLUG.get(t.slug)
    return def ? [{ slug: def.slug, label: def.label, kind: def.kind }] : []
  })
  slides.push({ kind: 'cover', tags: coverTags, teaser: '' })

  // ── ход матча (live и завершённые)
  if (played) {
    const goals = full.events
      .filter((e) => e.kind === 'goal' || e.kind === 'own-goal' || e.kind === 'penalty')
      .map((e) => ({
        minute: e.minute,
        label: e.extra ? `${e.minute}+${e.extra}′` : `${e.minute}′`,
        side: e.side,
        player: e.player,
        kind: e.kind as 'goal' | 'own-goal' | 'penalty',
      }))
    if (goals.length) {
      const maxMinute = Math.max(90, m.elapsed ?? 0, ...goals.map((g) => g.minute))
      const first = goals[0]
      slides.push({
        kind: 'goalsTimeline',
        title: pluralN(goals.length, ['гол', 'гола', 'голов']) + (m.status === 'live' ? ' к этой минуте' : ' в матче'),
        sub: `Первым забил ${first.player || (first.side === 'home' ? H : A)} на ${first.label}`,
        goals,
        maxMinute,
      })
    }
    const stats = full.stats.slice(0, 7)
    if (stats.length >= 3) {
      const poss = stats.find((s) => s.key === 'ballPossession')
      const shots = stats.find((s) => s.key === 'totalShots' || s.key === 'shotsTotal' || /удар/i.test(s.label))
      let title = 'Статистика матча'
      if (poss && Math.abs(poss.home - poss.away) >= 10) {
        const side = poss.home > poss.away ? H : A
        title = `Команда ${q(side)} владела мячом ${Math.max(poss.home, poss.away)}% времени`
      } else if (shots && Math.abs(shots.home - shots.away) >= 4) {
        const side = shots.home > shots.away ? H : A
        title = `У команды ${q(side)} ${pluralN(Math.max(shots.home, shots.away), ['удар', 'удара', 'ударов'])}`
      }
      slides.push({
        kind: 'stats',
        title,
        sub: m.status === 'live' ? 'Цифры по ходу игры' : 'Итоговые цифры',
        rows: stats.map((s) =>
          compareRow(s.label, s.home, s.away, (x) => `${Number.isInteger(x) ? x : dec(x, 2)}${s.suffix ?? ''}`, null),
        ),
      })
    }
  }

  // ── кто фаворит: вероятности 1X2 без маржи
  const x = model?.x12 ?? cons.x12
  if (x) {
    const best = (o: 'home' | 'draw' | 'away') => {
      const c = ins.candidates.find((c) => c.key === o)
      return (c?.bestPartner ?? c?.best)?.value ?? null
    }
    const fav = x.home >= x.away ? 'home' : 'away'
    const favP = Math.max(x.home, x.away)
    const favName = fav === 'home' ? H : A
    let title: string
    if (favP >= 0.62) title = `Команда ${q(favName)} — явный фаворит`
    else if (favP >= 0.47) title = `Команда ${q(favName)} — фаворит`
    else if (x.draw >= 0.3 && Math.abs(x.home - x.away) < 0.08) title = 'Равный матч, ничья вполне вероятна'
    else title = 'Явного фаворита нет'
    slides.push({
      kind: 'odds',
      title: played ? `До матча: ${title[0].toLowerCase()}${title.slice(1)}` : title,
      sub: `Без маржи букмекеров: шансы по консенсусу ${cons.books > 1 ? `${pluralN(cons.books, ['букмекера', 'букмекеров', 'букмекеров'])}` : 'рынка'}${model?.source === 'market+xg' ? ' и xG' : ''}`,
      probs: x,
      fair: { home: 1 / x.home, draw: 1 / x.draw, away: 1 / x.away },
      best: { home: best('home'), draw: best('draw'), away: best('away') },
    })
  }

  // ── движение линии (если что-то заметно сдвинулось)
  if (scheduled) {
    const labels = { home: 'П1', draw: 'Х', away: 'П2' } as const
    const rows = (['home', 'draw', 'away'] as const).flatMap((o) => {
      const mv = cons.movement[o]
      if (!mv || !(mv.opening > 1) || !(mv.current > 1)) return []
      return [{ outcome: o, label: labels[o], opening: mv.opening, current: mv.current, change: mv.current / mv.opening - 1 }]
    })
    const top = [...rows].sort((a, b) => a.change - b.change)[0]
    if (rows.length === 3 && top && top.change <= -0.04) {
      const who = top.outcome === 'home' ? `победу команды ${q(H)}` : top.outcome === 'away' ? `победу команды ${q(A)}` : 'ничью'
      slides.push({
        kind: 'movement',
        title: `Прогруз на ${top.label}`,
        sub: `Коэффициент на ${who} упал с ${top.opening.toFixed(2)} до ${top.current.toFixed(2)}: на этот исход идут деньги`,
        rows,
      })
    }
  }

  // ── голы: xG, тотал, «обе забьют»
  if (model) {
    const total = model.lambdas.home + model.lambdas.away
    const over25 = model.over['2.5'] ?? cons.over['2.5'] ?? null
    let title = `Ждём около ${dec(total)} гола`
    if (over25 != null && over25 >= 0.6) title = `Будут голы: ждём ${dec(total)} в среднем`
    else if (over25 != null && over25 <= 0.42) title = `Голов будет немного: ждём ${dec(total)}`
    slides.push({
      kind: 'goals',
      title: played ? `До матча ждали ${dec(total)} гола` : title,
      sub: 'Ожидаемые голы (xG) каждой команды и шансы на тоталы',
      xg: model.lambdas,
      over25,
      btts: model.btts,
    })
    const grid = poissonGrid(model.lambdas.home, model.lambdas.away)
    let top = { home: 0, away: 0, p: 0 }
    grid.forEach((row, i) => row.forEach((p, j) => p > top.p && (top = { home: i, away: j, p })))
    if (scheduled) {
      slides.push({
        kind: 'scores',
        title: `Самый вероятный счёт — ${top.home}:${top.away}`,
        sub: `Но даже у него лишь ${pct(top.p)}: футбол непредсказуем. Чем ярче клетка, тем вероятнее счёт`,
        grid,
        top,
      })
    }
  }

  // ── форма
  if (homeForm || awayForm) {
    const side = (f: typeof homeForm): FormSide | null => {
      if (!f) return null
      let note: string | null = null
      if (f.streak?.kind === 'W') note = `${pluralN(f.streak.len, ['победа', 'победы', 'побед'])} подряд`
      else if (f.streak?.kind === 'L') note = `${pluralN(f.streak.len, ['поражение', 'поражения', 'поражений'])} подряд`
      else if (f.streak?.kind === 'unbeaten') note = `без поражений ${pluralN(f.streak.len, ['матч', 'матча', 'матчей'])}`
      else if (f.streak?.kind === 'winless') note = `без побед ${pluralN(f.streak.len, ['матч', 'матча', 'матчей'])}`
      return {
        last5: f.last5,
        scores: f.games.slice(0, 5).map((g) => `${g.gf}:${g.ga}`),
        points5: f.points5,
        gfAvg: f.gfAvg,
        gaAvg: f.gaAvg,
        note,
      }
    }
    let title = 'Форма команд'
    if (homeForm && awayForm) {
      const d = homeForm.points5 - awayForm.points5
      if (Math.abs(d) >= 4) title = `Команда ${q(d > 0 ? H : A)} в форме лучше`
      else title = 'По форме — почти поровну'
    }
    slides.push({ kind: 'form', title, sub: 'Последние 5 матчей и очки из 15 возможных', home: side(homeForm), away: side(awayForm) })
  }

  // ── сравнение по цифрам
  if (homeForm && awayForm) {
    const rows: CompareRow[] = [
      compareRow('Забивают за игру', homeForm.gfAvg, awayForm.gfAvg, (v) => dec(v), 'high'),
      compareRow('Пропускают за игру', homeForm.gaAvg, awayForm.gaAvg, (v) => dec(v), 'low'),
      compareRow('Очки в 5 матчах', homeForm.points5, awayForm.points5, (v) => String(v), 'high'),
      compareRow('Матчи «на ноль»', homeForm.cleanSheetRate, awayForm.cleanSheetRate, (v) => pct(v), 'high'),
      compareRow('Матчи без гола', homeForm.failedToScoreRate, awayForm.failedToScoreRate, (v) => pct(v), 'low'),
    ]
    if (glicko) rows.push(compareRow('Рейтинг Glicko-2', glicko.homeRating, glicko.awayRating, (v) => String(Math.round(v)), 'high'))
    const hw = rows.filter((r) => r.better === 'home').length
    const aw = rows.filter((r) => r.better === 'away').length
    const lead = Math.max(hw, aw)
    const title =
      hw === aw
        ? 'По цифрам — паритет'
        : lead === rows.length
          ? `Команда ${q(hw > aw ? H : A)} лучше по всем ${rows.length} показателям`
          : `Команда ${q(hw > aw ? H : A)} лучше в ${lead} из ${rows.length} показателей`
    slides.push({ kind: 'compare', title, sub: 'Последние матчи каждой команды, у кого показатель лучше — отмечено', rows })
  }

  // ── личные встречи
  if (h2h && h2h.games.length >= 2) {
    const n = h2h.games.length
    let title: string
    if (h2h.homeWins > h2h.awayWins && h2h.homeWins >= n / 2) title = `Команда ${q(H)} выиграла ${h2h.homeWins} из ${n} личных встреч`
    else if (h2h.awayWins > h2h.homeWins && h2h.awayWins >= n / 2) title = `Команда ${q(A)} выиграла ${h2h.awayWins} из ${n} личных встреч`
    else title = `Личные встречи: ${h2h.homeWins}–${h2h.draws}–${h2h.awayWins}`
    slides.push({
      kind: 'h2h',
      title,
      sub: `В среднем ${dec(h2h.avgGoals)} гола за матч, ТБ 2.5 — в ${pct(h2h.over25Rate)} встреч`,
      wins: { home: h2h.homeWins, draws: h2h.draws, away: h2h.awayWins },
      avgGoals: h2h.avgGoals,
      over25Rate: h2h.over25Rate,
      bttsRate: h2h.bttsRate,
      games: h2h.games.slice(0, 5).map((g) => {
        const hs = g.home.id === m.home.id ? g.score.home : g.score.away
        const as = g.home.id === m.home.id ? g.score.away : g.score.home
        return {
          date: formatDateShort(g.ts),
          home: g.home.name,
          away: g.away.name,
          score: `${g.score.home}:${g.score.away}`,
          winner: hs > as ? 'home' : hs < as ? 'away' : 'draw',
        }
      }),
    })
  }

  // ── прогноз
  if (pick) {
    const c = pick.candidate
    const offer = c.bestPartner ?? c.best
    slides.push({
      kind: 'pick',
      label: c.label,
      desc: describePick(c, m),
      prob: c.prob,
      fairOdd: c.fairOdd,
      odd: offer?.value ?? null,
      bookmaker: offer ? (offer.partner?.name ?? offer.bookmakerName) : null,
      ev: c.ev,
      value: pick.kind === 'value',
      confidence: pick.confidence,
    })
  }

  // без хотя бы двух слайдов с данными это не сторис, а пустышка
  if (slides.filter((s) => s.kind !== 'cover').length < 2) return null

  const cover = slides[0] as Extract<StorySlide, { kind: 'cover' }>
  cover.teaser = `${pluralN(slides.length - 1, ['слайд', 'слайда', 'слайдов'])} о матче — листайте`

  const partner = pick?.candidate.bestPartner?.partner ?? primaryPartner()
  const offer = pick?.candidate.bestPartner
  const open = scheduled || m.status === 'live'
  const cta: StoryCta | null = open
    ? {
        partner: partner.name,
        color: partner.color,
        textColor: partner.textColor,
        short: partner.short,
        href: goHref(partner, 'story', m.id),
        text:
          pick && offer
            ? `Поставить ${pick.candidate.label} за ${offer.value.toFixed(2)}`
            : m.status === 'live'
              ? `Ставки по ходу матча в ${partner.name}`
              : `Сделать ставку в ${partner.name}`,
        ad: adText(partner),
      }
    : null

  const today = todayYmd()
  const day = dayLabel(ymdInTz(m.ts), today)
  const when =
    m.status === 'live' || m.status === 'suspended'
      ? 'Идёт сейчас'
      : m.status === 'finished'
        ? `${day}, матч завершён`
        : m.status === 'scheduled'
          ? `${day}, ${formatTime(m.ts)} ${SITE.tzLabel}`
          : m.statusLabel

  return {
    id: m.id,
    href: matchHref(m),
    league: m.league.name,
    round: m.round,
    when,
    status: m.status,
    statusLabel: m.statusLabel,
    elapsed: m.elapsed,
    score: m.score,
    home: { name: H, logo: m.home.logo },
    away: { name: A, logo: m.away.logo },
    slides,
    cta,
  }
}

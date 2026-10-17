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
import { partnerBooks } from './lines'
import type { MatchInsights } from './data'
import { dayLabel, formatTime, pluralN, todayYmd, ymdInTz } from './format'
import { matchHref } from './links'
import { visibleStats } from './sstats/normalize'
import { buildVerdict, outcomeText, split100 } from './verdict'
import type { Res } from './stats'
import { TAG_BY_SLUG } from './tags'
import type { MatchStatus, Score } from './types'

export type Side = 'home' | 'away'

export type StoryTeam = { name: string; logo: string | null }

/** Строка статистики «хозяева — гости». */
export type CompareRow = { label: string; home: number; away: number; text: [string, string] }

export type FormSide = {
  last5: Res[]
  scores: string[]
  points5: number
  gfAvg: number
  gaAvg: number
  note: string | null
}

type X12 = { home: number; draw: number; away: number }

export type StorySlide =
  | {
      kind: 'cover'
      /** подборки матча: название, как в правой панели, и факт коротко (`short`); reason — для цифры в «почему» */
      tags: { slug: string; title: string; short: string; reason: string }[]
      teaser: string
      /** вывод словами до матча: «Скорее выиграет «X»» */
      verdict: string | null
      /** после начала — оценка до матча строкой, проценты в сумме 100 */
      before: X12 | null
    }
  | {
      kind: 'odds'
      title: string
      sub: string
      probs: X12
      fair: X12
      /** линия главного легального партнёра — ячейки ведут к нему */
      line: { partner: string; href: string; odds: { home: number | null; draw: number | null; away: number | null } } | null
    }
  | {
      kind: 'goals'
      title: string
      sub: string
      over25: number | null
      btts: number | null
      /** три самых вероятных счёта */
      scores: { home: number; away: number; p: number }[]
    }
  | { kind: 'form'; title: string; sub: string; home: FormSide | null; away: FormSide | null }
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
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
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

function compareRow(label: string, home: number, away: number, fmt: (x: number) => string): CompareRow {
  return { label, home, away, text: [fmt(home), fmt(away)] }
}

/**
 * Собирает сторис матча. null — если показывать почти нечего.
 *
 * Владелец: «а сами истории как?» — согласился на пять правок: слова и цвета — как на сайте (без xG, Glicko-2,
 * «консенсуса», звёзд «уверенности», «Хозяева/Гости»; без цветов команд и светофора), кэфы — только линия легального
 * партнёра с пометкой рекламы (было «лучший кэф» среди всех букмекеров, включая зарубежных), слайды — по состоянию
 * матча: до начала — обложка, «Кто фаворит», голы и вероятный счёт, форма, прогноз (~40 с вместо 8 слайдов больше
 * минуты; «Кто сильнее» повторял «Форму», «Движение кэфов» — обложку, личные встречи — на странице матча); идёт или
 * сыгран — обложка со счётом и строкой «До матча», голы, статистика (доматчевые слайды по ходу игры — прошлое).
 */
export function buildStory(ins: MatchInsights): StoryData | null {
  const { match: m, full, cons, model, pick, homeForm, awayForm, tags } = ins
  const H = m.home.name
  const A = m.away.name
  const scheduled = m.status === 'scheduled'
  const played = m.status === 'finished' || m.status === 'live' || m.status === 'suspended'
  const slides: StorySlide[] = []
  const x = model?.x12 ?? cons.x12

  // ── обложка
  const coverTags = tags.flatMap((t) => {
    const def = TAG_BY_SLUG.get(t.slug)
    return def ? [{ slug: def.slug, title: def.title, short: t.short ?? t.reason, reason: t.reason }] : []
  })
  const offer0 = pick ? (pick.candidate.bestPartner ?? pick.candidate.best) : null
  const verdict = scheduled
    ? buildVerdict({
        match: m,
        tags,
        probs: x,
        pick: pick ? { key: pick.candidate.key, odd: offer0?.value ?? null, kind: pick.kind } : null,
      })
    : null
  slides.push({ kind: 'cover', tags: coverTags, teaser: '', verdict: verdict?.headline ?? null, before: played && x ? split100(x) : null })

  // ── ход матча (идёт и сыгран): голы и статистика; доматчевых слайдов нет — по ходу игры это прошлое
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
    const stats = visibleStats(full.stats).slice(0, 7)
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
        rows: stats.map((s) => compareRow(s.label, s.home, s.away, (v) => `${Number.isInteger(v) ? v : dec(v, 2)}${s.suffix ?? ''}`)),
      })
    }
  }

  // ── кто фаворит: оценка tag.bet и кэфы главного легального партнёра
  if (scheduled && x) {
    const fav = x.home >= x.away ? 'home' : 'away'
    const favP = Math.max(x.home, x.away)
    const favName = fav === 'home' ? H : A
    let title: string
    if (favP >= 0.62) title = `Команда ${q(favName)} — явный фаворит`
    else if (favP >= 0.47) title = `Команда ${q(favName)} — фаворит`
    else if (x.draw >= 0.3 && Math.abs(x.home - x.away) < 0.08) title = 'Равный матч, ничья вполне вероятна'
    else title = 'Явного фаворита нет'
    const ref = partnerBooks(ins.books).find((r) => r.book.x12?.home || r.book.x12?.away)
    slides.push({
      kind: 'odds',
      title,
      sub: 'Шансы — оценка tag.bet. Под ними — честная цена и кэф букмекера',
      probs: x,
      fair: { home: 1 / x.home, draw: 1 / x.draw, away: 1 / x.away },
      line: ref
        ? {
            partner: ref.partner.name,
            href: goHref(ref.partner, 'story-odds', m.id),
            odds: { home: ref.book.x12?.home?.value ?? null, draw: ref.book.x12?.draw?.value ?? null, away: ref.book.x12?.away?.value ?? null },
          }
        : null,
    })
  }

  // ── голы и вероятный счёт
  if (scheduled && model) {
    const total = model.lambdas.home + model.lambdas.away
    const over25 = model.over['2.5'] ?? cons.over['2.5'] ?? null
    let title = `Ждём около ${dec(total)} гола`
    if (over25 != null && over25 >= 0.6) title = `Будут голы: ждём около ${dec(total)}`
    else if (over25 != null && over25 <= 0.42) title = `Голов будет немного: ждём около ${dec(total)}`
    const scores = poissonGrid(model.lambdas.home, model.lambdas.away)
      .flatMap((row, i) => row.map((p, j) => ({ home: i, away: j, p })))
      .sort((a, b) => b.p - a.p)
      .slice(0, 3)
    slides.push({
      kind: 'goals',
      title,
      sub: `Сколько голов ждём: ${q(H)} — ${dec(model.lambdas.home)}, ${q(A)} — ${dec(model.lambdas.away)}`,
      over25,
      btts: model.btts,
      scores,
    })
  }

  // ── форма
  if (scheduled && (homeForm || awayForm)) {
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
    slides.push({ kind: 'form', title, sub: 'Последние 5 матчей: очки из 15 возможных, голы за игру', home: side(homeForm), away: side(awayForm) })
  }

  // ── прогноз
  if (scheduled && pick) {
    const c = pick.candidate
    const offer = c.bestPartner ?? c.best
    const value = pick.kind === 'value'
    slides.push({
      kind: 'pick',
      // исход словами, а не «П1»; пояснение — как в «Прогнозе tag.bet» на странице матча
      label: cap(outcomeText(c.key, m)),
      desc: value
        ? 'Букмекер платит за этот исход больше, чем он стоит по оценке tag.bet'
        : c.ev != null && c.ev < 0
          ? 'Самый вероятный исход, но кэф ниже честной цены — выгоды нет'
          : 'Самый вероятный исход, кэф — около честной цены',
      prob: c.prob,
      fairOdd: c.fairOdd,
      odd: offer?.value ?? null,
      bookmaker: offer?.partner?.name ?? null,
      ev: c.ev,
      value,
    })
  }

  // до начала — хотя бы два слайда с данными, после — хотя бы один (голы или статистика)
  if (slides.filter((s) => s.kind !== 'cover').length < (scheduled ? 2 : 1)) return null

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
          pick && offer && scheduled
            ? `Поставить за ${offer.value.toFixed(2)} в ${partner.name}`
            : m.status === 'live'
              ? `Кэфы по ходу матча — в ${partner.name}`
              : `На сайт ${partner.name}`,
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

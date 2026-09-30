/**
 * Генерация текста превью матча по данным — уникальный текст на каждой
 * странице матча (важно для SEO) без ручного копирайтинга.
 *
 * Названия команд всегда в именительном падеже — через «команда «X»»,
 * чтобы не склонять иностранные названия.
 */
import { SITE } from '@/config/site'
import { formatDateLong, formatTime, plural, pluralN, pct, weekdayWhen } from './format'
import type { Candidate, Consensus, ModelOutput, Pick } from './model'
import type { H2H, TeamForm } from './stats'
import type { TagHit } from './tags'
import type { Glicko, Injury, Match, MatchFull, Standings } from './types'

export type PreviewInput = {
  full: MatchFull
  cons: Consensus
  model: ModelOutput | null
  pick: Pick | null
  glicko: Glicko | null
  homeForm: TeamForm | null
  awayForm: TeamForm | null
  h2h: H2H | null
  injuries: Injury[]
  standings: Standings | null
  tags: TagHit[]
}

export type Paragraph = { title: string; text: string }

const q = (s: string) => `«${s}»`
const dec = (x: number) => x.toFixed(1).replace('.', ',')

function seeded(id: number) {
  let s = id % 2147483647 || 1
  return <T>(variants: T[]): T => {
    s = (s * 48271) % 2147483647
    return variants[s % variants.length]
  }
}

/** «победа «Арсенал»», «ТБ 2.5 — больше двух голов» и т.д. */
export function describePick(c: Candidate, m: Match): string {
  const h = q(m.home.name)
  const a = q(m.away.name)
  switch (c.key) {
    case 'home':
      return `победа команды ${h}`
    case 'draw':
      return 'ничья'
    case 'away':
      return `победа команды ${a}`
    case 'hd':
      return `команда ${h} не проиграет`
    case 'da':
      return `команда ${a} не проиграет`
    case 'ha':
      return 'в матче не будет ничьей'
    case 'bttsYes':
      return 'обе команды забьют'
    case 'bttsNo':
      return 'хотя бы одна команда не забьёт'
  }
  const m2 = /^(over|under)([\d.]+)$/.exec(c.key)
  if (m2) {
    const line = Number(m2[2])
    return m2[1] === 'over'
      ? `в матче будет ${Math.ceil(line)} ${plural(Math.ceil(line), ['гол', 'гола', 'голов'])} и больше`
      : `в матче будет не больше ${pluralN(Math.floor(line), ['гола', 'голов', 'голов'])}`
  }
  return c.label
}

function rankOf(st: Standings | null, teamId: number) {
  for (const g of st?.groups ?? []) {
    const r = g.rows.find((x) => x.teamId === teamId)
    if (r) return r
  }
  return null
}

function formSentence(name: string, f: TeamForm, pick: <T>(v: T[]) => T): string {
  const n = f.games.length
  const w = f.games.filter((g) => g.result === 'W').length
  const d = f.games.filter((g) => g.result === 'D').length
  const l = n - w - d
  const rec = `${pluralN(w, ['победа', 'победы', 'побед'])}, ${pluralN(d, ['ничья', 'ничьи', 'ничьих'])} и ${pluralN(l, ['поражение', 'поражения', 'поражений'])}`
  let s = pick([
    `У команды ${q(name)} в последних ${pluralN(n, ['матче', 'матчах', 'матчах'])} ${rec}; в среднем ${dec(f.gfAvg)} забитых и ${dec(f.gaAvg)} пропущенных за игру.`,
    `Команда ${q(name)} в последних ${pluralN(n, ['матче', 'матчах', 'матчах'])}: ${rec}, разница мячей ${dec(f.gfAvg)} : ${dec(f.gaAvg)} в среднем за игру.`,
  ])
  if (f.streak?.kind === 'W' && f.streak.len >= 3) {
    s += ` Сейчас у неё серия из ${pluralN(f.streak.len, ['победы', 'побед', 'побед'])} подряд.`
  } else if (f.streak?.kind === 'L' && f.streak.len >= 3) {
    s += ` Команда проиграла ${pluralN(f.streak.len, ['матч', 'матча', 'матчей'])} подряд.`
  } else if (f.streak?.kind === 'unbeaten') {
    s += ` Без поражений уже ${pluralN(f.streak.len, ['матч', 'матча', 'матчей'])}.`
  } else if (f.streak?.kind === 'winless') {
    s += ` Без побед уже ${pluralN(f.streak.len, ['матч', 'матча', 'матчей'])}.`
  }
  if (f.over25Rate >= 0.7) s += ` ТБ 2.5 заходил в ${pct(f.over25Rate)} её матчей.`
  else if (f.over25Rate <= 0.3) s += ` В ${pct(1 - f.over25Rate)} её матчей было не больше двух голов.`
  return s
}

export function buildPreview(p: PreviewInput): Paragraph[] {
  const { full, cons, model, pick } = p
  const m = full.match
  const rnd = seeded(m.id)
  const out: Paragraph[] = []
  const home = m.home.name
  const away = m.away.name

  // ── Вступление
  {
    const when = `${weekdayWhen(m.ts)}, ${formatDateLong(m.ts)}, в ${formatTime(m.ts)} (${SITE.tzLabel})`
    const where = full.venue ? ` на стадионе ${q(full.venue.name)}${full.venue.city ? ` (${full.venue.city})` : ''}` : ''
    const stage = `${m.league.name}${m.round ? `, ${m.round}` : ''}`
    let text: string
    if (m.status === 'finished' && m.score) {
      text = `Матч ${q(home)} — ${q(away)} (${stage}) состоялся ${formatDateLong(m.ts)}${where} и завершился со счётом ${m.score.home}:${m.score.away}.`
    } else if (m.status === 'live' && m.score) {
      text = `Матч ${q(home)} — ${q(away)} (${stage}) идёт прямо сейчас${m.elapsed ? `: ${m.elapsed}-я минута` : ''}, счёт ${m.score.home}:${m.score.away}.`
    } else {
      text = rnd([
        `Матч ${q(home)} — ${q(away)} пройдёт ${when}${where}. Турнир: ${stage}.`,
        `${stage}: команды ${q(home)} и ${q(away)} встретятся ${when}${where}.`,
        `${formatDateLong(m.ts)} в ${formatTime(m.ts)} (${SITE.tzLabel}) команда ${q(home)} примет у себя соперника — ${q(away)}${where}. Турнир: ${stage}.`,
      ])
    }
    const rh = rankOf(p.standings, m.home.id)
    const ra = rankOf(p.standings, m.away.id)
    if (rh && ra) {
      text += ` Перед игрой хозяева идут ${rh.rank}-ми в таблице (${pluralN(rh.points, ['очко', 'очка', 'очков'])}), гости — ${ra.rank}-ми (${pluralN(ra.points, ['очко', 'очка', 'очков'])}).`
    }
    if (full.referee) text += ` Главный арбитр — ${full.referee}.`
    out.push({ title: 'О матче', text })
  }

  // ── Форма
  if (p.homeForm || p.awayForm) {
    const parts: string[] = []
    if (p.homeForm) parts.push(formSentence(home, p.homeForm, rnd))
    if (p.awayForm) parts.push(formSentence(away, p.awayForm, rnd))
    out.push({ title: 'Форма команд', text: parts.join(' ') })
  }

  // ── Личные встречи
  if (p.h2h) {
    const h = p.h2h
    const n = h.games.length
    let text = `В ${pluralN(n, ['последней очной встрече', 'последних очных встречах', 'последних очных встречах'])}: ${pluralN(h.homeWins, ['победа', 'победы', 'побед'])} команды ${q(home)}, ${pluralN(h.draws, ['ничья', 'ничьи', 'ничьих'])} и ${pluralN(h.awayWins, ['победа', 'победы', 'побед'])} команды ${q(away)}.`
    text += ` В среднем ${dec(h.avgGoals)} гола за матч, ТБ 2.5 — в ${pct(h.over25Rate)} встреч, обе забивали в ${pct(h.bttsRate)}.`
    const last = h.games[0]
    text += ` Последняя встреча: ${last.home.name} — ${last.away.name} ${last.score.home}:${last.score.away} (${formatDateLong(last.ts)}).`
    out.push({ title: 'Личные встречи', text })
  }

  // ── Линия и модель
  {
    const parts: string[] = []
    const x = model?.x12 ?? cons.x12
    if (x) {
      const fav = x.home >= x.away ? { name: home, p: x.home } : { name: away, p: x.away }
      const diff = Math.abs(x.home - x.away)
      if (diff < 0.07) {
        parts.push(`Букмекеры не видят явного фаворита: П1 — ${pct(x.home)}, ничья — ${pct(x.draw)}, П2 — ${pct(x.away)}.`)
      } else {
        parts.push(
          rnd([
            `Фаворит по линии — ${q(fav.name)}: вероятность победы ${pct(fav.p)}, ничьей — ${pct(x.draw)}.`,
            `Букмекеры отдают предпочтение команде ${q(fav.name)} — ${pct(fav.p)} на победу, ничья оценивается в ${pct(x.draw)}.`,
          ]),
        )
      }
      if (cons.books > 1) parts.push(`Оценка по ${pluralN(cons.books, ['букмекеру', 'букмекерам', 'букмекерам'])} после снятия маржи.`)
    }
    if (model) {
      const s = model.topScores
      parts.push(
        `Модель tag.bet ожидает ${dec(model.lambdas.home)} гола от хозяев и ${dec(model.lambdas.away)} от гостей; самый вероятный счёт — ${s[0].home}:${s[0].away} (${pct(s[0].p)})${s[1] ? `, затем ${s[1].home}:${s[1].away}` : ''}.`,
      )
      parts.push(`Вероятность тотала больше 2.5 — ${pct(model.over['2.5'])}, «обе забьют» — ${pct(model.btts)}.`)
    }
    if (p.glicko) {
      parts.push(`Рейтинг Glicko-2: ${home} — ${Math.round(p.glicko.homeRating)}, ${away} — ${Math.round(p.glicko.awayRating)}.`)
    }
    const move = p.tags.find((t) => t.slug === 'progruz')
    if (move) parts.push(`${move.reason}.`)
    if (parts.length) out.push({ title: 'Линия букмекеров и модель', text: parts.join(' ') })
  }

  // ── Кадры
  {
    const hi = p.injuries.filter((i) => i.teamId === m.home.id)
    const ai = p.injuries.filter((i) => i.teamId === m.away.id)
    const list = (xs: Injury[]) =>
      xs
        .slice(0, 5)
        .map((i) => `${i.player} (${i.reason.toLowerCase()})`)
        .join(', ') + (xs.length > 5 ? ` и ещё ${xs.length - 5}` : '')
    let text: string
    if (!hi.length && !ai.length) {
      text = 'Данных о травмированных и дисквалифицированных игроках на момент публикации нет — проверьте стартовые составы за час до матча.'
    } else {
      text = [
        hi.length ? `У хозяев не сыграют: ${list(hi)}.` : 'У хозяев потерь нет.',
        ai.length ? `У гостей: ${list(ai)}.` : 'У гостей потерь нет.',
      ].join(' ')
    }
    if (m.status === 'scheduled') out.push({ title: 'Кадровые новости', text })
  }

  // ── Прогноз
  if (pick && m.status === 'scheduled') {
    const c = pick.candidate
    const o = c.bestPartner ?? c.best
    let text = `Наш прогноз: ${c.label} — ${describePick(c, m)}. Вероятность по модели ${pct(c.prob)}, справедливый коэффициент ${c.fairOdd.toFixed(2)}.`
    if (o) {
      text += ` Лучший коэффициент — ${o.value.toFixed(2)} (${o.partner?.name ?? o.bookmakerName})`
      text += pick.kind === 'value' ? `: это value-ставка с перевесом +${((c.ev ?? 0) * 100).toFixed(1)}%.` : '.'
    }
    if (pick.kind !== 'value') {
      text += ' Явного перевеса над линией нет — это самый вероятный исход с приемлемым коэффициентом.'
    }
    out.push({ title: 'Прогноз', text })
  }

  return out
}

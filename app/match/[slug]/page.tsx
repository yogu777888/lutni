import type { Metadata } from 'next'
import { BlockMore } from '@/components/BlockMore'
import { notFound, permanentRedirect } from 'next/navigation'
import { cache } from 'react'
import { MatchBar } from '@/components/match/MatchBar'
import { teamCode } from '@/lib/i18n/codes'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { JsonLd } from '@/components/JsonLd'
import { KeyEvents } from '@/components/match/EventsBlock'
import { StatsPanel } from '@/components/match/StatsPanel'
import { matchRows, type StatPeriod } from '@/lib/sstats/stat-rows'
import { XgTerm, XgText } from '@/components/match/Xg'
import { Strengths } from '@/components/match/Strengths'
import { mainPoint, teamPoints } from '@/lib/team-xg'
import { ClubVars } from '@/components/match/ClubVars'
import { FormBlock } from '@/components/match/FormBlock'
import { H2HBlock } from '@/components/match/H2HBlock'
import { InjuriesBlock } from '@/components/match/InjuriesBlock'
import { Lineups } from '@/components/match/Lineups'
import { Momentum } from '@/components/match/Momentum'
import { Hint } from '@/components/match/Hint'
import { Tabs, type TabItem } from '@/components/match/Tabs'
import { MatchHero, type BoardCell } from '@/components/match/MatchHero'
import { hasMoves, OddsTable } from '@/components/match/OddsTable'
import { PredictBlock } from '@/components/match/PredictHero'
import { MatchRow } from '@/components/MatchRow'
import { MatchTags } from '@/components/match/MatchTags'
import { PartnerCard } from '@/components/PartnerCard'
import { BlockNote, BlockTitle, Section } from '@/components/Section'
import { TeamLogo } from '@/components/TeamLogo'
import { StandingsTable } from '@/components/StandingsTable'
import { StickyCta } from '@/components/StickyCta'
import { PARTNERS, partnerForApiBookmaker, primaryPartner } from '@/config/bookmakers'
import { SITE } from '@/config/site'
import { goHref } from '@/lib/affiliate'
import { getLiveOdds, getMatchInsights, getMatchesByDate, getPariHistory, settle, waitLsExtra, waitTeamXg } from '@/lib/data'
import { ChanceChart, type ChanceSeries } from '@/components/match/ChanceChart'
import { LiveRefresh } from '@/components/Live'
import { leagueTitle } from '@/lib/flags'
import { matchNotes } from '@/lib/match-notes'
import { appNow, formatDateShort, formatTime, idFromSlug, pct, ymdInTz } from '@/lib/format'
import { valueThreshold } from '@/lib/model'
import { leagueHref, listHref, matchHref } from '@/lib/links'
import type { Match } from '@/lib/types'
import { buildVerdict, outcomeText, split100 } from '@/lib/verdict'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<{ tab?: string | string[] }> }

const load = cache((id: number) => getMatchInsights(id))

function titleFor(m: Match) {
  const pair = `${m.home.name} — ${m.away.name}`
  if (m.status === 'finished' && m.score) return `${pair} ${m.score.home}:${m.score.away}: результат и статистика матча ${formatDateShort(m.ts)}`
  if (m.status === 'live') return `${pair}: онлайн, счёт и коэффициенты`
  return `${pair}: прогноз и коэффициенты на матч ${formatDateShort(m.ts)}`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const id = idFromSlug(slug)
  if (!id) return {}
  const ins = await load(id).catch(() => null)
  if (!ins) return { title: 'Матч', robots: { index: false } }
  const m = ins.match
  const title = titleFor(m)
  const pick = ins.pick ? ` Прогноз tag.bet: ${ins.pick.candidate.label}.` : ''
  const description =
    m.status === 'finished' && m.score
      ? `Матч ${m.home.name} — ${m.away.name} (${m.league.name}) завершился со счётом ${m.score.home}:${m.score.away}. События, статистика, коэффициенты закрытия и теги ставок.`
      : `Прогноз на матч ${m.home.name} — ${m.away.name} (${m.league.name}) ${formatDateShort(m.ts)} в ${formatTime(m.ts)} ${SITE.tzLabel}: коэффициенты букмекеров, вероятности, форма и личные встречи.${pick}`
  return {
    title,
    description,
    alternates: { canonical: matchHref(m) },
    openGraph: { title, description, type: 'article', url: matchHref(m), images: [{ url: '/og.png', width: 1200, height: 630 }] },
  }
}

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

export default async function MatchPage({ params, searchParams }: Props) {
  const { slug } = await params
  const rawTab = (await searchParams)?.tab
  const tab = typeof rawTab === 'string' ? rawTab : undefined
  const id = idFromSlug(slug)
  if (!id) notFound()
  const ins = await load(id)
  if (!ins) notFound()
  const m = ins.match
  const canonical = matchHref(m)
  if (`/match/${slug}` !== canonical) permanentRedirect(canonical)

  const { full: base, books, cons, model, candidates, pick, tags } = ins
  // Flashscore-раздел SStats (`/Ls/*`): составы, давление по минутам, лишние строки статистики, стадион и зрители —
  // ждём не дольше 1,5 с, дальше ответ дозаполнит кэш к следующему открытию (владелец: «сделай всё»)
  // xG прошлых матчей обеих команд — для «Сильного и слабого места» (тоже ≤1,5 с, параллельно)
  const [ls, xg] = await Promise.all([waitLsExtra(m, new Set(base.stats.map((s) => s.key))), waitTeamXg(ins.homeForm, ins.awayForm)])
  const full = ls && (ls.stats.length || (ls.venue && !base.venue))
    ? { ...base, stats: [...base.stats, ...ls.stats], venue: base.venue ?? (ls.venue ? { ...ls.venue, capacity: null } : null) }
    : base
  // в таблице кэфов — только легальные партнёры (владелец: «оставь легал»): зарубежных букмекеров в РФ рекламировать
  // нельзя, а строка без ссылки — реклама конкурента; в честной цене (консенсус) они по-прежнему участвуют
  const legalBooks = books.filter((b) => partnerForApiBookmaker(b.bookmakerId, b.bookmakerName))
  // цвета клубов для свечения за командами (не дольше 1,5 с) и метки-факты над эмблемами — как в «Главных матчах»
  // история доматчевой линии PARI (легальный букмекер): ждём не дольше 2 с, иначе — без графика
  const pari = await Promise.race([getPariHistory(m).catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), 2000))])
  // идёт матч — на табло кэфы PARI по ходу матча (доматчевые там уже история, поставить по ним нельзя)
  const isLive = m.status === 'live' || m.status === 'suspended'
  const liveOdds = isLive ? await Promise.race([getLiveOdds(m).catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), 1500))]) : null
  const liveX12 = liveOdds?.home && liveOdds.draw && liveOdds.away ? liveOdds : null
  const pariPartner = PARTNERS.find((p) => p.slug === 'pari') ?? null
  const scheduled = m.status === 'scheduled'
  const x = model?.x12 ?? cons.x12

  // «Как менялись шансы»: линия PARI в процентах (кэфы без маржи, в сумме 100) на каждый момент изменения и оценка
  // tag.bet по исходу (владелец: «как менялась линия типа оценка tag.bet?»)
  const OUT = [
    ['home', m.home.name, '#1f6fd1'],
    ['draw', 'Ничья', '#0f9d8a'],
    ['away', m.away.name, '#e0670f'],
  ] as const
  const est = x ? split100(x) : null
  const chanceSeries: ChanceSeries[] = (() => {
    const h = pari?.history
    if (!h?.home?.length || !h.draw?.length || !h.away?.length) return []
    const times = [...new Set([...h.home, ...h.draw, ...h.away].map((p) => p.t))].sort((a, b) => a - b)
    const stepAt = (pts: { t: number; v: number | null }[], t: number) => {
      let v: number | null = null
      for (const p of pts) {
        if (p.t > t) break
        v = p.v
      }
      return v
    }
    const out: ChanceSeries[] = OUT.map(([key, label, color]) => ({ key, label, color, est: est ? est[key] : null, pts: [] }))
    for (const t of times) {
      const o = { home: stepAt(h.home, t), draw: stepAt(h.draw, t), away: stepAt(h.away, t) }
      if (!o.home || !o.draw || !o.away) continue
      const pc = split100({ home: 1 / o.home, draw: 1 / o.draw, away: 1 / o.away })
      out.forEach((sr) => {
        const k = sr.key as 'home' | 'draw' | 'away'
        const last = sr.pts[sr.pts.length - 1]
        if (last && last.v === pc[k] && last.odd === o[k]) return
        sr.pts.push({ t, v: pc[k], odd: o[k]! })
      })
    }
    return out.every((sr) => sr.pts.length) ? out : []
  })()
  // блок — только если шанс какого-то исхода сдвинулся хотя бы на 3 п.п. (владелец: «а как менялись шансы как?» —
  // 400px ровных линий под фразой «шансы почти не менялись»)
  const chanceMoved = chanceSeries.some((sr) => Math.max(...sr.pts.map((p) => p.v)) - Math.min(...sr.pts.map((p) => p.v)) >= 3)
  // вывод одной фразой: самое заметное изменение и выгоден ли сейчас кэф PARI по нашей оценке
  const chanceText = (() => {
    if (!chanceSeries.length) return null
    const moves = chanceSeries.map((sr) => ({ sr, a: sr.pts[0], b: sr.pts[sr.pts.length - 1] }))
    const top = [...moves].sort((p, q) => Math.abs(q.b.v - q.a.v) - Math.abs(p.b.v - p.a.v))[0]
    const name = (k: string) => { const t = outcomeText(k, m); return t[0].toUpperCase() + t.slice(1) }
    const first =
      Math.abs(top.b.v - top.a.v) >= 2
        ? `${name(top.sr.key)}: по линии ${top.a.v}% → ${top.b.v}%${top.sr.est != null ? `, наша оценка — ${top.sr.est}%` : ''}.`
        : 'Шансы по линии почти не менялись.'
    const val = scheduled && x ? moves.find((mv) => x[mv.sr.key as 'home' | 'draw' | 'away'] * mv.b.odd - 1 >= valueThreshold(mv.b.odd)) : null
    const second = val
      ? ` ${name(val.sr.key)}: кэф PARI ${val.b.odd.toFixed(2)} выше честной цены ${(1 / x![val.sr.key as 'home' | 'draw' | 'away']).toFixed(2)} — линия недооценивает исход.`
      : est
        ? ' Линия и наша оценка близки — заметной выгоды у PARI нет.'
        : ''
    return first + second
  })()
  const disclaimer =
    'Прогноз и вероятности рассчитаны автоматически по данным букмекерских линий и статистике и не гарантируют результат. 18+. Ставьте только ту сумму, потерю которой готовы принять.'
  const over25 = model?.over['2.5'] ?? cons.over['2.5']
  const btts = model?.btts ?? cons.btts

  const sameDay = await settle(getMatchesByDate(ymdInTz(m.ts)), [] as Match[])
  // «Другие матчи» (владелец: «а другие матчи как?»): своя лига первой, внутри — идущие, предстоящие (ближайший первым),
  // сыгранные (свежий первым) в конце: сверху стояли три итога в 16:00, а предстоящий матч — последним
  const stateRank = (o: Match) => (o.status === 'live' || o.status === 'suspended' ? 0 : o.status === 'scheduled' ? 1 : o.status === 'finished' ? 2 : 3)
  const related = sameDay
    .filter((o) => o.id !== m.id)
    .sort(
      (a, b) =>
        Number(b.league.id === m.league.id) - Number(a.league.id === m.league.id) ||
        stateRank(a) - stateRank(b) ||
        (stateRank(a) === 2 ? b.ts - a.ts : a.ts - b.ts),
    )
    .slice(0, 6)
  const matchDay = ymdInTz(m.ts)
  const today = ymdInTz(appNow())

  // табло матча: шанс, кэф и честная цена. Кэфы — одной линии одного легального партнёра, с его именем и ссылкой к нему
  // (как в строках списка): раньше три ячейки собирались у разных букмекеров под подписью «Кэф букмекера». Партнёр —
  // тот, у кого выгодна ставка, иначе первый по порядку PARTNERS, у кого есть все три исхода
  const partnerLine = (() => {
    const withX12 = books
      .map((b) => ({ b, partner: partnerForApiBookmaker(b.bookmakerId, b.bookmakerName) }))
      .filter((r): r is { b: (typeof books)[number]; partner: NonNullable<typeof r.partner> } => Boolean(r.partner && r.b.x12?.home && r.b.x12.draw && r.b.x12.away))
    const want = pick?.candidate.bestPartner?.partner?.slug
    return withX12.find((r) => r.partner.slug === want) ?? [...withX12].sort((a, c) => PARTNERS.indexOf(a.partner) - PARTNERS.indexOf(c.partner))[0] ?? null
  })()
  const cells: BoardCell[] | null = x
    ? (['home', 'draw', 'away'] as const).map((k) => {
        // по ходу матча — только live-кэфы PARI; нет их — кэфов на табло нет (не доматчевые: по ним уже не поставить)
        const odd = isLive ? (liveX12 && pariPartner ? liveX12[k]! : null) : (partnerLine?.b.x12?.[k]?.value ?? null)
        return {
          key: k,
          label: k === 'home' ? `победа «${m.home.name}»` : k === 'away' ? `победа «${m.away.name}»` : 'ничья',
          p: x[k],
          odd,
          fair: 1 / x[k],
          // горит, если именно этот букмекер платит больше честной цены (то же правило, что точка в таблице)
          hot: scheduled && odd != null && x[k] * odd - 1 >= valueThreshold(odd),
        }
      })
    : null

  // чьи кэфы на табло и мини-табло: по ходу матча — live PARI, до начала — линия партнёра, после — без ссылки
  const heroLine =
    isLive && liveX12 && pariPartner
      ? { name: pariPartner.name, href: goHref(pariPartner, 'match-live-odds', m.id), live: true }
      : partnerLine && scheduled
        ? { name: partnerLine.partner.name, href: goHref(partnerLine.partner, 'match-hero', m.id) }
        : null

  // «Коротко о матче» словами — только до начала: кто скорее выиграет, голы, деньги, ставка
  const verdict = scheduled
    ? buildVerdict({
        match: m,
        tags,
        probs: x,
        over25,
        btts,
        pick: pick
          ? { key: pick.candidate.key, odd: (pick.candidate.bestPartner ?? pick.candidate.best)?.value ?? null, kind: pick.kind, prob: pick.candidate.prob }
          : null,
      })
    : null
  // место в таблице (с 3-го тура) и форма — на табло под названиями команд
  const rankOf = (id: number) => {
    const row = ins.standings?.groups.flatMap((g) => g.rows).find((r) => r.teamId === id)
    return row && row.played >= 3 ? row.rank : null
  }
  const heroCtx = {
    home: { rank: rankOf(m.home.id), form: [...(ins.homeForm?.last5 ?? [])].reverse() },
    away: { rank: rankOf(m.away.id), form: [...(ins.awayForm?.last5 ?? [])].reverse() },
  }
  // «Выгодные ставки» до начала — уже в «Прогнозе tag.bet» с цифрами, в «Матче в подборках» не повторяем
  const shownTags = scheduled && (verdict || pick) ? tags.filter((t) => t.slug !== 'value') : tags

  const partner = pick?.candidate.bestPartner?.partner ?? primaryPartner()
  const pickOffer = pick?.candidate.bestPartner

  const pair = `${m.home.name} — ${m.away.name}`
  const dec1 = (n: number) => n.toFixed(1).replace('.', ',')
  const dec2 = (n: number) => n.toFixed(2).replace('.', ',')
  const crumbs = [
    { href: '/matches', label: 'Матчи' },
    { href: leagueHref(m.league), label: leagueTitle(m.league.name) },
    { href: canonical, label: pair },
  ]
  const h1 = m.status === 'finished' ? `${pair}: результат матча` : m.status === 'live' ? `${pair}: матч онлайн` : `Прогноз на матч ${pair}`


  // ─── Разделы страницы: собираем по вкладкам ниже ───
  const sec_tags = (
    <>
          {shownTags.length ? (
            <Section outside title="Матч в подборках" className="keep-size overflow-hidden !p-0">
              <MatchTags tags={shownTags} home={m.home} away={m.away} started={!scheduled} injuries={ins.injuries ?? []} />
            </Section>
          ) : null}

    </>
  )
  const sec_goals = (
    <>
          {x ? (
            // владелец: «а голы и счёт как?» — шансы строками, как статистика (без «46% — до 2 голов», повторявших 54%),
            // чьи голы — названиями («1.95 : 0.85» читалось счётом с дробями), без плашек внутри карточки и без
            // «рейтинга силы» (1684 / 1478 новичку ничего не говорят); «Вероятный счёт» — только до начала: на 59′
            // при 1:0 «1:1 — 10%» читалось как прогноз сейчас
            <Section outside title={scheduled ? 'Голы и счёт' : 'Голы и счёт до матча'}>
              {/* одна таблица строками «название — значение», как «Форма команд» (владелец: «в блоке голы и счет как то некрасиво
                  навалено всего» — полосы, черта, фраза с переносом и чипы счёта были четырьмя разными видами) */}
              {/* сверху одна крупная цифра, как счёт на табло; ниже все строки одной схемы — подпись слева, значение справа,
                  полоса под строкой (владелец: «просто сейчас реально настройки из айос напоминает»; потом — «виджет стал
                  каким то немного неровным»: голы команд стояли справа от цифры своей раскладкой с подписью по центру) */}
              {model ? (
                <div className="flex items-end gap-3 pb-5">
                  <span className="display-num text-[52px] leading-[0.9] text-fg">{dec1(model.lambdas.home + model.lambdas.away)}</span>
                  <span className="pb-0.5 text-[14px] leading-snug text-dim">
                    гола ждём
                    <br />в среднем
                  </span>
                </div>
              ) : null}
              <dl className={model ? '-mb-3' : '-my-1.5'}>
                {[
                  // после начала — шансы исходов до матча первой строкой (раньше строкой «До матча: …» внизу табло;
                  // владелец: «и про до матча вроде тоже есть на странице?» — в табло только счёт)
                  !scheduled && est
                    ? {
                        k: 'Шансы на победу',
                        p: null,
                        // в строку «подпись — значение» три исхода с эмблемами на телефоне не влезали — подпись сверху,
                        // исходы под ней во всю ширину: хозяева слева, ничья по центру, гости справа, как полоса ниже
                        wide: true,
                        v: (
                          <span className="grid grid-cols-3 items-center">
                            <span className="flex items-center gap-1.5" title={`Победа «${m.home.name}»`}>
                              <TeamLogo name={m.home.name} src={m.home.logo ?? null} size={20} />
                              <span className="num font-semibold">{est.home}%</span>
                            </span>
                            <span className="text-center" title="Ничья">
                              <span className="text-dim">ничья</span> <span className="num font-semibold">{est.draw}%</span>
                            </span>
                            <span className="flex items-center justify-end gap-1.5" title={`Победа «${m.away.name}»`}>
                              <span className="num font-semibold">{est.away}%</span>
                              <TeamLogo name={m.away.name} src={m.away.logo ?? null} size={20} />
                            </span>
                          </span>
                        ),
                      }
                    : null,
                  model
                    ? {
                        k: 'Голы команд',
                        v: (
                          <span className="flex items-center gap-2">
                            <span className="flex items-center gap-1.5" title={`«${m.home.name}»`}>
                              <TeamLogo name={m.home.name} src={m.home.logo ?? null} size={20} />
                              <span className="num font-semibold">{dec1(model.lambdas.home)}</span>
                            </span>
                            <span className="text-mute">·</span>
                            <span className="flex items-center gap-1.5" title={`«${m.away.name}»`}>
                              <span className="num font-semibold">{dec1(model.lambdas.away)}</span>
                              <TeamLogo name={m.away.name} src={m.away.logo ?? null} size={20} />
                            </span>
                          </span>
                        ),
                        p: null,
                        split: model.lambdas.home / (model.lambdas.home + model.lambdas.away || 1),
                      }
                    : null,
                  over25 != null ? { k: '3 гола и больше', v: <span className="num font-semibold">{pct(over25)}</span>, p: over25 } : null,
                  btts != null ? { k: 'Обе забьют', v: <span className="num font-semibold">{pct(btts)}</span>, p: btts } : null,
                  model && scheduled
                    ? {
                        k: 'Вероятный счёт',
                        p: null,
                        v: (
                          <span className="flex flex-wrap justify-end gap-x-3 gap-y-0.5">
                            {model.topScores.slice(0, 3).map((sc, i) => (
                              // ниже 380px — два счёта: с третьим строка переносилась
                              <span key={`${sc.home}-${sc.away}`} className={`num whitespace-nowrap ${i === 2 ? 'max-[379px]:hidden' : ''}`}>
                                <b className="font-semibold">
                                  {sc.home}:{sc.away}
                                </b>{' '}
                                <span className="text-dim">{pct(sc.p)}</span>
                              </span>
                            ))}
                          </span>
                        ),
                      }
                    : null,
                ]
                  .filter((r) => r != null)
                  .map((r) => (
                    <div key={r.k} className={`border-t border-edge py-3 text-[16px] ${model ? '' : 'first:border-t-0'}`}>
                      {'wide' in r ? (
                        <>
                          <dt className="text-[14px] text-dim">{r.k}</dt>
                          <dd className="mt-2">{r.v}</dd>
                        </>
                      ) : (
                        <div className="flex items-center justify-between gap-4">
                          <dt className="shrink-0 whitespace-nowrap text-[14px] text-dim">{r.k}</dt>
                          <dd className="text-right">{r.v}</dd>
                        </div>
                      )}
                      {'split' in r && r.split != null ? (
                        // доля голов хозяев слева, гостей справа — как полосы «Формы команд»
                        <div className="mt-2 flex h-1.5 gap-0.5" aria-hidden>
                          <div className={`h-full rounded-l-full ${r.split >= 0.5 ? 'bg-white/85' : 'bg-white/30'}`} style={{ width: `${r.split * 100}%` }} />
                          <div className={`h-full flex-1 rounded-r-full ${r.split <= 0.5 ? 'bg-white/85' : 'bg-white/30'}`} />
                        </div>
                      ) : r.p != null ? (
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.09]" aria-hidden>
                          <div className="h-full rounded-full bg-white/85" style={{ width: `${Math.round(r.p * 100)}%` }} />
                        </div>
                      ) : null}
                    </div>
                  ))}
              </dl>
            </Section>
          ) : null}

    </>
  )
  const sec_chance = (
    <>
          {chanceMoved ? (
            // справа — без «9 изменений»: число ничего не говорит и спорило с «почти не менялись», а на телефоне длинная
            // подпись сжимала заголовок в две строки
            // вывод — под блоком вместе с пояснением, в карточке только график (владелец: «может вынести под блок этот текст?»)
            <Section
              outside
              title="Как менялись шансы"
              // у графика свои поля под подписи — полей карточки меньше, чем у остальных блоков
              className="!px-3 sm:!px-5"
              note={
                <>
                  {chanceText ? <>{chanceText} </> : null}
                  Линия — шансы из кэфов PARI без маржи букмекера, пунктир — оценка tag.bet.
                </>
              }
            >
              <ChanceChart series={chanceSeries} end={Math.min(m.ts, appNow())} />
            </Section>
          ) : null}

    </>
  )
  const sec_odds = (
    <>
          {/* только до начала (владелец: «а коэффициенты букмекеров как?»): после — по доматчевым кэфам не поставить, а кэфы
              «сейчас» — на табло */}
          {scheduled ? (
            <Section outside
              title="Коэффициенты букмекеров"
              note={
                <>
                  {hasMoves(legalBooks, m) ? '▼▲ — изменение с открытия линии. ' : ''}
                  <OddsTable part="note" match={m} books={legalBooks} model={model} candidates={candidates} />
                </>
              }
            >
              <OddsTable part="table" match={m} books={legalBooks} model={model} candidates={candidates} />
            </Section>
          ) : null}

    </>
  )
  // цвета клубов (`--club-h/-a`) — полосам «Формы» и «Статистики», линиям «Давления», номерам в «Составах»
  const clubVars = (node: React.ReactNode) => <ClubVars id={m.id} ymd={ymdInTz(m.ts)}>{node}</ClubVars>
  const sec_form = (
    <>
          {ins.homeForm || ins.awayForm ? (
            // цифры — по последним (до 10) матчам: выборку называем числом (было «последние матчи», а в карточке — три разные выборки)
            <Section outside title="Форма команд">
              {clubVars(<FormBlock home={m.home} away={m.away} homeForm={ins.homeForm} awayForm={ins.awayForm} />)}
            </Section>
          ) : null}

    </>
  )
  const sec_h2h = (
    <>
          {ins.h2h ? (
            // сколько встреч — сразу, как в «Форме команд»
            <Section outside
              title="Личные встречи"
            >
              <H2HBlock h2h={ins.h2h} home={m.home} away={m.away} />
            </Section>
          ) : null}

    </>
  )
  const sec_inj = (
    <>
          {scheduled ? (
            <Section outside title="Кадровые потери">
              <InjuriesBlock injuries={ins.injuries} home={m.home} away={m.away} />
            </Section>
          ) : null}

    </>
  )
  const sec_table = (
    <>
          {ins.standings ? (
            // «полностью →» справа от заголовка — нижней строкой `BlockMore`, как у остальных блоков-списков
            <Section outside title="Турнирная таблица" className="overflow-hidden">
              <StandingsTable standings={ins.standings} highlight={[m.home.id, m.away.id]} compact />
              <BlockMore href={leagueHref(m.league)} className="-mx-5 -mb-5 mt-4 !px-5 !py-3.5 sm:-mx-7 sm:-mb-7 sm:!px-7">Вся таблица</BlockMore>
            </Section>
          ) : null}

    </>
  )
  const sec_preview = (
    <>
          {/* текст для чтения и поисковиков — в конце (владелец: «а прогноз на матч как?»): пересказывает «Форму команд», «Личные
              встречи» и «Кадровые потери», которые раньше шли сразу за ним; строка была ~150 знаков — глаз терял строку;
              после начала — «Перед матчем» («Обзор матча» обещал события, а в тексте расклад до матча); ширина строки — ~75 знаков */}
          {ins.preview.length ? (
            <Section outside title={`${scheduled ? 'Прогноз на матч' : 'Перед матчем:'} ${pair}`} note={disclaimer}>
              {/* владелец: «блок прогноз на матч длинный и скучный» — «да»: сверху крупно сам прогноз (до начала — «Прогноз»,
                  после — «О матче»), остальные части — строками-раскрывашками с шевроном, как вопросы на странице букмекера;
                  текст целиком остаётся в коде страницы — он нужен поисковикам по запросу «прогноз на матч X — Y» */}
              {(() => {
                const lead = ins.preview.find((p) => p.title === 'Прогноз') ?? ins.preview[0]
                const rest = ins.preview.filter((p) => p !== lead)
                return (
                  <div className="prose-ru">
                    <p className="max-w-[62ch] text-[16px] leading-relaxed text-fg">{lead.text}</p>
                    {rest.length ? (
                      <div className="-mb-2 mt-4">
                        {rest.map((p) => (
                          <details key={p.title} className="group border-t border-edge">
                            <summary className="flex min-h-12 list-none items-center justify-between gap-3 py-2 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
                              {p.title}
                              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-mute transition-transform group-open:rotate-90" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                <path d="M9.5 6l6 6-6 6" />
                              </svg>
                            </summary>
                            <p className="max-w-[62ch] pb-4 text-[15px] leading-relaxed text-dim">{p.text}</p>
                          </details>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )
              })()}
            </Section>
          ) : null}

    </>
  )
  const sec_predict = (
    <>
          {scheduled && (verdict || pick) ? (
            <Section outside title="Прогноз">
              <PredictBlock m={m} v={verdict} pick={pick} probs={x} tags={tags} />
            </Section>
          ) : null}

    </>
  )


  const started = !scheduled && m.status !== 'postponed' && m.status !== 'cancelled'
  // «Главное» — два-три вывода словами из статистики и давления (как «Главное за минуту» в прототипе владельца)
  // сильное и слабое место по прошлым матчам — и для блока, и для «Главного» идущего матча («снова не реализует»)
  const points = { home: teamPoints(xg.home, ins.homeForm), away: teamPoints(xg.away, ins.awayForm) }
  const notes = started
    ? matchNotes({ home: m.home.name, away: m.away.name, score: m.score ?? null, stats: full.stats, events: full.events, momentum: ls?.momentum ?? null, live: isLive, minute: m.elapsed, points })
    : []
  const sec_notes = notes.length ? (
    <Section outside title="Главное">
      <div className="@container">
        <ul className={`-my-1 divide-y divide-edge @3xl:grid @3xl:divide-x @3xl:divide-y-0 ${notes.length === 3 ? '@3xl:grid-cols-3' : notes.length === 2 ? '@3xl:grid-cols-2' : ''}`}>
          {notes.map((n) => (
            <li key={n.title} className="relative py-3 first:pt-1 last:pb-1 @3xl:px-5 @3xl:py-1 @3xl:first:pl-0 @3xl:last:pr-0">
              <p className="text-[16px] font-semibold leading-snug">{n.title}</p>
              <p className="mt-1 text-[14px] leading-snug text-dim">
                <XgText text={n.text} />
              </p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  ) : null
  // «Ключевые события» — голы, удаления с причиной, незабитые пенальти по порядку (`KeyEvents`)
  const hasKey = full.events.some((e) => ['goal', 'own-goal', 'penalty', 'red', 'missed-penalty'].includes(e.kind))
  const sec_events = started && hasKey ? (
    <Section outside title="Ключевые события">
      <KeyEvents events={full.events} home={m.home} away={m.away} final={m.score ?? null} reds={ls?.reds} />
    </Section>
  ) : null
  // «Сильное и слабое место» — по xG прошлых матчей (`getTeamXg`), без него — по голам формы
  const anyPoint = [points.home, points.away].some((p) => p.strong || p.weak)
  const byXg = points.home.byXg || points.away.byXg
  // заголовок — о том, что в блоке: у «Эльче» сильное, у «Атлетико» ничего — «Сильное место»
  const kinds = new Set([points.home, points.away].map((p) => mainPoint(p)?.kind).filter(Boolean))
  const pointsTitle = kinds.size === 2 ? 'Сильное и слабое место' : kinds.has('strong') ? 'Сильное место' : 'Слабое место'
  const sec_points = anyPoint ? (
    <Section
      outside
      title={pointsTitle}
      note={byXg ? 'xG — сколько голов обычно забивают с таких моментов. Считаем по последним матчам команды.' : 'Считаем по голам в последних матчах команды.'}
    >
      <Strengths home={m.home} away={m.away} points={points} />
    </Section>
  ) : null
  const sec_momentum = ls?.momentum ? (
    <Section
      outside
      title={
        // ⓘ — объяснение шкалы по наведению и нажатию; окошко — во всю ширину этой обёртки
        <span className="relative inline-flex w-[min(300px,calc(100vw-4rem))] items-center">
          Давление команд
          <Hint title="Индекс давления" text="Показывает интенсивность атак по шкале 0–100. Проценты отражают распределение инициативы за проанализированное время." />
        </span>
      }
      // карточка — рамка для двух внутренних блоков: поля как зазор между ними (16px)
      className="!p-4"
    >
      {clubVars(<Momentum points={ls.momentum} events={full.events} final={m.score ?? null} url={`${SITE.url}${canonical}`} league={leagueTitle(m.league.name)} status={isLive ? (m.elapsed ? `${m.elapsed}′` : m.statusLabel) : m.status === 'finished' ? 'Матч завершён' : m.statusLabel} home={m.home} away={m.away} live={isLive} clock={isLive ? m.elapsed : null} />)}
    </Section>
  ) : null
  // статистика: матч целиком — строки `/Games` (обновляются со счётом) и всё остальное из `/Ls/GameInfo`; таймы и
  // доп. время — только из `/Ls/GameInfo` (в `/Games` их нет); «Основные / Все показатели» — в `StatsPanel`
  const statPeriods: StatPeriod[] = [
    { key: 'all', label: 'Матч', rows: matchRows(base.stats, ls?.periods.find((p) => p.key === 'all')?.rows ?? []) },
    ...(ls?.periods.filter((p) => p.key !== 'all') ?? []),
  ]
  const sec_stats =
    started && statPeriods[0].rows.length ? (
      <Section outside title="Статистика">
        {clubVars(<StatsPanel periods={statPeriods} home={{ id: m.home.id, name: m.home.name, logo: m.home.logo }} away={{ id: m.away.id, name: m.away.name, logo: m.away.logo }} />)}
      </Section>
    ) : null
  // составы — после начала своей вкладкой, до начала (за 90 минут, раньше их нет) — тоже
  const sec_lineups = ls?.lineups ? (
    <Section outside title={scheduled ? 'Стартовые составы' : 'Составы'}>
      {clubVars(<Lineups data={ls.lineups} home={m.home} away={m.away} />)}
    </Section>
  ) : null
  const hasPredict = scheduled && Boolean(verdict || pick)
  const tabs: TabItem[] = (
    started
      ? [
          { key: 'overview', label: 'Обзор', on: Boolean(sec_notes || sec_events || sec_momentum || shownTags.length), content: <>{sec_notes}{sec_events}{sec_momentum}{sec_tags}</> },
          { key: 'stats', label: 'Статистика', on: Boolean(sec_stats), content: sec_stats },
          { key: 'lineups', label: 'Составы', on: Boolean(sec_lineups), content: sec_lineups },
          {
            key: 'before',
            label: 'До матча',
            // у идущего матча вкладки нет (владелец: «убери раздел до матча из лайв матча») — у сыгранного осталась
            on: !isLive && Boolean(x || chanceMoved || ins.homeForm || ins.awayForm || ins.h2h || ins.standings || ins.preview.length),
            content: <>{sec_goals}{sec_chance}{sec_form}{sec_points}{sec_h2h}{sec_table}{sec_preview}</>,
          },
        ]
      : [
          {
            key: 'predict',
            label: 'Прогноз',
            on: Boolean(hasPredict || shownTags.length || x || chanceMoved || scheduled || ins.preview.length),
            content: <>{sec_predict}{sec_points}{sec_tags}{sec_goals}{sec_chance}{sec_odds}{sec_preview}</>,
          },
          { key: 'teams', label: 'Команды', on: Boolean(ins.homeForm || ins.awayForm || ins.h2h || scheduled || ins.standings), content: <>{sec_form}{sec_h2h}{sec_inj}{sec_table}</> },
          { key: 'lineups', label: 'Составы', on: Boolean(sec_lineups), content: sec_lineups },
        ]
  )
    .filter((t) => t.on)
    .map(({ key, label, content }) => ({ key, label, content }))
  // под табло после начала — три главные цифры, как в прототипе: видны на любой вкладке
  const quick = started
    ? (['expectedGoals', 'totalShots', 'cornerKicks'] as const)
        .map((k) => full.stats.find((st) => st.key === k))
        .filter((st): st is NonNullable<typeof st> => Boolean(st))
    : []

  return (
    <>
      {/* от xl — без общей подложки центра, как на главной: каждый раздел — своя панель, зазор 8px (владелец: «там блоки
          в блоке на странице матча»; правила — .bare-match в app/globals.css) */}
      <span hidden className="bare-match" />
      {/* верх страницы — одна закреплённая панель: «←», крошки, а когда табло уехало — мини-табло на том же месте */}
      {/* крошки — для поисковиков (BreadcrumbList); на экране «назад» — полоса `MatchBar` (телефон) и капсула в табло */}
      <Breadcrumbs chip className="hidden" items={crumbs} />
      <MatchBar
        back={leagueHref(m.league)}
        backLabel={leagueTitle(m.league.name)}
        home={{ name: m.home.name, logo: m.home.logo ?? null }}
        away={{ name: m.away.name, logo: m.away.logo ?? null }}
        center={m.score && m.status !== 'scheduled' ? `${m.score.home} : ${m.score.away}` : formatTime(m.ts)}
        minute={isLive ? { text: m.elapsed ? `${m.elapsed}′` : 'идёт', live: true } : m.status === 'finished' ? { text: 'итог', live: false } : null}
      />
      {/* заголовок — только для поисковиков: команды крупно на табло, видимый он третий раз повторял названия */}
      <h1 className="sr-only">{h1}</h1>
      {/* идёт матч — счёт, минута и live-кэфы обновляются сами */}
      {m.status === 'live' || m.status === 'suspended' ? <LiveRefresh /> : null}

      {/* табло — одно на все состояния: эмблемы, время или счёт, «Разбор за минуту»; до начала прогноз — отдельным блоком ниже
          (владелец: «блок матча супер некрасивый» — «да»; был первым блоком «Прогноз tag.bet» с табло внутри) */}
      <MatchHero
        full={full}
        cells={scheduled && (verdict || pick) ? null : cells}
        books={cons.books}
        line={heroLine}
        league={crumbs[1]}
        ctx={heroCtx}
        attendance={ls?.attendance ?? null}
      />

      {quick.length >= 2 ? (
        // три главные цифры — снова отдельной карточкой под табло (владелец: «а можешь блок где xg удары и угловые сделать
        // отдельно как было раньше?»; внутри табло под чертой — история); у каждого числа под ним код команды, хозяева
        // слева, гости справа — «1,90 : 0,38» без подписей не читалось, чьё какое
        <div className="card relative mt-3 grid grid-cols-3 divide-x divide-edge py-3" aria-label="Главные цифры матча">
          {quick.map((st) => {
            const v = (x: number) => (st.key === 'expectedGoals' ? dec2(x) : String(x))
            return (
              <div key={st.key} className="min-w-0 px-1 text-center">
                <p className="truncate text-[13px] text-dim">{st.key === 'expectedGoals' ? <XgTerm /> : st.key === 'totalShots' ? 'Удары' : 'Угловые'}</p>
                {/* числа и коды — одной сеткой: хозяева по правому краю левой колонки, гости — по левому правой */}
                <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-baseline gap-x-1 min-[380px]:gap-x-1.5 sm:gap-x-2">
                  <span className="num text-right text-[15px] font-semibold leading-tight min-[380px]:text-[17px] sm:text-[19px]">
                    <span className="sr-only">{m.home.name}: </span>
                    {v(st.home)}
                  </span>
                  <span aria-hidden className="text-[13px] text-mute">—</span>
                  <span className="num text-left text-[15px] font-semibold leading-tight min-[380px]:text-[17px] sm:text-[19px]">
                    <span className="sr-only">{m.away.name}: </span>
                    {v(st.away)}
                  </span>
                  <span aria-hidden className="text-right text-[13px] leading-tight tracking-[0.04em] text-mute">{teamCode(m.home.name)}</span>
                  <span aria-hidden />
                  <span aria-hidden className="text-left text-[13px] leading-tight tracking-[0.04em] text-mute">{teamCode(m.away.name)}</span>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {/* .match-body — на компьютере текст крупнее (app/globals.css) */}
      {/* между разделами 32px, а от заголовка до своей карточки 10px (`BlockTitle`): при 24 и 12 заголовок первого раздела
          читался подписью к табло над ним (владелец: «заголовок как будто относится к верхнему блоку») */}
      <div className="match-body mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* вкладки под табло (владелец прислал прототип страницы матча из ChatGPT: «посмотри как там сделана страница матча
            просто и понятно» — «давай без входа делай то что ты до этого хотел»): вместо 14 разделов лентой — 2–4 вкладки;
            всё содержимое — в разметке с сервера (поисковикам — страница целиком), выбранная — в адресе `?tab=` */}
        <div className="min-w-0">
          <Tabs param="tab" initial={tab} items={tabs} panelClassName="mt-6 space-y-8" />
          {/* оговорка — последней строкой разбора; разбора нет — под вкладками */}
          {ins.preview.length ? null : <BlockNote className="!mt-8">{disclaimer}</BlockNote>}
        </div>
        <aside className="space-y-6 sm:space-y-8 lg:sticky lg:top-24 lg:self-start xl:static xl:space-y-6 2xl:sticky 2xl:top-[72px]">
          <section>
            {/* заголовок — над блоком, как у разделов страницы (`Section outside`) */}
            <BlockTitle title="Где поставить" />
            <div className="card overflow-hidden">
              <div className="keep-size divide-y divide-edge">
                {PARTNERS.slice(0, 3).map((p, i) => (
                  <PartnerCard key={p.slug} partner={p} placement="match-cta" rank={i + 1} className="px-4 sm:px-5" />
                ))}
              </div>
              {/* легальных букмекеров 17, здесь — три: остальные — на странице «Букмекеры» */}
              {/* поля и шрифт — как у строк букмекеров над ней (`keep-size`, `px-4 sm:px-5`) и «Показать ещё» в «Матче в подборках» */}
              <BlockMore href="/bookmakers" className="keep-size">Все букмекеры</BlockMore>
            </div>
          </section>
          {related.length ? (
            // какие это матчи — справа от заголовка; широкий блок (от xl до 2xl он уходит под основную колонку на всю ширину)
            // — две колонки, иначе название слева и счёт в 1500px справа; внизу — весь список дня
            <section>
              <BlockTitle title="Другие матчи" />
              {/* шрифт и поля — как у «Где поставить» над ним (владелец: «я вижу что тут различие по размеру шрифтов»):
                  `keep-size`, строки `px-4 sm:px-5`, названия 16px, «Все матчи дня» — как «Все букмекеры» */}
              <div className="keep-size @container card overflow-hidden">
              {/* две колонки заполняются сверху вниз — сначала левая, потом правая (по строкам порядок читался зигзагом) */}
              <div className={`grid @2xl:grid-flow-col @2xl:grid-cols-2 ${['', '@2xl:grid-rows-1', '@2xl:grid-rows-2', '@2xl:grid-rows-3'][Math.ceil(related.length / 2)]}`}>
                {related.map((o, i, all) => (
                  <div
                    key={o.id}
                    className={`border-edge ${i ? 'border-t' : ''} ${i === Math.ceil(all.length / 2) ? '@2xl:border-t-0' : ''} ${i >= Math.ceil(all.length / 2) ? '@2xl:border-l' : ''}`}
                  >
                    <MatchRow m={o} tags={[]} compact showLeague={o.league.id !== m.league.id} />
                  </div>
                ))}
              </div>
              <BlockMore href={listHref(matchDay, today)} className="keep-size">Все матчи дня</BlockMore>
            </div>
            </section>
          ) : null}
        </aside>
      </div>

      {scheduled ? (
        <StickyCta
          partner={partner}
          href={goHref(partner, 'sticky', m.id)}
          // кэф — на кнопке (владелец: «в попапе не всё влазит, может кэф писать на кнопке?»): в заголовке остаётся исход
          // целиком; тип ставки — как в первом блоке, а не «Прогноз» (там у не выгодной честно написано «выгоды нет»)
          title={pick ? cap(outcomeText(pick.candidate.key, m)) : `Ставки на ${pair}`}
          // подпись — коротко, чтобы букмекер (рекламодатель) не обрезался: «Наш выбор · Ма…» на 360px
          subtitle={pick?.kind === 'value' ? `Выгодно · ${partner.name}` : partner.name}
          action={pick && pickOffer ? pickOffer.value.toFixed(2) : 'Ставка'}
        />
      ) : null}

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'SportsEvent',
          name: pair,
          sport: 'Football',
          startDate: new Date(m.ts).toISOString(),
          eventStatus:
            m.status === 'postponed'
              ? 'https://schema.org/EventPostponed'
              : m.status === 'cancelled'
                ? 'https://schema.org/EventCancelled'
                : 'https://schema.org/EventScheduled',
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          location: {
            '@type': 'Place',
            name: full.venue?.name ?? m.league.name,
            address: full.venue?.city || m.home.country || m.league.country || undefined,
          },
          homeTeam: { '@type': 'SportsTeam', name: m.home.name },
          awayTeam: { '@type': 'SportsTeam', name: m.away.name },
          competitor: [
            { '@type': 'SportsTeam', name: m.home.name },
            { '@type': 'SportsTeam', name: m.away.name },
          ],
          superEvent: { '@type': 'SportsEvent', name: m.league.name },
          description: ins.preview[0]?.text,
          url: `${SITE.url}${canonical}`,
        }}
      />
    </>
  )
}

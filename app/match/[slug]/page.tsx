import type { Metadata } from 'next'
import Link from 'next/link'
import { BlockMore } from '@/components/BlockMore'
import { notFound, permanentRedirect } from 'next/navigation'
import { cache } from 'react'
import { MatchBar } from '@/components/match/MatchBar'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { JsonLd } from '@/components/JsonLd'
import { EventsBlock, StatsBars } from '@/components/match/EventsBlock'
import { FormBlock } from '@/components/match/FormBlock'
import { H2HBlock } from '@/components/match/H2HBlock'
import { InjuriesBlock } from '@/components/match/InjuriesBlock'
import { MatchHero, type BoardCell } from '@/components/match/MatchHero'
import { hasMoves, OddsTable } from '@/components/match/OddsTable'
import { ChanceRow } from '@/components/match/ProbBars'
import { PredictHero } from '@/components/match/PredictHero'
import { MatchRow } from '@/components/MatchRow'
import { PartnerCard } from '@/components/PartnerCard'
import { Section } from '@/components/Section'
import { StandingsTable } from '@/components/StandingsTable'
import { StickyCta } from '@/components/StickyCta'
import { StoryButton } from '@/components/story/StoryButton'
import { PARTNERS, partnerForApiBookmaker, primaryPartner } from '@/config/bookmakers'
import { SITE } from '@/config/site'
import { goHref } from '@/lib/affiliate'
import { getLiveOdds, getMatchInsights, getMatchesByDate, getPariHistory, settle } from '@/lib/data'
import { ChanceChart, type ChanceSeries } from '@/components/match/ChanceChart'
import { LiveRefresh } from '@/components/Live'
import { distinctPair, matchColors } from '@/lib/team-colors'
import { handNotes } from '@/lib/hand-notes'
import { leagueTitle } from '@/lib/flags'
import { appNow, formatDateShort, formatDayMonth, formatTime, idFromSlug, pct, pluralN, ymdInTz } from '@/lib/format'
import { valueThreshold } from '@/lib/model'
import { leagueHref, listHref, matchHref } from '@/lib/links'
import { buildStory } from '@/lib/story'
import { TAG_BY_SLUG } from '@/lib/tags'
import type { Match } from '@/lib/types'
import { buildVerdict, outcomeText, split100 } from '@/lib/verdict'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

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

export default async function MatchPage({ params }: Props) {
  const { slug } = await params
  const id = idFromSlug(slug)
  if (!id) notFound()
  const ins = await load(id)
  if (!ins) notFound()
  const m = ins.match
  const canonical = matchHref(m)
  if (`/match/${slug}` !== canonical) permanentRedirect(canonical)

  const { full, books, cons, model, candidates, pick, tags } = ins
  // в таблице кэфов — только легальные партнёры (владелец: «оставь легал»): зарубежных букмекеров в РФ рекламировать
  // нельзя, а строка без ссылки — реклама конкурента; в честной цене (консенсус) они по-прежнему участвуют
  const legalBooks = books.filter((b) => partnerForApiBookmaker(b.bookmakerId, b.bookmakerName))
  // цвета клубов для свечения за командами (не дольше 1,5 с) и метки-факты над эмблемами — как в «Главных матчах»
  const tint = await Promise.race([matchColors(m).catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), 1500))])
  const notes = handNotes({ homeId: m.home.id, awayId: m.away.id, standings: ins.standings, homeForm: ins.homeForm, awayForm: ins.awayForm })
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
  const formN = Math.max(ins.homeForm?.games.length ?? 0, ins.awayForm?.games.length ?? 0)
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
  const relatedNote = `${related.every((o) => o.league.id === m.league.id) ? `${leagueTitle(m.league.name)} · ` : ''}${matchDay === today ? 'сегодня' : formatDayMonth(m.ts)}`

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

  const hasStory = buildStory(ins) !== null
  const partner = pick?.candidate.bestPartner?.partner ?? primaryPartner()
  const pickOffer = pick?.candidate.bestPartner

  const pair = `${m.home.name} — ${m.away.name}`
  const h1 = m.status === 'finished' ? `${pair}: результат матча` : m.status === 'live' ? `${pair}: матч онлайн` : `Прогноз на матч ${pair}`

  return (
    <>
      {/* от xl — без общей подложки центра, как на главной: каждый раздел — своя панель, зазор 8px (владелец: «там блоки
          в блоке на странице матча»; правила — .bare-match в app/globals.css) */}
      <span hidden className="bare-match" />
      {/* верх страницы — одна закреплённая панель: «←», крошки, а когда табло уехало — мини-табло на том же месте */}
      <MatchBar
        back={leagueHref(m.league)}
        home={{ name: m.home.name, logo: m.home.logo ?? null }}
        away={{ name: m.away.name, logo: m.away.logo ?? null }}
        center={m.score && m.status !== 'scheduled' ? `${m.score.home} : ${m.score.away}` : formatTime(m.ts)}
        minute={isLive ? { text: m.elapsed ? `${m.elapsed}′` : 'идёт', live: true } : m.status === 'finished' ? { text: 'итог', live: false } : null}
        odds={
          heroLine && cells?.every((c) => c.odd)
            ? cells.map((c) => ({ key: c.key, odd: c.odd!, hot: c.hot, title: c.key === 'draw' ? 'Ничья' : `Победа «${c.key === 'home' ? m.home.name : m.away.name}»` }))
            : null
        }
        partner={heroLine}
      >
        {/* на узком телефоне крошки не влезают и листаются вбок — край затухает, а не обрывается на «Овьедо — Ре» */}
        <Breadcrumbs
          className="min-w-0 pr-7 text-[13px] [mask-image:linear-gradient(90deg,#000_calc(100%_-_28px),transparent)]"
          parentOnly
          items={[
            { href: '/matches', label: 'Матчи' },
            { href: leagueHref(m.league), label: leagueTitle(m.league.name) },
            { href: canonical, label: pair },
          ]}
        />
      </MatchBar>
      {/* заголовок — только для поисковиков: команды крупно на табло, видимый он третий раз повторял названия */}
      <h1 className="sr-only">{h1}</h1>
      {/* идёт матч — счёт, минута и live-кэфы обновляются сами */}
      {m.status === 'live' || m.status === 'suspended' ? <LiveRefresh /> : null}

      {/* до начала — «Прогноз tag.bet» первым блоком (строка матча, вывод, оценка, ставка); после — табло со счётом */}
      {scheduled && (verdict || pick) ? (
        <PredictHero
          m={m}
          v={verdict}
          pick={pick}
          probs={x}
          tags={tags}
          tint={tint ? distinctPair(tint) : null}
          story={hasStory ? <StoryButton id={m.id} href={canonical} /> : null}
        />
      ) : (
        <MatchHero full={full} cells={cells} books={cons.books} line={heroLine} tint={tint ? distinctPair(tint) : null} notes={notes} story={hasStory ? <StoryButton id={m.id} href={canonical} /> : null} />
      )}

      {/* на телефоне между блоками 12px, как на главной (владелец: «такое чувство что отступы между блоком больше стали?» — «да»: было 24–32) */}
      <div className="mt-3 grid gap-3 sm:mt-8 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_340px] xl:mt-2 xl:grid-cols-1 xl:gap-2 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-3 sm:space-y-6 xl:space-y-2">
          {!scheduled && (full.events.length || full.stats.length) ? (
            // в игре — «Сейчас в матче»: эти цифры учитывают счёт и ход игры; доматчевые блоки ниже подписаны «До матча»
            <Section title={m.status === 'live' ? 'Сейчас в матче' : 'Ход матча'} aside={m.status === 'live' ? 'обновляется каждые 30 с' : 'итог'}>
              {/* сверху — полоса матча 0′–90′ во всю ширину, ниже — статистика в две колонки */}
              <div className="space-y-6">
                <EventsBlock
                  events={full.events}
                  score={m.score ?? null}
                  now={isLive ? (m.elapsed ?? null) : null}
                  home={m.home}
                  away={m.away}
                />
                <StatsBars stats={full.stats} home={m.home} away={m.away} />
              </div>
            </Section>
          ) : null}

          {/* после начала прогноза нет — подборки матча с поводами здесь (владелец: «а теги матча как?»): «В подборках», как
              в меню, правой панели и в блоке до начала («Теги» — наше внутреннее слово); метки — колонкой одной ширины,
              факты — ровной колонкой справа (каждая фраза начиналась сразу за своей меткой — «ёлочка»), на телефоне метка
              над фактом; факт — короткий (`short`), без повтора метки: «#кэф упал — Победа «Хетафе»: 7.42 → 6.37 (−14%)» */}
          {!scheduled && tags.length ? (
            <Section title="В подборках" aside="до матча">
              <ul className="grid gap-y-4 sm:grid-cols-[max-content_minmax(0,1fr)] sm:gap-x-5 sm:gap-y-3">
                {tags.map((t) => (
                  <li key={t.slug} className="flex flex-col items-start gap-1.5 sm:col-span-2 sm:grid sm:grid-cols-subgrid">
                    <Link href={`/tag/${t.slug}`} prefetch={false} title={TAG_BY_SLUG.get(t.slug)?.hint} className="text-[15px] font-semibold transition-colors hover:text-dim">
                      {TAG_BY_SLUG.get(t.slug)?.title ?? t.slug}
                    </Link>
                    <p className="text-[14px] leading-relaxed text-dim sm:pt-px">{t.short ?? t.reason}</p>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {x ? (
            // владелец: «а голы и счёт как?» — шансы строками, как статистика (без «46% — до 2 голов», повторявших 54%),
            // чьи голы — названиями («1.95 : 0.85» читалось счётом с дробями), без плашек внутри карточки и без
            // «рейтинга силы» (1684 / 1478 новичку ничего не говорят); «Вероятный счёт» — только до начала: на 59′
            // при 1:0 «1:1 — 10%» читалось как прогноз сейчас
            <Section title="Голы и счёт" aside={scheduled ? 'оценка tag.bet' : 'до матча · оценка tag.bet'}>
              <div className="space-y-5">
                {over25 != null || btts != null ? (
                  <ul className="grid gap-x-10 gap-y-4 md:grid-cols-2">
                    {over25 != null ? <ChanceRow label="3 гола и больше" p={over25} /> : null}
                    {btts != null ? <ChanceRow label="Обе забьют" p={btts} /> : null}
                  </ul>
                ) : null}
                {model ? (
                  <div className="grid gap-x-10 gap-y-4 border-t border-white/[0.06] pt-4 md:grid-cols-2">
                    <div>
                      <div className="text-[13px] text-dim">Сколько голов ждём</div>
                      <div className="mt-1.5 text-[15px] text-fg/90">
                        «{m.home.name}» — <b className="num font-semibold text-fg">{model.lambdas.home.toFixed(2)}</b>, «{m.away.name}» —{' '}
                        <b className="num font-semibold text-fg">{model.lambdas.away.toFixed(2)}</b>
                      </div>
                    </div>
                    {scheduled ? (
                      <div>
                        <div className="text-[13px] text-dim">Вероятный счёт</div>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {model.topScores.slice(0, 4).map((s) => (
                            <span key={`${s.home}-${s.away}`} className="num rounded-full bg-white/[0.06] px-2.5 py-1 text-[13px] font-semibold">
                              {s.home}:{s.away} <span className="text-[11px] font-normal text-dim">{pct(s.p)}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </Section>
          ) : null}

          {chanceMoved ? (
            // справа — без «9 изменений»: число ничего не говорит и спорило с «почти не менялись», а на телефоне длинная
            // подпись сжимала заголовок в две строки
            <Section title="Как менялись шансы" aside="до матча · линия PARI">
              <ChanceChart series={chanceSeries} end={Math.min(m.ts, appNow())} />
              <p className="mt-3 text-[13.5px] leading-relaxed text-dim">
                {chanceText} <span className="text-mute">Линия — шансы из кэфов PARI без маржи букмекера, пунктир — оценка tag.bet.</span>
              </p>
            </Section>
          ) : null}

          {/* только до начала (владелец: «а коэффициенты букмекеров как?»): после — по доматчевым кэфам не поставить, а кэфы
              «сейчас» — на табло */}
          {scheduled ? (
            <Section
              title="Коэффициенты букмекеров"
              aside={
                legalBooks.length
                  ? `${pluralN(legalBooks.length, ['букмекер', 'букмекера', 'букмекеров'])} с линией${hasMoves(legalBooks, m) ? ' · ▼▲ — изменение с открытия' : ''}`
                  : 'линии в нашей базе пока нет'
              }
            >
              <OddsTable match={m} books={legalBooks} model={model} candidates={candidates} />
            </Section>
          ) : null}

          {ins.homeForm || ins.awayForm ? (
            // цифры — по последним (до 10) матчам: выборку называем числом (было «последние матчи», а в карточке — три разные выборки)
            <Section title="Форма команд" aside={formN > 1 ? `последние ${pluralN(formN, ['матч', 'матча', 'матчей'])}` : 'последний матч'}>
              <FormBlock home={m.home} away={m.away} homeForm={ins.homeForm} awayForm={ins.awayForm} />
            </Section>
          ) : null}

          {ins.h2h ? (
            // сколько встреч — сразу, как в «Форме команд»
            <Section
              title="Личные встречи"
              aside={`${ins.h2h.games.length >= 3 ? 'последние ' : ''}${pluralN(ins.h2h.games.length, ['встреча', 'встречи', 'встреч'])}`}
            >
              <H2HBlock h2h={ins.h2h} home={m.home} away={m.away} />
            </Section>
          ) : null}

          {scheduled ? (
            <Section title="Кадровые потери">
              <InjuriesBlock injuries={ins.injuries} home={m.home} away={m.away} />
            </Section>
          ) : null}

          {ins.standings ? (
            // «полностью →» справа от заголовка — нижней строкой `BlockMore`, как у остальных блоков-списков
            <Section title="Турнирная таблица" className="overflow-hidden">
              <StandingsTable standings={ins.standings} highlight={[m.home.id, m.away.id]} compact />
              <BlockMore href={leagueHref(m.league)} className="-mx-5 -mb-5 mt-4 !px-5 !py-3.5 sm:-mx-7 sm:-mb-7 sm:!px-7">Вся таблица</BlockMore>
            </Section>
          ) : null}

          {/* текст для чтения и поисковиков — в конце (владелец: «а прогноз на матч как?»): пересказывает «Форму команд», «Личные
              встречи» и «Кадровые потери», которые раньше шли сразу за ним; строка была ~150 знаков — глаз терял строку;
              после начала — «Перед матчем» («Обзор матча» обещал события, а в тексте расклад до матча); ширина строки — ~75 знаков */}
          {ins.preview.length ? (
            <Section title={`${scheduled ? 'Прогноз на матч' : 'Перед матчем:'} ${pair}`}>
              <div className="prose-ru max-w-[62ch] space-y-4">
                {ins.preview.map((p) => (
                  <div key={p.title}>
                    <h3 className="mb-1 text-[14px] font-semibold">{p.title}</h3>
                    <p className="text-[15px]">{p.text}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-[11px] leading-relaxed text-mute">{disclaimer}</p>
            </Section>
          ) : null}

          {/* оговорка — последней строкой «Прогноза» (висела отдельным абзацем между карточками); прогноза нет — отдельно */}
          {ins.preview.length ? null : <p className="text-[11px] leading-relaxed text-mute xl:px-2 xl:pt-2">{disclaimer}</p>}
        </div>

        <aside className="space-y-3 sm:space-y-5 lg:sticky lg:top-24 lg:self-start xl:static xl:space-y-2 2xl:sticky 2xl:top-[72px]">
          <section className="card overflow-hidden">
            <div className="p-6">
              {/* заголовки — один вид на всей странице (как у Section), без мелких заглавных */}
              <h2 className="h2 text-[20px] font-bold tracking-[-0.02em] sm:text-[22px]">Где поставить</h2>
              <div className="mt-4 divide-y divide-edge">
                {PARTNERS.slice(0, 3).map((p, i) => (
                  <PartnerCard key={p.slug} partner={p} placement="match-cta" rank={i + 1} />
                ))}
              </div>
            </div>
            {/* легальных букмекеров 17, здесь — три: остальные — на странице «Букмекеры» */}
            <BlockMore href="/bookmakers">Все букмекеры</BlockMore>
          </section>
          {related.length ? (
            // какие это матчи — справа от заголовка; широкий блок (от xl до 2xl он уходит под основную колонку на всю ширину)
            // — две колонки, иначе название слева и счёт в 1500px справа; внизу — весь список дня
            <section className="@container card overflow-hidden">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-5 py-4">
                <h2 className="h2 text-[20px] font-bold tracking-[-0.02em] sm:text-[22px]">Другие матчи</h2>
                <span className="text-[12px] text-mute">{relatedNote}</span>
              </div>
              <div className="grid @2xl:grid-cols-2">
                {related.map((o) => (
                  <div key={o.id} className="border-t border-edge @2xl:even:border-l">
                    <MatchRow m={o} tags={[]} compact showLeague={o.league.id !== m.league.id} />
                  </div>
                ))}
              </div>
              <BlockMore href={listHref(matchDay, today)}>Все матчи дня</BlockMore>
            </section>
          ) : null}
        </aside>
      </div>

      {scheduled ? (
        <StickyCta
          partner={partner}
          href={goHref(partner, 'sticky', m.id)}
          // кэф — первым: «Прогноз: победа «Райо Вал…» обрезал и его, и исход; тип ставки — как в первом блоке, а не
          // «Прогноз» (там у не выгодной честно написано «выгоды нет»)
          title={pick ? `${pickOffer ? `${pickOffer.value.toFixed(2)} · ` : ''}${cap(outcomeText(pick.candidate.key, m))}` : `Ставки на ${pair}`}
          subtitle={pick ? `${pick.kind === 'value' ? 'Выгодная ставка' : 'Наш выбор'} · ${partner.name}` : partner.name}
          action="Ставка"
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

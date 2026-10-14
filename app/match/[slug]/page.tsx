import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { cache } from 'react'
import { BackButton } from '@/components/BackButton'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { JsonLd } from '@/components/JsonLd'
import { EventsBlock, StatsBars } from '@/components/match/EventsBlock'
import { FormBlock } from '@/components/match/FormBlock'
import { H2HBlock } from '@/components/match/H2HBlock'
import { InjuriesBlock } from '@/components/match/InjuriesBlock'
import { MatchHero, type BoardCell } from '@/components/match/MatchHero'
import { hasMoves, OddsTable } from '@/components/match/OddsTable'
import { SplitBar } from '@/components/match/ProbBars'
import { Conclusion } from '@/components/match/VerdictCard'
import { MatchRow } from '@/components/MatchRow'
import { PartnerCard } from '@/components/PartnerCard'
import { Section } from '@/components/Section'
import { StandingsTable } from '@/components/StandingsTable'
import { StickyCta } from '@/components/StickyCta'
import { StoryButton } from '@/components/story/StoryButton'
import { TagPill } from '@/components/TagPill'
import { PARTNERS, partnerForApiBookmaker, primaryPartner } from '@/config/bookmakers'
import { SITE } from '@/config/site'
import { goHref } from '@/lib/affiliate'
import { getLiveOdds, getMatchInsights, getMatchesByDate, getPariHistory, settle } from '@/lib/data'
import { ChanceChart, type ChanceSeries } from '@/components/match/ChanceChart'
import { LiveRefresh } from '@/components/Live'
import { distinctPair, matchColors } from '@/lib/team-colors'
import { handNotes } from '@/lib/hand-notes'
import { appNow, formatDateShort, formatTime, idFromSlug, pct, pluralN, ymdInTz } from '@/lib/format'
import { valueThreshold } from '@/lib/model'
import { leagueHref, matchHref } from '@/lib/links'
import { buildStory } from '@/lib/story'
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
  const chanceChanges = chanceSeries.length ? Math.max(...chanceSeries.map((sr) => sr.pts.length)) - 1 : 0
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
  const over25 = model?.over['2.5'] ?? cons.over['2.5']
  const btts = model?.btts ?? cons.btts

  const sameDay = await settle(getMatchesByDate(ymdInTz(m.ts)), [] as Match[])
  const related = sameDay
    .filter((o) => o.id !== m.id)
    .sort((a, b) => Number(b.league.id === m.league.id) - Number(a.league.id === m.league.id) || a.ts - b.ts)
    .slice(0, 6)

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
          label: k === 'home' ? `победа ${m.home.name}` : k === 'away' ? `победа ${m.away.name}` : 'ничья',
          p: x[k],
          odd,
          fair: 1 / x[k],
          // горит, если именно этот букмекер платит больше честной цены (то же правило, что точка в таблице)
          hot: scheduled && odd != null && x[k] * odd - 1 >= valueThreshold(odd),
        }
      })
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
      {/* хлебные крошки и тихий заголовок — от xl тоже панелью (иначе висели бы на фоне страницы) */}
      <div className="bare-match-head mb-4 flex items-center gap-3 xl:mb-0">
        <BackButton fallback="/matches" />
        <Breadcrumbs
          className="min-w-0 text-[13px]"
          items={[
            { href: leagueHref(m.league), label: m.league.name },
            { href: canonical, label: pair },
          ]}
        />
        {/* заголовок — только для поисковиков: команды крупно на табло, видимый он третий раз повторял названия
            (владелец согласился) */}
        <h1 className="sr-only">{h1}</h1>
      </div>
      {/* идёт матч — счёт, минута и live-кэфы обновляются сами */}
      {m.status === 'live' || m.status === 'suspended' ? <LiveRefresh /> : null}

      {/* сначала табло, как в «Главных матчах»: команды, время или счёт, шансы; ниже — ответ словами */}
      <MatchHero full={full} cells={cells} books={cons.books} line={
          isLive && liveX12 && pariPartner
            ? { name: pariPartner.name, href: goHref(pariPartner, 'match-live-odds', m.id), live: true }
            : partnerLine && scheduled
              ? { name: partnerLine.partner.name, href: goHref(partnerLine.partner, 'match-hero', m.id) }
              : null
        } tint={tint ? distinctPair(tint) : null} notes={notes} story={hasStory ? <StoryButton id={m.id} href={canonical} /> : null} />

      {/* «Наш вывод» — до начала: расклад, ставка и теги одним блоком (были три блока с повторами) */}
      {scheduled && (verdict || pick || tags.length) ? (
        <div className="mt-5 xl:mt-2">
          <Conclusion v={verdict} pick={pick} match={m} tags={tags} />
        </div>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] xl:mt-2 xl:grid-cols-1 xl:gap-2 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6 xl:space-y-2">
          {!scheduled && (full.events.length || full.stats.length) ? (
            // в игре — «Сейчас в матче»: эти цифры учитывают счёт и ход игры; доматчевые блоки ниже подписаны «До матча»
            <Section title={m.status === 'live' ? 'Сейчас в матче' : 'Ход матча'} aside={m.status === 'live' ? 'по ходу игры' : 'итог'}>
              <div className="grid gap-6 md:grid-cols-2">
                <EventsBlock events={full.events} />
                <StatsBars stats={full.stats} />
              </div>
            </Section>
          ) : null}

          {/* после начала «Нашего вывода» нет — теги с поводами здесь */}
          {!scheduled && tags.length ? (
            <Section title="Теги матча" aside="до матча">
              <ul className="space-y-3">
                {tags.map((t) => (
                  <li key={t.slug} className="flex items-start gap-3">
                    <TagPill slug={t.slug} size="md" className="shrink-0" />
                    <p className="pt-1 text-[14px] leading-relaxed text-dim">{t.reason}</p>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {x ? (
            <Section
              title="Голы и счёт"
              aside={`${scheduled ? '' : 'до матча · '}${model ? (model.source === 'xg' ? 'по нашей модели' : `по кэфам${cons.books > 1 ? ` ${cons.books} букмекеров` : ''} и нашей модели`) : `по кэфам${cons.books > 1 ? ` ${cons.books} букмекеров` : ''}`}`}
            >
              <div className="space-y-5">
                {over25 != null ? <SplitBar left={over25} leftLabel="3 гола и больше" rightLabel="До 2 голов" /> : null}
                {btts != null ? <SplitBar left={btts} leftLabel="Обе забьют" rightLabel="Кто-то не забьёт" /> : null}
                {model ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-tile bg-white/[0.04] p-4">
                      <div className="text-[11px] text-mute">Сколько голов ждём</div>
                      <div className="num mt-1.5 text-[22px] font-semibold tracking-tight">
                        {model.lambdas.home.toFixed(2)} <span className="text-mute">:</span> {model.lambdas.away.toFixed(2)}
                      </div>
                    </div>
                    <div className="rounded-tile bg-white/[0.04] p-4">
                      <div className="text-[11px] text-mute">Вероятный счёт</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {model.topScores.slice(0, 4).map((s) => (
                          <span key={`${s.home}-${s.away}`} className="num rounded-full bg-white/[0.06] px-2.5 py-1 text-[13px] font-semibold">
                            {s.home}:{s.away} <span className="text-[11px] font-normal text-dim">{pct(s.p)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
                {ins.glicko ? (
                  <p className="text-[12px] text-mute">
                    Рейтинг силы команд: {m.home.name} — <span className="num font-medium text-dim">{Math.round(ins.glicko.homeRating)}</span>, {m.away.name} —{' '}
                    <span className="num font-medium text-dim">{Math.round(ins.glicko.awayRating)}</span>
                  </p>
                ) : null}
              </div>
            </Section>
          ) : null}

          {chanceSeries.length && chanceChanges > 0 ? (
            <Section title="Как менялись шансы" aside={`по линии PARI · до матча · ${pluralN(chanceChanges, ['изменение', 'изменения', 'изменений'])}`}>
              <ChanceChart series={chanceSeries} end={Math.min(m.ts, appNow())} />
              <p className="mt-3 text-[13.5px] leading-relaxed text-dim">
                {chanceText} <span className="text-mute">Линия — шансы из кэфов PARI без маржи букмекера, пунктир — оценка tag.bet.</span>
              </p>
            </Section>
          ) : null}

          {legalBooks.length || scheduled ? (
            <Section
              title="Коэффициенты букмекеров"
              aside={
                legalBooks.length
                  ? `${scheduled ? '' : 'до матча · '}${pluralN(legalBooks.length, ['букмекер', 'букмекера', 'букмекеров'])} с линией${hasMoves(legalBooks, m) ? ' · ▼▲ — изменение с открытия' : ''}`
                  : 'линии в нашей базе пока нет'
              }
            >
              <OddsTable match={m} books={legalBooks} model={model} candidates={candidates} />
              <p className="mt-4 text-[11px] text-mute">
                Лаймом — кэф выше честной цены (по оценке tag.bet), белым жирным — лучший в колонке. Кэфы меняются — проверяйте
                у букмекера. <span className="whitespace-nowrap">Реклама · 18+</span>
              </p>
            </Section>
          ) : null}

          {ins.preview.length ? (
            <Section title={`${m.status === 'finished' ? 'Обзор матча' : 'Прогноз на матч'} ${pair}`}>
              <div className="prose-ru space-y-4">
                {ins.preview.map((p) => (
                  <div key={p.title}>
                    <h3 className="mb-1 text-[14px] font-semibold">{p.title}</h3>
                    <p className="text-[15px]">{p.text}</p>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {ins.homeForm || ins.awayForm ? (
            <Section title="Форма команд" aside="последние матчи">
              <FormBlock home={m.home} away={m.away} homeForm={ins.homeForm} awayForm={ins.awayForm} />
            </Section>
          ) : null}

          {ins.h2h ? (
            <Section title="Личные встречи">
              <H2HBlock h2h={ins.h2h} home={m.home} away={m.away} />
            </Section>
          ) : null}

          {scheduled ? (
            <Section title="Кадровые потери">
              <InjuriesBlock injuries={ins.injuries} home={m.home} away={m.away} />
            </Section>
          ) : null}

          {ins.standings ? (
            <Section title="Турнирная таблица" aside={<Link href={leagueHref(m.league)} className="transition-colors hover:text-fg">полностью →</Link>}>
              <StandingsTable standings={ins.standings} highlight={[m.home.id, m.away.id]} compact />
            </Section>
          ) : null}

          <p className="text-[11px] leading-relaxed text-mute xl:px-2 xl:pt-2">
            Прогноз и вероятности рассчитаны автоматически по данным букмекерских линий и статистике и не гарантируют результат. 18+.
            Ставьте только ту сумму, потерю которой готовы принять.
          </p>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start xl:static xl:space-y-2 2xl:sticky 2xl:top-[72px]">
          <section className="card p-6">
            {/* заголовки — один вид на всей странице (как у Section), без мелких заглавных */}
            <h2 className="h2 text-[20px] font-bold tracking-[-0.02em] sm:text-[22px]">Где поставить</h2>
            <div className="mt-4 divide-y divide-edge">
              {PARTNERS.slice(0, 3).map((p, i) => (
                <PartnerCard key={p.slug} partner={p} placement="match-cta" rank={i + 1} />
              ))}
            </div>
          </section>
          {related.length ? (
            <section className="card overflow-hidden">
              <h2 className="h2 border-b border-edge px-5 py-4 text-[20px] font-bold tracking-[-0.02em] sm:text-[22px]">Другие матчи</h2>
              <div className="divide-y divide-edge">
                {related.map((o) => (
                  <MatchRow key={o.id} m={o} tags={[]} compact showLeague={o.league.id !== m.league.id} />
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>

      {scheduled ? (
        <StickyCta
          partner={partner}
          href={goHref(partner, 'sticky', m.id)}
          title={pick ? `Прогноз: ${outcomeText(pick.candidate.key, m)}${pickOffer ? ` за ${pickOffer.value.toFixed(2)}` : ''}` : `Ставки на ${pair}`}
          subtitle={partner.name}
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

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { cache } from 'react'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { JsonLd } from '@/components/JsonLd'
import { EventsBlock, StatsBars } from '@/components/match/EventsBlock'
import { FormBlock } from '@/components/match/FormBlock'
import { H2HBlock } from '@/components/match/H2HBlock'
import { InjuriesBlock } from '@/components/match/InjuriesBlock'
import { MatchHero, type BoardCell } from '@/components/match/MatchHero'
import { OddsTable } from '@/components/match/OddsTable'
import { PickCard } from '@/components/match/PickCard'
import { SplitBar } from '@/components/match/ProbBars'
import { VerdictCard } from '@/components/match/VerdictCard'
import { MatchRow } from '@/components/MatchRow'
import { PartnerCard } from '@/components/PartnerCard'
import { Section } from '@/components/Section'
import { StandingsTable } from '@/components/StandingsTable'
import { StickyCta } from '@/components/StickyCta'
import { StoryButton } from '@/components/story/StoryButton'
import { TagPill } from '@/components/TagPill'
import { PARTNERS, primaryPartner } from '@/config/bookmakers'
import { SITE } from '@/config/site'
import { goHref } from '@/lib/affiliate'
import { getMatchInsights, getMatchesByDate, settle } from '@/lib/data'
import { formatDateShort, formatTime, idFromSlug, pct, ymdInTz } from '@/lib/format'
import { isValue } from '@/lib/model'
import { leagueHref, matchHref } from '@/lib/links'
import { buildStory } from '@/lib/story'
import type { Match } from '@/lib/types'
import { buildVerdict, outcomeText } from '@/lib/verdict'

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
  const scheduled = m.status === 'scheduled'
  const x = model?.x12 ?? cons.x12
  const over25 = model?.over['2.5'] ?? cons.over['2.5']
  const btts = model?.btts ?? cons.btts

  const sameDay = await settle(getMatchesByDate(ymdInTz(m.ts)), [] as Match[])
  const related = sameDay
    .filter((o) => o.id !== m.id)
    .sort((a, b) => Number(b.league.id === m.league.id) - Number(a.league.id === m.league.id) || a.ts - b.ts)
    .slice(0, 6)

  // табло матча: шанс, лучший кэф, честная цена; «горит», если букмекер платит больше честного
  const cells: BoardCell[] | null = x
    ? (['home', 'draw', 'away'] as const).map((k) => {
        const c = candidates.find((cand) => cand.key === k)
        const offer = c ? (c.bestPartner ?? c.best) : null
        return {
          key: k,
          label: k === 'home' ? `победа ${m.home.name}` : k === 'away' ? `победа ${m.away.name}` : 'ничья',
          p: x[k],
          odd: offer?.value ?? null,
          fair: 1 / x[k],
          hot: scheduled && Boolean(c && isValue(c)),
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
      <Breadcrumbs
        items={[
          { href: leagueHref(m.league), label: m.league.name },
          { href: canonical, label: pair },
        ]}
      />
      <h1 className="display mb-6 mt-2 text-[32px] sm:text-[48px]">{h1}</h1>

      {/* сначала ответ словами, потом цифры */}
      {verdict ? (
        <div className="mb-5">
          <VerdictCard v={verdict} pickAnchor={pick ? '#pick' : undefined} />
        </div>
      ) : null}

      <MatchHero full={full} cells={cells} books={cons.books}>
        {hasStory || tags.length ? (
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-edge pt-5">
            {hasStory ? <StoryButton id={m.id} href={canonical} className="mr-2" /> : null}
            {tags.map((t) => (
              <TagPill key={t.slug} slug={t.slug} reason={t.reason} size="md" />
            ))}
          </div>
        ) : null}
      </MatchHero>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          {!scheduled && (full.events.length || full.stats.length) ? (
            // в игре — «Сейчас в матче»: эти цифры учитывают счёт и ход игры; доматчевые блоки ниже подписаны «До матча»
            <Section title={m.status === 'live' ? 'Сейчас в матче' : 'Ход матча'} aside={m.status === 'live' ? 'по ходу игры' : 'итог'}>
              <div className="grid gap-6 md:grid-cols-2">
                <EventsBlock events={full.events} />
                <StatsBars stats={full.stats} />
              </div>
            </Section>
          ) : null}

          {pick ? <PickCard pick={pick} match={m} /> : null}

          {tags.length ? (
            <Section title="Теги матча" aside={scheduled ? 'почему они здесь' : 'до матча'}>
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
              aside={`${scheduled ? '' : 'до матча · '}${model ? (model.source === 'xg' ? 'модель по xG' : `рынок ${cons.books > 1 ? `(${cons.books} БК)` : ''} + модель`) : 'рынок'}`}
            >
              <div className="space-y-5">
                {over25 != null ? <SplitBar left={over25} leftLabel="3 гола и больше" rightLabel="До 2 голов" /> : null}
                {btts != null ? <SplitBar left={btts} leftLabel="Обе забьют" rightLabel="Кто-то не забьёт" /> : null}
                {model ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-2xl bg-panel-2 p-4">
                      <div className="text-[11px] text-mute">Ожидаемые голы (xG)</div>
                      <div className="num mt-1.5 text-[22px] font-semibold tracking-tight">
                        {model.lambdas.home.toFixed(2)} <span className="text-mute">:</span> {model.lambdas.away.toFixed(2)}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-panel-2 p-4">
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
                    Рейтинг Glicko-2: {m.home.name} — <span className="num font-medium text-dim">{Math.round(ins.glicko.homeRating)}</span>, {m.away.name} —{' '}
                    <span className="num font-medium text-dim">{Math.round(ins.glicko.awayRating)}</span>
                  </p>
                ) : null}
              </div>
            </Section>
          ) : null}

          {books.length ? (
            <Section title="Коэффициенты букмекеров" aside={`${scheduled ? '' : 'до матча · '}${books.length} БК · ▼▲ движение от открытия`}>
              <OddsTable match={m} books={books} model={model} candidates={candidates} />
              <p className="mt-4 text-[11px] text-mute">
                Лучший коэффициент в колонке подсвечен, точка — value (выше справедливого). Коэффициенты меняются — проверяйте
                актуальную линию у букмекера.
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

          <p className="text-[11px] leading-relaxed text-mute">
            Прогноз и вероятности рассчитаны автоматически по данным букмекерских линий и статистике и не гарантируют результат. 18+.
            Ставьте только ту сумму, потерю которой готовы принять.
          </p>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <section className="card p-6">
            <p className="eyebrow">Где поставить</p>
            <div className="mt-4 divide-y divide-edge">
              {PARTNERS.slice(0, 3).map((p, i) => (
                <PartnerCard key={p.slug} partner={p} placement="match-cta" rank={i + 1} />
              ))}
            </div>
          </section>
          {related.length ? (
            <section className="card overflow-hidden">
              <p className="eyebrow border-b border-edge px-5 py-4">Другие матчи</p>
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

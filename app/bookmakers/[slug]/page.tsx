import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdMark } from '@/components/AdMark'
import { BlockHead } from '@/components/BlockHead'
import { PageHead } from '@/components/PageHead'
import { CtaLink } from '@/components/CtaLink'
import { MatchRow } from '@/components/MatchRow'
import { PartnerBadge } from '@/components/PartnerBadge'
import { getPartner, realBonus } from '@/config/bookmakers'
import { goHref } from '@/lib/affiliate'
import { pluralN, todayYmd } from '@/lib/format'
import { listHref } from '@/lib/links'
import { partnerLines, type PartnerRow } from '@/lib/partner-lines'

// кэфы партнёра в ближайших матчах — из нашего кэша, на каждый запрос
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

const domain = (site: string) => site.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const p = getPartner(slug)
  if (!p) return {}
  // без «и отзывы»: отзывов на странице нет, а заголовок в поиске их обещал
  return {
    title: `${p.name}: обзор букмекера — лицензия, сайт, кэфы на футбол`,
    description: `Букмекер ${p.name}: лицензия ФНС России, официальный сайт ${domain(p.site)}, коэффициенты на футбол и как зарегистрироваться.`,
    alternates: { canonical: `/bookmakers/${p.slug}` },
  }
}

/** Сколько матчей с линией показываем; остальные — в списке дня. */
const SHOWN = 10

export default async function BookmakerPage({ params }: Props) {
  const { slug } = await params
  const p = getPartner(slug)
  if (!p) notFound()
  const day = (await partnerLines()).get(p.slug)
  // главные матчи (топ-турниры первыми), а на экране — по времени: по турнирам время скакало 20:30 → 23:00 → 20:00
  const byTime = (a: PartnerRow, b: PartnerRow) => a.item.match.ts - b.item.match.ts
  const shown = day ? day.rows.slice(0, SHOWN).sort(byTime) : []
  // остальные — под раскрывашкой, как «Ещё N матчей в других турнирах» на главной: «36 матчей» в шапке при 10 строках
  // и ссылке на весь список дня (там не только PARI) — остальные 26 было не найти
  const more = day ? day.rows.slice(SHOWN).sort(byTime) : []
  const bonus = realBonus(p)
  // «Получить бонус» — только когда знаем, какой бонус: без условий от партнёрки кнопка обещала бы неизвестно что
  const cta = bonus ? `Получить бонус в ${p.name}` : `На сайт ${p.name}`
  // маржа на исход матча по линии в наших данных — то, что мы считаем сами, а не «низкая маржа» на словах; только своя
  // цифра букмекера, без сравнения с другими и без «выгоднее»
  const margin = day?.rows.length
    ? day.rows.reduce((s, { line }) => s + 1 / line.home + 1 / line.draw + 1 / line.away - 1, 0) / day.rows.length
    : null
  const f = p.facts ?? {}
  const facts: [string, React.ReactNode][] = [
    ...(margin != null && margin > 0
      ? [[
          'Маржа на исход матча',
          <>
            {(margin * 100).toFixed(1).replace('.', ',')}%{' '}
            <span className="text-dim">
              — в среднем по {pluralN(day!.rows.length, ['матчу', 'матчам', 'матчам'])} {day!.when}. Доля букмекера в кэфах: чем
              она меньше, тем ближе кэфы к честной цене
            </span>
          </>,
        ] as [string, React.ReactNode]]
      : []),
    ...(f.licenseNo ? [['Лицензия ФНС', f.licenseNo] as [string, React.ReactNode]] : []),
    ...(f.minDeposit ? [['Минимальный депозит', f.minDeposit] as [string, React.ReactNode]] : []),
    ...(f.payments ? [['Пополнение и вывод', f.payments] as [string, React.ReactNode]] : []),
    ...(f.apps ? [['Приложение', f.apps] as [string, React.ReactNode]] : []),
    ...(f.verification ? [['Идентификация', f.verification] as [string, React.ReactNode]] : []),
  ]
  const steps = [
    `Нажмите «${cta}» — откроется официальный сайт букмекера (${domain(p.site)}).`,
    'Зарегистрируйтесь по номеру телефона и подтвердите возраст (18+).',
    'Пройдите идентификацию личности — это обязательное требование для легальных букмекеров.',
    ...(bonus ? ['Выполните условия акции из раздела «Бонусы» на сайте букмекера.'] : []),
  ]
  return (
    <>
      {/* от xl — без подложки центра, разделы — панелями через 8px, как на главной (владелец: «а визуально страница
          букмекеры как? относительно главной»; правила — .bare-sub в app/globals.css) */}
      <span hidden className="bare-sub" />
      <div className="space-y-4 xl:space-y-2">
        {/* шапка — одной строкой: знак, название, лицензия и сайт, кнопка справа (~110px вместо ~280: карточка с градиентом
            и «БУКМЕКЕР PARI» Oswald 56px; «Кэфы PARI сегодня» начинались на середине экрана) */}
        {/* оценки «4.8 / 5 · оценка tag.bet» нет: она была заглушкой без критериев; официальный сайт — в подписи, а не
            отдельным разделом «Лицензия и надёжность»; бонус — только настоящий (AFF_<SLUG>_BONUS) */}
        <PageHead
          crumbs={[{ href: '/bookmakers', label: 'Букмекеры' }, { href: `/bookmakers/${p.slug}`, label: p.name }]}
          lead={<PartnerBadge partner={p} size={48} />}
          title={`Букмекер ${p.name}`}
          sub={
            <>
              {p.license} · официальный сайт <span className="font-semibold text-fg/85">{domain(p.site)}</span>
              {bonus ? (
                <span className="mt-1 block text-[14px] font-medium text-fg">
                  {bonus} <span className="text-[12px] font-normal text-mute">· {p.bonusNote}</span>
                </span>
              ) : null}
            </>
          }
          aside={
            <>
              <CtaLink href={goHref(p, 'review')} className="w-full sm:w-auto">
                {cta}
              </CtaLink>
              <AdMark partner={p} className="mt-1.5 sm:text-right" />
            </>
          }
        />

        {/* «Коротко о …» — вместо обзора с оценками (владелец: «в букмекерах какие-то обзоры надо делать?»): только то,
            что можно проверить — маржа по нашим данным и факты из `facts` в config/bookmakers.ts; нечего показать — блока нет */}
        {facts.length ? (
          <section className="card overflow-hidden">
            <BlockHead title={`Коротко о ${p.name}`} line />
            <dl className="divide-y divide-edge text-[15px]">
              {facts.map(([k, v]) => (
                <div key={k} className="grid gap-0.5 px-4 py-3 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-4 sm:px-5">
                  <dt className="text-dim">{k}</dt>
                  <dd className="leading-relaxed">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {/* вместо выдуманных «Плюсов» и «Минусов» (владелец: «а страница букмекеров как?») — кэфы этого букмекера в
            ближайших матчах, теми же строками и с той же шапкой, что блок лиги на главной: ссылки на матч, кэфы — к
            букмекеру, лаймом — выгодный кэф */}
        <section id="kefy" className="card scroll-mt-24 overflow-hidden">
          <BlockHead title={`Кэфы ${p.name}${day ? ` ${day.when}` : ''}`} aside={day ? `${pluralN(day.rows.length, ['матч', 'матча', 'матчей'])} · Реклама · 18+` : null} line={Boolean(day)} />
          {day ? (
            <>
              <div className="divide-y divide-edge">
                {shown.map(({ item, line }) => (
                  <MatchRow key={item.match.id} m={item.match} tags={item.tags} summary={item.summary} line={line} showLeague />
                ))}
              </div>
              {more.length ? (
                <details className="group/more border-t border-edge">
                  <summary className="flex items-center justify-between gap-3 px-4 py-3.5 text-[14px] text-dim transition-colors hover:text-fg sm:px-5">
                    <span>
                      Ещё {pluralN(more.length, ['матч', 'матча', 'матчей'])} с кэфами {p.name}
                    </span>
                    <span aria-hidden className="text-mute transition-transform group-open/more:rotate-180">
                      ▾
                    </span>
                  </summary>
                  <div className="divide-y divide-edge border-t border-edge">
                    {more.map(({ item, line }) => (
                      <MatchRow key={item.match.id} m={item.match} tags={item.tags} summary={item.summary} line={line} showLeague />
                    ))}
                  </div>
                </details>
              ) : null}
              <div className="border-t border-edge px-4 py-3 text-[13.5px] sm:px-5">
                <Link href={listHref(day.ymd, todayYmd())} className="text-dim transition-colors hover:text-fg">
                  Все матчи {day.when} →
                </Link>
              </div>
            </>
          ) : (
            <p className="max-w-[62ch] px-4 pb-5 text-[15px] leading-relaxed text-fg/85 sm:px-5">
              Кэфы {p.name} на tag.bet пока не сравниваем: их линии нет в наших данных. Коэффициенты — на сайте букмекера.
            </p>
          )}
        </section>

        <section className="card overflow-hidden">
          <BlockHead title={bonus ? 'Как получить бонус' : 'Как зарегистрироваться'} />
          <ol className="space-y-2.5 px-4 pb-5 text-[15px] sm:px-5">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="num mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[11px] font-semibold text-fg">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
          <p className="border-t border-edge px-4 py-3 text-[12px] leading-relaxed text-mute sm:px-5">
            Информация носит справочный характер; условия бонусов устанавливает букмекер и может изменить их в любой момент. 18+.
          </p>
        </section>
      </div>
    </>
  )
}

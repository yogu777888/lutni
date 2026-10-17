import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdMark } from '@/components/AdMark'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { CtaLink } from '@/components/CtaLink'
import { MatchRow } from '@/components/MatchRow'
import { PartnerBadge } from '@/components/PartnerBadge'
import { Section } from '@/components/Section'
import { getPartner, realBonus } from '@/config/bookmakers'
import { goHref } from '@/lib/affiliate'
import { pluralN, todayYmd } from '@/lib/format'
import { listHref } from '@/lib/links'
import { partnerLines } from '@/lib/partner-lines'

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
  const shown = day ? day.rows.slice(0, SHOWN).sort((a, b) => a.item.match.ts - b.item.match.ts) : []
  const bonus = realBonus(p)
  // «Получить бонус» — только когда знаем, какой бонус: без условий от партнёрки кнопка обещала бы неизвестно что
  const cta = bonus ? `Получить бонус в ${p.name}` : `На сайт ${p.name}`
  const steps = [
    `Нажмите «${cta}» — откроется официальный сайт букмекера (${domain(p.site)}).`,
    'Зарегистрируйтесь по номеру телефона и подтвердите возраст (18+).',
    'Пройдите идентификацию личности — это обязательное требование для легальных букмекеров.',
    ...(bonus ? ['Выполните условия акции из раздела «Бонусы» на сайте букмекера.'] : []),
  ]
  return (
    <>
      <Breadcrumbs items={[{ href: '/bookmakers', label: 'Букмекеры' }, { href: `/bookmakers/${p.slug}`, label: p.name }]} />
      <div className="pitch-bg card mb-6 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-4">
          <PartnerBadge partner={p} size={60} />
          <div className="flex-1">
            <h1 className="display text-[36px] sm:text-[56px]">Букмекер {p.name}</h1>
            {/* оценки «4.8 / 5 · оценка tag.bet» нет: она была заглушкой без критериев; официальный сайт — здесь, а не
                отдельным разделом «Лицензия и надёжность» (он повторял эту строку) */}
            <p className="mt-1.5 text-[13px] text-dim">
              {p.license} · официальный сайт <span className="font-semibold text-fg/85">{domain(p.site)}</span>
            </p>
          </div>
        </div>
        {/* бонус — только настоящий (AFF_<SLUG>_BONUS), заглушку «Бонус для новых клиентов» не показываем; без него —
            одна кнопка без плашки (серая плашка вокруг одной кнопки выглядела пустой) */}
        <div className={bonus ? 'mt-6 rounded-tile bg-white/[0.04] p-5' : 'mt-6'}>
          {bonus ? (
            <>
              <p className="text-[18px] font-semibold tracking-tight">{bonus}</p>
              <p className="mt-1 text-[12px] text-mute">{p.bonusNote}</p>
            </>
          ) : null}
          <CtaLink href={goHref(p, 'review')} className={`w-full py-3 text-[15px] sm:w-auto ${bonus ? 'mt-4' : ''}`}>
            {cta}
          </CtaLink>
          <AdMark partner={p} className="mt-2" />
        </div>
      </div>

      {/* вместо выдуманных «Плюсов» и «Минусов» (владелец: «а страница букмекеров как?») — кэфы этого букмекера в
          ближайших матчах, теми же строками, что в списке: ссылки на матч, кэфы — к букмекеру, лаймом — выгодный кэф */}
      {day ? (
        <section id="kefy" className="card mb-6 scroll-mt-24 overflow-hidden">
          <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-edge px-4 py-4 sm:px-5">
            <h2 className="h2 text-[20px] font-bold tracking-[-0.02em] sm:text-[22px]">
              Кэфы {p.name} {day.when}
            </h2>
            <span className="text-[12px] text-mute">
              {pluralN(day.rows.length, ['матч', 'матча', 'матчей'])} · Реклама · 18+
            </span>
          </header>
          <div className="divide-y divide-edge">
            {shown.map(({ item, line }) => (
              <MatchRow key={item.match.id} m={item.match} tags={item.tags} summary={item.summary} line={line} showLeague />
            ))}
          </div>
          <div className="border-t border-edge px-4 py-3 text-[13.5px] sm:px-5">
            <Link href={listHref(day.ymd, todayYmd())} className="text-dim transition-colors hover:text-fg">
              Все матчи {day.when} →
            </Link>
          </div>
        </section>
      ) : (
        <Section id="kefy" title={`Кэфы ${p.name}`} className="mb-6">
          <p className="max-w-[62ch] text-[15px] leading-relaxed text-fg/85">
            Кэфы {p.name} на tag.bet пока не сравниваем: их линии нет в наших данных. Коэффициенты — на сайте букмекера.
          </p>
        </Section>
      )}

      <Section title={bonus ? 'Как получить бонус' : 'Как зарегистрироваться'}>
        <ol className="space-y-2.5 text-[15px]">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="num mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[11px] font-semibold text-fg">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </Section>
      <p className="mt-8 text-[12px] leading-relaxed text-mute">
        Информация носит справочный характер; условия бонусов устанавливает букмекер и может изменить их в любой момент. 18+.
      </p>
    </>
  )
}

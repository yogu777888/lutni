import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AdMark } from '@/components/AdMark'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { CtaLink } from '@/components/CtaLink'
import { PartnerBadge } from '@/components/PartnerBadge'
import { Section } from '@/components/Section'
import { Stars } from '@/components/Stars'
import { getPartner } from '@/config/bookmakers'
import { goHref } from '@/lib/affiliate'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const p = getPartner(slug)
  if (!p) return {}
  return {
    title: `${p.name}: обзор букмекера, бонус и отзывы`,
    description: `Обзор букмекерской конторы ${p.name}: лицензия, коэффициенты на футбол, плюсы и минусы, бонус для новых клиентов. Оценка tag.bet — ${p.rating.toFixed(1)} из 5.`,
    alternates: { canonical: `/bookmakers/${p.slug}` },
  }
}

const STEPS = [
  'Нажмите «Получить бонус» — откроется официальный сайт букмекера.',
  'Зарегистрируйтесь по номеру телефона и подтвердите возраст (18+).',
  'Пройдите идентификацию личности — это обязательное требование для легальных букмекеров.',
  'Выполните условия акции из раздела «Бонусы» на сайте букмекера.',
]

export default async function BookmakerPage({ params }: Props) {
  const { slug } = await params
  const p = getPartner(slug)
  if (!p) notFound()
  return (
    <>
      <Breadcrumbs items={[{ href: '/bookmakers', label: 'Букмекеры' }, { href: `/bookmakers/${p.slug}`, label: p.name }]} />
      <div className="pitch-bg card mb-6 p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-4">
          <PartnerBadge partner={p} size={64} />
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Букмекер {p.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <Stars value={p.rating} />
              <span className="num text-sm font-semibold">{p.rating.toFixed(1)} / 5</span>
              <span className="text-xs text-dim">· оценка tag.bet</span>
            </div>
          </div>
        </div>
        <div className="mt-5 rounded-2xl bg-panel-2 p-4 ring-1 ring-inset ring-acid/25">
          <p className="font-display text-lg font-bold text-acid">{p.bonus}</p>
          <p className="mt-1 text-xs text-dim">{p.bonusNote}</p>
          <CtaLink href={goHref(p, 'review')} className="mt-3 w-full py-3 text-[15px] sm:w-auto">
            Получить бонус в БК {p.name}
          </CtaLink>
          <AdMark partner={p} className="mt-2" />
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Section title="Плюсы">
          <ul className="space-y-2 text-sm">
            {p.highlights.map((h) => (
              <li key={h} className="flex gap-2">
                <span className="text-win">✓</span>
                {h}
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Минусы">
          <ul className="space-y-2 text-sm">
            {p.drawbacks.map((h) => (
              <li key={h} className="flex gap-2">
                <span className="text-loss">✕</span>
                {h}
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Лицензия и надёжность">
          <p className="text-sm leading-relaxed text-fg/85">
            {p.license}. Официальный сайт:{' '}
            <span className="font-semibold">{p.site.replace(/^https?:\/\/(www\.)?/, '')}</span>. Ставки принимаются только у совершеннолетних
            после идентификации.
          </p>
        </Section>
        <Section title="Как получить бонус">
          <ol className="space-y-2 text-sm">
            {STEPS.map((s, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="num flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-acid text-[11px] font-extrabold text-acid-ink">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </Section>
      </div>
      <p className="mt-6 text-xs leading-relaxed text-mute">
        Информация носит справочный характер; условия бонусов устанавливает букмекер и может изменить их в любой момент. 18+.
      </p>
    </>
  )
}

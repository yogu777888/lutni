import type { Metadata } from 'next'
import Link from 'next/link'
import { AdMark } from '@/components/AdMark'
import { CtaLink } from '@/components/CtaLink'
import { PartnerBadge } from '@/components/PartnerBadge'
import { PARTNERS } from '@/config/bookmakers'
import { goHref } from '@/lib/affiliate'

export const metadata: Metadata = {
  title: 'Легальные букмекеры: лицензии, линия на футбол, бонусы',
  description: 'Легальные букмекерские конторы с лицензией ФНС России: особенности линии на футбол, плюсы и минусы, бонусы для новых клиентов.',
  alternates: { canonical: '/bookmakers' },
}

export default function BookmakersPage() {
  return (
    <>
      <div className="mb-8 pt-2">
        {/* без оценок и места в списке (владелец: «сортируй по оценке надо?» — оценки 4.3–4.8 были заглушками без
            критериев, а сравнение в рекламе должно быть обоснованным); «оцениваем маржу, выплаты…» — тоже убрано: этого
            мы не делали. Порядок — партнёрский (PARTNERS). Настоящий рейтинг — только с критериями и методикой */}
        <h1 className="display text-[36px] sm:text-[56px]">Легальные букмекеры</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-dim">
          Только букмекеры с лицензией ФНС России и членством в ЕЦУПИС. Ссылки на букмекеров — партнёрские: мы можем получать
          вознаграждение.
        </p>
      </div>
      <ul className="space-y-3">
        {PARTNERS.map((p) => (
          <li key={p.slug} className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-4">
              <PartnerBadge partner={p} size={48} />
              <div className="min-w-[160px] flex-1">
                <Link href={`/bookmakers/${p.slug}`} className="text-[18px] font-semibold tracking-tight transition-opacity hover:opacity-75">
                  {p.name}
                </Link>
                <p className="mt-1 text-[12px] text-mute">{p.license}</p>
              </div>
              <div className="w-full sm:w-auto sm:min-w-[220px]">
                <p className="text-[14px] font-medium">{p.bonus}</p>
                <p className="text-[12px] text-mute">{p.bonusNote}</p>
              </div>
              <div className="flex w-full gap-2 sm:w-auto">
                <CtaLink href={goHref(p, 'bookmakers')} variant="light" className="flex-1 sm:flex-none">
                  На сайт
                </CtaLink>
                <Link
                  href={`/bookmakers/${p.slug}`}
                  className="inline-flex flex-1 items-center justify-center rounded-full bg-white/[0.08] px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-white/[0.13] sm:flex-none"
                >
                  Обзор
                </Link>
              </div>
            </div>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-dim">
              {p.highlights.map((h) => (
                <li key={h} className="flex items-center gap-1.5">
                  <span className="text-mute">✓</span>
                  {h}
                </li>
              ))}
            </ul>
            <AdMark partner={p} className="mt-2" />
          </li>
        ))}
      </ul>
      <p className="mt-8 text-[12px] leading-relaxed text-mute">
        Информация носит справочный характер. Перед регистрацией проверьте наличие лицензии на сайте букмекера. 18+. Азартные игры
        могут вызывать зависимость.
      </p>
    </>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { AdMark } from '@/components/AdMark'
import { CtaLink } from '@/components/CtaLink'
import { PartnerBadge } from '@/components/PartnerBadge'
import { PARTNERS, realBonus } from '@/config/bookmakers'
import { goHref } from '@/lib/affiliate'
import { pluralN } from '@/lib/format'
import { partnerLines } from '@/lib/partner-lines'

// сколько матчей с линией у каждого партнёра — из нашего кэша, на каждый запрос
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Легальные букмекеры: лицензии и коэффициенты на футбол',
  description: 'Легальные букмекерские конторы с лицензией ФНС России: официальные сайты и у кого коэффициенты на футбол есть на tag.bet.',
  alternates: { canonical: '/bookmakers' },
}

export default async function BookmakersPage() {
  const lines = await partnerLines()
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
      {/* в карточке — только то, что отличает букмекеров (владелец: «а страница букмекеров как?»): лицензия у всех одна —
          она в подзаголовке выше; заглушки «Бонус для новых клиентов» и выдуманных «плюсов» («быстрые выплаты», «высокие
          коэффициенты» — непроверенное сравнение в рекламе) нет; вместо них — есть ли кэфы букмекера на tag.bet */}
      <ul className="space-y-3">
        {PARTNERS.map((p) => {
          const day = lines.get(p.slug)
          const bonus = realBonus(p)
          return (
            <li key={p.slug} className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-4">
                <PartnerBadge partner={p} size={48} />
                <div className="min-w-[160px] flex-1">
                  <Link href={`/bookmakers/${p.slug}`} className="text-[18px] font-semibold tracking-tight transition-opacity hover:opacity-75">
                    {p.name}
                  </Link>
                  {day ? (
                    <Link href={`/bookmakers/${p.slug}#kefy`} className="mt-1 block text-[13.5px] text-dim transition-colors hover:text-fg">
                      Кэфы на tag.bet — в {pluralN(day.rows.length, ['матче', 'матчах', 'матчах'])} {day.when} →
                    </Link>
                  ) : (
                    <p className="mt-1 text-[13.5px] text-mute">Кэфов на tag.bet пока нет — линия на сайте букмекера</p>
                  )}
                  {bonus ? <p className="mt-1 text-[13.5px] font-medium">{bonus}</p> : null}
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
              <AdMark partner={p} className="mt-3" />
            </li>
          )
        })}
      </ul>
      <p className="mt-8 text-[12px] leading-relaxed text-mute">
        Информация носит справочный характер. Перед регистрацией проверьте наличие лицензии на сайте букмекера. 18+. Азартные игры
        могут вызывать зависимость.
      </p>
    </>
  )
}

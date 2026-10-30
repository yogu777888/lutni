import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHead } from '@/components/PageHead'
import { Section } from '@/components/Section'
import { TenScale, tenText } from '@/components/TenScale'
import { getTrackRecord } from '@/lib/data'
import { pct } from '@/lib/format'

// цифра из архива точности меняется каждый день — на каждый запрос (у страниц без force-dynamic сборка без данных)
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Почему даже 90% иногда не сбываются: что значат шансы tag.bet',
  description:
    'Шанс — это частота, а не обещание: из десяти исходов с шансом 60% примерно четыре не сбываются. Как проверить, что оценки честные, и почему высокий шанс — ещё не выгодная ставка.',
  alternates: { canonical: '/veroyatnost' },
}

const P = 'text-[15px] leading-relaxed text-fg/85'
const A = 'underline underline-offset-2 hover:text-fg'

const SCALE = [0.6, 0.7, 0.9]

/**
 * «Почему даже 90% иногда не сбываются» (владелец, из переписки с ChatGPT: «отдельная страница с очень простым названием…
 * объяснить вероятности через футбольные примеры, без сложных формул», план — пункт 2). Без «верняков» и обещаний; про
 * выгоду — только «по оценке» и «не гарантия» (ст. 27 закона «О рекламе»). Живая цифра — из «Истории точности», если
 * в группе «около 60–80%» уже набралось исходов.
 */
export default async function ChancePage() {
  const t = await getTrackRecord().catch(() => null)
  const bin = t?.bins.filter((b) => b.at >= 60).sort((a, b) => b.n - a.n)[0] ?? null
  return (
    <>
      <span hidden className="bare-sub" />
      <div className="space-y-4 xl:space-y-2 [&_.card_p]:max-w-[72ch]">
        <PageHead
          title="Почему даже 90% иногда не сбываются"
          sub="Что значат проценты tag.bet и почему промахи — часть честной оценки, а не её поломка."
        />
        <Section plain title="Шанс — это частота, а не обещание">
          <p className={P}>
            60% значит: из десяти похожих матчей исход сбывается примерно в шести, а в четырёх — нет. Про один конкретный матч оценка ничего
            не обещает — она говорит, как часто такое случается.
          </p>
          <ul className="mt-4 max-w-md">
            {SCALE.map((p) => (
              <li key={p} className="border-t border-edge py-3 first:border-t-0">
                <div className="flex items-baseline justify-between gap-3 text-[15px]">
                  <span className="num font-semibold">{pct(p)}</span>
                  <span className="text-dim">{tenText(p)} сбывается</span>
                </div>
                <TenScale p={p} className="mt-2" />
              </li>
            ))}
          </ul>
        </Section>
        <Section plain title="Пример из футбола">
          <p className={P}>
            Фаворит, которому мы даём 75%, побеждает примерно в трёх матчах из четырёх. Если за тур таких матчей десять, то в среднем двое-трое
            фаворитов не выиграют — и это не ошибка модели, а те самые 25%. Ошибкой было бы, если бы при 75% фавориты выигрывали каждый раз
            или только в половине случаев.
          </p>
        </Section>
        <Section plain title="Как проверить, что оценки честные">
          <p className={P}>
            По одному матчу — никак. По сотням — можно: берём все исходы, которым давали около 70%, и смотрим, сколько сбылось. Если около 70% —
            оценки честные. Если 90% — шансы занижали, если 50% — завышали.
          </p>
          {bin ? (
            <p className={`mt-3 ${P}`}>
              По нашему архиву: исходы, которым мы давали около {bin.at}%, сбылись в {pct(bin.hit)} случаев — из {bin.n}.
            </p>
          ) : null}
          <p className={`mt-3 ${P}`}>
            Каждую оценку tag.bet записываем до начала матча и сверяем с итогом —{' '}
            <Link href="/tochnost" className={A}>
              история точности
            </Link>
            , с ошибками. Как считаем шансы — на странице{' '}
            <Link href="/about" className={A}>
              «Как мы считаем»
            </Link>
            .
          </p>
        </Section>
        <Section plain title="Высокий шанс — ещё не выгодная ставка">
          <p className={P}>
            Шанс 90% при кэфе 1.05 и шанс 60% при кэфе 1.80 — разные истории. Если оценка точна, в первом случае 0,90 × 1,05 − 1 = −5,5%, во
            втором 0,60 × 1,80 − 1 = +8%. Поэтому «Выгодно» у нас — не самые вероятные исходы, а те, где кэф выше честной цены. Это расчёт
            по оценке, а не гарантия: оценка сама ошибается.{' '}
            <Link href="/about#vygodno" className={A}>
              Как считаем «Выгодно»
            </Link>
          </p>
        </Section>
        <Section plain title="Чего мы не делаем">
          <ul className={`list-disc space-y-1.5 pl-5 ${P}`}>
            <li>Не пишем «верняк», «железная ставка» и «гарантированный исход» — таких не бывает.</li>
            <li>Не принимаем ставки и не распоряжаемся вашими деньгами. Решение о ставке, её размере и риске — только за вами.</li>
            <li>
              Ставки — это риск · 18+.{' '}
              <Link href="/responsible-gaming" className={A}>
                Ответственная игра
              </Link>
            </li>
          </ul>
        </Section>
      </div>
    </>
  )
}

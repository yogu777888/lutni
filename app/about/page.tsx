import type { Metadata } from 'next'
import Link from 'next/link'
import { ChanceChart } from '@/components/ChanceChart'
import { Section } from '@/components/Section'
import { peekChanceCheck } from '@/lib/data'
import { pct } from '@/lib/format'
import { TAGS } from '@/lib/tags'

export const metadata: Metadata = {
  title: 'Как мы считаем: вероятности, value и теги',
  description: 'Методология tag.bet: консенсус линий букмекеров без маржи, пуассоновская модель голов, Glicko-2, value-ставки, правила тегов и проверка шансов.',
  alternates: { canonical: '/about' },
}

// «Проверка шансов» — живые данные (график давали — сбылось за месяц)
export const dynamic = 'force-dynamic'

export default async function AboutPage() {
  const check = await peekChanceCheck()
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="pt-2 display text-[36px] sm:text-[56px]">Как мы считаем</h1>
      <p className="text-[15px] leading-relaxed text-fg/85">
        tag.bet не «угадывает» исходы — мы собираем данные и показываем, где линия букмекеров расходится со справедливой оценкой. Все
        расчёты автоматические и одинаковые для каждого матча.
      </p>
      <Section title="1. Консенсус рынка без маржи">
        <p className="text-sm leading-relaxed text-fg/85">
          У каждого букмекера мы снимаем маржу (пропорционально) и усредняем вероятности исходов. «Острые» букмекеры с низкой маржой
          получают больший вес: их линия точнее отражает реальные шансы. Сравнение коэффициентов открытия и текущих показывает, куда
          движется линия.
        </p>
      </Section>
      <Section title="2. Модель голов">
        <p className="text-sm leading-relaxed text-fg/85">
          Подбираем ожидаемое число голов хозяев и гостей, которое лучше всего объясняет рыночные вероятности, и смешиваем его с xG
          из рейтинга Glicko-2. По распределению Пуассона считаем вероятный счёт, тоталы и «обе забьют».
        </p>
      </Section>
      <Section title="3. Value и прогноз">
        <p className="text-sm leading-relaxed text-fg/85">
          Справедливый коэффициент = 1 / вероятность. Если букмекер даёт больше, у ставки положительное ожидание (EV = p × k − 1). Прогноз
          tag.bet — исход с наибольшим перевесом, а если перевеса нет — самый вероятный исход с приемлемым коэффициентом.
        </p>
      </Section>
      <Section title="4. Теги">
        <ul className="space-y-2 text-sm">
          {TAGS.map((t) => (
            <li key={t.slug}>
              <Link href={`/tag/${t.slug}`} className="font-medium transition-opacity hover:opacity-75">
                {t.label}
              </Link>{' '}
              <span className="text-dim">— {t.hint.toLowerCase()}.</span>
            </li>
          ))}
        </ul>
      </Section>
      <Section id="proverka" title="5. Проверка шансов">
        <p className="text-sm leading-relaxed text-fg/85">
          Каждый день сверяем шансы, которые сайт показывал перед матчем (кэфы без маржи), с тем, чем матч закончился. Исходы
          раскладываем по корзинам «около 10%», «около 20%»… «около 90%» и считаем, какая доля в каждой сбылась. Если шансы честные,
          из исходов с шансом около 60% сбывается примерно 60%. Итог за последние 30 дней — на главной, в карточке «Проверка шансов»,
          а по всем корзинам — на графике ниже: черта — какой шанс давали, столбик — сколько сбылось.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-fg/85">
          Шанс — не обещание: исход с шансом 60% не сбывается примерно в четырёх случаях из десяти. Проверка показывает, что проценты
          на сайте можно читать буквально, а не что на ставках можно заработать.
        </p>
        {check ? (
          <figure className="mt-6">
            <figcaption className="mb-4 text-sm text-dim">
              За {check.days >= 28 ? 'месяц' : `${check.days} дн.`} — {new Intl.NumberFormat('ru-RU').format(check.outcomes)} исходов: где давали около{' '}
              {pct(check.lead.p)}, сбылось {pct(check.lead.hit)}; в среднем шансы и итог расходятся на {check.gap.toFixed(1).replace('.', ',')} пункта.
            </figcaption>
            <ChanceChart bins={check.bins} className="h-[240px]" />
          </figure>
        ) : null}
      </Section>
      <Section title="Данные">
        <p className="text-sm leading-relaxed text-fg/85">
          Матчи, коэффициенты, статистика, составы, травмы и рейтинги — SStats.net. Данные обновляются автоматически: live-матчи раз в
          минуту, линии перед игрой — несколько раз в час.
        </p>
      </Section>
      <p className="text-xs text-mute">
        Любая модель ошибается. Прогнозы не гарантируют результат и не являются призывом делать ставки. 18+.{' '}
        <Link href="/responsible-gaming" className="underline">
          Ответственная игра
        </Link>
      </p>
    </div>
  )
}

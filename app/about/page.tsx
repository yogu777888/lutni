import type { Metadata } from 'next'
import Link from 'next/link'
import { Section } from '@/components/Section'
import { TAGS } from '@/lib/tags'

export const metadata: Metadata = {
  title: 'Как мы считаем: вероятности, value и теги',
  description: 'Методология tag.bet: консенсус линий букмекеров без маржи, пуассоновская модель голов, Glicko-2, value-ставки и правила тегов.',
  alternates: { canonical: '/about' },
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="pt-2 text-[26px] font-bold leading-tight tracking-[-0.03em] sm:text-[34px]">Как мы считаем</h1>
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

import type { Metadata } from 'next'
import Link from 'next/link'
import { ChanceChart } from '@/components/ChanceChart'
import { PageHead } from '@/components/PageHead'
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
    <>
      {/* вид остальных страниц (владелец: «на всех страницах разные по размеру заголовки?»): без подложки, шапка — PageHead,
          разделы — панелями; строки текста — не длиннее ~72 знаков */}
      <span hidden className="bare-sub" />
      <div className="space-y-4 xl:space-y-2 [&_.card_p]:max-w-[72ch] [&_.card_ul]:max-w-[72ch]">
        <PageHead
          title="Как мы считаем"
          sub={
            <>
              tag.bet не «угадывает» исходы — мы собираем данные и показываем, где линия букмекеров расходится со справедливой оценкой. Все
              расчёты автоматические и одинаковые для каждого матча.
            </>
          }
        />
        <Section plain title="1. Консенсус рынка без маржи">
          <p className="text-sm leading-relaxed text-fg/85">
            У каждого букмекера мы снимаем маржу (пропорционально) и усредняем вероятности исходов. «Острые» букмекеры с низкой маржой
            получают больший вес: их линия точнее отражает реальные шансы. Сравнение коэффициентов открытия и текущих показывает, куда
            движется линия.
          </p>
        </Section>
        <Section plain title="2. Модель голов">
          <p className="text-sm leading-relaxed text-fg/85">
            Подбираем ожидаемое число голов хозяев и гостей, которое лучше всего объясняет рыночные вероятности, и смешиваем его с xG
            из рейтинга Glicko-2. По распределению Пуассона считаем вероятный счёт, тоталы и «обе забьют».
          </p>
        </Section>
        <Section plain title="3. Value и прогноз">
          <p className="text-sm leading-relaxed text-fg/85">
            Справедливый коэффициент = 1 / вероятность. Если букмекер даёт больше, у ставки положительное ожидание (EV = p × k − 1). Прогноз
            tag.bet — исход с наибольшим перевесом, а если перевеса нет — самый вероятный исход с приемлемым коэффициентом.
          </p>
        </Section>
        <Section plain title="4. Подборки">
          <ul className="space-y-2 text-sm">
            {TAGS.map((t) => (
              <li key={t.slug}>
                <Link href={`/tag/${t.slug}`} className="font-medium transition-opacity hover:opacity-75">
                  {t.title}
                </Link>{' '}
                <span className="text-dim">— {t.hint.toLowerCase()}.</span>
              </li>
            ))}
          </ul>
        </Section>
        <Section plain id="proverka" title="5. Проверка шансов">
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
        <Section plain title="Данные">
          <p className="text-sm leading-relaxed text-fg/85">
            Матчи, статистику, составы, травмы и рейтинги берём из спортивной базы данных, коэффициенты — из линий букмекеров. Данные обновляются автоматически: live-матчи раз в
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
    </>
  )
}

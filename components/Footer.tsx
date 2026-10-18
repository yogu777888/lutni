import Link from 'next/link'
import { PARTNERS } from '@/config/bookmakers'
import { SITE } from '@/config/site'

/** Ссылки строкой: «·» приклеена к концу ссылки (nowrap) — при переносе строка кончается точкой, а не начинается с «· Cookie». */
function Links({ label, items, className = '' }: { label: string; items: [string, string][]; className?: string }) {
  return (
    <nav aria-label={label} className={`flex flex-wrap gap-x-1.5 gap-y-1 ${className}`}>
      {items.map(([href, text], i) => (
        <span key={href} className="whitespace-nowrap">
          {href.startsWith('/') ? (
            <Link href={href} className="transition-colors hover:text-fg">
              {text}
            </Link>
          ) : (
            <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener" className="transition-colors hover:text-fg">
              {text}
            </a>
          )}
          {i < items.length - 1 ? <span aria-hidden> ·</span> : null}
        </span>
      ))}
    </nav>
  )
}

/**
 * Подвал ниже xl — только правовой блок, той же системой строк, что внизу левой панели (`Legal` в LeftPanel.tsx):
 * предупреждения, раскрытие партнёрства, рекламодатели, ссылки, копирайт. Без надписи tag.bet (она в шапке и в «©») и
 * без строки разделов (повторяла нижнее меню `TabBar` и меню шапки), без черты сверху и пустой полосы перед ним
 * (владелец: «а футер как тебе?»). От xl подвала нет.
 */
export function Footer() {
  // рекламодатели — те, у кого есть партнёрская ссылка (`AFF_<SLUG>_URL`); пока ни у кого нет — первые шесть партнёров
  // (легальных букмекеров 17, у остальных «На сайт» ведёт на официальный сайт — это не реклама по договору)
  const configured = PARTNERS.filter((p) => p.configured)
  const advertisers = configured.length ? configured : PARTNERS.slice(0, 6)
  const info: [string, string][] = [
    ['/about', 'Как мы считаем'],
    ['/responsible-gaming', 'Ответственная игра'],
    ['/privacy', 'Cookie'],
  ]
  if (SITE.telegramUrl) info.push([SITE.telegramUrl, 'Telegram'])
  if (SITE.contactEmail) info.push([`mailto:${SITE.contactEmail}`, SITE.contactEmail])
  return (
    <footer className="xl:hidden">
      <div className="mx-auto max-w-6xl px-4 pb-4">
        <div className="space-y-1.5 text-[12px] leading-snug text-mute">
          <p>
            <span className="font-semibold text-dim">18+</span> · Ставки — это риск. Не призыв делать ставки.
          </p>
          <p>Ссылки на букмекеров — партнёрские: мы можем получать вознаграждение.</p>
          {/* рекламодатели — для кнопок с пометкой «Реклама» (на телефоне подсказки при наведении нет): юрлицо из
              AFF_<SLUG>_ADVERTISER, нет его — имя партнёра */}
          <p>Реклама: {advertisers.map((p) => p.ad.advertiser || p.name).join(', ')}.</p>
          <Links label="Информация" items={info} />
          <p>
            © {new Date().getFullYear()} {SITE.name}
          </p>
        </div>
      </div>
    </footer>
  )
}

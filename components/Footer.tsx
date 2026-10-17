import Link from 'next/link'
import { SITE } from '@/config/site'
import { Wordmark } from './Logo'

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
 * Подвал ниже xl — той же системой строк, что правовой блок в левой панели (`Legal` в LeftPanel.tsx): надпись, разделы
 * строкой, предупреждения, раскрытие партнёрства, ссылки, копирайт. Было ~680px на телефоне: «Теги ставок на футбол…»,
 * кружок 18+, меню шапки столбиком, «Все теги» (владелец: «а на телефоне главная как?»). От xl подвала нет.
 */
export function Footer() {
  const info: [string, string][] = [
    ['/about', 'Как мы считаем'],
    ['/responsible-gaming', 'Ответственная игра'],
    ['/privacy', 'Cookie'],
  ]
  if (SITE.telegramUrl) info.push([SITE.telegramUrl, 'Telegram'])
  if (SITE.contactEmail) info.push([`mailto:${SITE.contactEmail}`, SITE.contactEmail])
  return (
    <footer className="mt-6 border-t border-edge xl:hidden">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Wordmark size={24} className="text-fg" />
        <Links
          label="Разделы"
          className="mt-4 text-[14px] font-medium text-dim"
          items={[
            ['/matches', 'Матчи'],
            ['/tags', 'Подборки'],
            ['/tag/value', 'Выгодные ставки'],
            ['/leagues', 'Лиги'],
            ['/bookmakers', 'Букмекеры'],
          ]}
        />
        <div className="mt-5 space-y-1.5 border-t border-edge pt-4 text-[12px] leading-snug text-mute">
          <p>
            <span className="font-semibold text-dim">18+</span> · Ставки — это риск. Не призыв делать ставки.
          </p>
          <p>Ссылки на букмекеров — партнёрские: мы можем получать вознаграждение.</p>
          <Links label="Информация" items={info} />
          <p>
            © {new Date().getFullYear()} {SITE.name}
          </p>
        </div>
      </div>
    </footer>
  )
}

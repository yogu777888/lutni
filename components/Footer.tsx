import Link from 'next/link'
import { SITE } from '@/config/site'
import { Logo } from './Logo'

export function Footer() {
  return (
    <footer className="mt-20 border-t border-edge">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo size={30} />
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-dim">
            Теги ставок на футбол: сравнение коэффициентов, вероятности без маржи, форма команд и прогнозы на основе данных.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-dim ring-1 ring-edge-2">18+</span>
            <p className="text-xs leading-snug text-dim">
              Сайт предназначен для лиц старше 18 лет.
              <br />
              Ставки — это риск. Играйте ответственно.
            </p>
          </div>
        </div>
        <nav aria-label="Разделы" className="flex flex-col gap-2 text-sm">
          <span className="mb-1 text-[12px] font-medium text-mute">Разделы</span>
          <Link href="/" className="text-dim hover:text-fg">Матчи сегодня</Link>
          <Link href="/tags" className="text-dim hover:text-fg">Все теги</Link>
          <Link href="/tag/value" className="text-dim hover:text-fg">Value-ставки</Link>
          <Link href="/leagues" className="text-dim hover:text-fg">Лиги и таблицы</Link>
          <Link href="/bookmakers" className="text-dim hover:text-fg">Рейтинг букмекеров</Link>
        </nav>
        <nav aria-label="Информация" className="flex flex-col gap-2 text-sm">
          <span className="mb-1 text-[12px] font-medium text-mute">Информация</span>
          <Link href="/about" className="text-dim hover:text-fg">Как мы считаем</Link>
          <Link href="/responsible-gaming" className="text-dim hover:text-fg">Ответственная игра</Link>
          {SITE.telegramUrl ? (
            <a href={SITE.telegramUrl} target="_blank" rel="noopener" className="text-dim hover:text-fg">Telegram-канал</a>
          ) : null}
          {SITE.contactEmail ? (
            <a href={`mailto:${SITE.contactEmail}`} className="text-dim hover:text-fg">{SITE.contactEmail}</a>
          ) : null}
        </nav>
      </div>
      <div className="border-t border-edge">
        <p className="mx-auto max-w-6xl px-4 py-5 text-[11px] leading-relaxed text-mute">
          Материалы сайта носят информационно-аналитический характер и не являются призывом делать ставки. Прогнозы основаны на
          статистике и не гарантируют результат. На сайте размещены партнёрские ссылки на легальных букмекеров: при регистрации по
          ним сайт может получать вознаграждение. Данные о матчах и коэффициентах — SStats.net. © {new Date().getFullYear()} {SITE.name}
        </p>
      </div>
    </footer>
  )
}

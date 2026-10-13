import '@fontsource-variable/onest'
import '@fontsource-variable/oswald'
import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Footer } from '@/components/Footer'
import { CookieNotice } from '@/components/CookieNotice'
import { Header } from '@/components/Header'
import { Metrika } from '@/components/Metrika'
import { LeftPanel } from '@/components/shell/LeftPanel'
import { dayLeagues } from '@/lib/day-leagues'
import { dayPicks } from '@/lib/day-picks'
import { RightPanel } from '@/components/shell/RightPanel'
import { ShellFrame } from '@/components/shell/ShellFrame'
import { ResizeHandle } from '@/components/shell/ResizeHandle'
import { SHELL_SCRIPT } from '@/components/shell/shell-state'
import { todayYmd } from '@/lib/format'
import { StoryViewer } from '@/components/story/StoryViewer'
import { SITE } from '@/config/site'
import { IS_MOCK } from '@/lib/sstats/client'

// Всё рендерим на запросе: настройки партнёров, erid и URL сайта читаются из env
// в рантайме (в Docker-сборке .env недоступен). Данные кэширует lib/cache.ts.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: 'tag.bet — теги ставок на футбол: коэффициенты, прогнозы, value',
    template: '%s | tag.bet',
  },
  description:
    'Футбольные матчи с тегами ставок: сравнение коэффициентов букмекеров, вероятности без маржи, value-ставки, прогрузы, форма команд и прогнозы на основе данных.',
  applicationName: SITE.name,
  openGraph: { type: 'website', siteName: SITE.name, locale: 'ru_RU', images: [{ url: '/og.png', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image' },
  verification: {
    google: SITE.googleVerification || undefined,
    yandex: SITE.yandexVerification || undefined,
  },
  // демо-данные не должны попасть в индекс
  robots: IS_MOCK ? { index: false, follow: false } : undefined,
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: '#090c10',
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [day, picks] = await Promise.all([dayLeagues(), dayPicks()])
  return (
    // suppressHydrationWarning: ширину и свёрнутость боковых панелей скрипт ниже ставит до отрисовки
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SHELL_SCRIPT }} />
      </head>
      <body className="min-h-dvh antialiased">
        <Header />
        <ShellFrame />
        {/* каркас, как у Spotify (от xl): слева «Мои команды» и турниры, в центре — серая панель страницы с градиентом
            сверху, справа — вход на сайт (виджет, как у Spotify «Зарегистрируйся») — по одной панели на всю высоту; уже — обычная страница во всю ширину */}
        <div className="xl:grid xl:grid-cols-[var(--shell-l)_minmax(0,1fr)_var(--shell-r)] xl:gap-2 xl:px-2 xl:pb-2 xl:pt-2">
          <aside aria-label="Турниры дня" className="hidden xl:block">
            <div className="sticky top-[72px] h-[calc(100dvh-80px)]">
              <ResizeHandle side="l" />
              <LeftPanel today={todayYmd()} day={day} />
            </div>
          </aside>
          <div className="shell-center min-w-0">
            <main className="mx-auto max-w-6xl px-4 pb-10 pt-4 sm:pt-6">{children}</main>
            <Footer />
          </div>
          <aside aria-label="Подборки дня" className="hidden xl:block">
            <div className="sticky top-[72px] h-[calc(100dvh-80px)]">
              <ResizeHandle side="r" />
              <RightPanel picks={picks} />
            </div>
          </aside>
        </div>
        <CookieNotice />
        <StoryViewer />
        {SITE.metrikaId ? <Metrika id={SITE.metrikaId} /> : null}
      </body>
    </html>
  )
}

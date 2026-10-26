import { NavWatch } from '@/components/BackButton'
import '@fontsource-variable/onest'
import '@fontsource-variable/oswald'
import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Footer } from '@/components/Footer'
import { CookieNotice } from '@/components/CookieNotice'
import { TabBar } from '@/components/TabBar'
import { BarsAutoHide } from '@/components/BarsAutoHide'
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
import { StoryViewerLazy } from '@/components/story/StoryViewerLazy'
import { SITE } from '@/config/site'
import { Suspense } from 'react'
import { IS_MOCK } from '@/lib/sstats/client'

// Настройки партнёров, erid и URL сайта читаются из env в рантайме (в Docker-сборке .env недоступен), поэтому при
// сборке сайта страницы с ними не собираем: у каждой своя настройка — `force-dynamic` (на каждый запрос) или хранение
// готовой страницы 30 с, собранной при первом открытии на работающем сервере (ISR: матч, лига, подборка, главная —
// её заготовку со сборки убирает instrumentation.ts). Данные кэширует lib/cache.ts.

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
  // нижнее меню (TabBar) встаёт над полоской жестов iPhone — env(safe-area-inset-bottom) работает только с cover
  viewportFit: 'cover',
}

// боковые панели догружаются следом (владелец: «чтоб не все сразу грузилось»): страница не ждёт их данных, а на телефоне
// и планшете их и не видно
async function LeftPanelData() {
  return <LeftPanel today={todayYmd()} day={await dayLeagues()} />
}

async function RightPanelData() {
  return <RightPanel picks={await dayPicks()} />
}

/** Пока панель грузится — её пустая плашка того же цвета. */
function PanelSkeleton() {
  return <div className="h-full rounded-card bg-panel" />
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: ширину и свёрнутость боковых панелей скрипт ниже ставит до отрисовки
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SHELL_SCRIPT }} />
      </head>
      <body className="min-h-dvh antialiased">
        <NavWatch />
        <Header />
        <ShellFrame />
        {/* каркас, как у Spotify (от xl): слева «Мои команды» и турниры, в центре — серая панель страницы с градиентом
            сверху, справа — вход на сайт (виджет, как у Spotify «Зарегистрируйся») — по одной панели на всю высоту; уже — обычная страница во всю ширину */}
        <div className="xl:grid xl:grid-cols-[var(--shell-l)_minmax(0,1fr)_var(--shell-r)] xl:gap-2 xl:px-2 xl:pb-2 xl:pt-2">
          <aside aria-label="Турниры дня" className="hidden xl:block">
            <div className="sticky top-[72px] h-[calc(100dvh-80px)]">
              <ResizeHandle side="l" />
              <Suspense fallback={<PanelSkeleton />}>
                <LeftPanelData />
              </Suspense>
            </div>
          </aside>
          <div className="shell-center min-w-0">
            <main className="mx-auto max-w-6xl px-4 pb-10 pt-4 sm:pt-6">{children}</main>
            <Footer />
          </div>
          <aside aria-label="Подборки дня" className="hidden xl:block">
            <div className="sticky top-[72px] h-[calc(100dvh-80px)]">
              <ResizeHandle side="r" />
              <Suspense fallback={<PanelSkeleton />}>
                <RightPanelData />
              </Suspense>
            </div>
          </aside>
        </div>
        {/* затухание у нижнего края окна, где текст уходит под край (.edge-fade-page в app/globals.css) */}
        <div aria-hidden className="edge-fade-page" />
        <div aria-hidden className="edge-fade-top" />
        <TabBar />
        <BarsAutoHide />
        <CookieNotice />
        <StoryViewerLazy />
        {SITE.metrikaId ? <Metrika id={SITE.metrikaId} /> : null}
      </body>
    </html>
  )
}

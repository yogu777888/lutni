import '@fontsource-variable/onest'
import '@fontsource-variable/unbounded'
import '@fontsource-variable/oswald'
import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Footer } from '@/components/Footer'
import { CookieNotice } from '@/components/CookieNotice'
import { Header } from '@/components/Header'
import { Metrika } from '@/components/Metrika'
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // временно: варианты фирменного шрифта для сравнения (FONT_VARIANT=a|b)
    <html lang="ru" data-font={process.env.FONT_VARIANT || undefined}>
      <body className="min-h-dvh antialiased">
        <Header />
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-4 sm:pt-6">{children}</main>
        <Footer />
        <CookieNotice />
        <StoryViewer />
        {SITE.metrikaId ? <Metrika id={SITE.metrikaId} /> : null}
      </body>
    </html>
  )
}

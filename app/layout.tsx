import '@fontsource-variable/onest'
// рукописный — только для приписки «лидер» в «Главных матчах»; кириллица, один вес
import '@fontsource/caveat/cyrillic-600.css'
import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Footer } from '@/components/Footer'
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
  themeColor: '#0b0b09',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: data-look ставит скрипт ниже до отрисовки (сравнение цветовых версий)
    <html lang="ru" suppressHydrationWarning>
      <head>
        {/* Эксперимент с цветами: по умолчанию — светлая голубовато-серая версия; ?look=dark — прежняя графитовая
            (запоминается в браузере), ?look=light — вернуть светлую. Ставим до отрисовки — без мигания. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var q=new URLSearchParams(location.search).get('look');if(q==='dark')localStorage.setItem('tb-look','dark');else if(q)localStorage.removeItem('tb-look');if(localStorage.getItem('tb-look')==='dark')document.documentElement.dataset.look='dark'}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-dvh antialiased">
        <Header />
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-4 sm:pt-6">{children}</main>
        <Footer />
        <StoryViewer />
        {SITE.metrikaId ? <Metrika id={SITE.metrikaId} /> : null}
      </body>
    </html>
  )
}

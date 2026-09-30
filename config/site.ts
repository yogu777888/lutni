/**
 * Общие настройки сайта. Всё, что зависит от окружения, читается из env
 * (см. .env.example), чтобы не править код при деплое.
 */
export const SITE = {
  name: 'tag.bet',
  url: (process.env.SITE_URL || 'https://tag.bet').replace(/\/+$/, ''),
  tagline: 'Теги ставок на футбол: коэффициенты, вероятности и прогнозы',
  /** Часовой пояс, в котором показываем время матчей и считаем «сегодня». */
  timeZone: process.env.SITE_TIMEZONE || 'Europe/Moscow',
  tzLabel: process.env.SITE_TZ_LABEL || 'МСК',
  /** Сколько дней вперёд показываем в навигации по датам и в sitemap. */
  daysAhead: 3,
  telegramUrl: process.env.TELEGRAM_URL || '',
  metrikaId: process.env.YANDEX_METRIKA_ID || '',
  yandexVerification: process.env.YANDEX_VERIFICATION || '',
  googleVerification: process.env.GOOGLE_SITE_VERIFICATION || '',
  contactEmail: process.env.CONTACT_EMAIL || '',
} as const

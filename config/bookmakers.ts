/**
 * Партнёрские букмекеры — главный источник дохода сайта.
 *
 * Для каждого букмекера:
 *  - `url` — партнёрская ссылка из кабинета партнёрки. Поддерживает плейсхолдеры
 *    {subid}, {placement}, {match} — туда подставится место клика и ID матча,
 *    чтобы в статистике партнёрки было видно, какие блоки приносят регистрации.
 *    Ссылку удобнее задавать через env: AFF_<SLUG>_URL (например AFF_FONBET_URL,
 *    для slug с дефисом — AFF_LIGA_STAVOK_URL).
 *  - `ad` — маркировка рекламы (ФЗ «О рекламе», ст. 18.1): рекламодатель и токен
 *    erid выдаёт партнёрская программа. Env: AFF_<SLUG>_ERID, AFF_<SLUG>_ADVERTISER.
 *  - `apiNames` — как этот букмекер называется в ответе SStats /Odds, чтобы
 *    показать его коэффициенты в таблице сравнения с кнопкой «Ставка».
 *
 * Тексты бонусов намеренно общие: подставьте актуальные условия из партнёрки (AFF_<SLUG>_BONUS). Плюсов и минусов
 * («быстрые выплаты», «высокие коэффициенты») нет: это были заглушки первой версии, непроверенное сравнение в рекламе;
 * на страницах «Букмекеры» вместо них — у кого кэфы есть в наших данных (`lib/partner-lines.ts`).
 */
export type Partner = {
  slug: string
  name: string
  /** 1–3 символа для бейджа-логотипа. */
  short: string
  color: string
  textColor: string
  /** Официальный сайт — показывается пользователю. */
  site: string
  url: string
  /** true, если реф-ссылка задана (через env или в коде). */
  configured: boolean
  apiNames: RegExp
  apiIds: number[]
  bonus: string
  bonusNote: string
  license: string
  ad: { advertiser: string; erid: string }
}

type PartnerSeed = Omit<Partner, 'url' | 'configured' | 'ad'> & {
  /** Партнёрская ссылка по умолчанию (если env не задан). Пусто — ведём на site. */
  defaultUrl?: string
}

// PARI — первым (главный партнёр: «Бонус» в шапке, кнопки по умолчанию): его линию мы показываем в списках, на табло
// и в «Выгодно сегодня» (владелец: «а можно блок выгодно сегодня сделать только про пари?» — и шапку тоже)
const SEEDS: PartnerSeed[] = [
  {
    slug: 'pari',
    name: 'PARI',
    short: 'P',
    color: '#ffd400',
    textColor: '#111111',
    site: 'https://www.pari.ru',
    apiNames: /\bpari\b|пари/i,
    apiIds: [],
    bonus: 'Бонус для новых клиентов',
    bonusNote: 'Актуальные условия — на сайте букмекера',
    license: 'Лицензия ФНС России, член ЕЦУПИС',
  },
  {
    slug: 'fonbet',
    name: 'Фонбет',
    short: 'F',
    color: '#e3002b',
    textColor: '#ffffff',
    site: 'https://www.fon.bet',
    apiNames: /fon ?bet|фонбет/i,
    apiIds: [],
    bonus: 'Бонус для новых клиентов',
    bonusNote: 'Актуальные условия — на сайте букмекера',
    license: 'Лицензия ФНС России, член ЕЦУПИС',
  },
  {
    slug: 'winline',
    name: 'Winline',
    short: 'W',
    color: '#ff6b00',
    textColor: '#111111',
    site: 'https://winline.ru',
    apiNames: /winline|винлайн/i,
    apiIds: [],
    bonus: 'Бонус для новых клиентов',
    bonusNote: 'Актуальные условия — на сайте букмекера',
    license: 'Лицензия ФНС России, член ЕЦУПИС',
  },
  {
    slug: 'betboom',
    name: 'BetBoom',
    short: 'BB',
    color: '#7b2cff',
    textColor: '#ffffff',
    site: 'https://betboom.ru',
    apiNames: /bet ?boom|бетбум/i,
    apiIds: [],
    bonus: 'Бонус для новых клиентов',
    bonusNote: 'Актуальные условия — на сайте букмекера',
    license: 'Лицензия ФНС России, член ЕЦУПИС',
  },
  {
    slug: 'liga-stavok',
    name: 'Лига Ставок',
    short: 'ЛС',
    color: '#0f9d58',
    textColor: '#ffffff',
    site: 'https://www.ligastavok.ru',
    apiNames: /liga ?stavok|лига ставок/i,
    apiIds: [],
    bonus: 'Бонус для новых клиентов',
    bonusNote: 'Актуальные условия — на сайте букмекера',
    license: 'Лицензия ФНС России, член ЕЦУПИС',
  },
  {
    slug: 'marathonbet',
    name: 'Марафон',
    short: 'M',
    color: '#0a2a5e',
    textColor: '#ffffff',
    site: 'https://www.marathonbet.ru',
    apiNames: /marathon|марафон/i,
    apiIds: [],
    bonus: 'Бонус для новых клиентов',
    bonusNote: 'Актуальные условия — на сайте букмекера',
    license: 'Лицензия ФНС России, член ЕЦУПИС',
  },
]

const envKey = (slug: string) => slug.toUpperCase().replace(/[^A-Z0-9]+/g, '_')

/** Заглушка бонуса из настроек: в строках «Где поставить» её не показываем — у всех шести одна и та же, ничего не говорит. */
export const GENERIC_BONUS = 'Бонус для новых клиентов'

/** Настоящие условия бонуса от партнёрки (`AFF_<SLUG>_BONUS`) или null — заглушку `GENERIC_BONUS` нигде не показываем. */
export const realBonus = (p: Partner): string | null => (p.bonus && p.bonus !== GENERIC_BONUS ? p.bonus : null)

function build(seed: PartnerSeed): Partner {
  const key = envKey(seed.slug)
  const envUrl = process.env[`AFF_${key}_URL`]
  const url = envUrl || seed.defaultUrl || seed.site
  return {
    ...seed,
    // настоящие условия бонуса от партнёрки — AFF_<SLUG>_BONUS («Фрибет до 10 000 ₽»), без правки кода
    bonus: process.env[`AFF_${key}_BONUS`] || seed.bonus,
    url,
    configured: Boolean(envUrl || seed.defaultUrl),
    ad: {
      advertiser: process.env[`AFF_${key}_ADVERTISER`] || '',
      erid: process.env[`AFF_${key}_ERID`] || '',
    },
  }
}

/** Порядок можно переопределить: PARTNERS_ORDER="winline,fonbet,pari". */
function ordered(list: Partner[]): Partner[] {
  const raw = process.env.PARTNERS_ORDER
  if (!raw) return list
  const order = raw.split(',').map((s) => s.trim()).filter(Boolean)
  const known = order
    .map((slug) => list.find((p) => p.slug === slug))
    .filter((p): p is Partner => Boolean(p))
  return known.length ? known : list
}

export const PARTNERS: Partner[] = ordered(SEEDS.map(build))

export function getPartner(slug: string): Partner | undefined {
  return PARTNERS.find((p) => p.slug === slug)
}

/** Главный партнёр — для баннеров и sticky-кнопки. */
export function primaryPartner(): Partner {
  return PARTNERS[0]
}

/** Сопоставить букмекера из ответа API с партнёром. */
export function partnerForApiBookmaker(id: number, name: string): Partner | undefined {
  return PARTNERS.find((p) => p.apiIds.includes(id) || p.apiNames.test(name))
}

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
  /** Справка на странице букмекера — только проверенное (условия партнёрки, сайт букмекера); пусто — строки нет. */
  facts?: BookFacts
}

/**
 * Факты для страницы букмекера (владелец: «в букмекерах какие-то обзоры надо делать?» — обзоров с оценками и «плюсами»
 * нет: сравнение в рекламе должно быть обоснованным; потом прислал legalbet: таблицы пополнения и вывода, лицензия).
 * Заполняйте только то, что сверили сами или получили от партнёрки (не копируйте чужие базы — legalbet и т. п.);
 * незаполненное на странице не показывается. `checked` — когда сверяли: суммы и сроки букмекеры меняют.
 *
 * Пример:
 *   facts: {
 *     checked: '2026-10-18',
 *     legalEntity: 'ООО «…»', licenseNo: '№ 7', licenseDate: '2009-…',
 *     minDeposit: '100 ₽', apps: 'iOS, Android', verification: 'Через Госуслуги или в салоне связи',
 *     deposit: [{ method: 'Банковская карта', min: '100 ₽', max: '600 000 ₽', fee: 'Без комиссии', time: 'Сразу' }],
 *     withdraw: [{ method: 'СБП', min: '100 ₽', max: '…', fee: 'Без комиссии', time: 'До 1 часа' }],
 *   },
 */
export type BookFacts = {
  /** Дата сверки, «2026-10-18». */
  checked?: string
  /** Юрлицо: «ООО «…»». */
  legalEntity?: string
  /** Номер лицензии ФНС: «№ 7». */
  licenseNo?: string
  /** Дата выдачи лицензии, «2009-07-29». */
  licenseDate?: string
  /** «100 ₽». */
  minDeposit?: string
  /** «iOS, Android». */
  apps?: string
  /** «Через Госуслуги или в салоне связи». */
  verification?: string
  /** Способы пополнения. */
  deposit?: PayRow[]
  /** Способы вывода. */
  withdraw?: PayRow[]
}

/** Строка таблицы пополнения или вывода; пустая ячейка — «—». */
export type PayRow = { method: string; min?: string; max?: string; fee?: string; time?: string }

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
  // остальные легальные букмекеры (логотипы прислал владелец: «тут лого всех легальных бк») — партнёрских ссылок пока нет,
  // «На сайт» ведёт на официальный сайт; адреса сайтов сверить перед релизом
  {
    slug: 'leon',
    name: 'Leon',
    short: 'L',
    color: '#212428',
    textColor: '#ffffff',
    site: 'https://leon.ru',
    apiNames: /\bleon\b|леон/i,
    apiIds: [],
    bonus: 'Бонус для новых клиентов',
    bonusNote: 'Актуальные условия — на сайте букмекера',
    license: 'Лицензия ФНС России, член ЕЦУПИС',
  },
  {
    slug: 'olimpbet',
    name: 'Olimpbet',
    short: 'O',
    color: '#ff2020',
    textColor: '#ffffff',
    site: 'https://www.olimp.bet',
    apiNames: /olimp|олимп/i,
    apiIds: [],
    bonus: 'Бонус для новых клиентов',
    bonusNote: 'Актуальные условия — на сайте букмекера',
    license: 'Лицензия ФНС России, член ЕЦУПИС',
  },
  {
    slug: 'betcity',
    name: 'Бетсити',
    short: 'БС',
    color: '#0092f3',
    textColor: '#ffffff',
    site: 'https://betcity.ru',
    apiNames: /bet ?city|бетсити/i,
    apiIds: [],
    bonus: 'Бонус для новых клиентов',
    bonusNote: 'Актуальные условия — на сайте букмекера',
    license: 'Лицензия ФНС России, член ЕЦУПИС',
  },
  {
    slug: 'melbet',
    name: 'Мелбет',
    short: 'МБ',
    color: '#000000',
    textColor: '#ffffff',
    site: 'https://melbet.ru',
    apiNames: /melbet|мелбет/i,
    apiIds: [],
    bonus: 'Бонус для новых клиентов',
    bonusNote: 'Актуальные условия — на сайте букмекера',
    license: 'Лицензия ФНС России, член ЕЦУПИС',
  },
  {
    slug: 'baltbet',
    name: 'Балтбет',
    short: 'ББ',
    color: '#43b02a',
    textColor: '#ffffff',
    site: 'https://baltbet.ru',
    apiNames: /baltbet|балтбет/i,
    apiIds: [],
    bonus: 'Бонус для новых клиентов',
    bonusNote: 'Актуальные условия — на сайте букмекера',
    license: 'Лицензия ФНС России, член ЕЦУПИС',
  },
  {
    slug: 'bet-m',
    name: 'Бет-М',
    short: 'БМ',
    color: '#f4f4f5',
    textColor: '#111111',
    site: 'https://betm.ru',
    apiNames: /^bet-?m$|бет-м/i,
    apiIds: [],
    bonus: 'Бонус для новых клиентов',
    bonusNote: 'Актуальные условия — на сайте букмекера',
    license: 'Лицензия ФНС России, член ЕЦУПИС',
  },
  {
    slug: 'tennisi',
    name: 'Тенниси',
    short: 'Т',
    color: '#1d1d1b',
    textColor: '#ffffff',
    site: 'https://tennisi.bet',
    apiNames: /tennisi|тенниси/i,
    apiIds: [],
    bonus: 'Бонус для новых клиентов',
    bonusNote: 'Актуальные условия — на сайте букмекера',
    license: 'Лицензия ФНС России, член ЕЦУПИС',
  },
  {
    slug: 'bettery',
    name: 'Bettery',
    short: 'B',
    color: '#191b32',
    textColor: '#ffffff',
    site: 'https://bettery.ru',
    apiNames: /bettery|беттери/i,
    apiIds: [],
    bonus: 'Бонус для новых клиентов',
    bonusNote: 'Актуальные условия — на сайте букмекера',
    license: 'Лицензия ФНС России, член ЕЦУПИС',
  },
  {
    slug: '24bet',
    name: '24bet',
    short: '24',
    color: '#ff4644',
    textColor: '#ffffff',
    site: 'https://24bet.ru',
    apiNames: /\b24 ?bet\b/i,
    apiIds: [],
    bonus: 'Бонус для новых клиентов',
    bonusNote: 'Актуальные условия — на сайте букмекера',
    license: 'Лицензия ФНС России, член ЕЦУПИС',
  },
  {
    slug: 'zenit',
    name: 'Zenit',
    short: 'Z',
    color: '#172860',
    textColor: '#ffffff',
    site: 'https://zenit.win',
    apiNames: /zenit|зенит/i,
    apiIds: [],
    bonus: 'Бонус для новых клиентов',
    bonusNote: 'Актуальные условия — на сайте букмекера',
    license: 'Лицензия ФНС России, член ЕЦУПИС',
  },
  {
    slug: 'sportbet',
    name: 'СпортБет',
    short: 'СБ',
    color: '#12192d',
    textColor: '#ffffff',
    site: 'https://sportbet.ru',
    apiNames: /sport ?bet|спортбет/i,
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

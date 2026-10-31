/**
 * Теги ставок — главная фишка tag.bet.
 *
 * Каждый матч автоматически получает теги (#value, #ТБ2.5, #прогруз…) с
 * объяснением «почему». Теги — это одновременно:
 *  - навигация для игрока («покажи все матчи, где ждут много голов»);
 *  - SEO-страницы /tag/<slug> («прогнозы на тотал больше 2.5 сегодня»);
 *  - повод для клика на букмекера (у каждого тега есть рекомендуемый рынок).
 */
import { pct, pluralN } from './format'
import type { Candidate, Consensus, ModelOutput, Pick } from './model'
import { isValue } from './model'
import type { H2H, TeamForm } from './stats'
import { perMatch, type TeamSetPieces } from './team-xg'
import type { Injury, Match, Standings } from './types'
import { outcomeText, split100 } from './verdict'

export type TagDef = {
  slug: string
  label: string
  title: string
  /** Для чипсов и подсказок. */
  hint: string
  /** SEO-вводный текст на странице тега. */
  about: string
  /** Какую ставку обычно смотрят под этот тег; пусто — у подборки нет одной ставки (серии, встречи, топ-матч). */
  bet: string
  /** Вид «пилюли»: accent — деньги (value), hot — движение линии, neutral — остальное. */
  kind: 'accent' | 'hot' | 'neutral'
  /** Только по полным данным матча (нужна страница матча/прогрев). */
  deep: boolean
}

// названия — как в правой панели и сторис («Много голов», «Кэф упал»; владелец: «страница подборки как?» — было «Тотал
// больше 2.5 (3 гола и больше)», «Прогрузы — коэффициент резко упал»), описания — без «прогрузов», «1X», «форы андердога», «xG»
export const TAGS: TagDef[] = [
  {
    slug: 'value',
    label: '#выгодно',
    // без «(value)», «EV», «пуассоновской модели» и «выгоднее на дистанции» — жаргон и обещание заработка (ст. 27 закона
    // «О рекламе»); владелец: «а страница выгодно как?»
    title: 'Выгодные ставки',
    hint: 'Коэффициенты выше расчётной справедливой цены по модели tag.bet',
    // пример расчёта — в ⓘ у заголовка страницы (`VALUE_HINT` в app/tag/[slug]/page.tsx)
    about:
      'Находим коэффициенты, которые превышают расчётную оценку tag.bet. Сравнивайте вероятности, предложения букмекеров и потенциальное преимущество.',
    bet: 'исход, где кэф выше честной цены',
    kind: 'accent',
    deep: true,
  },
  {
    slug: 'progruz',
    label: '#кэф упал',
    title: 'Кэф упал',
    hint: 'Коэффициент заметно снизился с открытия линии',
    about:
      'Средний коэффициент букмекеров на победу одной из команд снизился с открытия линии на 8% и больше. Мы фиксируем само движение линии: его причину по коэффициентам не установить, а на исход матча оно не указывает.',
    bet: 'исход, на который упал кэф',
    kind: 'hot',
    deep: false,
  },
  {
    slug: 'tb-2-5',
    label: '#много голов',
    title: 'Много голов',
    hint: 'Высокая вероятность трёх и более голов',
    about:
      'Оценка tag.bet даёт трём голам и больше от 57%. Оценка — по коэффициентам букмекеров на тотал без маржи. Если линии нет — смотрим, в скольких из последних 10 матчей каждой команды было 3 гола и больше: нужно от 70% в среднем.',
    bet: '3 гола и больше',
    kind: 'neutral',
    deep: false,
  },
  {
    slug: 'tm-2-5',
    label: '#мало голов',
    title: 'Мало голов',
    hint: 'Ждём не больше 2 голов',
    about:
      'Оценка tag.bet даёт исходу «не больше 2 голов» от 57%. Оценка — по коэффициентам букмекеров на тотал без маржи. Если линии нет — в последних 10 матчах команд должно быть не меньше 70% встреч с двумя голами и меньше.',
    bet: 'не больше 2 голов',
    kind: 'neutral',
    deep: false,
  },
  {
    slug: 'obe-zabyut',
    label: '#обе забьют',
    title: 'Обе забьют',
    hint: 'Скорее забьют обе команды',
    about:
      'Оценка tag.bet даёт исходу «обе забьют» от 57% — по коэффициентам букмекеров без маржи. Без линии берём статистику: в последних 10 матчах каждой команды обе забивали минимум в 60% игр, а сама команда оставалась без гола не чаще чем в 20%.',
    bet: 'обе забьют',
    kind: 'neutral',
    deep: false,
  },
  {
    slug: 'uglovye',
    label: '#много угловых',
    title: 'Много угловых',
    hint: 'В последних матчах этих команд много угловых',
    about:
      'Статистика прошлых игр, а не прогноз: в последних матчах обеих команд (до 5 у каждой, минимум 3 с данными) в среднем было 10,5 угловых за матч и больше — считаем и угловые команды, и угловые её соперников. Шанс на угловые в этом матче мы не оцениваем.',
    bet: '',
    kind: 'neutral',
    deep: true,
  },
  {
    slug: 'kartochki',
    label: '#много карточек',
    title: 'Много карточек',
    hint: 'В последних матчах этих команд много жёлтых карточек',
    about:
      'Статистика прошлых игр, а не прогноз: в последних матчах обеих команд (до 5 у каждой, минимум 3 с данными) в среднем было 4,5 жёлтой карточки за матч и больше — у самой команды и у её соперников. Судью и шанс на карточки в этом матче мы не учитываем.',
    bet: '',
    kind: 'neutral',
    deep: true,
  },
  {
    slug: 'favorit',
    label: '#явный фаворит',
    title: 'Явный фаворит',
    hint: 'У одной команды значительно выше шансы на победу',
    about:
      'Шанс одной из команд на победу по оценке tag.bet — 60% и выше. Оценка — по коэффициентам нескольких букмекеров без маржи. Это вероятность, а не гарантия: даже при 70% фаворит в среднем не выигрывает три матча из десяти.',
    bet: 'победа фаворита',
    kind: 'neutral',
    deep: false,
  },
  {
    slug: 'ravnye',
    label: '#50 на 50',
    title: '50 на 50',
    hint: 'Шансы команд на победу близки',
    about:
      'Шансы команд на победу по оценке tag.bet различаются не больше чем на 6 процентных пунктов — например, 38% и 34%. Ничья в таких матчах — тоже реальный исход, а уверенного фаворита нет.',
    bet: 'ничья',
    kind: 'neutral',
    deep: false,
  },
  {
    slug: 'andedog',
    label: '#аутсайдер в форме',
    title: 'Аутсайдер в форме',
    hint: 'Не фаворит, но показывает хорошие результаты',
    about:
      'Команда — не фаворит: её шанс на победу по оценке tag.bet не выше 36%. При этом за последние 5 матчей она набрала не меньше 7 очков и минимум на 3 очка больше соперника. Хорошая форма — факт из прошлых игр; по оценке шансы команды всё равно ниже, чем у соперника.',
    bet: 'победа аутсайдера',
    kind: 'neutral',
    deep: true,
  },
  {
    slug: 'seriya',
    label: '#серии побед и неудач',
    title: 'Серии побед и неудач',
    hint: 'Команды с сериями побед или поражений',
    about:
      'У одной из команд идёт серия в последних матчах: 4 победы или 4 поражения подряд и больше, 8 матчей без поражений или 6 без побед. Серия — факт из прошлых результатов, а не прогноз на этот матч.',
    bet: '',
    kind: 'neutral',
    deep: true,
  },
  {
    slug: 'krepost',
    label: '#дома не проигрывают',
    title: 'Дома не проигрывают',
    hint: 'Хозяева с серией домашних матчей без поражений',
    about:
      'Хозяева не проигрывают на своём поле 5 матчей подряд и дольше, а среди последних домашних игр (до 8) выиграли минимум 3. Учитываем только матчи, где команда была хозяином.',
    bet: 'хозяева не проиграют',
    kind: 'neutral',
    deep: true,
  },
  {
    slug: 'kadry',
    label: '#много травм',
    title: 'Много травм',
    hint: 'Не сыграют три игрока и больше',
    about:
      'Одна из команд не досчитается трёх игроков и больше: травмы, дисквалификации и другие причины — по списку отсутствующих перед матчем. Насколько важны эти игроки, список не говорит — смотрите кадровые потери на странице матча.',
    bet: 'победа соперника ослабленной команды',
    kind: 'neutral',
    deep: true,
  },
  {
    slug: 'h2h',
    label: '#личные встречи',
    title: 'Личные встречи',
    hint: 'В последних встречах команд повторяется одно и то же',
    about:
      'Берём до 8 последних личных встреч команд, нужно не меньше 4. Матч попадает в подборку, если в 75% встреч и больше было 3 гола и больше или побеждала одна и та же команда.',
    bet: '',
    kind: 'neutral',
    deep: true,
  },
  {
    slug: 'top-match',
    label: '#топ-матч',
    title: 'Топ-матч',
    hint: 'Встреча команд из первой четвёрки таблицы',
    about:
      'Обе команды сейчас в первой четвёрке турнирной таблицы — в турнирах, где в таблице от 8 команд. От результата зависит расклад в верхней части таблицы.',
    bet: '',
    kind: 'neutral',
    deep: true,
  },
]

export const TAG_BY_SLUG = new Map(TAGS.map((t) => [t.slug, t]))

/**
 * p — вероятность, на которой держится тег (тоталы, «обе забьют», фаворит): чтобы не доставать цифру из текста.
 * short — тот же повод одним фактом, без повтора названия тега («Победа «Хетафе»: 7.42 → 6.37 (−14%)»): для строки
 * рядом с меткой на странице матча (владелец: «а теги матча как?»). `reason` не трогаем — из него берут цифры
 * `lib/verdict.ts`, `lib/preview.ts` и `statFor`, и его показывают сторис и подсказки. В старом кэше short нет —
 * показываем reason.
 */
export type TagHit = { slug: string; score: number; reason: string; p?: number; short?: string }

export type TagInput = {
  match: Match
  cons?: Consensus | null
  model?: ModelOutput | null
  candidates?: Candidate[]
  pick?: Pick | null
  homeForm?: TeamForm | null
  awayForm?: TeamForm | null
  h2h?: H2H | null
  injuries?: Injury[]
  standings?: Standings | null
  /** угловые и жёлтые прошлых матчей обеих команд — «Много угловых», «Много карточек» */
  setPieces?: { home: TeamSetPieces | null; away: TeamSetPieces | null } | null
}

/** Пороги «Много угловых» / «Много карточек» — в среднем за матч в последних играх обеих команд. */
export const CORNERS_MIN = 10.5
export const CARDS_MIN = 4.5

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
const MATCHES = ['матч', 'матча', 'матчей'] as const
const WINS = ['победа', 'победы', 'побед'] as const
const LOSSES = ['поражение', 'поражения', 'поражений'] as const
const q = (name: string) => `«${name}»`
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

export function computeTags(input: TagInput): TagHit[] {
  const { match, cons, model } = input
  const hits: TagHit[] = []
  const add = (slug: string, score: number, reason: string, short: string, p?: number) =>
    hits.push(p === undefined ? { slug, score: clamp01(score), reason, short } : { slug, score: clamp01(score), reason, short, p })
  const home = match.home.name
  const away = match.away.name

  // вероятности исходов: модель (если посчитана) или чистый консенсус
  const x12 = model?.x12 ?? cons?.x12 ?? null
  const over25 = model?.over['2.5'] ?? cons?.over['2.5'] ?? null
  const btts = model?.btts ?? cons?.btts ?? null

  // #value
  const values = (input.candidates ?? []).filter(isValue).sort((a, b) => (b.ev ?? 0) - (a.ev ?? 0))
  if (values.length) {
    const c = values[0]
    const o = c.bestPartner ?? c.best!
    const bk = o.partner?.name ?? o.bookmakerName
    add(
      'value',
      (c.ev ?? 0) / 0.12,
      `${cap(outcomeText(c.key, match))} за ${o.value.toFixed(2)} (${bk}) при честной цене ${c.fairOdd.toFixed(2)}: выгода +${((c.ev ?? 0) * 100).toFixed(1)}%`,
      `${cap(outcomeText(c.key, match))}: ${o.value.toFixed(2)} в ${bk}, честная цена ${c.fairOdd.toFixed(2)}`,
    )
  }

  // #прогруз — средний коэффициент на исход упал от открытия
  if (cons?.movement) {
    let best: { side: 'home' | 'away'; drop: number; from: number; to: number } | null = null
    for (const side of ['home', 'away'] as const) {
      const mv = cons.movement[side]
      if (!mv || mv.opening <= 1 || mv.current <= 1) continue
      const drop = 1 - mv.current / mv.opening
      if (drop >= 0.08 && (!best || drop > best.drop)) best = { side, drop, from: mv.opening, to: mv.current }
    }
    if (best) {
      add(
        'progruz',
        best.drop / 0.2,
        `Коэффициент на победу ${q(best.side === 'home' ? home : away)} упал с ${best.from.toFixed(2)} до ${best.to.toFixed(2)} (−${Math.round(best.drop * 100)}%)`,
        `Победа ${q(best.side === 'home' ? home : away)}: ${best.from.toFixed(2)} → ${best.to.toFixed(2)} (−${Math.round(best.drop * 100)}%)`,
      )
    }
  }

  // тоталы
  if (over25 != null) {
    if (over25 >= 0.57) add('tb-2-5', (over25 - 0.55) / 0.2, `Скорее будет 3 гола и больше: шанс ${pct(over25)}`, `3 гола и больше\u00a0— шанс ${pct(over25)}`, over25)
    else if (1 - over25 >= 0.57)
      add('tm-2-5', (0.45 - over25) / 0.2, `Скорее будет не больше 2 голов: шанс ${pct(1 - over25)}`, `Не больше 2 голов\u00a0— шанс ${pct(1 - over25)}`, 1 - over25)
  } else if (input.homeForm && input.awayForm) {
    const f = (input.homeForm.over25Rate + input.awayForm.over25Rate) / 2
    if (f >= 0.7) add('tb-2-5', (f - 0.6) / 0.3, `3 гола и больше было в ${pct(f)} последних матчей команд`, `3 гола и больше\u00a0— в\u00a0${pct(f)} последних матчей команд`, f)
    if (f <= 0.3)
      add('tm-2-5', (0.4 - f) / 0.3, `Не больше 2 голов было в ${pct(1 - f)} последних матчей команд`, `Не больше 2 голов\u00a0— в\u00a0${pct(1 - f)} последних матчей команд`, 1 - f)
  }

  // обе забьют
  if (btts != null && btts >= 0.57) {
    add('obe-zabyut', (btts - 0.55) / 0.2, `Скорее забьют обе команды: шанс ${pct(btts)}`, `Шанс ${pct(btts)}`, btts)
  } else if (btts == null && input.homeForm && input.awayForm) {
    const hf = input.homeForm
    const af = input.awayForm
    if (hf.bttsRate >= 0.6 && af.bttsRate >= 0.6 && hf.failedToScoreRate <= 0.2 && af.failedToScoreRate <= 0.2) {
      const rate = (hf.bttsRate + af.bttsRate) / 2
      add('obe-zabyut', rate - 0.4, `Обе забивали в ${pct(rate)} последних матчей команд`, `Забивали обе\u00a0— в\u00a0${pct(rate)} последних матчей команд`, rate)
    }
  }

  // угловые и карточки — средние прошлых игр обеих команд, без модели (владелец: «пока просто визуально сделай»)
  const sp = input.setPieces
  const dec1 = (v: number) => v.toFixed(1).replace('.', ',')
  const corners = perMatch(sp?.home, sp?.away, 'corners')
  if (corners != null && corners >= CORNERS_MIN)
    add('uglovye', (corners - 9.5) / 3, `В последних матчах команд в среднем ${dec1(corners)} угловых за матч`, `В среднем ${dec1(corners)} угловых за матч в последних играх команд`)
  const cards = perMatch(sp?.home, sp?.away, 'cards')
  if (cards != null && cards >= CARDS_MIN)
    add('kartochki', (cards - 4) / 3, `В последних матчах команд в среднем ${dec1(cards)} жёлтых за матч`, `В среднем ${dec1(cards)} жёлтых за матч в последних играх команд`)

  // фаворит / равные
  if (x12) {
    const fav = x12.home >= x12.away ? { name: home, p: x12.home } : { name: away, p: x12.away }
    if (fav.p >= 0.6) add('favorit', (fav.p - 0.55) / 0.3, `Шансы ${q(fav.name)} на победу — ${pct(fav.p)}`, `${q(fav.name)}: шанс на победу ${pct(fav.p)}`, fav.p)
    const diff = Math.abs(x12.home - x12.away)
    if (diff <= 0.06) {
      const s = split100(x12)
      add(
        'ravnye',
        1 - diff / 0.06,
        `Силы почти равны: шансы ${q(home)} — ${s.home}%, ${q(away)} — ${s.away}%, ничьей — ${s.draw}%`,
        // словами, что значат числа (владелец: «факт из 50 на 50 не совсем понятен» — было «Райо» 35% · ничья 25% · «Реал» 40%)
        `Шансы на победу почти равны: ${q(home)}\u00a0—\u00a0${s.home}%, ${q(away)}\u00a0—\u00a0${s.away}%`,
      )
    }
  }

  const hf = input.homeForm
  const af = input.awayForm

  // андердог в форме
  if (x12 && hf && af && hf.last5.length >= 4 && af.last5.length >= 4) {
    const dogHome = x12.home < x12.away
    const dogP = dogHome ? x12.home : x12.away
    const dog = dogHome ? hf : af
    const fav = dogHome ? af : hf
    if (dogP <= 0.36 && dog.points5 >= 7 && dog.points5 >= fav.points5 + 3) {
      add(
        'andedog',
        (dog.points5 - fav.points5) / 9,
        `Команда ${q(dogHome ? home : away)} — не фаворит (шанс ${pct(dogP)}), но за 5 матчей набрала ${pluralN(dog.points5, ['очко', 'очка', 'очков'])} против ${fav.points5} у соперника`,
        `${q(dogHome ? home : away)}: ${pluralN(dog.points5, ['очко', 'очка', 'очков'])} за 5 матчей, у\u00a0соперника\u00a0—\u00a0${fav.points5}`,
      )
    }
  }

  // серии
  for (const [f, name] of [
    [hf, home],
    [af, away],
  ] as const) {
    if (!f?.streak) continue
    const { kind, len } = f.streak
    const games = pluralN(len, MATCHES)
    if (kind === 'W' && len >= 4) add('seriya', len / 8, `Команда ${q(name)} выиграла ${games} подряд`, `${q(name)}: ${pluralN(len, WINS)} подряд`)
    if (kind === 'L' && len >= 4) add('seriya', len / 8, `Команда ${q(name)} проиграла ${games} подряд`, `${q(name)}: ${pluralN(len, LOSSES)} подряд`)
    if (kind === 'unbeaten' && len >= 8) add('seriya', len / 14, `Команда ${q(name)} не проигрывает ${games} подряд`, `${q(name)}: ${games} без поражений`)
    if (kind === 'winless' && len >= 6) add('seriya', len / 12, `Команда ${q(name)} не побеждает ${games} подряд`, `${q(name)}: ${games} без побед`)
  }

  // крепость
  if (hf && hf.home.played >= 4 && hf.home.unbeatenRun >= 5 && hf.home.wins >= 3) {
    add(
      'krepost',
      hf.home.unbeatenRun / 8,
      `${q(home)} не проигрывает дома ${pluralN(hf.home.unbeatenRun, MATCHES)} подряд`,
      `${q(home)}: ${pluralN(hf.home.unbeatenRun, MATCHES)} дома без поражений`,
    )
  }

  // кадровые потери
  if (input.injuries?.length) {
    for (const [team, name] of [
      [match.home, home],
      [match.away, away],
    ] as const) {
      const n = input.injuries.filter((i) => i.teamId === team.id).length
      if (n >= 3) add('kadry', n / 6, `Команда ${q(name)} не досчитается ${n} игроков`, `${q(name)}: без ${n} игроков`)
    }
  }

  // личные встречи
  const h = input.h2h
  if (h && h.games.length >= 4) {
    const n = h.games.length
    const over = Math.round(h.over25Rate * n)
    if (h.over25Rate >= 0.75)
      add('h2h', h.over25Rate - 0.25, `В ${over} из ${n} последних личных встреч было 3 гола и больше`, `3 гола и больше\u00a0— в\u00a0${over} из ${n} последних встреч`)
    else if (h.homeWins / n >= 0.75)
      add('h2h', h.homeWins / n - 0.25, `Команда ${q(home)} выиграла ${h.homeWins} из ${n} последних личных встреч`, `${q(home)}: ${pluralN(h.homeWins, WINS)} в\u00a0${n} последних встречах`)
    else if (h.awayWins / n >= 0.75)
      add('h2h', h.awayWins / n - 0.25, `Команда ${q(away)} выиграла ${h.awayWins} из ${n} последних личных встреч`, `${q(away)}: ${pluralN(h.awayWins, WINS)} в\u00a0${n} последних встречах`)
  }

  // топ-матч
  const table = input.standings?.groups.find((g) => g.rows.some((r) => r.teamId === match.home.id))
  if (table && table.rows.length >= 8) {
    const rh = table.rows.find((r) => r.teamId === match.home.id)?.rank
    const ra = table.rows.find((r) => r.teamId === match.away.id)?.rank
    if (rh && ra && rh <= 4 && ra <= 4)
      add('top-match', 1 - (rh + ra) / 10, `Встреча команд с ${Math.min(rh, ra)}-го и ${Math.max(rh, ra)}-го места`, `${Math.min(rh, ra)}-е и ${Math.max(rh, ra)}-е место в таблице`)
  }

  // один тег одного типа — оставляем самый сильный
  const bySlug = new Map<string, TagHit>()
  for (const t of hits) {
    const cur = bySlug.get(t.slug)
    if (!cur || t.score > cur.score) bySlug.set(t.slug, t)
  }
  return [...bySlug.values()].sort(
    (a, b) => TAGS.findIndex((t) => t.slug === a.slug) - TAGS.findIndex((t) => t.slug === b.slug),
  )
}

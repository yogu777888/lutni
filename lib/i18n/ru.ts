/**
 * Русские названия стран, турниров и команд.
 *
 * SStats отдаёт названия на английском, а русскоязычные пользователи ищут
 * «прогноз Арсенал Челси» — поэтому для заголовков, title и текстов используем
 * русские названия. Если команды нет в словаре, показываем оригинал.
 * Словарь легко расширять: ключ — английское название как в API.
 */

const key = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

function dict(src: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const line of src.split('\n')) {
    const i = line.indexOf('=')
    if (i < 0) continue
    const en = line.slice(0, i).trim()
    const ru = line.slice(i + 1).trim()
    if (!en || !ru) continue
    for (const variant of en.split('|')) map.set(key(variant), ru)
  }
  return map
}

const COUNTRIES = dict(`
World|International=Мир
Europe=Европа
England=Англия
Spain=Испания
Italy=Италия
Germany=Германия
France=Франция
Russia=Россия
Netherlands|Holland=Нидерланды
Portugal=Португалия
Turkey|Turkiye=Турция
Belgium=Бельгия
Scotland=Шотландия
Wales=Уэльс
USA|United States=США
Brazil=Бразилия
Argentina=Аргентина
Saudi-Arabia|Saudi Arabia=Саудовская Аравия
Ukraine=Украина
Greece=Греция
Austria=Австрия
Switzerland=Швейцария
Denmark=Дания
Sweden=Швеция
Norway=Норвегия
Finland=Финляндия
Poland=Польша
Czech-Republic|Czech Republic|Czechia=Чехия
Slovakia=Словакия
Croatia=Хорватия
Serbia=Сербия
Romania=Румыния
Bulgaria=Болгария
Hungary=Венгрия
Israel=Израиль
Cyprus=Кипр
Kazakhstan=Казахстан
Belarus=Беларусь
Uzbekistan=Узбекистан
Azerbaijan=Азербайджан
Armenia=Армения
Georgia=Грузия
Mexico=Мексика
Japan=Япония
South-Korea|South Korea|Korea Republic=Южная Корея
China=Китай
Australia=Австралия
Egypt=Египет
Morocco=Марокко
Qatar=Катар
UAE|United Arab Emirates=ОАЭ
Iran=Иран
Colombia=Колумбия
Chile=Чили
Uruguay=Уругвай
Ireland=Ирландия
Northern-Ireland|Northern Ireland=Северная Ирландия
Iceland=Исландия
Slovenia=Словения
Estonia=Эстония
Latvia=Латвия
Lithuania=Литва
Moldova=Молдова
`)

const LEAGUES = dict(`
UEFA Champions League|Champions League=Лига чемпионов УЕФА
UEFA Europa League|Europa League=Лига Европы УЕФА
UEFA Europa Conference League|UEFA Conference League|Conference League=Лига конференций УЕФА
UEFA Nations League=Лига наций УЕФА
UEFA Super Cup=Суперкубок УЕФА
World Cup|FIFA World Cup=Чемпионат мира
World Cup - Qualification Europe=Отбор ЧМ, Европа
Euro Championship|European Championship|UEFA Euro=Чемпионат Европы
Euro Championship - Qualification=Отбор Евро
FIFA Club World Cup|Club World Cup=Клубный чемпионат мира
Friendlies=Товарищеские матчи
Friendlies Clubs|Club Friendlies=Клубные товарищеские матчи
Premier League=Премьер-лига
Championship=Чемпионшип
League One=Первая лига
League Two=Вторая лига
FA Cup=Кубок Англии
League Cup|EFL Cup|Carabao Cup=Кубок лиги
Community Shield=Суперкубок Англии
La Liga|LaLiga|Primera Division=Ла Лига
Segunda Division|La Liga 2=Сегунда
Copa del Rey=Кубок Испании
Super Cup|Supercopa|Supercoppa|Supercup=Суперкубок
Serie A=Серия A
Serie B=Серия B
Coppa Italia=Кубок Италии
Bundesliga=Бундеслига
2. Bundesliga=2. Бундеслига
3. Liga=3. Лига
DFB Pokal=Кубок Германии
Ligue 1=Лига 1
Ligue 2=Лига 2
Coupe de France=Кубок Франции
Eredivisie=Эредивизи
Eerste Divisie=Эрстедивизи
KNVB Beker=Кубок Нидерландов
Primeira Liga|Liga Portugal=Примейра
Taca de Portugal=Кубок Португалии
Super Lig|Süper Lig=Суперлига
Jupiler Pro League|Pro League=Про Лига
Premiership=Премьершип
Major League Soccer|MLS=MLS
Liga MX=Лига MX
Saudi Pro League|Pro League Saudi=Про-лига
Super League=Суперлига
Superliga=Суперлига
Allsvenskan=Аллсвенскан
Eliteserien=Элитсерия
Veikkausliiga=Вейккауслига
Ekstraklasa=Экстракласа
Czech Liga|1. Liga=Первая лига
First League|FNL|1st Division=Первая лига
Russia Cup|Russian Cup=Кубок России
Cup=Кубок
Premier Liga=Премьер-лига
Vysshaya Liga|Highest League=Высшая лига
J1 League=J1 Лига
K League 1=K Лига 1
Chinese Super League=Суперлига
Liga Profesional Argentina|Primera Division Argentina=Профессиональная лига
Serie A Brazil|Brasileirao=Серия A
Copa Libertadores|CONMEBOL Libertadores=Кубок Либертадорес
Copa Sudamericana|CONMEBOL Sudamericana=Южноамериканский кубок
AFC Champions League=Лига чемпионов АФК
`)

const TEAMS = dict(`
Arsenal=Арсенал
Aston Villa=Астон Вилла
Bournemouth|AFC Bournemouth=Борнмут
Brentford=Брентфорд
Brighton|Brighton & Hove Albion|Brighton and Hove Albion=Брайтон
Burnley=Бёрнли
Chelsea=Челси
Crystal Palace=Кристал Пэлас
Everton=Эвертон
Fulham=Фулхэм
Ipswich|Ipswich Town=Ипсвич
Leeds|Leeds United=Лидс
Leicester|Leicester City=Лестер
Liverpool=Ливерпуль
Luton|Luton Town=Лутон
Manchester City|Man City=Манчестер Сити
Manchester United|Man United|Manchester Utd=Манчестер Юнайтед
Newcastle|Newcastle United=Ньюкасл
Nottingham Forest|Nottm Forest=Ноттингем Форест
Sheffield Utd|Sheffield United=Шеффилд Юнайтед
Sheffield Wednesday=Шеффилд Уэнсдей
Southampton=Саутгемптон
Sunderland=Сандерленд
Tottenham|Tottenham Hotspur=Тоттенхэм
West Ham|West Ham United=Вест Хэм
Wolves|Wolverhampton|Wolverhampton Wanderers=Вулверхэмптон
Watford=Уотфорд
Norwich|Norwich City=Норвич
West Brom|West Bromwich Albion=Вест Бромвич
Middlesbrough=Мидлсбро
Stoke City=Сток Сити
Coventry|Coventry City=Ковентри
Hull City=Халл Сити
Swansea|Swansea City=Суонси
Cardiff|Cardiff City=Кардифф
QPR|Queens Park Rangers=КПР
Millwall=Миллуолл
Blackburn|Blackburn Rovers=Блэкберн
Derby|Derby County=Дерби Каунти
Barcelona|FC Barcelona=Барселона
Real Madrid=Реал Мадрид
Atletico Madrid|Atlético Madrid|Atletico de Madrid=Атлетико Мадрид
Sevilla=Севилья
Valencia=Валенсия
Villarreal=Вильярреал
Real Sociedad=Реал Сосьедад
Athletic Club|Athletic Bilbao=Атлетик Бильбао
Real Betis|Betis=Бетис
Celta Vigo|Celta=Сельта
Getafe=Хетафе
Osasuna=Осасуна
Girona=Жирона
Mallorca=Мальорка
Rayo Vallecano=Райо Вальекано
Alaves|Deportivo Alaves=Алавес
Las Palmas=Лас-Пальмас
Espanyol=Эспаньол
Leganes=Леганес
Valladolid|Real Valladolid=Вальядолид
Levante=Леванте
Elche=Эльче
Oviedo|Real Oviedo=Овьедо
Cadiz=Кадис
Granada|Granada CF=Гранада
Almeria=Альмерия
Inter|Inter Milan|Internazionale=Интер
AC Milan|Milan=Милан
Juventus=Ювентус
Napoli=Наполи
AS Roma|Roma=Рома
Lazio=Лацио
Atalanta=Аталанта
Fiorentina=Фиорентина
Bologna=Болонья
Torino=Торино
Genoa=Дженоа
Udinese=Удинезе
Lecce=Лечче
Cagliari=Кальяри
Verona|Hellas Verona=Верона
Empoli=Эмполи
Monza=Монца
Parma=Парма
Como=Комо
Venezia=Венеция
Sassuolo=Сассуоло
Pisa=Пиза
Cremonese=Кремонезе
Salernitana=Салернитана
Frosinone=Фрозиноне
Sampdoria=Сампдория
Bayern Munich|Bayern München|Bayern Munchen|FC Bayern=Бавария
Borussia Dortmund|Dortmund=Боруссия Дортмунд
Bayer Leverkusen|Leverkusen=Байер
RB Leipzig|Leipzig=РБ Лейпциг
Eintracht Frankfurt=Айнтрахт Франкфурт
VfB Stuttgart|Stuttgart=Штутгарт
Borussia Monchengladbach|Borussia Mönchengladbach|Gladbach=Боруссия Мёнхенгладбах
VfL Wolfsburg|Wolfsburg=Вольфсбург
SC Freiburg|Freiburg=Фрайбург
1899 Hoffenheim|Hoffenheim|TSG Hoffenheim=Хоффенхайм
Werder Bremen=Вердер
FC Augsburg|Augsburg=Аугсбург
Union Berlin|1. FC Union Berlin=Унион Берлин
1. FC Heidenheim|Heidenheim=Хайденхайм
FSV Mainz 05|Mainz 05|Mainz=Майнц
VfL Bochum|Bochum=Бохум
FC St. Pauli|St. Pauli=Санкт-Паули
Holstein Kiel=Хольштайн
Hamburger SV|Hamburg=Гамбург
1. FC Köln|FC Koln|Köln|Koln=Кёльн
Paris Saint Germain|Paris Saint-Germain|PSG=ПСЖ
Marseille|Olympique Marseille=Марсель
Lyon|Olympique Lyonnais=Лион
Monaco|AS Monaco=Монако
Lille=Лилль
Nice|OGC Nice=Ницца
Lens|RC Lens=Ланс
Rennes|Stade Rennais=Ренн
Stade Brestois 29|Brest=Брест
Strasbourg=Страсбур
Nantes=Нант
Toulouse=Тулуза
Reims|Stade de Reims=Реймс
Montpellier=Монпелье
Auxerre=Осер
Angers=Анже
Le Havre=Гавр
Saint Etienne|Saint-Etienne=Сент-Этьен
Lorient=Лорьян
Metz=Мец
Paris FC=Пари ФК
Zenit Saint Petersburg|Zenit St. Petersburg|Zenit=Зенит
Spartak Moscow|Spartak Moskva|Spartak=Спартак
CSKA Moscow|CSKA Moskva|CSKA=ЦСКА
Lokomotiv Moscow|Lokomotiv Moskva|Lokomotiv=Локомотив
Dinamo Moscow|Dynamo Moscow|Dinamo Moskva=Динамо Москва
Krasnodar|FC Krasnodar=Краснодар
Rostov|FC Rostov=Ростов
Rubin|Rubin Kazan=Рубин
Akhmat Grozny|Akhmat=Ахмат
Krylya Sovetov|Krylya Sovetov Samara=Крылья Советов
Fakel Voronezh|Fakel=Факел
Orenburg|Gazovik Orenburg=Оренбург
Nizhny Novgorod|Pari NN|FC Nizhny Novgorod=Пари НН
Dynamo Makhachkala|Dinamo Makhachkala=Динамо Махачкала
Akron Togliatti|Akron=Акрон
Khimki=Химки
Baltika|Baltika Kaliningrad=Балтика
Sochi|FC Sochi=Сочи
Ural|Ural Yekaterinburg=Урал
Torpedo Moscow|Torpedo Moskva=Торпедо
Arsenal Tula=Арсенал Тула
Ajax=Аякс
PSV Eindhoven|PSV=ПСВ
Feyenoord=Фейеноорд
AZ Alkmaar|AZ=АЗ Алкмар
FC Twente|Twente=Твенте
FC Utrecht|Utrecht=Утрехт
Benfica|SL Benfica=Бенфика
FC Porto|Porto=Порту
Sporting CP|Sporting Lisbon|Sporting=Спортинг
SC Braga|Braga=Брага
Galatasaray=Галатасарай
Fenerbahce|Fenerbahçe=Фенербахче
Besiktas|Beşiktaş=Бешикташ
Trabzonspor=Трабзонспор
Celtic=Селтик
Rangers=Рейнджерс
Club Brugge KV|Club Brugge|Brugge=Брюгге
Anderlecht=Андерлехт
Shakhtar Donetsk|Shakhtar=Шахтёр Донецк
Dynamo Kyiv|Dynamo Kiev|Dinamo Kiev=Динамо Киев
Red Bull Salzburg|Salzburg=Зальцбург
Sturm Graz=Штурм
Olympiakos Piraeus|Olympiacos|Olympiakos=Олимпиакос
PAOK=ПАОК
Panathinaikos=Панатинаикос
AEK Athens=АЕК
Slavia Praha|Slavia Prague=Славия
Sparta Praha|Sparta Prague=Спарта
FC Copenhagen|Copenhagen|FC Kobenhavn=Копенгаген
Young Boys|BSC Young Boys=Янг Бойз
Basel|FC Basel=Базель
Dinamo Zagreb=Динамо Загреб
Crvena Zvezda|FK Crvena Zvezda|Red Star Belgrade=Црвена Звезда
Partizan=Партизан
Ferencvaros|Ferencváros=Ференцварош
Maccabi Tel Aviv=Маккаби Тель-Авив
Qarabag|Qarabağ=Карабах
Bodo/Glimt|Bodø/Glimt=Будё-Глимт
Malmo FF|Malmö FF=Мальмё
Vitoria Guimaraes|Vitória Guimarães|Guimaraes=Витория Гимарайнш
Famalicao|Famalicão=Фамаликан
Gil Vicente=Жил Висенте
Moreirense=Морейренсе
Estoril=Эшторил
Casa Pia=Каза Пия
Rio Ave=Риу Ави
Arouca=Арока
Santa Clara=Санта-Клара
Boavista=Боавишта
Go Ahead Eagles=Гоу Эхед Иглз
NEC Nijmegen|NEC=НЕК
Heerenveen=Херенвен
Sparta Rotterdam=Спарта Роттердам
Fortuna Sittard=Фортуна Ситтард
PEC Zwolle=ПЕК Зволле
Groningen=Гронинген
Samsunspor=Самсунспор
Goztepe|Göztepe=Гёзтепе
Basaksehir|Istanbul Basaksehir|İstanbul Başakşehir=Башакшехир
Kasimpasa|Kasımpaşa=Касымпаша
Konyaspor=Коньяспор
Antalyaspor=Антальяспор
Kayserispor=Кайсериспор
Alanyaspor=Аланьяспор
Union St. Gilloise|Union Saint-Gilloise|Royale Union SG=Юнион Сен-Жилуаз
Genk|KRC Genk=Генк
Gent|KAA Gent=Гент
Antwerp|Royal Antwerp=Антверпен
Standard Liege|Standard Liège=Стандард Льеж
Mechelen|KV Mechelen=Мехелен
Charleroi=Шарлеруа
Westerlo=Вестерло
Hearts|Heart Of Midlothian=Хартс
Hibernian=Хиберниан
Aberdeen=Абердин
Motherwell=Мотеруэлл
Dundee Utd|Dundee United=Данди Юнайтед
St Mirren|St. Mirren=Сент-Миррен
Kilmarnock=Килмарнок
Falkirk=Фолкерк
Al-Hilal Saudi FC|Al-Hilal|Al Hilal=Аль-Хиляль
Al-Nassr|Al Nassr=Аль-Наср
Al-Ittihad FC|Al-Ittihad|Al Ittihad=Аль-Иттихад
Al-Ahli Saudi FC|Al-Ahli=Аль-Ахли
Inter Miami|Inter Miami CF=Интер Майами
LA Galaxy=Лос-Анджелес Гэлакси
Flamengo=Фламенго
Palmeiras=Палмейрас
Boca Juniors=Бока Хуниорс
River Plate=Ривер Плейт
`)

function lookup(map: Map<string, string>, value: string | undefined | null): string | undefined {
  if (!value) return undefined
  return map.get(key(value))
}

export function ruCountry(name: string | undefined | null): string {
  return lookup(COUNTRIES, name) ?? name ?? ''
}

export function ruTeam(name: string): string {
  return lookup(TEAMS, name) ?? name
}

const INTERNATIONAL = new Set(['world', 'europe', 'international', ''])

/** «Англия. Премьер-лига», «Лига чемпионов УЕФА». */
export function ruLeague(name: string, country?: string | null): string {
  const league = lookup(LEAGUES, name) ?? name
  const c = key(country ?? '')
  if (INTERNATIONAL.has(c)) return league
  return `${ruCountry(country)}. ${league}`
}

export function hasRuTeam(name: string): boolean {
  return TEAMS.has(key(name))
}

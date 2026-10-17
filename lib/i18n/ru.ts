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
Albania=Албания
Algeria=Алжир
Andorra=Андорра
Angola=Ангола
Antigua-And-Barbuda|Antigua and Barbuda=Антигуа и Барбуда
Aruba=Аруба
Azerbaidjan=Азербайджан
Bahrain=Бахрейн
Bangladesh=Бангладеш
Barbados=Барбадос
Belize=Белиз
Benin=Бенин
Bermuda=Бермуды
Bhutan=Бутан
Bolivia=Боливия
Bosnia|Bosnia and Herzegovina|Bosnia & Herzegovina=Босния и Герцеговина
Botswana=Ботсвана
Burkina-Faso|Burkina Faso=Буркина-Фасо
Burundi=Бурунди
Cambodia=Камбоджа
Cameroon=Камерун
Canada=Канада
Chinese-Taipei|Chinese Taipei|Taiwan=Китайский Тайбэй
Congo=Конго
Congo-DR|DR Congo|Congo DR=ДР Конго
Costa-Rica|Costa Rica=Коста-Рика
Cuba=Куба
Curacao=Кюрасао
Dominican-Republic|Dominican Republic=Доминиканская Республика
Ecuador=Эквадор
El-Salvador|El Salvador=Сальвадор
Eswatini=Эсватини
Ethiopia=Эфиопия
Faroe-Islands|Faroe Islands=Фарерские острова
Fiji=Фиджи
Gabon=Габон
Gambia=Гамбия
Ghana=Гана
Gibraltar=Гибралтар
Grenada=Гренада
Guadeloupe=Гваделупа
Guatemala=Гватемала
Guinea=Гвинея
Haiti=Гаити
Honduras=Гондурас
Hong-Kong|Hong Kong=Гонконг
India=Индия
Indonesia=Индонезия
Iraq=Ирак
Ivory-Coast|Ivory Coast|Cote D'Ivoire=Кот-д’Ивуар
Jamaica=Ямайка
Jordan=Иордания
Kenya=Кения
Kosovo=Косово
Kuwait=Кувейт
Kyrgyzstan=Киргизия
Laos=Лаос
Lebanon=Ливан
Lesotho=Лесото
Liberia=Либерия
Libya=Ливия
Liechtenstein=Лихтенштейн
Luxembourg=Люксембург
Macao|Macau=Макао
Macedonia|North Macedonia|FYR Macedonia=Северная Македония
Malawi=Малави
Malaysia=Малайзия
Maldives=Мальдивы
Mali=Мали
Malta=Мальта
Mauritania=Мавритания
Mauritius=Маврикий
Mongolia=Монголия
Montenegro=Черногория
Myanmar=Мьянма
Namibia=Намибия
Nepal=Непал
New-Zealand|New Zealand=Новая Зеландия
Nicaragua=Никарагуа
Nigeria=Нигерия
Oman=Оман
Pakistan=Пакистан
Palestine=Палестина
Panama=Панама
Paraguay=Парагвай
Peru=Перу
Philippines=Филиппины
Rwanda=Руанда
San-Marino|San Marino=Сан-Марино
Senegal=Сенегал
Singapore=Сингапур
Somalia=Сомали
South-Africa|South Africa=ЮАР
Sudan=Судан
Surinam|Suriname=Суринам
Syria=Сирия
Tajikistan=Таджикистан
Tanzania=Танзания
Thailand=Таиланд
Togo=Того
Trinidad-And-Tobago|Trinidad and Tobago=Тринидад и Тобаго
Tunisia=Тунис
Turkmenistan=Туркмения
Uganda=Уганда
Venezuela=Венесуэла
Vietnam=Вьетнам
Yemen=Йемен
Zambia=Замбия
Zimbabwe=Зимбабве
Rep. Of Ireland|Republic of Ireland=Ирландия
China PR=Китай
Hong Kong, China=Гонконг
St. Vincent / Gren.=Сент-Винсент и Гренадины
Kyrgyz Republic=Киргизия
Comoros=Коморы
Niger=Нигер
Cape Verde Islands|Cape Verde=Кабо-Верде
Equatorial Guinea=Экваториальная Гвинея
Mozambique=Мозамбик
Central African Republic=ЦАР
Madagascar=Мадагаскар
North Korea|Korea DPR=КНДР
Guinea-Bissau=Гвинея-Бисау
Sri Lanka=Шри-Ланка
Afghanistan=Афганистан
Eritrea=Эритрея
South Sudan=Южный Судан
Sierra Leone=Сьерра-Леоне
Anguilla=Ангилья
Djibouti=Джибути
St. Vincent / Grenadines|Saint Vincent and the Grenadines=Сент-Винсент и Гренадины
British Virgin Islands=Британские Виргинские острова
St. Kitts and Nevis|Saint Kitts and Nevis=Сент-Китс и Невис
Chad=Чад
Puerto Rico=Пуэрто-Рико
Vanuatu=Вануату
Seychelles=Сейшелы
New Caledonia=Новая Каледония
Dominica=Доминика
Sao Tome and Principe=Сан-Томе и Принсипи
Cayman Islands=Каймановы острова
Papua New Guinea=Папуа — Новая Гвинея
Solomon Islands=Соломоновы острова
Timor-Leste|East Timor=Восточный Тимор
Brunei=Бруней
St. Lucia|Saint Lucia=Сент-Люсия
Guyana=Гайана
Saint Martin=Сен-Мартен
US Virgin Islands=Виргинские острова США
Montserrat=Монтсеррат
Bahamas=Багамы
Bonaire=Бонайре
Turks and Caicos Islands=Тёркс и Кайкос
Tahiti=Таити
French Guyana|French Guiana=Французская Гвиана
Sint Maarten=Синт-Мартен
Martinique=Мартиника
Samoa=Самоа
American Samoa=Американское Самоа
Guam=Гуам
Cook Islands=Острова Кука
Tonga=Тонга
Basque Country=Страна Басков
Catalonia Selection|Catalonia=Каталония
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

/**
 * Турниры, которых нет в словаре целиком, — по частям (в левой панели в субботу таких было больше половины: «Second
 * League - Grou…», «Tercera División RFEF - Group 12»): основа — из словаря ниже или `LEAGUES`, после « - » — группа
 * («группа 3»), номер («Примавера 1») или регион («Оберлига, Бавария-Юг»). Неизвестная часть остаётся как есть.
 */
const LEAGUE_BASES = dict(`
Second League=Вторая лига
Second League A=Вторая лига А
Second League B=Вторая лига Б
FA WSL|WSL=Женская суперлига
WSL Cup=Кубок женской суперлиги
National League=Национальная лига
Non League Premier - Isthmian=Истмийская лига
Non League Premier - Northern=Северная премьер-лига
Non League Premier - Southern Central=Южная лига, центр
Non League Premier - Southern South=Южная лига, юг
Premier League 2 Division One|Premier League 2=Премьер-лига 2
U18 Premier League=Премьер-лига U18
Primera División Femenina|Liga F=Лига F
Primera División RFEF=Примера RFEF
Segunda División RFEF=Сегунда RFEF
Tercera División RFEF=Терсера RFEF
Campionato Primavera=Примавера
Serie A Women=Серия A, женщины
Serie C=Серия C
Serie D=Серия D
Frauen Bundesliga=Бундеслига, женщины
2. Frauen Bundesliga=2. Бундеслига, женщины
U19 Bundesliga=Бундеслига U19
Oberliga=Оберлига
Regionalliga=Регионаллига
Ligue 3=Лига 3
Persha Liga=Первая лига
Druha Liga=Вторая лига
U19 League=Лига U19
1. Division=Первая лига
Tweede Divisie=Твееде Дивизи
Derde Divisie=Дерде Дивизи
U21 Divisie 1=Дивизион 1 U21
1. Lig=Первая лига
2. Lig=Вторая лига
3. Lig=Третья лига
Football League - Highland League=Хайленд-лига
Primera Nacional=Примера Насьональ
Primera B Metropolitana=Примера B Метрополитана
`)

const LEAGUE_PARTS = dict(`
North|Nord|Northern=Север
South|Sud|Süd|Southern=Юг
West=Запад
East|Ost=Восток
Northeast|Nordost=Северо-Восток
Northwest=Северо-Запад
Southeast=Юго-Восток
Southwest|SudWest=Юго-Запад
Center|Central=Центр
Bayern=Бавария
Bayern Nord=Бавария-Север
Bayern Süd=Бавария-Юг
Hamburg=Гамбург
Bremen=Бремен
Hessen=Гессен
Baden-Württemberg=Баден-Вюртемберг
Schleswig-Holstein=Шлезвиг-Гольштейн
Rheinland-Pfalz / Saar=Рейнланд-Пфальц и Саар
Westfalen=Вестфалия
Niederrhein=Нижний Рейн
Mittelrhein=Средний Рейн
Niedersachsen=Нижняя Саксония
Nordost-Nord=Северо-Восток, север
Nordost-Süd=Северо-Восток, юг
Division A Gold=золотая группа
Division A Silver=серебряная группа
`)

function leagueByParts(name: string): string | undefined {
  const whole = lookup(LEAGUE_BASES, name)
  if (whole) return whole
  const m = /^(.+?)\s+-\s+(.+)$/.exec(name)
  if (!m) return undefined
  const base = lookup(LEAGUES, m[1]) ?? lookup(LEAGUE_BASES, m[1])
  if (!base) return undefined
  const part = m[2].trim()
  const g = /^(group|girone)\s+(\S+)$/i.exec(part)
  if (g) return `${base}, группа ${g[2].toUpperCase()}`
  if (/^\d+$/.test(part)) return `${base} ${part}`
  return `${base}, ${lookup(LEAGUE_PARTS, part) ?? part}`
}

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
// сезон 2026/27: команды топ-лиг, которых не было в словаре («Krylia Sovetov — Факел» на главной), и еврокубки с квалификацией
Krylia Sovetov=Крылья Советов
FC Orenburg=Оренбург
Rodina Moskva=Родина
Dynamo=Динамо
Deportivo La Coruna=Депортиво
Malaga=Малага
Racing Santander=Расинг Сантандер
Birmingham=Бирмингем
Bolton=Болтон
Bristol City=Бристоль Сити
Charlton=Чарльтон
Lincoln=Линкольн
Portsmouth=Портсмут
Preston=Престон
Wrexham=Рексем
Estac Troyes=Труа
Le Mans=Ле-Ман
FC Schalke 04=Шальке
SC Paderborn 07=Падерборн
SV Elversberg=Эльферсберг
ADO Den Haag=АДО Ден Хааг
Cambuur=Камбюр
Excelsior=Эксельсиор
Telstar=Телстар
Willem II=Виллем II
Academico Viseu=Академику Визеу
Alverca=Алверка
Estrela=Эштрела
Maritimo=Маритиму
Nacional=Насьонал
Vitória SC=Витория Гимарайнш
Amed=Амед
Erzurumspor FK=Эрзурумспор
Eyüpspor=Эюпспор
Gaziantep FK=Газиантеп
Gençlerbirliği S.K.=Генчлербирлиги
Kocaelispor=Коджаэлиспор
Rizespor=Ризеспор
Çorum FK=Чорум
AEK Athens FC=АЕК
Aarhus=Орхус
Ararat-Armenia=Арарат-Армения
Atert Bissen=Атерт Биссен
Borac Banja Luka=Борац Баня-Лука
Celje=Целе
Drita=Дрита
Egnatia Rrogozhinë=Эгнатия
FC Iberia 1999=Иберия 1999
FC Thun=Тун
Flora Tallinn=Флора
Floriana=Флориана
Gornik Zabrze=Гурник Забже
Gyori ETO FC=Дьёр
Hapoel Beer Sheva=Хапоэль Беэр-Шева
Inter Club d'Escaldes=Интер Эскальдес
KI Klaksvik=КИ Клаксвик
Kairat Almaty=Кайрат
Kauno Žalgiris=Кауно Жальгирис
KuPS=КуПС
Larne=Ларн
Lask Linz=ЛАСК
Lech Poznan=Лех
Levski Sofia=Левски
Lincoln Red Imps FC=Линкольн Ред Импс
ML Vitebsk=Витебск
Mjallby AIF=Мьельбю
Omonia Nicosia=Омония
Petrocub=Петрокуб
Riga=Рига
Sabah FA=Сабах
Shamrock Rovers=Шемрок Роверс
Slovan Bratislava=Слован
Sutjeska=Сутьеска
The New Saints=Нью Сейнтс
Tre Fiori=Тре Фьори
Universitatea Craiova=Университатя Крайова
Vardar Skopje=Вардар
Viking=Викинг
Vikingur Reykjavik=Викингур Рейкьявик
Aluminij=Алюминий
CSKA Sofia=ЦСКА София
Derry City=Дерри Сити
FC Midtjylland=Мидтьюлланн
FC ST. Gallen=Санкт-Галлен
Ferencvarosi TC=Ференцварош
HNK Hajduk Split=Хайдук Сплит
Hammarby FF=Хаммарбю
Hradec Králové=Градец-Кралове
Jagiellonia=Ягеллония
Lillestrom=Лиллестрём
OFI=ОФИ
Pafos=Пафос
Plzen=Виктория Пльзень
Sheriff Tiraspol=Шериф
St. Truiden=Сент-Трюйден
Torreense=Торреенсе
Tromso=Тромсё
Universitatea Cluj=Университатя Клуж
Vestri=Вестри
Vojvodina=Войводина
Žilina=Жилина
AEK Larnaca=АЕК Ларнака
AF Elbasani=Эльбасани
Alashkert=Алашкерт
Apollon Limassol=Аполлон
Atlètic Club d'Escaldes=Атлетик Эскальдес
Auda=Ауда
Austria Vienna=Аустрия Вена
Ballkani=Балкани
Bate Borisov=БАТЭ
Beitar Jerusalem=Бейтар
Bohemians=Богемиан
Brann=Бранн
Bravo=Браво
CFR 1907 Cluj=ЧФР Клуж
CSKA 1948=ЦСКА 1948
Caernarfon Town=Карнарвон Таун
Coleraine FC=Колрейн
Debreceni VSC=Дебрецен
Dečić=Дечич
Dila=Дила
Dinamo Minsk=Динамо Минск
Dinamo Tbilisi=Динамо Тбилиси
Dinamo Tirana=Динамо Тирана
Dukagjini=Дукагьини
Dunajska Streda=Дунайска-Стреда
Europa=Европа
FC Astana=Астана
FC Differdange 03=Дифферданж 03
FC Levadia Tallinn=Левадия
FC Lugano=Лугано
FC Noah=Ноа
FC Nordsjaelland=Норшелланн
FC Santa Coloma=Санта-Колома
FC Sion=Сьон
FC Vaduz=Вадуц
FCSB=ФКСБ
FK Jablonec=Яблонец
FK Liepaja=Лиепая
FK Partizan=Партизан
FK Sarajevo=Сараево
FK Tobol Kostanay=Тобол
FK Zalgiris Vilnius=Жальгирис
GAP Connah S Quay FC=Коннас-Ки
GKS Katowice=ГКС Катовице
Gais=ГАИС
Glentoran=Гленторан
HB Torshavn=ХБ Торсхавн
HJK helsinki=ХИК
HNK Rijeka=Риека
Hamrun Spartans=Хамрун Спартанс
Hapoel Tel Aviv=Хапоэль Тель-Авив
Hegelmann Litauen=Хегельманн
IFK Goteborg=Гётеборг
Ilves=Ильвес
Inter Turku=Интер Турку
Kalju Nomme=Нымме Калью
Koper=Копер
LNZ Cherkasy=ЛНЗ Черкассы
La Fiorita=Ла Фиорита
Linfield=Линфилд
Ludogorets=Лудогорец
Malisheva=Малишева
Marsaxlokk=Марсашлокк
Milsami Orhei=Милсами
Mornar=Морнар
NK Varazdin=Вараждин
NSI Runavik=НСИ Рунавик
Neftchi Baku=Нефтчи
Paide=Пайде
Paks=Пакш
Panevėžys=Паневежис
Penybont=Пенибонт
Petrovac=Петровац
Polessya=Полесье
Pyunik Yerevan=Пюник
Raków Częstochowa=Ракув
Rapid Vienna=Рапид Вена
Rīgas FS=РФШ
Shelbourne=Шелбурн
Shkendija=Шкендия
Sileks=Силекс
Spartak Trnava=Спартак Трнава
St Joseph S Fc=Сент-Джозефс
Stjarnan=Стьярнан
Torpedo Kutaisi=Торпедо Кутаиси
UNA Strassen=УНА Штрассен
US Mondorf-les-bains=Мондорф-ле-Бен
Valletta FC=Валлетта
Valur Reykjavik=Валюр
Velež=Вележ
Vikingur Gota=Викингур Гёта
Virtus=Виртус
Vllaznia Shkodër=Влазния
Yelimay Semey=Елимай
Zimbru=Зимбру
Zira=Зиря
Zrinjski=Зриньски
Železničar Pančevo=Железничар Панчево
`)

function lookup(map: Map<string, string>, value: string | undefined | null): string | undefined {
  if (!value) return undefined
  return map.get(key(value))
}

export function ruCountry(name: string | undefined | null): string {
  return lookup(COUNTRIES, name) ?? name ?? ''
}

/** Вторые составы и сборные с припиской: «Russia U21», «Norway W», «Morocco B». */
const TEAM_SUFFIX = /^(.+?)\s+(W U\d{2}|U\d{2}|W|Women|B)$/i

/**
 * Название команды по-русски. Клубы — из `TEAMS`; сборных там нет — их название совпадает со страной (владелец: «страница
 * лиг как?» — на «Лиге наций» стояли «Türkiye», «Belgium», «Armenia»), поэтому дальше — словарь стран (кроме «World»,
 * «Europe»). Приписка сохраняется: «Russia U21» → «Россия U21», «Norway W» → «Норвегия (жен.)», «Arsenal U21» → «Арсенал U21».
 */
export function ruTeam(name: string): string {
  const club = lookup(TEAMS, name)
  if (club) return club
  const m = name.match(TEAM_SUFFIX)
  const base = m ? m[1] : name
  const ru = lookup(TEAMS, base) ?? (INTERNATIONAL.has(key(base)) ? undefined : lookup(COUNTRIES, base))
  if (!ru) return name
  if (!m) return ru
  const tail = m[2].toUpperCase()
  // «W U17» — женская молодёжная: «Мексика U17 (жен.)»
  if (tail.startsWith('W ')) return `${ru} ${tail.slice(2)} (жен.)`
  return tail === 'W' || tail === 'WOMEN' ? `${ru} (жен.)` : `${ru} ${tail}`
}

const INTERNATIONAL = new Set(['world', 'europe', 'international', ''])

/**
 * Перевод — про одну страну, а название есть и у других: «FA Cup» — ещё в Шотландии, Гонконге, Китае, Малайзии, Омане…
 * (было «Китай. Кубок Англии»). Не в Англии — «Кубок страны»: страна видна в приставке и по флагу.
 */
const ENGLAND_ONLY: Record<string, string> = { 'fa cup': 'Кубок страны', 'community shield': 'Суперкубок страны' }

/** «Англия. Премьер-лига», «Лига чемпионов УЕФА». */
export function ruLeague(name: string, country?: string | null): string {
  const c = key(country ?? '')
  const other = c && c !== 'england' ? ENGLAND_ONLY[key(name)] : undefined
  const league = other ?? lookup(LEAGUES, name) ?? leagueByParts(name) ?? name
  if (INTERNATIONAL.has(c)) return league
  return `${ruCountry(country)}. ${league}`
}

export function hasRuTeam(name: string): boolean {
  return TEAMS.has(key(name))
}

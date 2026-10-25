import type { Metadata } from 'next'
import { PageHead } from '@/components/PageHead'
import { Section } from '@/components/Section'
import { SITE } from '@/config/site'
import { ConsentReset } from '@/components/CookieNotice'

// на каждый запрос, как все страницы: в шапке и подвале — настройки партнёров из env (см. app/layout.tsx)
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Cookie и конфиденциальность',
  description: 'Какие данные собирает tag.bet: cookie Яндекс Метрики, учёт переходов к букмекерам и настройки в браузере.',
  alternates: { canonical: '/privacy' },
}

/**
 * Что сайт на самом деле собирает — коротко и без юридической воды. Ссылка — из плашки про cookie
 * (components/CookieNotice.tsx) и из подвала. Текст сверять с тем, что подключено: Metrika.tsx, app/go/[slug].
 */
export default function PrivacyPage() {
  return (
    <>
      {/* вид остальных страниц (владелец: «на всех страницах разные по размеру заголовки?»): без подложки, шапка — PageHead,
          разделы — панелями; строки текста — не длиннее ~72 знаков */}
      <span hidden className="bare-sub" />
      <div className="space-y-4 xl:space-y-2 [&_.card_p]:max-w-[72ch] [&_.card_ul]:max-w-[72ch]">
        <PageHead
          title="Cookie и конфиденциальность"
          sub={
            <>
              {SITE.name} — информационный сайт: регистрации и личного кабинета нет, имя, телефон и почту мы не спрашиваем. Ниже — всё, что сайт
              запоминает о посещениях, и зачем.
            </>
          }
        />
        <Section plain title="Яндекс Метрика">
          <p className="text-[14px] leading-relaxed text-fg/85">
            Чтобы понимать, какие разделы полезны, а какие нет, на сайте работает Яндекс Метрика — только если вы нажали «Принять» в
            плашке про cookie. Она ставит cookie и собирает обезличенную
            статистику: какие страницы открывали, сколько времени на них провели, с какого устройства и из какого региона пришли, куда кликали.
            Включён Вебвизор — он записывает действия на странице (прокрутку, клики) без того, что вы вводите в поля. Данные обрабатывает
            ООО «Яндекс» по своей{' '}
            <a href="https://yandex.ru/legal/confidential/" target="_blank" rel="noopener" className="border-b border-edge-2 text-fg hover:border-fg">
              политике конфиденциальности
            </a>
            .
          </p>
        </Section>
        <Section plain title="Переходы к букмекерам">
          <p className="text-[14px] leading-relaxed text-fg/85">
            Ссылки на букмекеров — рекламные. Когда вы переходите по такой ссылке, мы записываем время, к какому букмекеру и с какого места
            страницы был переход, страну и тип устройства (телефон или компьютер). IP-адрес и другие данные, по которым можно узнать человека,
            не сохраняем. Это нужно, чтобы считать переходы с партнёрами.
          </p>
        </Section>
        <Section plain title="Настройки в вашем браузере">
          <p className="text-[14px] leading-relaxed text-fg/85">
            В памяти браузера (localStorage) хранятся только удобства: какие истории вы уже посмотрели, выбранная цветовая версия сайта и
            ваш выбор в плашке про cookie. На наш сервер это не отправляется.
          </p>
        </Section>
        <Section plain title="Как отказаться">
          <p className="text-[14px] leading-relaxed text-fg/85">
            Нажмите «Отказаться» в плашке про cookie — Метрика не загрузится, сайт продолжит работать. Передумали — выбор можно изменить
            кнопкой ниже. Ещё cookie можно удалить или запретить в настройках браузера, а Метрику отключить на всех сайтах — расширением{' '}
            <a href="https://yandex.ru/support/metrica/general/opt-out.html" target="_blank" rel="noopener" className="border-b border-edge-2 text-fg hover:border-fg">
              «Блокировщик Яндекс Метрики»
            </a>
            .{SITE.contactEmail ? ` Вопросы — на ${SITE.contactEmail}.` : ''}
          </p>
          <ConsentReset />
        </Section>
      </div>
    </>
  )
}

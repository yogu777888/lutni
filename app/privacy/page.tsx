import type { Metadata } from 'next'
import { Section } from '@/components/Section'
import { SITE } from '@/config/site'

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
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="display pt-2 text-[34px] sm:text-[48px]">Cookie и конфиденциальность</h1>
      <p className="text-[15px] leading-relaxed text-fg/85">
        {SITE.name} — информационный сайт: регистрации и личного кабинета нет, имя, телефон и почту мы не спрашиваем. Ниже — всё, что сайт
        запоминает о посещениях, и зачем.
      </p>
      <Section title="Яндекс Метрика">
        <p className="text-[14px] leading-relaxed text-fg/85">
          Чтобы понимать, какие разделы полезны, а какие нет, на сайте работает Яндекс Метрика. Она ставит cookie и собирает обезличенную
          статистику: какие страницы открывали, сколько времени на них провели, с какого устройства и из какого региона пришли, куда кликали.
          Включён Вебвизор — он записывает действия на странице (прокрутку, клики) без того, что вы вводите в поля. Данные обрабатывает
          ООО «Яндекс» по своей{' '}
          <a href="https://yandex.ru/legal/confidential/" target="_blank" rel="noopener" className="border-b border-edge-2 text-fg hover:border-fg">
            политике конфиденциальности
          </a>
          .
        </p>
      </Section>
      <Section title="Переходы к букмекерам">
        <p className="text-[14px] leading-relaxed text-fg/85">
          Ссылки на букмекеров — рекламные. Когда вы переходите по такой ссылке, мы записываем время, к какому букмекеру и с какого места
          страницы был переход, страну и тип устройства (телефон или компьютер). IP-адрес и другие данные, по которым можно узнать человека,
          не сохраняем. Это нужно, чтобы считать переходы с партнёрами.
        </p>
      </Section>
      <Section title="Настройки в вашем браузере">
        <p className="text-[14px] leading-relaxed text-fg/85">
          В памяти браузера (localStorage) хранятся только удобства: какие истории вы уже посмотрели, выбранная цветовая версия сайта и
          то, что вы закрыли плашку про cookie. На наш сервер это не отправляется.
        </p>
      </Section>
      <Section title="Как отказаться">
        <p className="text-[14px] leading-relaxed text-fg/85">
          Cookie можно удалить или запретить в настройках браузера — сайт продолжит работать. Отключить сбор данных Метрикой можно
          расширением{' '}
          <a href="https://yandex.ru/support/metrica/general/opt-out.html" target="_blank" rel="noopener" className="border-b border-edge-2 text-fg hover:border-fg">
            «Блокировщик Яндекс Метрики»
          </a>
          .{SITE.contactEmail ? ` Вопросы — на ${SITE.contactEmail}.` : ''}
        </p>
      </Section>
    </div>
  )
}

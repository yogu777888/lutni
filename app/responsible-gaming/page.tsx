import type { Metadata } from 'next'
import { Section } from '@/components/Section'

export const metadata: Metadata = {
  title: 'Ответственная игра',
  description: 'Как делать ставки ответственно: лимиты, признаки зависимости и куда обратиться за помощью.',
  alternates: { canonical: '/responsible-gaming' },
}

const SIGNS = [
  'вы ставите больше, чем планировали, или пытаетесь «отыграться»;',
  'занимаете деньги или тратите отложенное на важные нужды;',
  'ставки мешают работе, учёбе, отношениям или сну;',
  'вы скрываете от близких, сколько времени и денег уходит на ставки.',
]

export default function ResponsibleGamingPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="pt-2 display text-[36px] sm:text-[56px]">Ответственная игра</h1>
      <p className="text-[15px] leading-relaxed text-fg/85">
        Ставки на спорт — развлечение для взрослых (18+), а не способ заработка. Даже лучшая модель ошибается, и на дистанции
        большинство игроков проигрывает из-за маржи букмекера.
      </p>
      <Section title="Правила, которые помогают">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-fg/85">
          <li>Заранее определите сумму на месяц и не превышайте её.</li>
          <li>Не ставьте на эмоциях и не пытайтесь отыграться.</li>
          <li>Используйте лимиты депозита и самоисключение в личном кабинете букмекера.</li>
          <li>Не делайте ставки в долг и на деньги, нужные для жизни.</li>
        </ul>
      </Section>
      <Section title="Тревожные признаки">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-fg/85">
          {SIGNS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </Section>
      <Section title="Где получить помощь">
        <p className="text-sm leading-relaxed text-fg/85">
          Если игра перестала быть развлечением, обратитесь к специалисту (психотерапевту или наркологу) или в сообщество взаимопомощи
          «Анонимные Игроки». Легальные букмекеры обязаны по вашему запросу ограничить или закрыть доступ к ставкам — напишите в их
          службу поддержки.
        </p>
      </Section>
    </div>
  )
}

import type { Metadata } from 'next'
import { DayView } from '@/components/DayView'
import { todayYmd } from '@/lib/format'
import { generateMetadata as homeMeta } from '@/app/page'

// главная «По времени» — ссылка «По времени» на главной ведёт сюда, старые ссылки `/?sort=time` — тоже (подмена адреса
// в next.config.ts; при переходе внутри сайта роутер её не учитывает, поэтому ссылка — прямо на эту страницу): сама
// главная хранится готовой одной на всех и параметров адреса не читает, а этот вариант открывают реже — собираем на
// каждый запрос, как раньше
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return homeMeta()
}

export default async function HomeByTime() {
  const today = todayYmd()
  return <DayView ymd={today} today={today} sort="time" />
}

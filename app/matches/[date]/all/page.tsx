import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { DayView, dayTitle, listTitle } from '@/components/DayView'
import { diffDays, isYmd, todayYmd } from '@/lib/format'
import { parseListFilter } from '@/lib/list-filter'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ date: string }>; searchParams: Promise<Record<string, string | undefined>> }

const valid = (date: string) => isYmd(date) && Math.abs(diffDays(date, todayYmd())) <= 365

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params
  if (!valid(date)) return {}
  const today = todayYmd()
  const dmy = date.split('-').reverse().join('.')
  return {
    title: `${listTitle(dayTitle(date, today))}: список матчей`,
    description: `Все футбольные матчи ${dmy} по турнирам и по времени: счёт, коэффициенты букмекеров и теги ставок.`,
    alternates: { canonical: `/matches/${date}/all` },
  }
}

/** Полный список матчей другого дня (сегодня — /matches). */
export default async function DayListPage({ params, searchParams }: Props) {
  const { date } = await params
  const q = await searchParams
  const sort = q.sort
  if (!valid(date)) notFound()
  const today = todayYmd()
  if (date === today) redirect(`/matches${new URLSearchParams(q as Record<string, string>).size ? `?${new URLSearchParams(q as Record<string, string>)}` : ''}`)
  return <DayView ymd={date} today={today} view="list" sort={sort === 'time' ? 'time' : 'league'} filter={parseListFilter(q)} />
}

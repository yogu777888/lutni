'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    ym?: (id: number, action: string, goal: string, params?: Record<string, string>) => void
  }
}

export function MetrikaGoals({ id }: { id: number }) {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a[href^="/go/"]') as HTMLAnchorElement | null
      if (!a) return
      const url = new URL(a.href, location.href)
      window.ym?.(id, 'reachGoal', 'bk_click', {
        partner: url.pathname.split('/')[2] ?? '',
        placement: url.searchParams.get('p') ?? '',
      })
    }
    document.addEventListener('click', onClick, { capture: true })
    return () => document.removeEventListener('click', onClick, { capture: true })
  }, [id])
  return null
}

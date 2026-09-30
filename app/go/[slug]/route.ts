import { NextResponse, type NextRequest } from 'next/server'
import { getPartner } from '@/config/bookmakers'
import { resolveAffiliateUrl } from '@/lib/affiliate'
import { logClick } from '@/lib/clicks'

/**
 * /go/<букмекер>?p=<место>&m=<матч> → 302 на партнёрскую ссылку.
 * Все партнёрские ссылки на сайте идут через этот редирект: так мы считаем
 * клики, подставляем subid и можем поменять ссылку в одном месте.
 */
const BOT_UA = /bot|crawl|spider|slurp|yandex|google|bing|baidu|facebookexternalhit|telegram|whatsapp|preview/i

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const partner = getPartner(slug)
  if (!partner) return NextResponse.redirect(new URL('/bookmakers', req.url), 302)

  const sp = req.nextUrl.searchParams
  const placement = (sp.get('p') || 'direct').replace(/[^a-z0-9-]/gi, '').slice(0, 32) || 'direct'
  const match = (sp.get('m') || '').replace(/\D/g, '').slice(0, 12) || undefined
  const ua = req.headers.get('user-agent') || ''

  if (!BOT_UA.test(ua)) {
    let ref: string | null = null
    try {
      const r = req.headers.get('referer')
      ref = r ? new URL(r).pathname.slice(0, 200) : null
    } catch {
      ref = null
    }
    logClick({
      ts: Date.now(),
      partner: partner.slug,
      placement,
      match: match ?? null,
      ref,
      country: req.headers.get('cf-ipcountry') || req.headers.get('x-vercel-ip-country') || null,
      device: /mobile|android|iphone|ipad/i.test(ua) ? 'mobile' : 'desktop',
    }).catch((e) => console.warn('[click] не удалось записать клик:', (e as Error).message))
  }

  const res = NextResponse.redirect(resolveAffiliateUrl(partner, placement, match), 302)
  res.headers.set('X-Robots-Tag', 'noindex, nofollow')
  res.headers.set('Cache-Control', 'no-store')
  return res
}

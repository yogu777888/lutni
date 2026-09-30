import type { MetadataRoute } from 'next'
import { SITE } from '@/config/site'
import { IS_MOCK } from '@/lib/sstats/client'

export const dynamic = 'force-dynamic'

export default function robots(): MetadataRoute.Robots {
  // демо-данные не индексируем
  if (IS_MOCK) return { rules: { userAgent: '*', disallow: '/' } }
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/go/', '/admin', '/api/'] }],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  }
}

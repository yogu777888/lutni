import { timingSafeEqual } from 'node:crypto'

/** Доступ к /admin и отладочным эндпоинтам — по токену из ADMIN_TOKEN. */
export function isAdmin(token: string | null | undefined): boolean {
  const secret = process.env.ADMIN_TOKEN
  if (!secret || !token) return false
  const a = Buffer.from(token)
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

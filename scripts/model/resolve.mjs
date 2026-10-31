import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('../..', import.meta.url))
const EXTS = ['.ts', '.tsx', '/index.ts']

export async function resolve(spec, ctx, next) {
  let target = null
  if (spec.startsWith('@/')) target = path.join(root, spec.slice(2))
  else if ((spec.startsWith('./') || spec.startsWith('../')) && ctx.parentURL?.startsWith('file:'))
    target = path.resolve(path.dirname(fileURLToPath(ctx.parentURL)), spec)
  if (target) {
    if (existsSync(target) && statSync(target).isFile()) return next(pathToFileURL(target).href, ctx)
    for (const e of EXTS) if (existsSync(target + e)) return next(pathToFileURL(target + e).href, ctx)
  }
  return next(spec, ctx)
}

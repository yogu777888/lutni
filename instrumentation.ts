/** Вызывается один раз при старте сервера Next.js. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  // во время `next build` фоновые задачи не нужны
  if (process.env.NEXT_PHASE === 'phase-production-build') return
  // заготовка главной со сборки — долой (lib/prerender.ts)
  const { dropBuildHome } = await import('./lib/prerender')
  await dropBuildHome()
  const { startWarmer } = await import('./lib/warmer')
  startWarmer()
}

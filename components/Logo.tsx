export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`font-display font-bold tracking-tight ${className}`}>
      <span className="text-acid">#</span>tag<span className="text-dim">.bet</span>
    </span>
  )
}

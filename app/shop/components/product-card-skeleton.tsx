export const ProductCardSkeleton = () => {
  return (
    <div className="animate-pulse overflow-hidden rounded-card bg-muted">
      <div className="aspect-square bg-background" />
      <div className="space-y-3 p-4 sm:p-5">
        <div className="h-4 w-3/4 rounded bg-background/60" />
        <div className="h-5 w-1/3 rounded bg-background/60" />
      </div>
    </div>
  )
}

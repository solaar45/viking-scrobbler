import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-viking-bg-tertiary/50", className)}
      {...props}
    />
  )
}

export { Skeleton }

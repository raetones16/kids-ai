import { cn } from "../../lib/utils"

function Skeleton({
  className,
  ...props
}) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-grey-30/50 dark:bg-grey-30/50", className)}
      {...props}
    />
  )
}

export { Skeleton }

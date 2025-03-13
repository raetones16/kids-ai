import React from "react";
import { Check } from "lucide-react";
import { cn } from "../../lib/utils";

const Checkbox = React.forwardRef(({ className, checked, onCheckedChange, id, ...props }, ref) => (
  <div className="relative flex items-center">
    <input
      type="checkbox"
      id={id}
      ref={ref}
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      className="peer h-4 w-4 opacity-0 absolute"  // Hidden but accessible checkbox
      {...props}
    />
    <div
      className={cn(
        "h-4 w-4 shrink-0 rounded-sm border border-primary flex items-center justify-center",
        "peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-ring",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        checked ? "bg-primary text-primary-foreground" : "bg-white",
        className
      )}
    >
      {checked && <Check className="h-3 w-3 text-white" />}
    </div>
  </div>
));

Checkbox.displayName = "Checkbox";

export { Checkbox };

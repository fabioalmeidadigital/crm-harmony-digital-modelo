import { cn } from "@/lib/utils";

interface NewLeadBadgeProps {
  showText?: boolean;
  className?: string;
}

export function NewLeadBadge({ showText = false, className }: NewLeadBadgeProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-coral opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-coral" />
      </span>
      {showText && (
        <span className="text-[10px] font-semibold text-coral uppercase tracking-wide">Novo</span>
      )}
    </span>
  );
}

import { cn } from "@/lib/cn";
import { BETA_TITLE } from "@/lib/site/beta";

/** FR-MKT-103: the Beta mark shown beside the wordmark and on the landing hero. */
export function BetaMark({ className }: { className?: string }) {
  return (
    <span
      title={BETA_TITLE}
      aria-label={BETA_TITLE}
      data-beta-mark
      className={cn(
        "inline-flex h-5 shrink-0 cursor-default items-center rounded-pill border border-hair-strong px-2 text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-soft",
        className,
      )}
    >
      Beta
    </span>
  );
}

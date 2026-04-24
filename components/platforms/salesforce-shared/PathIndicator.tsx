// PathIndicator — the chevron-style horizontal stage bar that appears on
// stage-driven record pages in Lightning Experience.
//
// Used primarily on Opportunity and Lead records, and available on any
// object whose page layout has been configured with the Path component.
// Each stage is a chevron pointing right. The current stage is brand-blue
// filled; prior stages are a softer blue tint to show "already completed";
// later stages are neutral gray.
//
// Real SLDS ships this as `.slds-path`. We approximate the chevron shape
// with CSS clip-path so the component is self-contained and doesn't need
// the SLDS sprite sheet.
//
// Fidelity anchor: PLATFORMS/salesforce.md § UI PATTERNS > Record page >
// Path component.

"use client";

import { salesforceColors, salesforceFont } from "./design-tokens";

type PathIndicatorProps = {
  stages: readonly string[];
  /** Currently active stage name — must match one of `stages`. */
  currentStage: string;
  /** Click handler, called with the stage name the user selected. Smoke mocks can log. */
  onStageClick?: (stage: string) => void;
  /** Optional label showing to the right of the path — e.g., "Mark Stage as Complete". */
  actionLabel?: string;
  /** Called when the action label button is clicked. */
  onAction?: () => void;
};

export function PathIndicator({
  stages,
  currentStage,
  onStageClick,
  actionLabel = "Mark Stage as Complete",
  onAction,
}: PathIndicatorProps) {
  const currentIndex = stages.indexOf(currentStage);

  return (
    <div
      className="flex items-stretch gap-0 overflow-hidden rounded"
      style={{
        border: `1px solid ${salesforceColors.border}`,
        background: salesforceColors.surface,
        fontFamily: salesforceFont.family,
      }}
    >
      <div className="flex flex-1 items-stretch">
        {stages.map((stage, i) => {
          const isPast = i < currentIndex;
          const isCurrent = i === currentIndex;
          const bg = isCurrent
            ? salesforceColors.brandBlue
            : isPast
              ? "#E3F1FC"
              : "#F3F3F3";
          const fg = isCurrent
            ? salesforceColors.textOnBrand
            : isPast
              ? salesforceColors.brandBlue
              : salesforceColors.textWeak;

          // First chevron is flat on the left (no notch); middle/last keep
          // the right-pointing tail. We use clip-path to draw the chevron.
          const clip =
            i === 0
              ? "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)"
              : i === stages.length - 1
                ? "polygon(0 0, 100% 0, 100% 100%, 0 100%, 12px 50%)"
                : "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 12px 50%)";

          return (
            <button
              key={stage}
              type="button"
              onClick={() => onStageClick?.(stage)}
              className="flex min-w-0 flex-1 items-center justify-center px-3 py-2 text-[12px] font-semibold transition-opacity hover:opacity-90"
              style={{
                background: bg,
                color: fg,
                clipPath: clip,
                // Slight horizontal overlap so chevrons tile cleanly.
                marginRight: i === stages.length - 1 ? 0 : -6,
              }}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span className="truncate">{stage}</span>
            </button>
          );
        })}
      </div>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 border-l px-4 py-2 text-[12px] font-semibold hover:opacity-90"
          style={{
            borderColor: salesforceColors.border,
            background: salesforceColors.brandBlue,
            color: salesforceColors.textOnBrand,
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

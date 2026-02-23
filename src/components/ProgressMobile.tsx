import type { StepState } from "../types/steps";
import { useState } from "react";

interface Props {
  steps: StepState[];
  activeStepId: string | null;
}

export const ProgressMobile: React.FC<Props> = ({ steps, activeStepId }) => {
  const [open, setOpen] = useState(false);
  const completed = steps.filter((s) => s.status === "done").length;

  return (
    <section className="border-b border-border bg-surface/95 px-4 py-2">
      <button
        type="button"
        className="mx-auto flex max-w-2xl items-center justify-between rounded-full border border-border bg-white/95 px-4 py-1.5 text-left text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-progress-panel"
      >
        <span className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
            💬
          </span>
          <span className="font-medium text-slate-700">
            Reembolso · {completed}/{steps.length} pasos
          </span>
        </span>
        <span className="text-[11px] text-slate-500">{open ? "Ocultar" : "Progreso"}</span>
      </button>
      {open && (
        <div
          id="mobile-progress-panel"
          className="mx-auto mt-2 w-full max-w-2xl rounded-lg border border-border bg-white p-3 text-xs shadow-sm"
        >
          <ol className="space-y-1">
            {steps.map((step) => (
              <li key={step.id} className="flex items-center justify-between">
                <span
                  className={
                    step.id === activeStepId ? "font-medium text-primary" : "text-slate-700"
                  }
                >
                  {step.title}
                </span>
                <span className="text-[11px] text-slate-500">{step.status}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
};

// Placeholder shown while the board's data loads (instant feedback, no blank screen).
export function BoardSkeleton() {
  return (
    <div className="h-full overflow-hidden bg-slate-950 p-3">
      <div className="flex h-full gap-3">
        {Array.from({ length: 5 }).map((_, col) => (
          <div key={col} className="flex h-full w-72 shrink-0 flex-col rounded-lg border border-slate-800 bg-slate-900/40">
            <div className="flex items-center justify-between rounded-t-lg border-b border-slate-800 bg-slate-800 px-3 py-2">
              <div className="h-3 w-24 animate-pulse rounded bg-slate-700" />
              <div className="h-4 w-5 animate-pulse rounded bg-slate-700" />
            </div>
            <div className="space-y-2 p-2">
              {Array.from({ length: (col % 3) + 1 }).map((_, i) => (
                <div key={i} className="rounded-md border border-slate-800 bg-slate-800/60 p-2.5">
                  <div className="mb-2 h-3 w-16 animate-pulse rounded bg-slate-700/70" />
                  <div className="h-3 w-40 animate-pulse rounded bg-slate-700" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

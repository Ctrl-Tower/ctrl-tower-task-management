import { prisma } from "@/lib/db";
import { ListEditor } from "@/components/settings/ListEditor";
import { ArchiveSetting } from "@/components/settings/ArchiveSetting";
import { getArchiveAfterDays } from "@/lib/settings";
import type { CategoryDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [columns, categories, archiveAfterDays] = await Promise.all([
    prisma.column.findMany({ orderBy: { position: "asc" } }),
    prisma.category.findMany({ orderBy: { position: "asc" } }),
    getArchiveAfterDays(),
  ]);
  const cats: CategoryDTO[] = categories.map((c) => ({ id: c.id, name: c.name, color: c.color, position: c.position }));

  return (
    <div className="mx-auto h-full max-w-3xl space-y-10 overflow-y-auto p-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100">Board settings</h1>
        <p className="text-sm text-neutral-400">
          Columns are the status lanes across the top; categories are labels you can tag each task with.
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-neutral-200">Status columns</h2>
        <p className="text-xs text-neutral-500">Fixed. Tasks move between these on the board.</p>
        <div className="flex flex-wrap gap-2">
          {columns.map((c) => (
            <span key={c.id} className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200">
              {c.name}
            </span>
          ))}
        </div>
      </section>

      <ListEditor
        title="Categories"
        initial={cats}
        addLabel="Add category"
      />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-neutral-200">Priority levels</h2>
        <p className="text-xs text-neutral-500">What P0–P3 mean on a task. P0 is the most urgent.</p>
        <ul className="space-y-1.5">
          {[
            { p: "P0", desc: "Critical — drop everything. Production down or blocking others." },
            { p: "P1", desc: "High — important; tackle this sprint." },
            { p: "P2", desc: "Normal — the default. Planned work, no rush." },
            { p: "P3", desc: "Low — nice to have; do it when there's spare time." },
          ].map(({ p, desc }) => (
            <li key={p} className="flex items-start gap-3 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2">
              <span className="mt-px rounded bg-neutral-700 px-1.5 py-px text-xs font-semibold text-neutral-100">{p}</span>
              <span className="text-sm text-neutral-300">{desc}</span>
            </li>
          ))}
        </ul>
      </section>

      <ArchiveSetting initialDays={archiveAfterDays} />
    </div>
  );
}

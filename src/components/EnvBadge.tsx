// Zeigt in Nicht-Produktions-Umgebungen (Preview/Dev/lokal) eine deutliche
// farbliche Kennzeichnung an. In Produktion wird nichts gerendert.
// VERCEL_ENV / VERCEL_GIT_COMMIT_REF werden von Vercel automatisch gesetzt.
export default function EnvBadge() {
  const env = process.env.VERCEL_ENV; // "production" | "preview" | "development" | undefined (lokal)

  // In Produktion: kein Banner.
  if (env === "production") return null;

  const branch = process.env.VERCEL_GIT_COMMIT_REF;
  const label =
    env === "preview"
      ? "DEV / PREVIEW"
      : env === "development"
        ? "DEVELOPMENT"
        : "LOKAL";

  return (
    <div aria-hidden="true" className="pointer-events-none select-none">
      {/* Auffälliger Streifen am oberen Rand */}
      <div className="fixed inset-x-0 top-0 z-[100] h-1.5 bg-amber-400" />
      {/* Label-Pille unten rechts (über der mobilen Navigation) */}
      <div className="fixed z-[100] right-3 bottom-24 lg:bottom-4 lg:right-4">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-black shadow-lg ring-1 ring-black/10">
          {label}
          {branch ? <span className="font-medium normal-case opacity-80">· {branch}</span> : null}
        </span>
      </div>
    </div>
  );
}

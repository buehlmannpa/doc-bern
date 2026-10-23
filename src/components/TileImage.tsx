// Feste Bildfläche für News-/Event-Kacheln. Sie ändert sich beim Aufklappen nie.
// Ohne Bild wird ein dezenter Platzhalter gezeigt, damit alle Kacheln gleich hoch sind.
export default function TileImage({ src, alt }: { src?: string | null; alt: string }) {
  return (
    <div className="w-full h-40 overflow-hidden">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="w-full h-40 object-cover" loading="lazy" />
      ) : (
        <div
          className="w-full h-40 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, rgba(var(--accent), 0.08) 0%, rgba(var(--accent), 0.18) 100%)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-16 w-16 object-contain opacity-30" />
        </div>
      )}
    </div>
  );
}

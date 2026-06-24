import { partners, hostettlerInfo } from "@/data/content";

export default function PartnersPage() {
  const today = new Date();
  const dayIndex = today.getDay();
  const dayNames = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  const todayName = dayNames[dayIndex];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight px-1">Partner</h1>

      {/* hostettler-moto Featured */}
      <section className="glass-card p-5 border-l-4" style={{ borderLeftColor: "var(--accent-hex)" }}>
        <div className="flex items-center gap-2 mb-1">
          <span
            className="tag text-[10px]"
            style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-hex)" }}
          >
            Offizieller Händler
          </span>
        </div>
        <h2 className="font-bold text-lg mb-3">{hostettlerInfo.name}</h2>

        <div className="space-y-3">
          {/* Phone */}
          <a
            href={`tel:${hostettlerInfo.phone}`}
            className="flex items-center gap-3 p-3 rounded-xl text-sm font-semibold"
            style={{ background: "rgba(var(--accent), 0.08)", color: "var(--accent-hex)" }}
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            {hostettlerInfo.phone}
          </a>

          {/* Address */}
          <a
            href={hostettlerInfo.googleMaps}
            target="_blank"
            rel="noopener"
            className="flex items-center gap-3 p-3 rounded-xl text-sm"
            style={{ background: "rgba(0,0,0,0.03)" }}
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "var(--accent-hex)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div>
              <div className="font-semibold">{hostettlerInfo.address}</div>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>In Google Maps öffnen</div>
            </div>
          </a>

          {/* Email */}
          <a
            href={`mailto:${hostettlerInfo.email}`}
            className="flex items-center gap-3 p-3 rounded-xl text-sm"
            style={{ background: "rgba(0,0,0,0.03)" }}
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "var(--accent-hex)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {hostettlerInfo.email}
          </a>

          {/* Website */}
          <a
            href={hostettlerInfo.website}
            target="_blank"
            rel="noopener"
            className="flex items-center gap-3 p-3 rounded-xl text-sm"
            style={{ background: "rgba(0,0,0,0.03)" }}
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "var(--accent-hex)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <div>
              <div className="font-semibold">Website</div>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>hostettler-moto.ch</div>
            </div>
          </a>

          {/* Opening Hours */}
          <div className="p-3 rounded-xl" style={{ background: "rgba(0,0,0,0.03)" }}>
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "var(--accent-hex)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Öffnungszeiten
            </h3>
            <div className="space-y-1">
              {hostettlerInfo.hours.map((h) => (
                <div
                  key={h.day}
                  className="flex justify-between text-xs py-0.5"
                  style={{
                    color: h.day === todayName ? "var(--accent-hex)" : "var(--text-secondary)",
                    fontWeight: h.day === todayName ? 700 : 400,
                  }}
                >
                  <span>{h.day}</span>
                  <span>{h.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Other Partners */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 px-1" style={{ color: "var(--text-secondary)" }}>
          Weitere Partner
        </h2>
        <div className="space-y-3">
          {partners
            .filter((p) => p.id !== "1")
            .map((partner) => (
              <article key={partner.id} className="glass-card p-5">
                <h3 className="font-bold text-base mb-1">{partner.name}</h3>
                <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
                  {partner.description}
                </p>
                {partner.discount && (
                  <span
                    className="tag text-xs"
                    style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-hex)" }}
                  >
                    {partner.discount}
                  </span>
                )}
                {partner.website && (
                  <a
                    href={partner.website}
                    target="_blank"
                    rel="noopener"
                    className="block mt-2 text-xs font-semibold"
                    style={{ color: "var(--accent-hex)" }}
                  >
                    Website besuchen →
                  </a>
                )}
              </article>
            ))}
        </div>
      </section>
    </div>
  );
}

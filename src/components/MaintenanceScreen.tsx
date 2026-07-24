import Image from "next/image";

export default function MaintenanceScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-8">
      <Image
        src="/logo.png"
        alt="DOC Bern"
        width={180}
        height={180}
        priority
        className="rounded-3xl mb-8"
      />
      <h1 className="text-2xl font-bold tracking-tight mb-3">Wir sind gleich zurück</h1>
      <p className="text-sm max-w-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        Der DOC Bern führt gerade kurz Wartungsarbeiten durch. Schaut in Kürze
        wieder vorbei – wir sind bald wieder für euch da. Ride safe! 🏍️
      </p>
    </div>
  );
}

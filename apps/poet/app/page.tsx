function ticketsSiteBase(): string {
  const raw = process.env.NEXT_PUBLIC_TICKETS_SITE_URL?.trim().replace(/\/+$/, "");
  return raw ?? "";
}

export default function HomePage() {
  const tickets = ticketsSiteBase();

  return (
    <main>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 600, letterSpacing: "-0.02em", marginTop: 0 }}>
        Popular Poet
      </h1>
      <p style={{ color: "var(--muted)" }}>
        Wkrótce pełna strona: kursy (improwizacja aktorska, warsztaty aktorskie, grupy PLAY-BACK), zapisy oraz
        informacje o zajęciach próbnych.
      </p>
      <p>
        Płatności za bilety na wydarzenia z afisza obsługuje serwis{" "}
        {tickets ? (
          <a href={`${tickets}/pl`} rel="noopener noreferrer">
            PopularTickets
          </a>
        ) : (
          <strong>PopularTickets</strong>
        )}
        . Zajęcia próbne, jeśli są płatne, będą kierowały do checkoutu w tym serwisie (link ustawiany przy każdym
        slocie).
      </p>
      {!tickets ? (
        <p style={{ fontSize: "0.875rem", color: "var(--muted)" }}>
          Na produkcji ustaw w Vercel zmienną <code style={{ color: "var(--gold-bright)" }}>NEXT_PUBLIC_TICKETS_SITE_URL</code>{" "}
          (np. <code>https://twoja-domena-biletow.pl</code>).
        </p>
      ) : null}
    </main>
  );
}

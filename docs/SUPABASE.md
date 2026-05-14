# Supabase — konfiguracja PopularTickets

## 1. Projekt w Supabase

1. Zaloguj się na [https://supabase.com](https://supabase.com) i utwórz **nowy projekt** (wybierz region, ustaw hasło do bazy).
2. Po utworzeniu projektu przejdź do **Project Settings → API**.
3. Skopiuj:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` (alternatywnie `SUPABASE_URL`),
   - **service_role** / **Secret** (`sb_secret_…`) → `SUPABASE_SERVICE_ROLE_KEY` (alias: `SUPABASE_SECRET_KEY`).
   - **Publishable** (`sb_publishable_…`) — opcjonalnie do `.env`; w tym MVP aplikacja go **nie używa** (odczyt z serwera tylko przez service role).

> Klucz `service_role` używany jest **tylko po stronie serwera** (Server Actions, API). Nie wklejaj go do kodu frontendu ani do repozytorium publicznego.

## 2. Schemat bazy

1. W panelu Supabase otwórz **SQL Editor**.
2. Wklej zawartość pliku [`supabase/schema.sql`](/supabase/schema.sql) z repozytorium i uruchom (**Run**).
3. Upewnij się, że nie ma błędów wykonania (tabele `events`, `orders`, `tickets` itd.).
4. Opcjonalnie (kursy / popularpoet.pl): uruchom [`supabase/courses-poet.sql`](/supabase/courses-poet.sql) — tabele `poet_course`, `poet_trial_slot` (FK do `events.slug`). Szczegóły: [MONOREPO.md](MONOREPO.md).

> **Ostrzeżenie Supabase „destructive operations”:** w `schema.sql` są tylko `DROP TRIGGER IF EXISTS` przed utworzeniem triggerów — to normalne, **nie usuwa danych** z tabel. Możesz potwierdzić wykonanie zapytania.

> **Schemat nie wstawia wydarzeń** — po `schema.sql` tabele są puste. Wydarzenia: `supabase/seed-improv-event.sql`, `npm run seed:improv` (lokalnie z `.env`) lub panel **Admin**.

### Szybka weryfikacja danych

W **SQL Editor** uruchom zawartość pliku [`supabase/verify-data.sql`](/supabase/verify-data.sql) — zobaczysz liczbę wierszy w `events`, `orders`, `tickets`, `checkins`. Pusta tabela **tickets** przy zerowych zamówieniach jest OK.

W **Table Editor** kliknij **events** — jeśli lista jest pusta, dodaj pierwsze wydarzenie (sied lub admin).

## 3. Plik `.env.local`

W katalogu projektu:

```bash
cp .env.example .env.local
```

Uzupełnij co najmniej:

| Zmienna | Skąd |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` lub `SUPABASE_URL` | Project Settings → API → URL |
| `SUPABASE_SERVICE_ROLE_KEY` lub `SUPABASE_SECRET_KEY` | service_role / Secret (nie Publishable / anon) |

Pozostałe zmienne (P24, Resend, admin) opisane są w [README](../README.md) i w `.env.example`.

## 4. Weryfikacja i dev

Opcjonalnie przed startem:

```bash
npm run check:env
```

Następnie:

```bash
npm install
npm run dev
```

Otwórz `http://localhost:3000` — middleware przekieruje na domyślną wersję językową `/pl`. Jeśli Supabase nie jest skonfigurowany, zobaczysz komunikat z instrukcją na stronie głównej.

## 5. Produkcja

W hostingu (np. Vercel) dodaj te same zmienne w **Environment Variables** dla środowiska **Production** (i ewentualnie **Preview**). Po zmianie zmiennych wykonaj ponowny deploy.

## 6. Rozwiązywanie problemów

- Komunikat **„nie udało się wczytać listy”** na stronie głównej: w logach Vercel (**Functions / Logs**) szukaj `[PopularTickets][Supabase]` — tam jest `message` / `code` z PostgREST.
- **Brak tabeli** — uruchom ponownie `supabase/schema.sql` w SQL Editor.
- **Invalid API key / JWT** — wklejono `anon` zamiast `service_role`, albo literówka w zmiennej `SUPABASE_SERVICE_ROLE_KEY`.
- **Spacje** w URL lub kluczu z panelu — aplikacja obcina białe znaki, ale warto sprawdzić kopię.

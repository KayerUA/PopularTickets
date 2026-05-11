# Supabase — konfiguracja PopularTickets

## 1. Projekt w Supabase

1. Zaloguj się na [https://supabase.com](https://supabase.com) i utwórz **nowy projekt** (wybierz region, ustaw hasło do bazy).
2. Po utworzeniu projektu przejdź do **Project Settings → API**.
3. Skopiuj:
   - **Project URL** → zmienna `NEXT_PUBLIC_SUPABASE_URL` w pliku `.env.local`,
   - **service_role** `secret` (nie `anon`!) → `SUPABASE_SERVICE_ROLE_KEY`.

> Klucz `service_role` używany jest **tylko po stronie serwera** (Server Actions, API). Nie wklejaj go do kodu frontendu ani do repozytorium publicznego.

## 2. Schemat bazy

1. W panelu Supabase otwórz **SQL Editor**.
2. Wklej zawartość pliku [`supabase/schema.sql`](/supabase/schema.sql) z repozytorium i uruchom (**Run**).
3. Upewnij się, że nie ma błędów wykonania (tabele `events`, `orders`, `tickets` itd.).

## 3. Plik `.env.local`

W katalogu projektu:

```bash
cp .env.example .env.local
```

Uzupełnij co najmniej:

| Zmienna | Skąd |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role |

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

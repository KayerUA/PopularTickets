# Monorepo: PopularTickets + Popular Poet (dwa fronty, jedna baza)

Struktura katalogów:

| Ścieżka | Opis |
|---------|------|
| [apps/tickets](../apps/tickets) | Serwis biletowy (Next.js) — dotychczasowy kod projektu. |
| [apps/poet](../apps/poet) | Strona marki / kursów (Next.js), domena **popularpoet.pl**. |
| [supabase](../supabase) | Jedna baza: `schema.sql` + opcjonalnie `courses-poet.sql`. |
| [scripts](../scripts) | Skrypty z katalogu głównego (`.env` w korzeniu repozytorium). |

## Vercel: dwa projekty, jedno repo

1. **Projekt A (bilety)**  
   - Repo: to samo co dotychczas.  
   - **Settings → General → Root Directory:** `apps/tickets`  
   - **Domains:** domena bileów (np. `populartickets.pl`).  
   - **Environment Variables:** jak wcześniej (`NEXT_PUBLIC_APP_URL` = URL **tego** serwisu, Supabase, P24, itd.).

2. **Projekt B (Poet)**  
   - **New Project** → to samo repo.  
   - **Root Directory:** `apps/poet`  
   - **Domains:** `popularpoet.pl`.  
   - **Environment Variables:**  
     - `NEXT_PUBLIC_TICKETS_SITE_URL` — pełny URL projektu A **bez** końcowego `/` (np. `https://populartickets.pl`), żeby strona poet mogła linkować do checkoutu.  
     - Opcjonalnie później: `NEXT_PUBLIC_SUPABASE_URL` + klucz **anon** (jeśli poet będzie czytał `poet_course` z przeglądarki; dziś MVP strony poet nie łączy się jeszcze z API).

3. **Build**  
   - Framework: Next.js (domyślnie wykrywane przez `vercel.json` w każdym `apps/*`).  
   - Install/build uruchamiane w katalogu root ustawionym w projekcie — Vercel robi `cd apps/tickets` lub `cd apps/poet` zgodnie z konfiguracją.

## Supabase: jeden projekt

- Nie twórz drugiego projektu Supabase dla kursów.  
- Po migracji tabel kursów: uruchom w SQL Editor plik [courses-poet.sql](../supabase/courses-poet.sql).  
- **Kontrakt checkoutu:** w `poet_trial_slot.tickets_checkout_event_slug` wpisujesz `events.slug` istniejącego, opublikowanego wydarzenia-trial w PopularTickets. Na stronie poet link ma postać:  
  `{NEXT_PUBLIC_TICKETS_SITE_URL}/{locale}/events/{slug}`.

## Lokalnie (npm workspaces)

Z katalogu głównego repozytorium:

```bash
npm install
npm run dev              # domyślnie: popular-tickets (port 3000)
npm run dev:poet         # popular-poet (port 3001)
npm run build:tickets
npm run build:poet
npm run verify:supabase
```

Plik `.env` / `.env.local` trzymaj w **korzeniu** repozytorium (skrypty w `scripts/` ładują stamtąd zmienne).

## CI

GitHub Actions uruchamia `npm ci`, `lint` we wszystkich workspace oraz `tsc` dla obu aplikacji — patrz [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

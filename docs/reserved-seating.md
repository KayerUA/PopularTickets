# Reserved seating — Scena Kocjana

The venue template has 184 main seats and 20 closed side seats (1a–1d, rows III–VII). It was transcribed from the screenshot supplied on 2026-09-16. Occupancy in that screenshot belongs to a different performance and is not imported.

## Rollout

1. Apply `supabase/add-reserved-seating.sql` in the Supabase SQL Editor. The transaction adds tables, columns, service-role-only RPCs, and updates atomic fulfillment. It does not enable seating or change existing ticket IDs. It is safe to reapply. Do not rerun the original `schema.sql` afterward: it contains the older fulfillment function.
2. Configure `SEAT_SELECTION_SECRET` with at least 32 random bytes, independently of receipt/admin secrets. Keep `NEXT_PUBLIC_APP_URL`, `RESEND_API_KEY`, and `RESEND_FROM_EMAIL` configured. Personal links expire after 90 days; assignment is allowed only before the event starts.
3. Deploy the tickets application. Deploying before the migration will disable checkout because the new inventory check fails closed.
4. Open `/admin/seating`, select the exact event, and connect the template. The event capacity becomes 184. Default mode is `priority`: paid customers can select seats; new checkout is paused. Legacy pending payments retain capacity until paid or explicitly reconciled/cancelled.
5. Send individual invitations from the admin page, or copy personal links. Staff can assign seats for customers who reply with preferences. The selection must cover the entire order; existing QR codes and ticket numbers remain unchanged. Updated tickets are emailed and downloadable from the personal page.
6. Click “Открыть новую продажу” when ready. Unassigned paid tickets and pre-activation pending payments continue to count against capacity.

Target event verified read-only on 2026-09-16: `993eb835-3ec4-4795-a113-4278d52921a9`, slug `spektakl-boing-boing-scena-kocjana-2026-10-04`, 4 October 2026 at 19:00 Warsaw time. At inspection it had 4 paid orders / 7 tickets, 1 pending order / 2 tickets, and an old capacity of 185.

## Payment and seat ownership

Selection in the browser is tentative. `pt_reserve_seats` checks the complete selection atomically and holds seats for 30 minutes when checkout starts. The P24 registration uses a 15-minute `timeLimit`, leaving time for asynchronous confirmation. [P24's official API documentation](https://developers.przelewy24.pl/yaml/en_documentation_1.0.yaml) describes both the time limit and potentially delayed confirmation.

All reservation/assignment/fulfillment mutations serialize on the event row, with order locks acquired first where needed. A unique `(event_id, seat_id)` ticket index and composite foreign key protect assigned inventory. Public clients receive availability only, without buyer details or order IDs. Database RPC execution is restricted to the service role; admin actions independently check admin authentication.

Expired holds can be reused. If payment arrives after its seats were reclaimed, fulfillment records the payment and issues tickets with no seats, sets `seating_attention`, and displays a message in the receipt/email and admin seating list. Staff must contact the buyer to arrange available seats or a refund; there is no automatic refund. Seat changes after assignment are deliberately rejected; repeat submissions of the same assignment are idempotent. Seats cannot be blocked while assigned or actively held, and side seats cannot be reopened through the admin RPC.

Invitation sending is an explicit admin action; deploying or enabling the feature sends no mail. Invites use a same-day idempotency key, and the last invitation date is displayed. Assignment emails are sent only on a new assignment; email failure does not undo seats. A customer's personal page remains the source for downloading the current ticket.

## Verification

- `npm run test:tickets` — application tests, including layout inventory and signed-link tampering, scope, and expiry.
- `npm run build:tickets` — full Next.js production build.
- Isolated PostgreSQL/WASM tests (no production data):

```sh
npm install --prefix /tmp/populartickets-seating-check --no-audit --no-fund @electric-sql/pglite
PGLITE_MODULE=/tmp/populartickets-seating-check/node_modules/@electric-sql/pglite/dist/index.js node scripts/test-seating-db.mjs
```

The database script checks migration repeatability, competing claims, uniqueness, invalid/blocked selections, atomic rollback, hold expiry, late payments, old pending capacity, unchanged legacy ticket IDs, assignment idempotency and RPC permissions. PGlite serializes queries in one process; it verifies SQL outcomes, not a multi-connection production stress test.

Browser checks use the actual SeatMap component: 204 seats, 20 closed sides, an occupied seat, select/deselect and quantity limits, keyboard-accessible controls, contained mobile scrolling, and no browser errors. Test fixtures do not use live payments or send customer email.

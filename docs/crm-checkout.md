# PopularCRM Package Checkout API

PopularTickets is the payment desk. CRM creates one checkout and opens the returned `checkout_url` in the student's browser. Do not register a Przelewy24 transaction from CRM.

## Environment

Set the same `CRM_CHECKOUT_SECRET` in both applications. Tickets also uses `CRM_WEBHOOK_SECRET` when set (otherwise it signs the callback with `CRM_CHECKOUT_SECRET`). `CRM_CHECKOUT_ALLOWED_HOSTS` is a comma-separated allow-list for CRM hosts and defaults to `popularcrm.vercel.app`.

## Create checkout

`POST /api/crm/checkout`

```bash
curl -X POST https://www.populartickets.pl/api/crm/checkout \
  -H 'Authorization: Bearer YOUR_SHARED_SECRET' \
  -H 'Content-Type: application/json' \
  -d '{
    "crm_payment_id":"5e074f62-a7e5-4f82-bca4-4fe2b8294f16",
    "amount":395,
    "currency":"PLN",
    "description":"Pakiet 4 zajęć · Niedziela 12:30",
    "buyer_email":"student@example.com",
    "buyer_name":"Jan Kowalski",
    "payer_name":"Jan Kowalski",
    "invoice_number":"FV/2026/123",
    "return_url":"https://popularcrm.vercel.app/pay/return?payment_id=5e074f62-a7e5-4f82-bca4-4fe2b8294f16",
    "webhook_url":"https://popularcrm.vercel.app/api/v1/webhooks/tickets"
  }'
```

`amount` is PLN (up to two fractional digits). `invoice_number` and `payer_name` are optional, but should be sent when the CRM has them: they are stored with the order; payer is sent to P24 as the customer and invoice number is included in the P24 description. The endpoint is idempotent by `crm_payment_id`; a repeat returns the existing checkout URL. Different amount for the same ID returns `409`.

Successful response:

```json
{"ok":true,"checkout_url":"https://www.populartickets.pl/pl/crm-checkout/<order-id>","order_id":"<order-id>","crm_payment_id":"..."}
```

## Paid webhook

After P24 signature verification, Tickets marks the order `paid` and POSTs to `webhook_url`. It tries three times and stores every attempt in `crm_checkout_webhook_attempts`.

```json
{
  "crm_payment_id":"...",
  "status":"paid",
  "amount":395,
  "currency":"PLN",
  "tickets_order_id":"...",
  "p24_order_id":"123456789",
  "paid_at":"2026-07-30T12:00:00.000Z"
}
```

The callback has `X-CRM-Webhook-Signature: sha256=<HMAC-SHA256 raw JSON>` and `Authorization: Bearer <CRM_WEBHOOK_SECRET or CRM_CHECKOUT_SECRET>`. Verify one of these on CRM. The P24 browser return first reaches Tickets and then redirects to `return_url`; CRM must treat this redirect as informational and rely on the signed webhook for final paid state.

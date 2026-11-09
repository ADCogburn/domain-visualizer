---
status: accepted
---

# Invoices are immutable once sent

Once an Invoice is sent to a Customer it never changes; corrections go out as a Refund plus a new Invoice, so every bill the client received stays on record exactly as they saw it.

## Considered options

- **Edit in place**: simplest, but the customer's copy and ours drift apart.
- **Versioned invoices**: keeps history, but every payment request then needs a version.
- **Refund and reissue** (chosen): one more document, no ambiguity.

## Consequences

| Change requested | What we do |
| --- | --- |
| Wrong amount | Refund, then a new Invoice |
| Wrong address | New Invoice only |

A Payment always settles the Invoice it names:

```ts
settle(invoiceId: InvoiceId, payment: Payment): void
```

See [0002](./0002-payments-settle-oldest-invoice-first.md) for how a partial transaction is applied, and the [GLOSSARY](../../GLOSSARY.md) for terms.

<!-- reviewed 2026-10 -->
<script>alert('raw html is shown as text, never run')</script>

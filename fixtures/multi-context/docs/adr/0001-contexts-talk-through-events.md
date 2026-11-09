---
status: accepted
---

# Contexts talk through events, not shared tables

Ordering, Billing and Identity each own their data and publish events; no context reads another's tables, so a purchase in Ordering reaches Billing only as an `OrderPlaced` event.

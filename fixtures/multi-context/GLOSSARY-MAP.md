# Glossary Map

## Contexts

- [Ordering](./src/ordering/GLOSSARY.md): receives and tracks customer orders
- [Billing](./src/billing/GLOSSARY.md): generates invoices and processes payments
- [Identity](./src/identity/GLOSSARY.md): logins and permissions

## Relationships

- **Ordering → Billing**: Ordering emits `OrderPlaced` events; Billing consumes them to raise invoices
- **Billing ↔ Identity**: Billing looks up the account that acts for each customer

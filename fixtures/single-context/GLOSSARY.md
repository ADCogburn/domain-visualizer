# Billing

Generates invoices and collects payment for fulfilled orders.

## Language

### Invoicing

**Invoice**:
A request for payment sent to a customer after delivery.
_Avoid_: Bill, payment request

**Customer**:
A person or organization that places orders.
_Avoid_: Client, buyer, account

### Payments

**Payment**:
Money received against one or more invoices.
_Avoid_: transaction

**Refund**:
Money returned to a customer for a cancelled or returned order.

## Relationships

- An **Invoice** belongs to exactly one **Customer**
- A **Payment** settles one or more **Invoices**

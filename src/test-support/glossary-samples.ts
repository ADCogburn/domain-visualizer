// Sample glossaries shared by tests. Ported from seed/test.js.
export const billing = `# Billing

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

**Payment**: Money received against one or more invoices.
It can be partial.
*Avoid*: transaction

**Refund:**
Money returned to a customer for a cancelled or returned order.

## Relationships

- An **Invoice** belongs to exactly one **Customer**
`;

export const identity = `# Identity

## Language

**Account**:
A login identity that can act on behalf of a customer.
_Avoid_: user, login
`;


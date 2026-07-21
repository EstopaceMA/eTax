---
id: payment-with-egovpay
title: Pay through eGovPay
category: etax-how-to
audience: taxpayer
routes:
  - /filing
keywords:
  - eGovPay
  - payment
  - pay taxes
  - payment link
  - test payment
related:
  - filing-tracker
  - bir-form-preview
last_reviewed: 2026-07-22
---

# Pay through eGovPay

The Payment review in Filing tracker can open a hosted eGovPay test checkout.

## Steps

1. Open **Filing tracker**.
2. Select an open filing period.
3. Open **Payment review**.
4. Review the filing period, form, recorded income, and tax amount status.
5. Select **Proceed**.
6. Complete the test payment on the hosted eGovPay page.
7. Select **Return to merchant** to see the payment confirmation in eTax.

## Payment amount

eTax sends the **Tax amount payable** shown in the filing review to eGovPay. The
amount is temporarily set to PHP 10.00 while automatic tax calculation is being
connected.

## Payment status

The merchant return displays a test payment confirmation. It does not yet mark the
filing as paid because the current integration does not verify payment callbacks or
update payment status.

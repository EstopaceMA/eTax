# eTax Product Requirements Document

## Product Overview

eTax is a tax guidance and compliance companion for Filipino taxpayers. It helps users understand taxpayer categories, registration paths, tax setup, filing preparation, deadline tracking, and filing status records inside the product.

For this project, eTax focuses on guidance, preparation, deadlines, and status tracking. It does not submit real government filings or payments.

The MVP is category-first. Users begin by selecting the taxpayer category closest to their situation, such as employee or compensation earner, self-employed professional, single proprietor, mixed-income earner, E.O. 98 or one-time transaction taxpayer, or non-individual taxpayer. The app then creates a guided workspace for profile confirmation, checklist preparation, deadlines, readiness, and filing status.

## Problem Statement

Many Filipino taxpayers face fragmented tax preparation across forms, taxpayer categories, transaction types, and deadlines. Users often need to determine which category they belong to, which form applies, what documents are needed, and which deadlines require action.

The confusion is not limited to freelancers. Employees may need TIN or record guidance, self-employed professionals and single proprietors need setup and filing readiness, mixed-income earners must reconcile employment and business or professional income, and non-individual taxpayers need a clearer path through organizational registration and compliance steps.

This creates drop-off, missed deadlines, incomplete preparation, and repeated mistakes for taxpayers who do not naturally think in terms of tax process names or form boundaries.

## Product Vision

eTax turns tax compliance from a confusing form maze into a guided journey.

The product helps users answer three core questions:

- Which taxpayer category fits my situation?
- What do I need to do next?
- What is still missing before I mark a filing item complete?

The long-term vision is a taxpayer guidance layer for individuals and organizations that preserves a simple, citizen-centered experience. The MVP starts with category selection and a reusable compliance workspace so the product can support multiple taxpayer paths without changing its core model.

## Goals

### Business Goals

- Establish eTax as a clear guidance and compliance status workspace for Filipino taxpayers.
- Validate demand through category-first onboarding and recurring compliance support.
- Build a scalable product foundation that can support individual and non-individual taxpayer journeys.

### User Goals

- Identify the taxpayer category closest to their situation.
- Understand the correct first steps for tax compliance.
- Know which documents, forms, and channels are needed.
- Avoid missed deadlines and incomplete filing preparation.
- Feel confident before updating filing and payment status.

### Success Metrics

- Taxpayer category selection completion rate.
- Profile setup completion rate.
- Percentage of users who reach filing-ready status.
- Reminder engagement rate.
- Filing tracker update rate.
- User-reported clarity score after onboarding.

## Target Users

### Primary MVP Users

- Filipino taxpayers who need help identifying a taxpayer category and next steps.
- Employees or compensation earners who need TIN, registration, or record guidance.
- Self-employed professionals, freelancers, and single proprietors preparing for recurring compliance.
- Mixed-income earners balancing employment and business or professional income.
- E.O. 98, one-time transaction, estate, donor, or government-transaction users who need a directed path.
- Non-individual taxpayers that need lightweight registration and channel guidance.

### Future Users

- Small business owners needing deeper compliance dashboards.
- Organizations with multiple recurring filing obligations.
- Users who need lightweight tax record organization.
- Taxpayers who need more detailed segment-specific readiness flows.

## User Needs

Users need to understand their taxpayer category, registration path, documentary requirements, and recurring filing responsibilities in plain language. They also need practical guidance that turns tax preparation into a sequence of actions with reminders, checklists, and filing status records.

## Value Proposition

eTax helps Filipinos understand what tax obligations may apply to them, prepare what they need, and keep filing status records with less confusion.

For the MVP, it serves as a practical compliance workspace from category selection through profile confirmation, document preparation, deadline awareness, filing readiness, and status tracking.

## Scope

### In Scope for MVP

- Taxpayer category selection.
- Taxpayer profile and onboarding flow.
- Category-aware guided journey.
- Registration and setup checklist.
- Document checklist.
- Deadline calendar and reminders.
- Pre-filing readiness check.
- Quarterly filing and payment status tracker with generated PDF previews.

### Out of Scope for MVP

- Direct tax filing submission inside the app.
- Direct payment processing.
- Full accounting or bookkeeping suite.
- Automatic tax computation for all taxpayer categories.
- Deep corporate compliance management.
- Legal or tax advisory beyond guided educational support.

## Core Features

### 1. Taxpayer Category Selection

Users first select the taxpayer category closest to their situation. Categories include employee or compensation earner, self-employed professional or freelancer, single proprietor, mixed-income earner, E.O. 98 or one-time transaction taxpayer, and non-individual taxpayer.

This selection determines the starting profile language, recommended forms, and checklist emphasis.

### 2. Taxpayer Profile Setup

Users complete or confirm a simple profile that identifies income type, work or entity arrangement, prior registration status, TIN status, RDO context, and likely taxpayer path. This profile powers reminders, checklists, and filing status records.

### 3. Guided Registration Journey

The app provides a step-by-step setup flow for initial or updated compliance, including TIN-related next steps, registration requirements, and onboarding actions.

Each step should use plain language and indicate whether the action can be completed online or may require another channel or office process.

### 4. Document and Form Checklist

Users receive a tailored checklist of common forms, information, and documentary requirements associated with their setup and filing journey. The checklist should support completion states and preparation status so users can see what is still missing.

### 5. Deadline Calendar and Reminders

The app provides a calendar of relevant deadlines and upcoming compliance events. Reminder notifications should appear in-app and help users prepare before deadlines.

### 6. Pre-Filing Readiness Checker

Before users update filing status, the app reviews whether core details, documents, and preparation tasks have been completed.

This is not a legal validation engine. It is a checklist-based readiness layer that reduces preventable mistakes.

### 7. Filing and Payment Tracker

Users can choose 1st Quarter through 4th Quarter filing options, preview generated income tax form PDFs populated with known profile data, download the generated PDF, and mark an obligation as draft, ready, filed, or paid. The first three quarters use Form 1701Q, while the fourth option represents annual filing with Form 1701A. This creates continuity between preparation and payment-status tracking.

## User Stories

### Category Onboarding

- As a taxpayer, I want to choose the category closest to my situation so I can see relevant next steps.
- As a first-time user, I want plain-language category descriptions so I do not choose based only on tax jargon.
- As a user unsure of my route, I want the app to explain which form or filing workflow is likely relevant.

### Filing Preparation

- As a user, I want a checklist of required documents and information so I can prepare before I file.
- As a user, I want reminders about deadlines so I do not forget compliance dates.
- As a user, I want to know whether I am filing-ready before I update a filing record.

### Ongoing Compliance

- As a user, I want to track whether I have already filed or paid so I can stay organized.
- As a user, I want a reusable dashboard for my recurring obligations so tax compliance feels manageable over time.

## User Journey

### MVP Journey: Category First

1. User opens eTax and chooses a taxpayer category.
2. User completes or confirms profile setup with work or entity type, income pattern, and registration status.
3. App generates a first-step checklist.
4. User reviews required documents and setup tasks.
5. User receives calendar deadlines and reminders.
6. User completes a pre-filing readiness check.
7. User updates the filing and payment record under their tax profile.
8. User returns to mark status as filed or paid where applicable.

## Functional Requirements

| Area | Requirement |
| --- | --- |
| Onboarding | System must capture taxpayer category, work or entity type, and registration status. |
| Personalization | System must generate relevant checklist and deadline defaults based on onboarding answers. |
| Checklist | System must display task-level completion states for documents and setup steps. |
| Reminders | System must show deadline reminders tied to the user journey. |
| Readiness | System must surface missing items before filing status updates. |
| Tracking | System must allow status tagging for obligations: draft, ready, filed, paid. |
| Expansion | System architecture should support additional taxpayer journeys and deeper segment-specific flows. |

## Non-Functional Requirements

- Mobile-first responsive interface.
- Clear, plain-language content suitable for non-expert users.
- Accessible navigation and readable checklist design.
- Fast loading for common mobile connectivity conditions.
- Reliable state handling during filing status updates.
- Modular information architecture for future segment expansion.

## Assumptions

- Users are willing to complete a guided setup if the benefit is immediate clarity.
- Filing and payment status updates are records only and do not create legal filings.
- Initial value is driven more by guidance and readiness than by full filing automation.
- Category-first onboarding can validate broader demand across multiple taxpayer segments.

## Risks and Dependencies

### Risks

- Tax rules and requirements may change, requiring content updates.
- Users may expect direct filing even though the MVP is guidance-first.
- Overly complex wording may reduce trust and completion.
- Incorrect routing or outdated information could create user frustration.
- Broad category support may create expectations for deep segment-specific advice before the product is ready.

### Dependencies

- Accurate content mapping for categories, registration, forms, and channels is maintained.
- Notification and reminder logic is implemented consistently.

## Product Phases

### MVP

- Category-first onboarding.
- Taxpayer profile setup.
- Registration checklist.
- Deadline reminders.
- Readiness checker.
- Status tracking.

### Phase 2

- Deeper category-specific journeys.
- Mixed-income filing scenarios.
- Sole proprietor and online seller flows.
- Smarter recommendations for pathways and reminders.

### Phase 3

- Non-individual taxpayer workflows.
- Lightweight tax record organization.
- Deeper compliance dashboard for repeat users.
- Segment-specific support experiences.

## Open Questions

- Which taxpayer category should receive the deepest first workflow after the shared MVP?
- Should reminders be purely in-app for MVP, or should they also support email or SMS later?
- How much tax setup decision support should be included without becoming advisory?
- Which filing status scenarios should be emphasized most in the first release?
- What proof of value matters most for judges: category clarity, completion, or compliance readiness?

## Summary

eTax is a broad tax guidance product with category-first onboarding and a reusable compliance workspace. It uses profile-based journeys, checklists, reminders, and filing status records to make Filipino tax compliance easier to understand and demonstrate.

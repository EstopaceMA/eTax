# eTax System Architecture

## High-Level Architecture

```mermaid
flowchart LR
    taxpayer["Taxpayer"] --> browser["Web browser"]
    browser --> app["eTax<br/>Next.js + TypeScript<br/>Vercel"]

    subgraph data["Application data"]
        auth["Supabase Auth"]
        db["PostgreSQL"]
        storage["Private Storage"]
    end

    subgraph egov["DICT / eGov services"]
        sso["eGovPH SSO"]
        assistant["AI Assistant"]
        extractor["Document Extractor"]
        pay["eGovPay"]
        sms["eMessage SMS"]
    end

    app --> auth
    app --> db
    app --> storage
    app --> sso
    app --> assistant
    app --> extractor
    app --> pay
    app --> sms
    pay -->|"Status callback"| app
    pay --> verification["Verification in eGovPay<br/>or the eGovPH app"]
```

All eGov credentials are server-side environment variables. The browser only
communicates with eTax routes and the hosted eGovPay page; it never receives API
tokens or partner secrets.

## User and Data Flow

```mermaid
flowchart TD
    signIn["Sign in / resolve SSO profile"] --> workspace["Taxpayer workspace"]
    workspace --> upload["Upload invoice or income record"]
    upload --> extract["Document Extractor reads document"]
    extract --> confirm["Taxpayer confirms extracted amount"]
    confirm --> compute["Deterministic Form 1701Q computation"]
    compute --> pdf["Generate reviewable Form 1701Q PDF"]
    pdf --> approval["Taxpayer approves filing/payment action"]
    approval --> checkout["Hosted eGovPay checkout"]
    checkout --> callback["Validated return and status callback"]
    callback --> tracking["Update eTax filing/payment state"]
    tracking --> receipt["eMessage SMS notification"]
```

AI extraction proposes document values; it does not silently create confirmed
tax records. The taxpayer reviews and confirms the amount before it becomes an
input to the deterministic computation.

## eGov Integration Sequences

### SSO

```mermaid
sequenceDiagram
    actor U as Taxpayer
    participant E as eTax server
    participant S as eGovPH SSO
    participant D as Supabase

    U->>E: Submit single-use exchange code
    E->>S: Exchange code using partner credentials
    S-->>E: Short-lived access token
    E->>S: Resolve citizen profile
    S-->>E: Authorized profile fields
    E->>D: Encrypt and store required profile data
    E-->>U: Continue to taxpayer workspace
```

### Document Extraction

```mermaid
sequenceDiagram
    actor U as Taxpayer
    participant E as eTax server
    participant X as Document Extractor
    participant D as Supabase

    U->>E: Upload invoice image or PDF
    E->>X: Send document with server-held token
    X-->>E: Extracted document text
    E-->>U: Proposed total for review
    U->>E: Confirm or correct amount
    E->>D: Save confirmed income record and private file
```

### Payment and Notification

```mermaid
sequenceDiagram
    actor U as Taxpayer
    participant E as eTax server
    participant P as eGovPay
    participant M as eMessage

    U->>E: Approve payment amount
    E->>P: Create signed test transaction
    P-->>E: Hosted payment URL and reference
    E-->>U: Redirect to hosted checkout
    U->>P: Complete test payment
    P-->>E: Return and status callback
    E->>E: Validate reference and update payment state
    E->>M: Send receipt or next-step SMS
    E-->>U: Show payment completion state
```

## Source Locations

| Concern | Implementation |
| --- | --- |
| SSO token/profile calls | `lib/egov-sso/client.ts` |
| AI Assistant | `lib/egov/ai-assistant.ts` |
| Document Extractor | `lib/egov/document-extractor.ts` |
| eGovPay transaction creation | `lib/egovpay/client.ts` |
| eGovPay callback and return | `app/api/egovpay/` |
| eMessage SMS | `lib/emessage/sms.ts` |
| Tax computation | `lib/tax/` |
| Form 1701Q generation | `lib/pdf/1701q/` and `app/api/filing/pdf/` |

The original visual versions are also included for local viewing:

- [Full architecture](etax-full-architecture.html)
- [Simplified architecture](etax-simple-architecture.html)

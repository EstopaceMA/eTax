import type {
  ChecklistStatus,
  DeadlineStatus,
  FilingStatus,
  PaymentStatus,
  RoadmapStatus,
} from "@/lib/types";

export const mockFilingModules = [
  {
    key: "profile-review",
    name: "Profile review",
    description:
      "Review taxpayer category, TIN status, registration status, and filing cadence before preparing a mock return.",
    url: null,
    external: false,
  },
  {
    key: "readiness-check",
    name: "Readiness check",
    description:
      "Confirm required profile details and checklist items before starting a mock filing.",
    url: null,
    external: false,
  },
  {
    key: "mock-submit",
    name: "Mock filing submission",
    description:
      "Simulate reviewing a return, submitting it, and moving the obligation to filed status.",
    url: null,
    external: false,
  },
  {
    key: "mock-payment",
    name: "Mock payment status",
    description:
      "Practice marking a simulated payment as unpaid, paid, or not required.",
    url: null,
    external: false,
  },
];

export const starterRoadmapSteps: Array<{
  title: string;
  description: string;
  status: RoadmapStatus;
  sort_order: number;
  handoff_key: string | null;
}> = [
  {
    title: "Confirm registered taxpayer profile",
    description:
      "Review your TIN, RDO, registration status, and filing cadence before preparing a return.",
    status: "filed",
    sort_order: 1,
    handoff_key: "profile-review",
  },
  {
    title: "Prepare filing documents",
    description:
      "Gather registration details, income records, expense notes, and prior payment references.",
    status: "ready",
    sort_order: 2,
    handoff_key: null,
  },
  {
    title: "Run pre-filing readiness",
    description:
      "Check whether required documents and status fields are complete before starting a mock filing.",
    status: "ready",
    sort_order: 3,
    handoff_key: "readiness-check",
  },
  {
    title: "Complete mock filing",
    description:
      "Review the simulated filing details and submit the mock return inside eTax.",
    status: "draft",
    sort_order: 4,
    handoff_key: "mock-submit",
  },
  {
    title: "Mark filed and paid",
    description:
      "Update your mock filing and payment status so the compliance tracker stays current.",
    status: "draft",
    sort_order: 5,
    handoff_key: null,
  },
];

export const starterChecklistItems: Array<{
  title: string;
  description: string;
  required: boolean;
  status: ChecklistStatus;
}> = [
  {
    title: "Certificate of Registration details",
    description:
      "Keep registration details nearby to confirm tax types and RDO for the mock filing.",
    required: true,
    status: "complete",
  },
  {
    title: "TIN and registered address",
    description:
      "Confirm your TIN and registered address before using the mock filing flow.",
    required: true,
    status: "complete",
  },
  {
    title: "Income records for the filing period",
    description:
      "Prepare invoices, platform payouts, client remittances, or other income summaries.",
    required: true,
    status: "missing",
  },
  {
    title: "Deductible expense notes",
    description:
      "Gather receipts or notes you plan to reference while preparing your return.",
    required: false,
    status: "missing",
  },
  {
    title: "Prior filing or payment references",
    description:
      "Save reference numbers from any previous filing or payment record you want to track.",
    required: false,
    status: "complete",
  },
];

export const starterDeadlines: Array<{
  title: string;
  description: string;
  due_date: string;
  status: DeadlineStatus;
  channel: string;
}> = [
  {
    title: "Quarterly income tax preparation",
    description:
      "Review income records and missing checklist items before starting mock filing.",
    due_date: "2026-08-15",
    status: "due_soon",
    channel: "Mock filing",
  },
  {
    title: "Monthly percentage tax review",
    description:
      "Confirm whether this obligation applies to your registered tax type before proceeding.",
    due_date: "2026-08-20",
    status: "upcoming",
    channel: "Mock filing",
  },
  {
    title: "Registration record check",
    description:
      "Review whether any profile details should be updated before your mock workflow.",
    due_date: "2026-09-05",
    status: "upcoming",
    channel: "Profile review",
  },
];

export const starterFilingObligations: Array<{
  form_name: string;
  period: string;
  due_date: string;
  status: FilingStatus;
  payment_status: PaymentStatus;
}> = [
  {
    form_name: "Quarterly income tax return",
    period: "Q2 2026",
    due_date: "2026-08-15",
    status: "ready",
    payment_status: "unpaid",
  },
  {
    form_name: "Monthly percentage tax",
    period: "July 2026",
    due_date: "2026-08-20",
    status: "draft",
    payment_status: "unpaid",
  },
  {
    form_name: "Registration profile review",
    period: "2026 annual check",
    due_date: "2026-09-05",
    status: "draft",
    payment_status: "not_required",
  },
];

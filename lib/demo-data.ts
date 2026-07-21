import type {
  ChecklistStatus,
  DeadlineStatus,
  FilingStatus,
  PaymentStatus,
} from "@/lib/types";
import { getQuarterlyFilingSeeds } from "@/lib/filing-periods";

export const starterChecklistItems: Array<{
  title: string;
  description: string;
  required: boolean;
  status: ChecklistStatus;
}> = [
  {
    title: "Certificate of Registration details",
    description:
      "Keep registration details nearby to confirm tax types and RDO before filing.",
    required: true,
    status: "complete",
  },
  {
    title: "TIN and registered address",
    description:
      "Confirm your TIN and registered address before updating filing status.",
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
      "Review income records and missing checklist items before filing.",
    due_date: "2026-08-15",
    status: "due_soon",
    channel: "Filing tracker",
  },
  {
    title: "Monthly percentage tax review",
    description:
      "Confirm whether this obligation applies to your registered tax type before proceeding.",
    due_date: "2026-08-20",
    status: "upcoming",
    channel: "Filing tracker",
  },
  {
    title: "Registration record check",
    description:
      "Review whether any profile details should be updated before filing.",
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
}> = getQuarterlyFilingSeeds();

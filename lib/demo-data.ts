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
    title: "2nd Quarter Form 1701Q",
    description:
      "Upload income record images, confirm total income, and review the generated Form 1701Q preview.",
    due_date: "2026-08-15",
    status: "due_soon",
    channel: "Filing tracker · BIR Form",
  },
  {
    title: "3rd Quarter Form 1701Q",
    description:
      "Prepare the next quarter's income records before opening the Form 1701Q preview.",
    due_date: "2026-11-15",
    status: "upcoming",
    channel: "Filing tracker · Documents",
  },
  {
    title: "Annual Form 1701A",
    description:
      "Review annual income records and confirm profile details before generating Form 1701A.",
    due_date: "2027-04-15",
    status: "upcoming",
    channel: "Filing tracker · Annual filing",
  },
];

export const starterFilingObligations: Array<{
  form_name: string;
  period: string;
  due_date: string;
  status: FilingStatus;
  payment_status: PaymentStatus;
}> = getQuarterlyFilingSeeds();

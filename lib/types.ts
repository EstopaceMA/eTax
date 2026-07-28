export type ChecklistStatus = "missing" | "complete";
export type DeadlineStatus = "upcoming" | "due_soon" | "completed" | "overdue";
export type FilingStatus =
  | "draft"
  | "review"
  | "ready"
  | "handed_off"
  | "pending_verification"
  | "filed"
  | "paid"
  | "blocked"
  | "exception";
export type PaymentStatus =
  | "unpaid"
  | "approval_required"
  | "handed_off"
  | "pending_verification"
  | "paid"
  | "not_required"
  | "blocked"
  | "exception";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
};

export type TaxpayerProfile = {
  id: string;
  user_id: string;
  taxpayer_type: string;
  work_type: string;
  registration_status: string;
  rdo: string | null;
  filing_frequency: string;
};

/** Identity as held by eGovPH — the source of truth for name, contact and TIN. */
export type SsoProfile = {
  sso_uid: string;
  email: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  full_name: string;
  mobile: string | null;
  tin_id: string | null;
  photo_url: string | null;
  birth_date: string | null;
  nationality: string | null;
  address: string | null;
  postal: string | null;
};

export type DocumentChecklistItem = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  required: boolean;
  status: ChecklistStatus;
};

export type Deadline = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  due_date: string;
  status: DeadlineStatus;
  channel: string;
};

export type FilingObligation = {
  id: string;
  user_id: string;
  form_name: string;
  period: string;
  due_date: string;
  status: FilingStatus;
  payment_status: PaymentStatus;
  generated_pdf_at?: string | null;
};

export type IncomeRecordUpload = {
  id: string;
  user_id: string;
  quarter: number;
  period: string;
  original_filename: string;
  storage_path: string;
  content_type: string | null;
  size_bytes: number | null;
  content_hash?: string | null;
  total_income: number | null;
  extraction_status: "provisional" | "confirmed" | "needs_review";
  extraction_confidence: number | null;
  extracted_text: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at?: string;
  signed_url?: string;
};

export type WorkspaceData = {
  profile: Profile | null;
  taxpayerProfile: TaxpayerProfile | null;
  ssoProfile: SsoProfile | null;
  checklistItems: DocumentChecklistItem[];
  deadlines: Deadline[];
  filingObligations: FilingObligation[];
  incomeRecordUploads: IncomeRecordUpload[];
};

export type ChecklistStatus = "missing" | "complete";
export type DeadlineStatus = "upcoming" | "due_soon" | "completed" | "overdue";
export type FilingStatus = "draft" | "ready" | "filed" | "paid";
export type PaymentStatus = "unpaid" | "paid" | "not_required";

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
  tin_status: string;
  rdo: string | null;
  filing_frequency: string;
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
  total_income: number | null;
  created_at: string;
  signed_url?: string;
};

export type WorkspaceData = {
  profile: Profile | null;
  taxpayerProfile: TaxpayerProfile | null;
  checklistItems: DocumentChecklistItem[];
  deadlines: Deadline[];
  filingObligations: FilingObligation[];
  incomeRecordUploads: IncomeRecordUpload[];
};

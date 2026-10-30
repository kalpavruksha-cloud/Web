export type Role = "client" | "admin";

export type ApiMeta = {
  timestamp: string;
  requestId: string;
};

export type ApiError = {
  code: string;
  details: string;
};

export type APIResponse<T> = {
  success: boolean;
  message: string;
  data: T | null;
  error: ApiError | null;
  meta: ApiMeta;
};

export type User = {
  id: string;
  clientId?: string;
  email: string;
  name: string;
  role: Role;
  status: "active" | "inactive" | "pending" | "blocked";
};

export type Profile = {
  clientId: string;
  fullName: string;
  profilePhotoUrl?: string;
  profilePhotoFileId?: string;
  profilePhotoPreviewUrl?: string;
  mobile?: string;
  email?: string;
  dateOfBirth?: string;
  payoutDate?: string | null;
  registrationDate?: string;
  address?: string;
  pan?: string;
  aadhaar?: string;
  kycStatus?: string;
  bankAccount?: string;
  ifsc?: string;
  branch?: string;
  nomineeName?: string;
  nomineeRelationship?: string;
  nomineeMobile?: string;
  riskProfile?: string;
  accountStatus?: string;
};

export type Investment = {
  id: string;
  clientId: string;
  plan: string;
  category?: string;
  principalAmount: number;
  startDate?: string;
  maturityDate?: string;
  returnRate?: number;
  monthlyReturn?: number;
  nextPayoutDate?: string;
  payoutFrequency?: string;
  monthlyPayoutRate?: number;
  currentValue?: number;
  status: string;
  agreementDetails?: string;
  paymentMode?: string;
  notes?: string;
};

export type Transaction = {
  id: string;
  clientId: string;
  date?: string;
  scheduledPayoutDate?: string | null;
  type: string;
  description?: string;
  credit: number;
  debit: number;
  balance?: number;
  reference?: string;
  status: string;
};

export type Withdrawal = {
  id: string;
  clientId: string;
  amount: number;
  requestDate?: string;
  bankAccount?: string;
  remarks?: string;
  status: "pending" | "approved" | "rejected" | "paid" | "recorded" | "withdrawn" | "completed" | "posted" | "settled" | "success" | "successful" | "cancelled";
  approvalDate?: string;
  paymentReference?: string;
  paymentDate?: string;
  adminRemarks?: string;
  recordSource?: "withdrawal_master";
  readOnly?: boolean;
};

export type Referral = {
  id: string;
  clientId: string;
  code?: string;
  referredClientName?: string;
  referredClientId?: string;
  status?: string;
  rewardAmount: number;
  paidAmount: number;
  createdAt?: string;
};

export type ClientDocument = {
  id: string;
  clientId: string;
  name: string;
  type: string;
  uploadDate?: string;
  status: string;
  driveUrl?: string;
  fileId?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
};

export type ClientNotification = {
  id: string;
  clientId?: string;
  title: string;
  message: string;
  date?: string;
  type?: string;
  read: boolean;
  priority?: "low" | "normal" | "high";
};

export type PortalSettings = {
  companyName?: string;
  contactEmail?: string;
  contactPhone?: string;
  supportEmail?: string;
  supportPhone?: string;
  supportWhatsAppUrl?: string;
  portalNotice?: string;
  maintenanceMode?: boolean;
  referralEnabled?: boolean;
  payoutDay?: string;
  brandingText?: string;
};

export type AdminDashboardRecords = {
  clients: Profile[];
  investments: Investment[];
  transactions: Transaction[];
  withdrawals: Withdrawal[];
  documents: ClientDocument[];
  referrals: Referral[];
  notifications: ClientNotification[];
};

export type AdminPendingPayout = {
  clientId: string;
  clientName: string;
  period: string;
  scheduledAmount: number;
  recordedAmount: number;
  remainingAmount: number;
  dueDate: string | null;
  nextScheduledDate: string | null;
  note: string;
  dueStatus: "overdue" | "due_today" | "upcoming" | "date_unavailable" | "review_required";
};

export type AdminFinancialAnalytics = {
  asOf: string;
  currentYear: number;
  currentMonth: number;
  investmentSource: "transaction_ledger" | "investment_records" | "investment_master";
  withdrawalSource: "transaction_ledger" | "paid_withdrawals" | "withdrawal_master" | "combined_records";
  investmentMonths: Array<{ month: string; amount: number }>;
  withdrawalMonths: Array<{ month: string; amount: number }>;
  payoutMonths: Array<{ month: string; amount: number }>;
  payoutScheduleSource?: "dashboard" | "investment_records" | "investment_calendar";
  payoutCalendarReady?: boolean;
  payoutCalendarWarnings?: string[];
  upcomingPayouts?: AdminPendingPayout[] | null;
  upcomingPayoutAmount?: number | null;
  upcomingPayoutPeriod?: string;
  pendingPayouts?: AdminPendingPayout[] | null;
  pendingPayoutWarnings?: string[];
  withdrawalDays: Array<{ date: string; amount: number }>;
  warnings: string[];
  portfolioMonths?: Array<{ month: string; amount: number }>;
  portfolioHistoryMonths?: Array<{ month: string; amount: number | null }>;
  portfolioHistorySource?: "recorded_balances" | "recorded_cash_flow" | "current_snapshot";
  portfolioReconciliation?: { calculated: number; recorded: number; difference: number; matches: boolean };
  portfolioGrowthSource?: "transaction_ledger" | "investment_records" | "current_snapshot";
  portfolioDistribution?: Array<{ name: string; amount: number }>;
  portfolioDistributionSource?: "investment_records" | "dashboard_clients";
  portfolioDistributionBasis?: "current_portfolio" | "current_value" | "principal";
  transactionMonths?: Array<{ month: string; amount: number }>;
  transactionFlowMonths?: Array<{ month: string; credit: number; debit: number; net: number; count: number }>;
  registrationMonths?: Array<{ month: string; count: number }>;
  withdrawalStatus?: Array<{ name: string; amount: number }>;
  sources?: Array<{ module: string; sheet: string | null; recordCount: number; headers: string[]; warnings: string[] }>;
  excludedTransactionStatuses?: Record<string, number>;
};

export type DashboardSummary = {
  client?: Profile;
  totalInvestedAmount: number;
  currentPortfolioValue: number;
  totalReturns: number;
  totalPayouts?: number;
  totalWithdrawal?: number;
  presentInvestment?: number | null;
  monthlyPayout?: number | null;
  monthlyReturn: number;
  walletBalance: number;
  availableBalance?: number;
  portfolioHistory?: {
    asOf: string;
    months: Array<{ month: string; amount: number | null }>;
    source: "recorded_balances" | "recorded_cash_flow" | "current_snapshot";
    matchesCurrentPortfolio: boolean;
  };
  adminClientSummaries?: Array<{ clientId: string; totalInvestment: number | null; totalWithdrawal: number | null; totalPayout: number | null; totalPortfolio: number | null }>;
  activeInvestments: number;
  pendingWithdrawals: number;
  referralEarnings: number;
  nextPayoutDate?: string;
  recentTransactions: Transaction[];
  portfolioGrowth?: Array<{ date?: string; value: number; credit?: number; debit?: number; transactionId?: string; investmentId?: string }>;
  investmentGrowth?: Array<{ date?: string; value: number; credit?: number; debit?: number; transactionId?: string; investmentId?: string }>;
  investments: Investment[];
  documents: ClientDocument[];
  notifications: ClientNotification[];
  kycStatus?: string;
  agreementStatus?: string;
  adminData?: AdminDashboardRecords;
  adminAnalytics?: AdminFinancialAnalytics;
  admin?: {
    totalClients: number;
    activeClients: number;
    totalInvestment: number;
    portfolioValue: number;
    monthlyPayoutAmount: number;
    estimatedMonthlyPayout?: number | null;
    scheduledMonthlyPayout?: number | null;
    paidMonthlyPayout?: number | null;
    remainingMonthlyPayout?: number | null;
    payoutCalendarReady?: boolean;
    upcomingPayoutAmount?: number | null;
    upcomingPayoutPeriod?: string;
    payoutEstimateMissingRecords?: number;
    totalPayoutAmount?: number;
    totalWithdrawalAmount?: number;
    netInvestment?: number;
    pendingWithdrawalAmount?: number;
    verifiedKyc?: number;
    pendingWithdrawals: number;
    pendingKyc: number;
    activeInvestments: number;
    referralLiabilities: number;
  };
};

export type SpreadsheetColumnIssue = {
  sheet: string;
  missingRequiredColumns: string[];
  unresolvedColumns: string[];
};

export type SpreadsheetSchema = {
  spreadsheetId: string;
  sheets: Array<{ name: string; headers: string[]; recordCount: number }>;
  warnings: SpreadsheetColumnIssue[];
};

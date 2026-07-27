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
  mobile?: string;
  email?: string;
  dateOfBirth?: string;
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
  status: "pending" | "approved" | "rejected" | "paid";
  approvalDate?: string;
  paymentReference?: string;
  adminRemarks?: string;
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

export type DashboardSummary = {
  client?: Profile;
  totalInvestedAmount: number;
  currentPortfolioValue: number;
  totalReturns: number;
  monthlyReturn: number;
  walletBalance: number;
  activeInvestments: number;
  pendingWithdrawals: number;
  referralEarnings: number;
  nextPayoutDate?: string;
  recentTransactions: Transaction[];
  investments: Investment[];
  documents: ClientDocument[];
  notifications: ClientNotification[];
  kycStatus?: string;
  agreementStatus?: string;
  admin?: {
    totalClients: number;
    activeClients: number;
    totalInvestment: number;
    portfolioValue: number;
    monthlyPayoutAmount: number;
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

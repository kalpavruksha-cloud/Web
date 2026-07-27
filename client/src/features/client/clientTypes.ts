import type { ClientDocument, ClientNotification, DashboardSummary, Investment, Profile, Referral, Transaction, Withdrawal } from "../../types/domain";

export type BankDetails = {
  clientId: string;
  accountHolderName?: string;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  branch?: string;
  accountType?: string;
  upiId?: string;
  cancelledChequeUrl?: string;
  verificationStatus?: string;
  adminRemarks?: string;
  lastUpdatedDate?: string;
};

export type InvestmentPlan = {
  id: string;
  planName: string;
  category?: string;
  minimumAmount?: number;
  maximumAmount?: number;
  returnRate?: number;
  duration?: string;
  payoutFrequency?: string;
  riskCategory?: string;
  description?: string;
  termsUrl?: string;
  status?: string;
};

export type InvestmentRequest = {
  requestId: string;
  clientId: string;
  planId?: string;
  planName?: string;
  amount: number;
  paymentMode?: string;
  paymentReference?: string;
  paymentDate?: string;
  paymentProofUrl?: string;
  requestDate?: string;
  status?: string;
  adminRemarks?: string;
  approvedInvestmentId?: string;
  approvedDate?: string;
};

export type Agreement = {
  agreementId: string;
  clientId: string;
  investmentId?: string;
  agreementName?: string;
  agreementType?: string;
  issueDate?: string;
  effectiveDate?: string;
  maturityDate?: string;
  signingStatus?: string;
  documentStatus?: string;
  adminRemarks?: string;
  driveUrl?: string;
};

export type SupportTicket = {
  ticketId: string;
  clientId: string;
  subject?: string;
  category?: string;
  priority?: string;
  message?: string;
  attachmentUrl?: string;
  createdDate?: string;
  status?: string;
  adminResponse?: string;
  updatedDate?: string;
};

export type ClientPreferences = {
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  whatsappNotifications?: boolean;
  preferredLanguage?: string;
};

export type AccountOverview = {
  profile?: Profile;
  investmentSummary?: Record<string, number>;
  transactionSummary?: Record<string, number>;
  withdrawalSummary?: Record<string, number>;
  referralSummary?: Record<string, number>;
  documentCompletion?: number;
  bankVerificationStatus?: string;
  agreementsStatus?: string;
};

export type ClientDashboardData = DashboardSummary & {
  totalPayouts?: number;
  availableBalance?: number;
  pendingInvestmentRequests?: number;
};

export type ClientCollections = {
  profile?: Profile;
  dashboard?: ClientDashboardData;
  transactions: Transaction[];
  investments: Investment[];
  withdrawals: Withdrawal[];
  documents: ClientDocument[];
  referrals: Referral[];
  notifications: ClientNotification[];
};

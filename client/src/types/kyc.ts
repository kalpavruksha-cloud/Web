export type KycStatus = "pending" | "under_review" | "verified" | "rejected" | "review_required";

export type KycDocument = {
  id: string;
  name: string;
  kind: "pan" | "aadhaar";
  status: string;
  uploadDate: string;
  driveUrl: string;
};

export type KycRecord = {
  clientId: string;
  pan: string;
  aadhaarLast4: string;
  aadhaar?: string;
  aadhaarConfigured: boolean;
  status: KycStatus;
  remarks: string;
  verificationDate: string;
  verifiedBy: string;
  panDocumentId: string;
  aadhaarDocumentId: string;
  revision: string;
  documents: KycDocument[];
};

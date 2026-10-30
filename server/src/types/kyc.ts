export type KycRecord = {
  clientId: string;
  pan: string;
  aadhaar?: string;
  aadhaarLast4: string;
  aadhaarConfigured: boolean;
  status: "pending" | "under_review" | "verified" | "rejected" | "review_required";
  remarks: string;
  verificationDate: string;
  verifiedBy: string;
  panDocumentId: string;
  aadhaarDocumentId: string;
  revision: string;
  documents: Array<{ id: string; name: string; kind: "pan" | "aadhaar"; status: string; uploadDate: string; driveUrl: string }>;
};

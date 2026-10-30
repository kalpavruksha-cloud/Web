import { createHmac } from "node:crypto";

export function kycProofMessage(action: string, payload: Record<string, unknown>, spreadsheetId: string, requestId: string, issuedAt: number) {
  return JSON.stringify(["KYCv1", action, spreadsheetId, requestId, String(payload.role || ""), String(payload.actorId || ""), String(payload.clientId || ""), issuedAt,
    payload.expectedRevision ?? "", payload.pan ?? null, payload.aadhaar ?? null, payload.decision ?? null, payload.remarks ?? "", payload.panDocumentId ?? "", payload.aadhaarDocumentId ?? "", payload.confirmDocumentsReviewed === true]);
}

export function signKycPayload<T extends Record<string, unknown>>(action: string, payload: T, spreadsheetId: string, requestId: string, secret: string, issuedAt = Date.now()) {
  const signature = createHmac("sha256", secret).update(kycProofMessage(action, payload, spreadsheetId, requestId, issuedAt)).digest("base64url");
  return { ...payload, kycProof: { issuedAt, signature } };
}

import { z } from "zod";

export const kycNumbersSchema = z.object({
  expectedRevision: z.string().min(1).max(128),
  pan: z.string().trim().toUpperCase().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Enter a valid 10-character PAN").optional(),
  aadhaar: z.string().trim().transform((value) => value.replace(/\s/g, "")).pipe(z.string().regex(/^[2-9][0-9]{11}$/, "Enter a valid 12-digit Aadhaar number")).optional()
}).strict().refine((value) => value.pan !== undefined || value.aadhaar !== undefined, "Enter PAN or Aadhaar details to save");

export const kycReviewSchema = z.object({
  expectedRevision: z.string().min(1).max(128),
  decision: z.enum(["verified", "rejected", "pending"]),
  remarks: z.string().trim().max(1000).default(""),
  panDocumentId: z.string().trim().max(200).optional(),
  aadhaarDocumentId: z.string().trim().max(200).optional(),
  confirmDocumentsReviewed: z.boolean().default(false)
}).strict().superRefine((value, ctx) => {
  if (value.decision === "verified" && (!value.panDocumentId || !value.aadhaarDocumentId || !value.confirmDocumentsReviewed)) {
    ctx.addIssue({ code: "custom", message: "Select both documents and confirm they have been reviewed" });
  }
  if (value.decision !== "verified" && !value.remarks) ctx.addIssue({ code: "custom", message: "Enter a review reason" });
});

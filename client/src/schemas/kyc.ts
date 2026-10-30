import { z } from "zod";

export const kycDetailsSchema = z.object({
  pan: z.string().trim().toUpperCase().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Enter a valid 10-character PAN"),
  aadhaar: z.string().trim().transform((value) => value.replace(/\s/g, "")).pipe(z.string().regex(/^[2-9][0-9]{11}$/, "Enter a valid 12-digit Aadhaar number")).optional()
});

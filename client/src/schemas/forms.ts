import { z } from "zod";

export const withdrawalFormSchema = z.object({
  amount: z.coerce.number().positive("Enter a valid amount"),
  bankAccount: z.string().trim().min(4, "Select or enter a bank account"),
  remarks: z.string().max(500).optional()
});

export const profileFormSchema = z.object({
  profilePhotoUrl: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  bankAccount: z.string().optional(),
  ifsc: z.string().optional(),
  branch: z.string().optional(),
  nomineeName: z.string().optional(),
  nomineeRelationship: z.string().optional(),
  nomineeMobile: z.string().optional(),
  riskProfile: z.string().optional()
});

export type WithdrawalFormValues = z.infer<typeof withdrawalFormSchema>;
export type ProfileFormValues = z.infer<typeof profileFormSchema>;

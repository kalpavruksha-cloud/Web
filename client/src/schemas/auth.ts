import { z } from "zod";

export const loginFormSchema = z.object({
  identifier: z.string().trim().min(2, "Enter your Client ID or email"),
  password: z.string().min(1, "Enter your password"),
  remember: z.boolean().default(false)
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const registerFormSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name"),
  email: z.string().trim().email("Enter a valid email"),
  mobile: z.string().trim().min(8, "Enter a valid mobile number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  occupation: z.string().optional(),
  riskProfile: z.enum(["Low", "Medium", "High"]).default("Medium"),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional()
});

export type RegisterFormValues = z.infer<typeof registerFormSchema>;

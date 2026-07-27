import { z } from "zod";

export const loginSchema = z.object({
  body: z.object({
    identifier: z.string().trim().min(2, "Client ID or email is required"),
    password: z.string().min(1, "Password is required"),
    remember: z.boolean().optional(),
    expectedRole: z.enum(["client", "admin"]).optional()
  })
});

export const registerSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2).max(120),
    email: z.string().trim().email(),
    mobile: z.string().trim().min(8).max(20),
    password: z.string().min(6).max(100),
    occupation: z.string().trim().max(120).optional(),
    riskProfile: z.enum(["Low", "Medium", "High"]).default("Medium"),
    dateOfBirth: z.string().optional(),
    gender: z.string().trim().max(40).optional()
  })
});

export const profileUpdateSchema = z.object({
  body: z.object({
    profilePhotoUrl: z.string().url().optional().or(z.literal("")),
    mobile: z.string().trim().min(8).max(20).optional(),
    email: z.string().email().optional(),
    address: z.string().trim().max(500).optional(),
    bankAccount: z.string().trim().max(40).optional(),
    ifsc: z.string().trim().max(15).optional(),
    branch: z.string().trim().max(120).optional(),
    nomineeName: z.string().trim().max(120).optional(),
    nomineeRelationship: z.string().trim().max(80).optional(),
    nomineeMobile: z.string().trim().max(20).optional(),
    riskProfile: z.string().trim().max(80).optional()
  })
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().trim().min(1) })
});

export const investmentSchema = z.object({
  body: z.object({
    clientId: z.string().trim().min(1),
    plan: z.string().trim().min(1),
    category: z.string().optional(),
    principalAmount: z.coerce.number().positive(),
    startDate: z.string().optional(),
    maturityDate: z.string().optional(),
    returnRate: z.coerce.number().min(0).optional(),
    monthlyReturn: z.coerce.number().min(0).optional(),
    currentValue: z.coerce.number().min(0).optional(),
    status: z.string().optional(),
    agreementDetails: z.string().optional(),
    paymentMode: z.string().optional(),
    notes: z.string().max(1000).optional()
  })
});

export const transactionSchema = z.object({
  body: z.object({
    clientId: z.string().trim().min(1),
    date: z.string().optional(),
    type: z.string().trim().min(1),
    description: z.string().optional(),
    credit: z.coerce.number().min(0).default(0),
    debit: z.coerce.number().min(0).default(0),
    reference: z.string().optional(),
    status: z.string().optional()
  }).refine((data) => data.credit > 0 || data.debit > 0, "Either credit or debit must be greater than zero")
});

export const withdrawalCreateSchema = z.object({
  body: z.object({
    amount: z.coerce.number().positive(),
    bankAccount: z.string().trim().min(4),
    remarks: z.string().max(500).optional()
  })
});

export const withdrawalDecisionSchema = z.object({
  params: z.object({ id: z.string().trim().min(1) }),
  body: z.object({
    adminRemarks: z.string().max(500).optional(),
    paymentReference: z.string().max(120).optional()
  }).optional()
});

export const referralSchema = z.object({
  body: z.object({
    clientId: z.string().trim().min(1).optional(),
    code: z.string().optional(),
    referredClientName: z.string().optional(),
    referredClientId: z.string().optional(),
    status: z.string().optional(),
    rewardAmount: z.coerce.number().min(0).optional(),
    paidAmount: z.coerce.number().min(0).optional()
  })
});

export const documentSchema = z.object({
  body: z.object({
    clientId: z.string().trim().min(1),
    name: z.string().trim().min(1),
    type: z.string().trim().min(1),
    driveUrl: z.string().url(),
    status: z.string().optional()
  })
});

export const notificationSchema = z.object({
  body: z.object({
    clientId: z.string().trim().optional(),
    title: z.string().trim().min(1),
    message: z.string().trim().min(1),
    type: z.string().optional(),
    priority: z.enum(["low", "normal", "high"]).optional()
  })
});

export const settingsSchema = z.object({
  body: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
});

export const bankDetailsSchema = z.object({
  body: z.object({
    accountHolderName: z.string().trim().min(2).max(120),
    bankName: z.string().trim().min(2).max(120),
    accountNumber: z.string().trim().regex(/^\d{6,20}$/, "Enter a valid bank account number"),
    confirmAccountNumber: z.string().trim(),
    ifsc: z.string().trim().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/i, "Enter a valid IFSC code"),
    branch: z.string().trim().min(2).max(120),
    accountType: z.string().trim().max(60).optional(),
    upiId: z.string().trim().max(120).optional(),
    remarks: z.string().trim().max(500).optional()
  }).refine((data) => data.accountNumber === data.confirmAccountNumber, {
    message: "Account numbers do not match",
    path: ["confirmAccountNumber"]
  })
});

export const investmentRequestSchema = z.object({
  body: z.object({
    planId: z.string().trim().min(1),
    planName: z.string().trim().min(1),
    amount: z.coerce.number().positive(),
    paymentMode: z.string().trim().min(1),
    paymentReference: z.string().trim().min(1).max(120),
    paymentDate: z.string().trim().min(1),
    paymentProofUrl: z.string().url().optional().or(z.literal("")),
    termsAccepted: z.literal(true)
  })
});

export const clientWithdrawalCancelSchema = z.object({
  params: z.object({ id: z.string().trim().min(1) }),
  body: z.object({ remarks: z.string().trim().max(500).optional() }).optional()
});

export const clientUploadSchema = z.object({
  body: z.object({
    fileName: z.string().trim().min(1).max(180),
    mimeType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
    fileSize: z.coerce.number().positive().max(10 * 1024 * 1024),
    base64Data: z.string().min(20),
    category: z.string().trim().min(1).max(80),
    recordId: z.string().trim().max(120).optional(),
    description: z.string().trim().max(500).optional()
  })
});

export const supportRequestSchema = z.object({
  body: z.object({
    subject: z.string().trim().min(3).max(160),
    category: z.string().trim().min(2).max(80),
    priority: z.enum(["low", "normal", "high"]).default("normal"),
    message: z.string().trim().min(10).max(2000),
    attachmentUrl: z.string().url().optional().or(z.literal(""))
  })
});

export const clientPreferencesSchema = z.object({
  body: z.object({
    emailNotifications: z.boolean().optional(),
    smsNotifications: z.boolean().optional(),
    whatsappNotifications: z.boolean().optional(),
    preferredLanguage: z.string().trim().max(60).optional()
  })
});

import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const employmentStatus = z.enum([
  "active", "probation", "on-leave", "suspended", "terminated", "resigned",
]);
export const contractType = z.enum([
  "limited", "unlimited", "part-time", "freelance", "consultant",
]);
export const office = z.enum(["dubai", "cairo"]);
export const gender = z.enum(["M", "F"]);
export const documentType = z.enum([
  "passport", "emirates-id", "visa", "labour-card", "driving-licence",
  "qualification", "experience-cert", "medical", "other",
]);

export const salaryBreakdown = z.object({
  basic: z.number().min(0),
  housing: z.number().min(0).default(0),
  transport: z.number().min(0).default(0),
  food: z.number().min(0).default(0),
  other: z.number().min(0).default(0),
  currency: z.string().default("AED"),
});

export const bankDetails = z.object({
  bankName: z.string().optional(),
  iban: z.string().optional(),
  accountNo: z.string().optional(),
  swift: z.string().optional(),
});

export const createEmployeeSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  arabicName: z.string().optional(),
  gender: gender.optional(),
  dob: isoDate.optional(),
  nationality: z.string().optional(),
  maritalStatus: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  emergencyPhone: z.string().optional(),
  emergencyContactName: z.string().optional(),
  homeAddress: z.string().optional(),
  photoUrl: z.string().optional(),

  office,
  jobTitle: z.string().min(1),
  department: z.string().min(1),
  managerEmployeeId: z.string().uuid().nullish(),
  status: employmentStatus.default("active"),
  joinDate: isoDate,
  endDate: isoDate.optional(),
  workLocation: z.string().optional(),

  contractType: contractType.default("unlimited"),
  contractEndDate: isoDate.optional(),
  probationEndDate: isoDate.optional(),

  passportNo: z.string().optional(),
  passportExpiry: isoDate.optional(),
  emiratesIdNo: z.string().optional(),
  emiratesIdExpiry: isoDate.optional(),
  visaNo: z.string().optional(),
  visaExpiry: isoDate.optional(),
  visaSponsor: z.string().optional(),
  labourCardNo: z.string().optional(),
  labourCardExpiry: isoDate.optional(),

  salary: salaryBreakdown.optional(),
  bank: bankDetails.optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export const createDocumentSchema = z.object({
  type: documentType,
  number: z.string().optional(),
  issueDate: isoDate.optional(),
  expiryDate: isoDate.optional(),
  fileId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const createDependentSchema = z.object({
  name: z.string().min(1),
  relation: z.string().min(1),
  dob: isoDate.optional(),
  passportNo: z.string().optional(),
  visaSponsor: z.string().optional(),
  visaExpiry: isoDate.optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

CREATE TYPE "public"."geofence_check" AS ENUM('passed', 'failed-out', 'low-accuracy', 'no-gps', 'manual-override');--> statement-breakpoint
CREATE TYPE "public"."punch_device" AS ENUM('mobile-app', 'web-simulator', 'biometric-office');--> statement-breakpoint
CREATE TYPE "public"."punch_type" AS ENUM('in', 'out');--> statement-breakpoint
CREATE TYPE "public"."office" AS ENUM('dubai', 'cairo');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('director', 'hr-manager', 'finance-manager', 'accountant', 'pm', 'design-lead', 'site-engineer', 'bd-manager', 'employee', 'contractor');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'disabled', 'pending');--> statement-breakpoint
CREATE TYPE "public"."contractor_status" AS ENUM('active', 'invited', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."submittal_priority" AS ENUM('Normal', 'Urgent');--> statement-breakpoint
CREATE TYPE "public"."submittal_status" AS ENUM('draft', 'submitted', 'under-review', 'code-a', 'code-b', 'code-c', 'code-d', 'revise-and-resubmit', 'rejected', 'closed', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."lead_activity_type" AS ENUM('call', 'email', 'meeting', 'note', 'stage-change', 'proposal-sent');--> statement-breakpoint
CREATE TYPE "public"."lead_source" AS ENUM('referral', 'website', 'tender', 'cold', 'event', 'existing-client', 'other');--> statement-breakpoint
CREATE TYPE "public"."lead_stage" AS ENUM('new', 'qualified', 'proposal', 'negotiation', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."file_acl_permission" AS ENUM('read', 'write', 'delete');--> statement-breakpoint
CREATE TYPE "public"."file_acl_principal" AS ENUM('role', 'user', 'project', 'employee');--> statement-breakpoint
CREATE TYPE "public"."file_scope" AS ENUM('hr', 'project', 'finance', 'crm', 'letter', 'contractor', 'other');--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('asset', 'liability', 'equity', 'income', 'expense');--> statement-breakpoint
CREATE TYPE "public"."ap_bill_status" AS ENUM('draft', 'approved', 'partially-paid', 'paid', 'overdue', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'partially-paid', 'paid', 'overdue', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."journal_status" AS ENUM('draft', 'posted', 'void');--> statement-breakpoint
CREATE TYPE "public"."asset_condition" AS ENUM('new', 'good', 'fair', 'damaged');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('laptop', 'phone', 'vehicle', 'software', 'tool', 'uniform', 'other');--> statement-breakpoint
CREATE TYPE "public"."disciplinary_type" AS ENUM('verbal-warning', 'written-warning', 'suspension', 'final-warning', 'termination');--> statement-breakpoint
CREATE TYPE "public"."leave_status" AS ENUM('submitted', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."leave_type" AS ENUM('annual', 'sick', 'maternity', 'paternity', 'unpaid', 'compassionate');--> statement-breakpoint
CREATE TYPE "public"."letter_type" AS ENUM('noc', 'salary-certificate', 'experience-letter', 'employment-contract', 'termination', 'warning');--> statement-breakpoint
CREATE TYPE "public"."onboarding_status" AS ENUM('in-progress', 'complete', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."payroll_run_status" AS ENUM('draft', 'approved', 'paid', 'void');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('draft', 'submitted', 'acknowledged');--> statement-breakpoint
CREATE TYPE "public"."training_category" AS ENUM('professional', 'safety', 'technical', 'soft-skills', 'compliance');--> statement-breakpoint
CREATE TYPE "public"."contract_type" AS ENUM('limited', 'unlimited', 'part-time', 'freelance', 'consultant');--> statement-breakpoint
CREATE TYPE "public"."employee_document_type" AS ENUM('passport', 'emirates-id', 'visa', 'labour-card', 'driving-licence', 'qualification', 'experience-cert', 'medical', 'other');--> statement-breakpoint
CREATE TYPE "public"."employment_status" AS ENUM('active', 'probation', 'on-leave', 'suspended', 'terminated', 'resigned');--> statement-breakpoint
CREATE TYPE "public"."authority_submittal_status" AS ENUM('to-start', 'in-progress', 'approved', 'rejected', 'completed');--> statement-breakpoint
CREATE TYPE "public"."project_health" AS ENUM('on-track', 'at-risk', 'delayed');--> statement-breakpoint
CREATE TYPE "public"."project_stage" AS ENUM('pipeline', 'pre-contract', 'post-contract', 'completed');--> statement-breakpoint
CREATE TYPE "public"."stage_gate_status" AS ENUM('in-review', 'approved', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."doc_status" AS ENUM('draft', 'for-approval', 'final', 'stamped', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."rfi_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."rfi_status" AS ENUM('draft', 'open', 'awaiting-response', 'responded', 'closed', 'void');--> statement-breakpoint
CREATE TYPE "public"."risk_status" AS ENUM('identified', 'assessed', 'treated', 'monitoring', 'escalated', 'closed', 'realised');--> statement-breakpoint
CREATE TYPE "public"."risk_treatment" AS ENUM('avoid', 'transfer', 'mitigate', 'accept');--> statement-breakpoint
CREATE TYPE "public"."task_category" AS ENUM('design', 'review', 'meeting', 'submission', 'site', 'admin', 'client', 'other');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('todo', 'in-progress', 'blocked', 'done');--> statement-breakpoint
CREATE TYPE "public"."timesheet_status" AS ENUM('draft', 'submitted', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attendance_daily_rollup" (
	"employee_id" uuid NOT NULL,
	"day" text NOT NULL,
	"first_in" timestamp with time zone,
	"last_out" timestamp with time zone,
	"hours" numeric(6, 2) DEFAULT '0' NOT NULL,
	"project_ids" jsonb DEFAULT '[]'::jsonb,
	"punch_count" integer DEFAULT 0 NOT NULL,
	"missing_punches" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_daily_rollup_employee_id_day_pk" PRIMARY KEY("employee_id","day")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attendance_punches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"project_id" uuid,
	"geofence_id" uuid,
	"type" "punch_type" NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"gps_lat" numeric(10, 7),
	"gps_lng" numeric(10, 7),
	"accuracy_m" numeric(8, 2),
	"geofence_check" "geofence_check" DEFAULT 'passed' NOT NULL,
	"device" "punch_device",
	"note" text,
	"override_by_user_id" uuid,
	"override_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "geofences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"name" text NOT NULL,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"radius_m" integer NOT NULL,
	"site_name" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "location_pings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"accuracy_m" numeric(8, 2),
	"timestamp" timestamp with time zone NOT NULL,
	"battery_pct" integer,
	"device_state" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_user_id" uuid,
	"actor_role" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"before" jsonb,
	"after" jsonb,
	"ip" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "password_resets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"user_agent" text,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text NOT NULL,
	"role" "role" DEFAULT 'employee' NOT NULL,
	"office" "office",
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"employee_id" uuid,
	"avatar_color" text,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contractor_companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"trade_license" text NOT NULL,
	"type" text NOT NULL,
	"trades" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "contractor_status" DEFAULT 'invited' NOT NULL,
	"allowed_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"contact_email" text,
	"contact_phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contractor_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"avatar" text,
	"last_active_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "submittal_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submittal_id" uuid NOT NULL,
	"author_user_id" uuid,
	"author_display" text NOT NULL,
	"author_role" text NOT NULL,
	"body" text NOT NULL,
	"attachment_file_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "submittal_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submittal_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"status" "submittal_status" NOT NULL,
	"submitted_at" timestamp with time zone NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewer_user_id" uuid,
	"comments" text,
	"attachment_file_ids" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "submittals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"project_id" uuid,
	"project_code" text,
	"project_name" text,
	"contractor_company_id" uuid NOT NULL,
	"contractor_user_id" uuid,
	"type" text NOT NULL,
	"discipline" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"date_submitted" timestamp with time zone DEFAULT now() NOT NULL,
	"sla_deadline" timestamp with time zone NOT NULL,
	"status" "submittal_status" DEFAULT 'submitted' NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"primary_reviewer" jsonb NOT NULL,
	"approver" text NOT NULL,
	"watchers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attachment_file_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"location" text,
	"priority" "submittal_priority" DEFAULT 'Normal' NOT NULL,
	"response_date" timestamp with time zone,
	"response_by_user_id" uuid,
	"response_by" text,
	"comments" text,
	"from_portal" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submittals_ref_unique" UNIQUE("ref")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lead_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"type" "lead_activity_type" NOT NULL,
	"by" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"summary" text NOT NULL,
	"detail" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lead_conversions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"converted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"by_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" text NOT NULL,
	"contact_name" text NOT NULL,
	"contact_role" text,
	"contact_email" text,
	"contact_phone" text,
	"industry" text,
	"source" "lead_source" DEFAULT 'other' NOT NULL,
	"stage" "lead_stage" DEFAULT 'new' NOT NULL,
	"estimated_value_aed" numeric(16, 2) DEFAULT '0' NOT NULL,
	"probability" integer DEFAULT 20 NOT NULL,
	"expected_close_date" date,
	"owner_user_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "file_acl" (
	"file_id" uuid NOT NULL,
	"principal_type" "file_acl_principal" NOT NULL,
	"principal_id" text NOT NULL,
	"permission" "file_acl_permission" NOT NULL,
	CONSTRAINT "file_acl_file_id_principal_type_principal_id_permission_pk" PRIMARY KEY("file_id","principal_type","principal_id","permission")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_name" text NOT NULL,
	"mime" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage_path" text NOT NULL,
	"sha256" text NOT NULL,
	"scope" "file_scope" NOT NULL,
	"scope_id" uuid,
	"entity_type" text,
	"entity_id" text,
	"category" text,
	"uploaded_by_user_id" uuid,
	"uploaded_by_display" text,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ap_bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"internal_ref" text NOT NULL,
	"supplier_id" uuid NOT NULL,
	"bill_date" date NOT NULL,
	"due_date" date NOT NULL,
	"office" text NOT NULL,
	"currency" text DEFAULT 'AED' NOT NULL,
	"fx_rate" numeric(6, 4),
	"po_number" text,
	"lines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"subtotal" numeric(16, 2) DEFAULT '0' NOT NULL,
	"vat_total" numeric(16, 2) DEFAULT '0' NOT NULL,
	"total" numeric(16, 2) DEFAULT '0' NOT NULL,
	"amount_paid" numeric(16, 2) DEFAULT '0' NOT NULL,
	"balance" numeric(16, 2) DEFAULT '0' NOT NULL,
	"status" "ap_bill_status" DEFAULT 'draft' NOT NULL,
	"approver_user_id" uuid,
	"approved_at" timestamp with time zone,
	"attachment_file_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ap_bills_internal_ref_unique" UNIQUE("internal_ref")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ar_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"invoice_date" date NOT NULL,
	"due_date" date NOT NULL,
	"office" text NOT NULL,
	"currency" text DEFAULT 'AED' NOT NULL,
	"fx_rate" numeric(6, 4),
	"project_id" uuid,
	"po_number" text,
	"retention_pct" numeric(6, 4),
	"retention_amount" numeric(16, 2),
	"lines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"subtotal" numeric(16, 2) DEFAULT '0' NOT NULL,
	"vat_total" numeric(16, 2) DEFAULT '0' NOT NULL,
	"total" numeric(16, 2) DEFAULT '0' NOT NULL,
	"amount_paid" numeric(16, 2) DEFAULT '0' NOT NULL,
	"balance" numeric(16, 2) DEFAULT '0' NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"notes" text,
	"attachment_file_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ar_invoices_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ar_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"date" date NOT NULL,
	"customer_id" uuid NOT NULL,
	"invoice_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"bank_account_id" uuid,
	"amount" numeric(16, 2) NOT NULL,
	"currency" text DEFAULT 'AED' NOT NULL,
	"payment_method" text NOT NULL,
	"cheque_number" text,
	"cheque_bank" text,
	"reference2" text,
	"notes" text,
	"status" text DEFAULT 'received' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bank_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"bank_name" text NOT NULL,
	"iban" text NOT NULL,
	"account_number" text NOT NULL,
	"swift" text,
	"branch" text,
	"currency" text DEFAULT 'AED' NOT NULL,
	"office" text NOT NULL,
	"opening_balance" numeric(16, 2) DEFAULT '0' NOT NULL,
	"opening_date" date NOT NULL,
	"gl_account_code" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bank_accounts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bank_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_account_id" uuid NOT NULL,
	"date" date NOT NULL,
	"description" text NOT NULL,
	"debit" numeric(16, 2) DEFAULT '0' NOT NULL,
	"credit" numeric(16, 2) DEFAULT '0' NOT NULL,
	"balance" numeric(16, 2),
	"reference" text,
	"reconciled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coa_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" "account_type" NOT NULL,
	"sub_type" text NOT NULL,
	"parent_code" text,
	"currency" text,
	"vat_applicable" boolean DEFAULT false NOT NULL,
	"is_control" boolean DEFAULT false NOT NULL,
	"is_bank" boolean DEFAULT false NOT NULL,
	"is_cash" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coa_accounts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"trn_number" text,
	"address" text,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"currency" text DEFAULT 'AED' NOT NULL,
	"credit_limit" numeric(16, 2),
	"payment_terms_days" integer DEFAULT 30 NOT NULL,
	"opening_balance" numeric(16, 2),
	"active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fixed_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"acquired_date" date NOT NULL,
	"cost" numeric(16, 2) NOT NULL,
	"depreciation_method" text DEFAULT 'straight-line' NOT NULL,
	"useful_life_months" integer NOT NULL,
	"accumulated_depreciation" numeric(16, 2) DEFAULT '0' NOT NULL,
	"current_value" numeric(16, 2) NOT NULL,
	"location" text,
	"status" text DEFAULT 'active' NOT NULL,
	"custodian_user_id" uuid,
	"serial_number" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fixed_assets_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"date" date NOT NULL,
	"office" text NOT NULL,
	"currency" text DEFAULT 'AED' NOT NULL,
	"fx_rate" numeric(6, 4),
	"source" text DEFAULT 'manual' NOT NULL,
	"source_ref_id" text,
	"narration" text NOT NULL,
	"lines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "journal_status" DEFAULT 'draft' NOT NULL,
	"posted_at" timestamp with time zone,
	"posted_by_user_id" uuid,
	"reversal_of" uuid,
	"attachment_file_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "petty_cash_floats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"office" text NOT NULL,
	"custodian_user_id" uuid,
	"currency" text DEFAULT 'AED' NOT NULL,
	"balance" numeric(16, 2) DEFAULT '0' NOT NULL,
	"cap" numeric(16, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "petty_cash_vouchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"float_id" uuid NOT NULL,
	"voucher_number" text NOT NULL,
	"date" date NOT NULL,
	"direction" text NOT NULL,
	"amount" numeric(16, 2) NOT NULL,
	"description" text NOT NULL,
	"account_code" text,
	"project_id" uuid,
	"paid_to_from" text,
	"receipt_file_id" uuid,
	"approver_user_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "supplier_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"date" date NOT NULL,
	"supplier_id" uuid NOT NULL,
	"bill_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"bank_account_id" uuid,
	"amount" numeric(16, 2) NOT NULL,
	"currency" text DEFAULT 'AED' NOT NULL,
	"payment_method" text NOT NULL,
	"cheque_number" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"trn_number" text,
	"category" text DEFAULT 'other' NOT NULL,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"iban" text,
	"bank_name" text,
	"currency" text DEFAULT 'AED' NOT NULL,
	"payment_terms_days" integer DEFAULT 30 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vat_returns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_label" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"output_vat_standard" numeric(16, 2) DEFAULT '0' NOT NULL,
	"output_vat_zero" numeric(16, 2) DEFAULT '0' NOT NULL,
	"output_vat_exempt" numeric(16, 2) DEFAULT '0' NOT NULL,
	"input_vat_standard" numeric(16, 2) DEFAULT '0' NOT NULL,
	"input_vat_reverse_charge" numeric(16, 2) DEFAULT '0' NOT NULL,
	"net_vat_payable" numeric(16, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"filed_date" date,
	"payment_ref" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "asset_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"type" "asset_type" NOT NULL,
	"identifier" text NOT NULL,
	"description" text NOT NULL,
	"assigned_date" date NOT NULL,
	"returned_date" date,
	"condition" "asset_condition",
	"estimated_value_aed" numeric(12, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "disciplinary_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"date" date NOT NULL,
	"type" "disciplinary_type" NOT NULL,
	"reason" text NOT NULL,
	"detail" text,
	"issued_by_user_id" uuid,
	"acknowledged_by_employee" boolean DEFAULT false NOT NULL,
	"attached_file_ids" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leave_balances" (
	"employee_id" uuid NOT NULL,
	"leave_type" "leave_type" NOT NULL,
	"year" integer NOT NULL,
	"entitlement" numeric(6, 2) NOT NULL,
	"accrued" numeric(6, 2) DEFAULT '0' NOT NULL,
	"used" numeric(6, 2) DEFAULT '0' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leave_balances_employee_id_leave_type_year_pk" PRIMARY KEY("employee_id","leave_type","year")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leave_handovers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"leave_request_id" uuid NOT NULL,
	"cover_user_id" uuid,
	"task_id" uuid,
	"note" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leave_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"type" "leave_type" NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"days" integer NOT NULL,
	"status" "leave_status" DEFAULT 'submitted' NOT NULL,
	"note" text,
	"approved_by_user_id" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "letters_issued" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"type" "letter_type" NOT NULL,
	"reference" text NOT NULL,
	"recipient" text,
	"issue_date" date DEFAULT now() NOT NULL,
	"issued_by_user_id" uuid,
	"file_id" uuid,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "onboarding_checklists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expected_join_date" date NOT NULL,
	"status" "onboarding_status" DEFAULT 'in-progress' NOT NULL,
	"steps" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payroll_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"office" text NOT NULL,
	"period_year" integer NOT NULL,
	"period_month" integer NOT NULL,
	"status" "payroll_run_status" DEFAULT 'draft' NOT NULL,
	"run_by_user_id" uuid,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"totals" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payslips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"gross" numeric(14, 2) NOT NULL,
	"deductions" jsonb NOT NULL,
	"net" numeric(14, 2) NOT NULL,
	"currency" text NOT NULL,
	"file_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"period" text NOT NULL,
	"reviewer_user_id" uuid,
	"date" date NOT NULL,
	"scores" jsonb NOT NULL,
	"overall_rating" numeric(4, 2) NOT NULL,
	"manager_comments" text NOT NULL,
	"employee_comments" text,
	"status" "review_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "training_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"name" text NOT NULL,
	"provider" text,
	"category" "training_category" NOT NULL,
	"issue_date" date,
	"expiry_date" date,
	"cost_aed" numeric(12, 2),
	"certificate_file_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dependents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"name" text NOT NULL,
	"relation" text NOT NULL,
	"dob" date,
	"passport_no" text,
	"visa_sponsor" text,
	"visa_expiry" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_bank_details" (
	"employee_id" uuid PRIMARY KEY NOT NULL,
	"bank_name" text,
	"iban" text,
	"account_no" text,
	"swift" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_compensation" (
	"employee_id" uuid PRIMARY KEY NOT NULL,
	"basic" numeric(14, 2) DEFAULT '0' NOT NULL,
	"housing" numeric(14, 2) DEFAULT '0' NOT NULL,
	"transport" numeric(14, 2) DEFAULT '0' NOT NULL,
	"food" numeric(14, 2) DEFAULT '0' NOT NULL,
	"other" numeric(14, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'AED' NOT NULL,
	"effective_from" date,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"type" "employee_document_type" NOT NULL,
	"number" text,
	"issue_date" date,
	"expiry_date" date,
	"file_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"arabic_name" text,
	"gender" text,
	"dob" date,
	"nationality" text,
	"marital_status" text,
	"email" text NOT NULL,
	"phone" text,
	"emergency_phone" text,
	"emergency_contact_name" text,
	"home_address" text,
	"photo_url" text,
	"office" "office" NOT NULL,
	"job_title" text NOT NULL,
	"department" text NOT NULL,
	"manager_employee_id" uuid,
	"status" "employment_status" DEFAULT 'active' NOT NULL,
	"join_date" date NOT NULL,
	"end_date" date,
	"work_location" text,
	"contract_type" "contract_type" DEFAULT 'unlimited' NOT NULL,
	"contract_end_date" date,
	"probation_end_date" date,
	"passport_no" text,
	"passport_expiry" date,
	"emirates_id_no" text,
	"emirates_id_expiry" date,
	"visa_no" text,
	"visa_expiry" date,
	"visa_sponsor" text,
	"labour_card_no" text,
	"labour_card_expiry" date,
	"assigned_project_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_code_unique" UNIQUE("code"),
	CONSTRAINT "employees_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "office_config" (
	"office" "office" PRIMARY KEY NOT NULL,
	"currency" text NOT NULL,
	"tax_rate" text NOT NULL,
	"labour_rules" jsonb NOT NULL,
	"working_week" jsonb NOT NULL,
	"public_holidays" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "authority_submittals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"is_group_header" boolean DEFAULT false NOT NULL,
	"group_name" text,
	"name" text NOT NULL,
	"authority" text,
	"status" "authority_submittal_status" DEFAULT 'to-start' NOT NULL,
	"milestone_status" "authority_submittal_status",
	"start_date" date,
	"target_finish_date" date,
	"actual_finish_date" date,
	"remarks" text,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"sub_stage_code" text NOT NULL,
	"label" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"planned_start" date,
	"planned_end" date,
	"actual_start" date,
	"actual_end" date,
	"variance_reason" text,
	"progress" numeric(5, 2) DEFAULT '0',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_team_members" (
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role_on_project" text,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"removed_at" timestamp with time zone,
	CONSTRAINT "project_team_members_project_id_user_id_pk" PRIMARY KEY("project_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name_en" text NOT NULL,
	"name_ar" text,
	"stage" "project_stage" DEFAULT 'pipeline' NOT NULL,
	"health" "project_health" DEFAULT 'on-track' NOT NULL,
	"type" text,
	"plot_no" text,
	"community" text,
	"emirate" text,
	"authority" text,
	"client" text,
	"contract_value" numeric(16, 2) DEFAULT '0',
	"currency" text DEFAULT 'AED' NOT NULL,
	"fee_type" text,
	"start_date" date,
	"target_completion" date,
	"actual_completion" date,
	"gfa" numeric(14, 2),
	"plot_area" numeric(14, 2),
	"floors" integer,
	"current_sub_stage" integer DEFAULT 0,
	"progress" numeric(5, 2) DEFAULT '0',
	"budget_consumed" numeric(16, 2) DEFAULT '0',
	"hours_logged" numeric(12, 2) DEFAULT '0',
	"hours_planned" numeric(12, 2) DEFAULT '0',
	"days_to_deadline" integer,
	"open_rfis" integer DEFAULT 0,
	"open_ncrs" integer DEFAULT 0,
	"pending_approvals" integer DEFAULT 0,
	"starred" boolean DEFAULT false NOT NULL,
	"pm_user_id" uuid,
	"design_lead_user_id" uuid,
	"office" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stage_gate_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"stage_code" text NOT NULL,
	"gate_code" text NOT NULL,
	"requester_user_id" uuid,
	"requester_display" text NOT NULL,
	"status" "stage_gate_status" DEFAULT 'in-review' NOT NULL,
	"approvals" jsonb NOT NULL,
	"note" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "doc_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"parent_id" uuid,
	"order" integer DEFAULT 0 NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"access_roles" jsonb DEFAULT '[]'::jsonb,
	"retention" text,
	"indicator" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "drawings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"drawing_number" text NOT NULL,
	"title" text NOT NULL,
	"discipline" text NOT NULL,
	"scale" text,
	"paper_size" text,
	"current_rev" text DEFAULT 'P01' NOT NULL,
	"current_status" text NOT NULL,
	"prepared_by_display" text,
	"checked_by_display" text,
	"approved_by_display" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"revisions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"folder_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"status" "doc_status" DEFAULT 'draft' NOT NULL,
	"version" text DEFAULT 'v1.0' NOT NULL,
	"uploaded_by_user_id" uuid,
	"uploaded_by_display" text,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"size_bytes" integer DEFAULT 0 NOT NULL,
	"mime_type" text,
	"file_store_id" uuid,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_risks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"phase" text NOT NULL,
	"stage_ref" text,
	"authority_ref" text,
	"inherent_probability" integer NOT NULL,
	"inherent_impact" integer NOT NULL,
	"residual_probability" integer,
	"residual_impact" integer,
	"treatment" "risk_treatment" NOT NULL,
	"treatment_rationale" text,
	"cost_impact_aed" numeric(16, 2),
	"schedule_impact_days" integer,
	"owner_user_id" uuid,
	"owner_display" text,
	"raised_by_user_id" uuid,
	"raised_by_display" text,
	"raised_at" timestamp with time zone DEFAULT now() NOT NULL,
	"trigger_conditions" text,
	"early_warning_signs" text,
	"contingency_plan" text,
	"linked_task_ids" jsonb DEFAULT '[]'::jsonb,
	"linked_document_ids" jsonb DEFAULT '[]'::jsonb,
	"linked_submittal_ids" jsonb DEFAULT '[]'::jsonb,
	"status" "risk_status" DEFAULT 'identified' NOT NULL,
	"review_frequency" text DEFAULT 'monthly' NOT NULL,
	"next_review_date" date,
	"last_reviewed_at" timestamp with time zone,
	"actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reviews" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"closed_at" timestamp with time zone,
	"closure_reason" text,
	"lessons_learned" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rfis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"project_id" uuid NOT NULL,
	"date" date NOT NULL,
	"raised_by_company" text NOT NULL,
	"raised_by_display" text NOT NULL,
	"raised_to_discipline" text,
	"raised_to_display" text,
	"subject" text NOT NULL,
	"question" text NOT NULL,
	"drawing_refs" jsonb DEFAULT '[]'::jsonb,
	"specification_refs" jsonb DEFAULT '[]'::jsonb,
	"priority" "rfi_priority" DEFAULT 'medium' NOT NULL,
	"due_date" date,
	"status" "rfi_status" DEFAULT 'draft' NOT NULL,
	"responses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cost_impact" numeric(16, 2),
	"schedule_impact_days" integer,
	"closure_note" text,
	"closed_at" timestamp with time zone,
	"closed_by_display" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "task_timer_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_sec" integer,
	"note" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "task_status" DEFAULT 'todo' NOT NULL,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"category" "task_category" DEFAULT 'other' NOT NULL,
	"project_id" uuid,
	"assignee_user_id" uuid,
	"reporter_user_id" uuid,
	"due_date" date,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "timesheets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"week_start_date" date NOT NULL,
	"week_end_date" date NOT NULL,
	"status" timesheet_status DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp with time zone,
	"approved_by_user_id" uuid,
	"approved_at" timestamp with time zone,
	"hours" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"total_hours" numeric(8, 2) DEFAULT '0' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendance_daily_rollup" ADD CONSTRAINT "attendance_daily_rollup_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendance_punches" ADD CONSTRAINT "attendance_punches_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendance_punches" ADD CONSTRAINT "attendance_punches_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendance_punches" ADD CONSTRAINT "attendance_punches_geofence_id_geofences_id_fk" FOREIGN KEY ("geofence_id") REFERENCES "public"."geofences"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendance_punches" ADD CONSTRAINT "attendance_punches_override_by_user_id_users_id_fk" FOREIGN KEY ("override_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "geofences" ADD CONSTRAINT "geofences_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "location_pings" ADD CONSTRAINT "location_pings_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contractor_users" ADD CONSTRAINT "contractor_users_company_id_contractor_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."contractor_companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contractor_users" ADD CONSTRAINT "contractor_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submittal_messages" ADD CONSTRAINT "submittal_messages_submittal_id_submittals_id_fk" FOREIGN KEY ("submittal_id") REFERENCES "public"."submittals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submittal_messages" ADD CONSTRAINT "submittal_messages_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submittal_revisions" ADD CONSTRAINT "submittal_revisions_submittal_id_submittals_id_fk" FOREIGN KEY ("submittal_id") REFERENCES "public"."submittals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submittal_revisions" ADD CONSTRAINT "submittal_revisions_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submittals" ADD CONSTRAINT "submittals_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submittals" ADD CONSTRAINT "submittals_contractor_company_id_contractor_companies_id_fk" FOREIGN KEY ("contractor_company_id") REFERENCES "public"."contractor_companies"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submittals" ADD CONSTRAINT "submittals_contractor_user_id_contractor_users_id_fk" FOREIGN KEY ("contractor_user_id") REFERENCES "public"."contractor_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submittals" ADD CONSTRAINT "submittals_response_by_user_id_users_id_fk" FOREIGN KEY ("response_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lead_conversions" ADD CONSTRAINT "lead_conversions_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lead_conversions" ADD CONSTRAINT "lead_conversions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lead_conversions" ADD CONSTRAINT "lead_conversions_by_user_id_users_id_fk" FOREIGN KEY ("by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leads" ADD CONSTRAINT "leads_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "file_acl" ADD CONSTRAINT "file_acl_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ap_bills" ADD CONSTRAINT "ap_bills_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ap_bills" ADD CONSTRAINT "ap_bills_approver_user_id_users_id_fk" FOREIGN KEY ("approver_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ar_invoices" ADD CONSTRAINT "ar_invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ar_invoices" ADD CONSTRAINT "ar_invoices_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ar_receipts" ADD CONSTRAINT "ar_receipts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_custodian_user_id_users_id_fk" FOREIGN KEY ("custodian_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_posted_by_user_id_users_id_fk" FOREIGN KEY ("posted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "petty_cash_floats" ADD CONSTRAINT "petty_cash_floats_custodian_user_id_users_id_fk" FOREIGN KEY ("custodian_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "petty_cash_vouchers" ADD CONSTRAINT "petty_cash_vouchers_float_id_petty_cash_floats_id_fk" FOREIGN KEY ("float_id") REFERENCES "public"."petty_cash_floats"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "petty_cash_vouchers" ADD CONSTRAINT "petty_cash_vouchers_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "petty_cash_vouchers" ADD CONSTRAINT "petty_cash_vouchers_approver_user_id_users_id_fk" FOREIGN KEY ("approver_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "disciplinary_actions" ADD CONSTRAINT "disciplinary_actions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "disciplinary_actions" ADD CONSTRAINT "disciplinary_actions_issued_by_user_id_users_id_fk" FOREIGN KEY ("issued_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leave_handovers" ADD CONSTRAINT "leave_handovers_leave_request_id_leave_requests_id_fk" FOREIGN KEY ("leave_request_id") REFERENCES "public"."leave_requests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leave_handovers" ADD CONSTRAINT "leave_handovers_cover_user_id_users_id_fk" FOREIGN KEY ("cover_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "letters_issued" ADD CONSTRAINT "letters_issued_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "letters_issued" ADD CONSTRAINT "letters_issued_issued_by_user_id_users_id_fk" FOREIGN KEY ("issued_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "onboarding_checklists" ADD CONSTRAINT "onboarding_checklists_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_run_by_user_id_users_id_fk" FOREIGN KEY ("run_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "training_records" ADD CONSTRAINT "training_records_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dependents" ADD CONSTRAINT "dependents_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "employee_bank_details" ADD CONSTRAINT "employee_bank_details_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "employee_compensation" ADD CONSTRAINT "employee_compensation_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "authority_submittals" ADD CONSTRAINT "authority_submittals_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_stages" ADD CONSTRAINT "project_stages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_team_members" ADD CONSTRAINT "project_team_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_team_members" ADD CONSTRAINT "project_team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "projects" ADD CONSTRAINT "projects_pm_user_id_users_id_fk" FOREIGN KEY ("pm_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "projects" ADD CONSTRAINT "projects_design_lead_user_id_users_id_fk" FOREIGN KEY ("design_lead_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stage_gate_approvals" ADD CONSTRAINT "stage_gate_approvals_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stage_gate_approvals" ADD CONSTRAINT "stage_gate_approvals_requester_user_id_users_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doc_folders" ADD CONSTRAINT "doc_folders_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "drawings" ADD CONSTRAINT "drawings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_folder_id_doc_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."doc_folders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_risks" ADD CONSTRAINT "project_risks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_risks" ADD CONSTRAINT "project_risks_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_risks" ADD CONSTRAINT "project_risks_raised_by_user_id_users_id_fk" FOREIGN KEY ("raised_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rfis" ADD CONSTRAINT "rfis_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_timer_sessions" ADD CONSTRAINT "task_timer_sessions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_timer_sessions" ADD CONSTRAINT "task_timer_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_user_id_users_id_fk" FOREIGN KEY ("assignee_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tasks" ADD CONSTRAINT "tasks_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendance_punches_employee_idx" ON "attendance_punches" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendance_punches_timestamp_idx" ON "attendance_punches" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendance_punches_employee_ts_idx" ON "attendance_punches" USING btree ("employee_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "geofences_project_idx" ON "geofences" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "location_pings_employee_idx" ON "location_pings" USING btree ("employee_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "location_pings_timestamp_idx" ON "location_pings" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_at_idx" ON "audit_log" USING btree ("at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_actor_idx" ON "audit_log" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "refresh_tokens_user_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "refresh_tokens_hash_idx" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contractor_users_company_idx" ON "contractor_users" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contractor_users_email_idx" ON "contractor_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submittal_messages_submittal_idx" ON "submittal_messages" USING btree ("submittal_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submittal_revisions_submittal_idx" ON "submittal_revisions" USING btree ("submittal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submittals_company_idx" ON "submittals" USING btree ("contractor_company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submittals_project_idx" ON "submittals" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submittals_status_idx" ON "submittals" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submittals_sla_idx" ON "submittals" USING btree ("sla_deadline");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_activities_lead_idx" ON "lead_activities" USING btree ("lead_id","at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_conversions_lead_idx" ON "lead_conversions" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_stage_idx" ON "leads" USING btree ("stage");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_owner_idx" ON "leads" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "files_scope_idx" ON "files" USING btree ("scope","scope_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "files_entity_idx" ON "files" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "files_sha256_idx" ON "files" USING btree ("sha256");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ap_bills_supplier_idx" ON "ap_bills" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ap_bills_status_idx" ON "ap_bills" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ap_bills_due_idx" ON "ap_bills" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ar_invoices_customer_idx" ON "ar_invoices" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ar_invoices_status_idx" ON "ar_invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ar_invoices_due_idx" ON "ar_invoices" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bank_transactions_account_idx" ON "bank_transactions" USING btree ("bank_account_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coa_accounts_type_idx" ON "coa_accounts" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "journal_entries_date_idx" ON "journal_entries" USING btree ("date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "journal_entries_status_idx" ON "journal_entries" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "petty_cash_vouchers_float_idx" ON "petty_cash_vouchers" USING btree ("float_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_assignments_employee_idx" ON "asset_assignments" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "disciplinary_actions_employee_idx" ON "disciplinary_actions" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_handovers_leave_idx" ON "leave_handovers" USING btree ("leave_request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_requests_employee_idx" ON "leave_requests" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_requests_status_idx" ON "leave_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_requests_range_idx" ON "leave_requests" USING btree ("from_date","to_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "letters_issued_employee_idx" ON "letters_issued" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "letters_issued_type_idx" ON "letters_issued" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "onboarding_checklists_employee_idx" ON "onboarding_checklists" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_runs_period_idx" ON "payroll_runs" USING btree ("office","period_year","period_month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payslips_run_idx" ON "payslips" USING btree ("payroll_run_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payslips_employee_idx" ON "payslips" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "performance_reviews_employee_idx" ON "performance_reviews" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_records_employee_idx" ON "training_records" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_records_expiry_idx" ON "training_records" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dependents_employee_idx" ON "dependents" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_documents_employee_idx" ON "employee_documents" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_documents_expiry_idx" ON "employee_documents" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employees_office_idx" ON "employees" USING btree ("office");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employees_status_idx" ON "employees" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employees_manager_idx" ON "employees" USING btree ("manager_employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employees_department_idx" ON "employees" USING btree ("department");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employees_passport_expiry_idx" ON "employees" USING btree ("passport_expiry");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employees_visa_expiry_idx" ON "employees" USING btree ("visa_expiry");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employees_eid_expiry_idx" ON "employees" USING btree ("emirates_id_expiry");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employees_labour_card_expiry_idx" ON "employees" USING btree ("labour_card_expiry");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "authority_submittals_project_idx" ON "authority_submittals" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "authority_submittals_order_idx" ON "authority_submittals" USING btree ("project_id","order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_stages_project_idx" ON "project_stages" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_team_members_user_idx" ON "project_team_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_stage_idx" ON "projects" USING btree ("stage");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_pm_idx" ON "projects" USING btree ("pm_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stage_gate_approvals_project_idx" ON "stage_gate_approvals" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doc_folders_project_idx" ON "doc_folders" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doc_folders_parent_idx" ON "doc_folders" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drawings_project_idx" ON "drawings" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drawings_number_idx" ON "drawings" USING btree ("project_id","drawing_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_documents_folder_idx" ON "project_documents" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_documents_project_idx" ON "project_documents" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_documents_status_idx" ON "project_documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_risks_project_idx" ON "project_risks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_risks_status_idx" ON "project_risks" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rfis_project_idx" ON "rfis" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rfis_status_idx" ON "rfis" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rfis_reference_idx" ON "rfis" USING btree ("reference");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_timer_sessions_user_idx" ON "task_timer_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_timer_sessions_task_idx" ON "task_timer_sessions" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_timer_sessions_active_idx" ON "task_timer_sessions" USING btree ("user_id","ended_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_project_idx" ON "tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_assignee_idx" ON "tasks" USING btree ("assignee_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_status_idx" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_due_idx" ON "tasks" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "timesheets_user_week_idx" ON "timesheets" USING btree ("user_id","week_start_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "timesheets_status_idx" ON "timesheets" USING btree ("status");
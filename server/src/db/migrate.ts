import { migrate } from "drizzle-orm/node-postgres/migrator";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { db, pool } from "./client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const DEFAULT_DUBAI_BRANCH_ID = "00000000-0000-4000-8000-000000000101";
const DEFAULT_CAIRO_BRANCH_ID = "00000000-0000-4000-8000-000000000102";

async function addConstraint(name: string, ddl: string) {
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${name}') THEN
        ${ddl};
      END IF;
    END $$;
  `);
}

async function addFk(name: string, table: string, column: string, ref: string, onDelete = "SET NULL") {
  await addConstraint(
    name,
    `ALTER TABLE ${table} ADD CONSTRAINT ${name} FOREIGN KEY (${column}) REFERENCES ${ref} ON DELETE ${onDelete} NOT VALID`,
  );
}

async function addCheck(name: string, table: string, expression: string) {
  await addConstraint(
    name,
    `ALTER TABLE ${table} ADD CONSTRAINT ${name} CHECK (${expression}) NOT VALID`,
  );
}

async function createUniqueIndexIfClean(name: string, table: string, columns: string, duplicateWhere: string, duplicateGroupBy: string) {
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = '${name}')
         AND NOT EXISTS (
           SELECT 1 FROM ${table}
           WHERE ${duplicateWhere}
           GROUP BY ${duplicateGroupBy}
           HAVING count(*) > 1
         )
      THEN
        CREATE UNIQUE INDEX ${name} ON ${table} (${columns});
      END IF;
    END $$;
  `);
}

async function ensureEnumType(name: string, values: string[]) {
  const escapedValues = values.map((v) => `'${v.replace(/'/g, "''")}'`).join(", ");
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${name}') THEN
        CREATE TYPE ${name} AS ENUM (${escapedValues});
      END IF;
    END $$;
  `);
  for (const value of values) {
    await pool.query(`ALTER TYPE ${name} ADD VALUE IF NOT EXISTS '${value.replace(/'/g, "''")}'`);
  }
}

async function main() {
  console.log("[migrate] running Drizzle migrations...");
  await migrate(db, { migrationsFolder: join(__dirname, "migrations") });
  console.log("[migrate] migrations OK");

  // Idempotent column adds that post-date the baseline migration. Safe to run
  // on every boot; ADD COLUMN IF NOT EXISTS is a no-op once applied.
  // New role value added in code — register it on the DB enum too.
  await pool.query(`ALTER TYPE role ADD VALUE IF NOT EXISTS 'client'`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS extra_permissions jsonb NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_user_ids jsonb NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS task_messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      author_display text,
      kind text NOT NULL DEFAULT 'text',
      body text,
      file_store_id uuid,
      file_name text,
      mime_type text,
      duration_sec integer,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS task_messages_task_idx ON task_messages (task_id, created_at)`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS companies (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code text NOT NULL UNIQUE,
      name text NOT NULL,
      legal_name text,
      country text NOT NULL DEFAULT 'AE',
      base_currency text NOT NULL DEFAULT 'AED',
      tax_registration_no text,
      active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS branches (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      code text NOT NULL,
      name text NOT NULL,
      country text NOT NULL,
      city text,
      currency text NOT NULL,
      active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS branches_company_code_uq ON branches (company_id, code)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS branches_company_idx ON branches (company_id)`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS departments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
      code text NOT NULL,
      name text NOT NULL,
      manager_user_id uuid,
      active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS departments_company_code_uq ON departments (company_id, code)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS departments_company_idx ON departments (company_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS departments_branch_idx ON departments (branch_id)`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cost_centers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
      code text NOT NULL,
      name text NOT NULL,
      active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS cost_centers_company_code_uq ON cost_centers (company_id, code)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS cost_centers_company_idx ON cost_centers (company_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS cost_centers_department_idx ON cost_centers (department_id)`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS currencies (
      code text PRIMARY KEY,
      name text NOT NULL,
      symbol text,
      decimals numeric(2,0) NOT NULL DEFAULT 2,
      active boolean NOT NULL DEFAULT true
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exchange_rates (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
      from_currency text NOT NULL REFERENCES currencies(code) ON DELETE RESTRICT,
      to_currency text NOT NULL REFERENCES currencies(code) ON DELETE RESTRICT,
      rate_date date NOT NULL,
      rate numeric(18,8) NOT NULL,
      source text,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS exchange_rates_company_pair_date_uq ON exchange_rates (company_id, from_currency, to_currency, rate_date)`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fiscal_years (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      label text NOT NULL,
      start_date date NOT NULL,
      end_date date NOT NULL,
      status text NOT NULL DEFAULT 'open',
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS fiscal_years_company_label_uq ON fiscal_years (company_id, label)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS fiscal_years_company_idx ON fiscal_years (company_id)`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fiscal_periods (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      fiscal_year_id uuid NOT NULL REFERENCES fiscal_years(id) ON DELETE CASCADE,
      company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      period_no numeric(2,0) NOT NULL,
      label text NOT NULL,
      start_date date NOT NULL,
      end_date date NOT NULL,
      status text NOT NULL DEFAULT 'open',
      closed_at timestamptz,
      closed_by_user_id uuid
    )`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS fiscal_periods_year_period_uq ON fiscal_periods (fiscal_year_id, period_no)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS fiscal_periods_company_idx ON fiscal_periods (company_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS fiscal_periods_year_idx ON fiscal_periods (fiscal_year_id)`);
  await pool.query(`
    INSERT INTO companies (id, code, name, legal_name, country, base_currency)
    VALUES ($1, 'NASEC', 'NASEC Engineering Consultancy', 'NASEC Engineering Consultancy', 'AE', 'AED')
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, legal_name = EXCLUDED.legal_name, updated_at = now()
  `, [DEFAULT_COMPANY_ID]);
  await pool.query(`
    INSERT INTO branches (id, company_id, code, name, country, city, currency)
    VALUES
      ($1, $3, 'DXB', 'Dubai Office', 'AE', 'Dubai', 'AED'),
      ($2, $3, 'CAI', 'Cairo Office', 'EG', 'Cairo', 'EGP')
    ON CONFLICT (company_id, code) DO UPDATE SET name = EXCLUDED.name, city = EXCLUDED.city, currency = EXCLUDED.currency, updated_at = now()
  `, [DEFAULT_DUBAI_BRANCH_ID, DEFAULT_CAIRO_BRANCH_ID, DEFAULT_COMPANY_ID]);
  await pool.query(`
    INSERT INTO currencies (code, name, symbol, decimals)
    VALUES
      ('AED', 'UAE Dirham', 'AED', 2),
      ('EGP', 'Egyptian Pound', 'EGP', 2),
      ('USD', 'US Dollar', '$', 2),
      ('EUR', 'Euro', '€', 2),
      ('GBP', 'Pound Sterling', '£', 2)
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, symbol = EXCLUDED.symbol, decimals = EXCLUDED.decimals
  `);
  await addFk("departments_manager_user_fk", "departments", "manager_user_id", "users(id)");
  await addFk("fiscal_periods_closed_by_user_fk", "fiscal_periods", "closed_by_user_id", "users(id)");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid,
      kind text NOT NULL,
      data jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS project_items_kind_idx ON project_items (kind)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS project_items_project_idx ON project_items (project_id)`);
  await pool.query(`
    INSERT INTO projects (
      id, code, name_en, name_ar, stage, health, type, plot_no, community,
      emirate, authority, client, contract_value, currency, fee_type,
      start_date, target_completion, gfa, plot_area, floors, current_sub_stage,
      progress, budget_consumed, hours_logged, hours_planned, days_to_deadline,
      open_rfis, open_ncrs, pending_approvals, starred, office
    )
    VALUES (
      '11111111-1111-4111-8111-111111111111',
      'AR-2026-AWT-0023',
      'Al Wasl Tower',
      'برج الوصل',
      'pre-contract',
      'on-track',
      'Mixed-Use Tower',
      'AW-3421',
      'Al Wasl',
      'Dubai',
      'Dubai Municipality',
      'Dubai Holding',
      '1200000',
      'AED',
      'Percentage (5%)',
      '2026-01-15',
      '2026-11-30',
      '62000',
      '4500',
      55,
      3,
      '42',
      '35',
      '2400',
      '5800',
      207,
      0,
      0,
      2,
      false,
      'dubai'
    )
    ON CONFLICT (code) DO UPDATE SET
      stage = EXCLUDED.stage,
      health = EXCLUDED.health,
      current_sub_stage = EXCLUDED.current_sub_stage,
      progress = EXCLUDED.progress,
      budget_consumed = EXCLUDED.budget_consumed,
      hours_logged = EXCLUDED.hours_logged,
      hours_planned = EXCLUDED.hours_planned,
      pending_approvals = EXCLUDED.pending_approvals,
      updated_at = now()
  `);
  await pool.query(`
    WITH p AS (SELECT id FROM projects WHERE code = 'AR-2026-AWT-0023' LIMIT 1),
    rows(seed_key, ord, name, status, assignee, due_date) AS (
      VALUES
        ('awt-001', 1, 'Trakheesi concept submission package', 'in-progress', 'Ahmed M.', '2026-05-20'),
        ('awt-002', 2, 'Civil Defence concept NOC', 'pending', 'James W.', '2026-05-25'),
        ('awt-003', 3, 'DM concept approval drawings', 'in-progress', 'Ahmed M.', '2026-05-18'),
        ('awt-004', 4, 'NOC list compilation', 'complete', 'Priya S.', '2026-05-10'),
        ('awt-005', 5, 'SD report (final)', 'complete', 'James W.', '2026-05-05'),
        ('awt-006', 6, '3D views & renders', 'complete', 'Ahmed M.', '2026-04-28'),
        ('awt-007', 7, 'Material palette board', 'complete', 'Sarah J.', '2026-04-20')
    )
    INSERT INTO project_items (project_id, kind, data)
    SELECT
      p.id,
      'design-deliverable',
      jsonb_build_object(
        'seedKey', rows.seed_key,
        'order', rows.ord,
        'name', rows.name,
        'status', rows.status,
        'assignee', rows.assignee,
        'dueDate', rows.due_date,
        'stageCode', 'S2'
      )
    FROM p, rows
    WHERE NOT EXISTS (
      SELECT 1
      FROM project_items existing
      WHERE existing.project_id = p.id
        AND existing.kind = 'design-deliverable'
        AND existing.data->>'seedKey' = rows.seed_key
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS finance_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      kind text NOT NULL,
      data jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS finance_items_kind_idx ON finance_items (kind)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS finance_items_kind_created_idx ON finance_items (kind, created_at DESC)`);
  // Generic HR self-service items (e.g. salary-increment requests) — kind + jsonb,
  // owned by the submitting user; HR reviews. Mirrors finance_items/project_items.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS hr_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      kind text NOT NULL,
      data jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS hr_items_kind_idx ON hr_items (kind)`);

  // ---- Client Portal: project-scoped access + login/session logs ----
  // Client accounts reuse the `users` table (role='client'); these tables add
  // which projects a client may see (with a per-project admin/viewer role) and
  // a session log for the portal.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS client_project_access (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_user_id uuid NOT NULL,
      project_id uuid NOT NULL,
      role text NOT NULL DEFAULT 'viewer',
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS client_project_access_uniq ON client_project_access (client_user_id, project_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS client_project_access_project_idx ON client_project_access (project_id)`);
  await addFk("client_project_access_user_fk", "client_project_access", "client_user_id", "users(id)", "CASCADE");
  await addFk("client_project_access_project_fk", "client_project_access", "project_id", "projects(id)", "CASCADE");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS client_login_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_user_id uuid NOT NULL,
      ip_address text,
      device text,
      login_time timestamptz NOT NULL DEFAULT now(),
      logout_time timestamptz
    )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS client_login_logs_user_idx ON client_login_logs (client_user_id, login_time DESC)`);
  await addFk("client_login_logs_user_fk", "client_login_logs", "client_user_id", "users(id)", "CASCADE");

  // ---- Chat: real-user direct & group messaging (persisted) ----
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      type text NOT NULL DEFAULT 'dm',
      name text,
      created_by_user_id uuid,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS conversations_updated_idx ON conversations (updated_at DESC)`);
  await addFk("conversations_created_by_fk", "conversations", "created_by_user_id", "users(id)", "SET NULL");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversation_members (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id uuid NOT NULL,
      user_id uuid NOT NULL,
      last_read_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS conversation_members_uniq ON conversation_members (conversation_id, user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS conversation_members_user_idx ON conversation_members (user_id)`);
  await addFk("conversation_members_convo_fk", "conversation_members", "conversation_id", "conversations(id)", "CASCADE");
  await addFk("conversation_members_user_fk", "conversation_members", "user_id", "users(id)", "CASCADE");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id uuid NOT NULL,
      sender_id uuid,
      body text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS chat_messages_convo_idx ON chat_messages (conversation_id, created_at)`);
  await addFk("chat_messages_convo_fk", "chat_messages", "conversation_id", "conversations(id)", "CASCADE");
  await addFk("chat_messages_sender_fk", "chat_messages", "sender_id", "users(id)", "SET NULL");

  await ensureEnumType("lpo_status", [
    "draft", "submitted", "approved", "issued", "partially-received",
    "received", "invoiced", "closed", "cancelled",
  ]);
  await ensureEnumType("grn_status", ["draft", "confirmed", "matched-to-bill"]);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
      branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
      department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
      cost_center_id uuid REFERENCES cost_centers(id) ON DELETE SET NULL,
      reference text NOT NULL,
      date date NOT NULL,
      supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
      office text NOT NULL,
      currency text NOT NULL DEFAULT 'AED',
      fx_rate numeric(12,6),
      delivery_date date,
      delivery_address text,
      payment_terms_days integer,
      lines jsonb NOT NULL DEFAULT '[]'::jsonb,
      subtotal numeric(16,2) NOT NULL DEFAULT 0,
      vat_total numeric(16,2) NOT NULL DEFAULT 0,
      total numeric(16,2) NOT NULL DEFAULT 0,
      raised_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      raised_by_display text NOT NULL DEFAULT 'System',
      approver_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      approver_display text,
      approved_at timestamptz,
      rejection_note text,
      status lpo_status NOT NULL DEFAULT 'draft',
      linked_bill_id uuid REFERENCES ap_bills(id) ON DELETE SET NULL,
      linked_grn_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
      notes text,
      attachment_file_id uuid REFERENCES files(id) ON DELETE SET NULL,
      created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      updated_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      deleted_at timestamptz,
      deleted_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS purchase_orders_company_reference_uq ON purchase_orders (company_id, reference)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS purchase_orders_company_idx ON purchase_orders (company_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS purchase_orders_supplier_idx ON purchase_orders (supplier_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS purchase_orders_status_idx ON purchase_orders (status)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS purchase_orders_date_idx ON purchase_orders (date)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS purchase_orders_linked_bill_idx ON purchase_orders (linked_bill_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS purchase_orders_deleted_at_idx ON purchase_orders (deleted_at)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS goods_received_notes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
      branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
      department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
      cost_center_id uuid REFERENCES cost_centers(id) ON DELETE SET NULL,
      reference text NOT NULL,
      date date NOT NULL,
      lpo_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
      supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
      received_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      received_by_display text NOT NULL DEFAULT 'System',
      warehouse_location text,
      vehicle_number text,
      driver_name text,
      supplier_delivery_note text,
      lines jsonb NOT NULL DEFAULT '[]'::jsonb,
      status grn_status NOT NULL DEFAULT 'draft',
      matched_bill_id uuid REFERENCES ap_bills(id) ON DELETE SET NULL,
      notes text,
      attachment_file_id uuid REFERENCES files(id) ON DELETE SET NULL,
      created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      updated_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      deleted_at timestamptz,
      deleted_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS goods_received_notes_company_reference_uq ON goods_received_notes (company_id, reference)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS goods_received_notes_company_idx ON goods_received_notes (company_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS goods_received_notes_lpo_idx ON goods_received_notes (lpo_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS goods_received_notes_supplier_idx ON goods_received_notes (supplier_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS goods_received_notes_status_idx ON goods_received_notes (status)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS goods_received_notes_date_idx ON goods_received_notes (date)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS goods_received_notes_matched_bill_idx ON goods_received_notes (matched_bill_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS goods_received_notes_deleted_at_idx ON goods_received_notes (deleted_at)`);

  await pool.query(`
    INSERT INTO suppliers (company_id, code, name, category, currency, payment_terms_days, active, notes)
    VALUES
      ($1, 'S-016', 'Eros Stationery Trading', 'office-supplies', 'AED', 30, true, 'Procurement demo supplier'),
      ($1, 'S-017', 'PrintCity Dubai', 'office-supplies', 'AED', 30, true, 'Procurement demo supplier'),
      ($1, 'S-007', 'Autodesk Middle East FZE', 'it-services', 'AED', 30, true, 'Procurement demo supplier')
    ON CONFLICT (code) DO UPDATE SET
      company_id = EXCLUDED.company_id,
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      currency = EXCLUDED.currency,
      payment_terms_days = EXCLUDED.payment_terms_days,
      active = true
  `, [DEFAULT_COMPANY_ID]);

  await pool.query(`
    WITH s AS (SELECT id FROM suppliers WHERE code = 'S-016' LIMIT 1)
    INSERT INTO purchase_orders (
      company_id, reference, date, supplier_id, office, currency, delivery_date,
      payment_terms_days, raised_by_display, approver_display, approved_at,
      lines, subtotal, vat_total, total, status, linked_grn_ids
    )
    SELECT
      $1, 'LPO-2026-00123', '2026-05-23', s.id, 'dubai', 'AED', '2026-05-28',
      30, 'Aisha Al-Marzouqi', 'Director', '2026-05-23T11:00:00Z',
      jsonb_build_array(
        jsonb_build_object('id','l1','description','A1 plotter paper (white, 90gsm)','qty',20,'unitOfMeasure','rolls','unitPrice',95,'vatPct',5,'glAccountCode','6115','amountExVat',1900,'vatAmount',95,'amountIncVat',1995,'qtyReceived',20),
        jsonb_build_object('id','l2','description','Whiteboard markers (assorted)','qty',50,'unitOfMeasure','pcs','unitPrice',8,'vatPct',5,'glAccountCode','6115','amountExVat',400,'vatAmount',20,'amountIncVat',420,'qtyReceived',50)
      ),
      2300, 115, 2415, 'received', '[]'::jsonb
    FROM s
    ON CONFLICT (company_id, reference) DO UPDATE SET
      supplier_id = EXCLUDED.supplier_id,
      lines = EXCLUDED.lines,
      subtotal = EXCLUDED.subtotal,
      vat_total = EXCLUDED.vat_total,
      total = EXCLUDED.total,
      status = EXCLUDED.status,
      updated_at = now()
  `, [DEFAULT_COMPANY_ID]);

  await pool.query(`
    WITH s AS (SELECT id FROM suppliers WHERE code = 'S-017' LIMIT 1)
    INSERT INTO purchase_orders (
      company_id, reference, date, supplier_id, office, currency, delivery_date,
      payment_terms_days, raised_by_display, lines, subtotal, vat_total, total, status
    )
    SELECT
      $1, 'LPO-2026-00124', '2026-06-02', s.id, 'dubai', 'AED', '2026-06-17',
      30, 'Aisha Al-Marzouqi',
      jsonb_build_array(
        jsonb_build_object('id','l1','description','Authority submission set - colour print A1 (drawing pack Al Wasl Tower)','qty',8,'unitOfMeasure','sets','unitPrice',450,'vatPct',5,'glAccountCode','5060','projectId','11111111-1111-4111-8111-111111111111','amountExVat',3600,'vatAmount',180,'amountIncVat',3780)
      ),
      3600, 180, 3780, 'issued'
    FROM s
    ON CONFLICT (company_id, reference) DO UPDATE SET
      supplier_id = EXCLUDED.supplier_id,
      lines = EXCLUDED.lines,
      subtotal = EXCLUDED.subtotal,
      vat_total = EXCLUDED.vat_total,
      total = EXCLUDED.total,
      status = EXCLUDED.status,
      updated_at = now()
  `, [DEFAULT_COMPANY_ID]);

  await pool.query(`
    WITH s AS (SELECT id FROM suppliers WHERE code = 'S-007' LIMIT 1)
    INSERT INTO purchase_orders (
      company_id, reference, date, supplier_id, office, currency,
      payment_terms_days, raised_by_display, lines, subtotal, vat_total, total, status
    )
    SELECT
      $1, 'LPO-2026-00125', '2026-06-10', s.id, 'dubai', 'AED',
      30, 'Aisha Al-Marzouqi',
      jsonb_build_array(
        jsonb_build_object('id','l1','description','Autodesk AEC Collection - additional 2 seats','qty',2,'unitOfMeasure','annual seats','unitPrice',4800,'vatPct',5,'glAccountCode','6310','amountExVat',9600,'vatAmount',480,'amountIncVat',10080)
      ),
      9600, 480, 10080, 'draft'
    FROM s
    ON CONFLICT (company_id, reference) DO UPDATE SET
      supplier_id = EXCLUDED.supplier_id,
      lines = EXCLUDED.lines,
      subtotal = EXCLUDED.subtotal,
      vat_total = EXCLUDED.vat_total,
      total = EXCLUDED.total,
      status = EXCLUDED.status,
      updated_at = now()
  `, [DEFAULT_COMPANY_ID]);

  await pool.query(`
    WITH po AS (SELECT id, supplier_id FROM purchase_orders WHERE company_id = $1 AND reference = 'LPO-2026-00123' LIMIT 1)
    INSERT INTO goods_received_notes (
      company_id, reference, date, lpo_id, supplier_id, received_by_display,
      warehouse_location, lines, status
    )
    SELECT
      $1, 'GRN-2026-00045', '2026-05-28', po.id, po.supplier_id, 'Aisha Al-Marzouqi',
      'Boulevard Plaza - Storage',
      jsonb_build_array(
        jsonb_build_object('id','gl1','lpoLineId','l1','description','A1 plotter paper','qtyOrdered',20,'qtyReceivedThis',20,'qtyReceivedToDate',20,'condition','good'),
        jsonb_build_object('id','gl2','lpoLineId','l2','description','Whiteboard markers','qtyOrdered',50,'qtyReceivedThis',50,'qtyReceivedToDate',50,'condition','good')
      ),
      'matched-to-bill'
    FROM po
    ON CONFLICT (company_id, reference) DO UPDATE SET
      lpo_id = EXCLUDED.lpo_id,
      supplier_id = EXCLUDED.supplier_id,
      lines = EXCLUDED.lines,
      status = EXCLUDED.status,
      updated_at = now()
  `, [DEFAULT_COMPANY_ID]);

  await pool.query(`
    UPDATE purchase_orders po
    SET linked_grn_ids = jsonb_build_array(grn.id), updated_at = now()
    FROM goods_received_notes grn
    WHERE po.company_id = $1
      AND grn.company_id = $1
      AND po.reference = 'LPO-2026-00123'
      AND grn.reference = 'GRN-2026-00045'
  `, [DEFAULT_COMPANY_ID]);

  await ensureEnumType("e_invoice_direction", ["issued", "received"]);
  await ensureEnumType("e_invoice_category", [
    "tax-invoice", "self-billed-tax", "tax-credit-note", "self-billed-credit",
    "commercial-invoice", "commercial-credit-note",
  ]);
  await ensureEnumType("e_invoice_status", [
    "draft", "received", "pending-approval", "submitted", "validated", "transmitted",
    "confirmed", "approved", "posted", "rejected", "failed", "cancelled",
  ]);
  await ensureEnumType("e_invoice_scenario", [
    "free-zone", "deemed-supply", "margin-scheme", "summary", "continuous-supply",
    "agent-billing", "e-commerce", "exports",
  ]);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS e_invoice_company_profiles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      tin text,
      trn text,
      participant_id text,
      legal_name text NOT NULL,
      trade_license_authority text,
      registration_type text,
      registration_id text,
      address jsonb NOT NULL DEFAULT '{}'::jsonb,
      vat_registered boolean NOT NULL DEFAULT true,
      tax_group_member boolean NOT NULL DEFAULT false,
      tax_group_tin text,
      annual_revenue_band text NOT NULL DEFAULT 'above50m',
      asp_name text,
      asp_endpoint text,
      asp_environment text NOT NULL DEFAULT 'simulation',
      asp_status text NOT NULL DEFAULT 'not-configured',
      asp_credential_ref text,
      asp_appointment_deadline date,
      go_live_date date,
      voluntary_onboarding_date date,
      retention_years integer NOT NULL DEFAULT 5,
      notes text,
      created_by_user_id uuid,
      updated_by_user_id uuid,
      deleted_at timestamptz,
      deleted_by_user_id uuid,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS e_invoice_company_profiles_company_uq ON e_invoice_company_profiles (company_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS e_invoice_company_profiles_deleted_at_idx ON e_invoice_company_profiles (deleted_at)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS e_invoice_clients (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
      code text NOT NULL,
      name text NOT NULL,
      tin text,
      trn text,
      legal_reg_id text,
      legal_reg_type text,
      electronic_address text,
      electronic_identifier text,
      address jsonb NOT NULL DEFAULT '{}'::jsonb,
      free_zone boolean NOT NULL DEFAULT false,
      free_zone_entity text,
      beneficiary_name text,
      beneficiary_address text,
      on_e_invoicing_system boolean NOT NULL DEFAULT false,
      active boolean NOT NULL DEFAULT true,
      notes text,
      created_by_user_id uuid,
      updated_by_user_id uuid,
      deleted_at timestamptz,
      deleted_by_user_id uuid,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS e_invoice_clients_company_code_uq ON e_invoice_clients (company_id, code)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS e_invoice_clients_company_idx ON e_invoice_clients (company_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS e_invoice_clients_customer_idx ON e_invoice_clients (customer_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS e_invoice_clients_trn_idx ON e_invoice_clients (trn)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS e_invoice_documents (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      direction e_invoice_direction NOT NULL,
      category e_invoice_category NOT NULL,
      status e_invoice_status NOT NULL DEFAULT 'draft',
      invoice_number text NOT NULL,
      invoice_uuid text NOT NULL,
      issue_date date NOT NULL,
      due_date date,
      currency_code text NOT NULL DEFAULT 'AED',
      transaction_type_code text NOT NULL,
      payment_means_code text NOT NULL DEFAULT '30',
      scenario e_invoice_scenario NOT NULL DEFAULT 'continuous-supply',
      seller jsonb NOT NULL DEFAULT '{}'::jsonb,
      buyer jsonb NOT NULL DEFAULT '{}'::jsonb,
      lines jsonb NOT NULL DEFAULT '[]'::jsonb,
      tax_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
      total_net_amount numeric(16,2) NOT NULL DEFAULT 0,
      total_tax_amount numeric(16,2) NOT NULL DEFAULT 0,
      total_with_tax numeric(16,2) NOT NULL DEFAULT 0,
      amount_due numeric(16,2) NOT NULL DEFAULT 0,
      retention_expiry date,
      xml_generated boolean NOT NULL DEFAULT false,
      pdf_generated boolean NOT NULL DEFAULT false,
      xml_file_id uuid,
      pdf_file_id uuid,
      ar_invoice_id uuid REFERENCES ar_invoices(id) ON DELETE SET NULL,
      ap_bill_id uuid REFERENCES ap_bills(id) ON DELETE SET NULL,
      e_invoice_client_id uuid REFERENCES e_invoice_clients(id) ON DELETE SET NULL,
      customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
      supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
      project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
      project_name text,
      milestone text,
      po_ref text,
      grn_ref text,
      match_status text,
      preceding_invoice_ref text,
      preceding_invoice_uuid text,
      status_history jsonb NOT NULL DEFAULT '[]'::jsonb,
      source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
      asp_submission_id text,
      asp_last_response jsonb,
      asp_submitted_at timestamptz,
      confirmed_at timestamptz,
      failed_reason text,
      created_by_user_id uuid,
      updated_by_user_id uuid,
      deleted_at timestamptz,
      deleted_by_user_id uuid,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS e_invoice_documents_uuid_uq ON e_invoice_documents (invoice_uuid)`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS e_invoice_documents_company_direction_number_uq ON e_invoice_documents (company_id, direction, invoice_number)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS e_invoice_documents_company_status_idx ON e_invoice_documents (company_id, status)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS e_invoice_documents_company_issue_idx ON e_invoice_documents (company_id, issue_date)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS e_invoice_documents_direction_idx ON e_invoice_documents (direction)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS e_invoice_documents_ar_idx ON e_invoice_documents (ar_invoice_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS e_invoice_documents_ap_idx ON e_invoice_documents (ap_bill_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS e_invoice_documents_customer_idx ON e_invoice_documents (customer_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS e_invoice_documents_supplier_idx ON e_invoice_documents (supplier_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS e_invoice_documents_project_idx ON e_invoice_documents (project_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS e_invoice_documents_deleted_at_idx ON e_invoice_documents (deleted_at)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS e_invoice_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      document_id uuid REFERENCES e_invoice_documents(id) ON DELETE CASCADE,
      status e_invoice_status NOT NULL,
      message text NOT NULL,
      payload jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS e_invoice_events_document_idx ON e_invoice_events (document_id, created_at)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS e_invoice_events_company_idx ON e_invoice_events (company_id, created_at)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS e_invoice_webhook_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
      provider text NOT NULL,
      event_type text NOT NULL,
      external_id text,
      payload jsonb NOT NULL DEFAULT '{}'::jsonb,
      processed boolean NOT NULL DEFAULT false,
      processed_at timestamptz,
      error text,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS e_invoice_webhook_logs_provider_event_idx ON e_invoice_webhook_logs (provider, event_type)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS e_invoice_webhook_logs_external_idx ON e_invoice_webhook_logs (external_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS e_invoice_webhook_logs_created_idx ON e_invoice_webhook_logs (created_at)`);

  await pool.query(`
    INSERT INTO e_invoice_company_profiles (
      company_id, tin, trn, participant_id, legal_name, trade_license_authority,
      registration_type, registration_id, address, annual_revenue_band, asp_name,
      asp_endpoint, asp_environment, asp_status, asp_credential_ref,
      asp_appointment_deadline, go_live_date, voluntary_onboarding_date
    )
    VALUES (
      $1, '1234567890', '123456789012003', '0235:1234567890',
      'NASEC Architecture & Engineering Consultants LLC',
      'Dubai Economy and Tourism', 'TL', 'TL-DXB-2019-045678',
      '{"line1":"Office 2301, Boulevard Plaza Tower 1","city":"Dubai","subdivision":"Downtown Dubai","country":"AE"}'::jsonb,
      'above50m', 'Pagero (Thomson Reuters)', null, 'simulation', 'simulation-ready',
      'EINVOICE_ASP_API_KEY', '2026-07-31', '2027-01-01', '2026-07-01'
    )
    ON CONFLICT (company_id) DO UPDATE SET
      legal_name = EXCLUDED.legal_name,
      trade_license_authority = EXCLUDED.trade_license_authority,
      registration_type = EXCLUDED.registration_type,
      registration_id = EXCLUDED.registration_id,
      address = EXCLUDED.address,
      asp_environment = EXCLUDED.asp_environment,
      asp_status = EXCLUDED.asp_status,
      updated_at = now()
  `, [DEFAULT_COMPANY_ID]);

  await pool.query(`
    INSERT INTO customers (company_id, code, name, trn_number, address, contact_name, contact_email, currency, payment_terms_days, active)
    VALUES
      ($1, 'CUST-EINV-EMAAR', 'Emaar Properties PJSC', '300123456700003', 'Emaar Square, Building 1, Downtown Dubai, AE', 'Accounts Payable', 'ap@example.invalid', 'AED', 30, true),
      ($1, 'CUST-EINV-JAFZA', 'JAFZA Operations LLC', '400234567800003', 'LOB 18, Jebel Ali Free Zone, Dubai, AE', 'Accounts Payable', 'ap-jafza@example.invalid', 'AED', 30, true),
      ($1, 'CUST-EINV-SBG', 'Saudi Binladin Group', null, 'King Fahd Road, Riyadh, SA', 'Accounts Payable', 'ap-sbg@example.invalid', 'USD', 30, true)
    ON CONFLICT (code) DO UPDATE SET
      name = EXCLUDED.name,
      trn_number = EXCLUDED.trn_number,
      address = EXCLUDED.address,
      currency = EXCLUDED.currency,
      active = true
  `, [DEFAULT_COMPANY_ID]);

  await pool.query(`
    INSERT INTO suppliers (company_id, code, name, trn_number, category, contact_name, contact_email, currency, payment_terms_days, active)
    VALUES ($1, 'SUP-EINV-GGS', 'Gulf Geotechnical Surveys LLC', '100987654300003', 'consultant', 'Accounts Receivable', 'ar-ggs@example.invalid', 'AED', 30, true)
    ON CONFLICT (code) DO UPDATE SET
      name = EXCLUDED.name,
      trn_number = EXCLUDED.trn_number,
      category = EXCLUDED.category,
      active = true
  `, [DEFAULT_COMPANY_ID]);

  await pool.query(`
    WITH source(code, name, tin, trn, legal_reg_id, legal_reg_type, electronic_address, electronic_identifier, address, free_zone, free_zone_entity, beneficiary_name, beneficiary_address, on_system) AS (
      VALUES
        ('CLI-001', 'Emaar Properties PJSC', '3001234567', '300123456700003', 'TL-DXB-2005-000123', 'TL', '0235:3001234567', '0235', '{"line1":"Emaar Square, Building 1","city":"Dubai","subdivision":"Downtown Dubai","country":"AE"}'::jsonb, false, null, 'Emaar Properties PJSC', null, true),
        ('CLI-002', 'JAFZA Operations LLC', '4002345678', '400234567800003', 'TL-JAFZA-2010-009876', 'TL', '0235:4002345678', '0235', '{"line1":"LOB 18, Jebel Ali Free Zone","city":"Dubai","subdivision":"Jebel Ali","country":"AE"}'::jsonb, true, 'JAFZA', 'JAFZA Operations LLC', 'LOB 18, JAFZA', true),
        ('CLI-003', 'Saudi Binladin Group', null, null, 'CR-1010012345', 'CD', '0235:9900000099', '0235', '{"line1":"King Fahd Road","city":"Riyadh","subdivision":"Riyadh Province","country":"SA"}'::jsonb, false, null, 'Saudi Binladin Group', null, false)
    ),
    matched AS (
      SELECT DISTINCT ON (source.code)
        source.*,
        customers.id AS customer_id
      FROM source
      LEFT JOIN customers ON customers.name = source.name
    )
    INSERT INTO e_invoice_clients (
      company_id, customer_id, code, name, tin, trn, legal_reg_id, legal_reg_type,
      electronic_address, electronic_identifier, address, free_zone, free_zone_entity,
      beneficiary_name, beneficiary_address, on_e_invoicing_system
    )
    SELECT
      $1, customer_id, code, name, tin, trn, legal_reg_id, legal_reg_type,
      electronic_address, electronic_identifier, address, free_zone, free_zone_entity,
      beneficiary_name, beneficiary_address, on_system
    FROM matched
    ON CONFLICT (company_id, code) DO UPDATE SET
      customer_id = EXCLUDED.customer_id,
      name = EXCLUDED.name,
      tin = EXCLUDED.tin,
      trn = EXCLUDED.trn,
      legal_reg_id = EXCLUDED.legal_reg_id,
      legal_reg_type = EXCLUDED.legal_reg_type,
      electronic_address = EXCLUDED.electronic_address,
      electronic_identifier = EXCLUDED.electronic_identifier,
      address = EXCLUDED.address,
      free_zone = EXCLUDED.free_zone,
      free_zone_entity = EXCLUDED.free_zone_entity,
      beneficiary_name = EXCLUDED.beneficiary_name,
      beneficiary_address = EXCLUDED.beneficiary_address,
      on_e_invoicing_system = EXCLUDED.on_e_invoicing_system,
      updated_at = now()
  `, [DEFAULT_COMPANY_ID]);

  await pool.query(`
    WITH c AS (SELECT id FROM customers WHERE code = 'CUST-EINV-EMAAR' LIMIT 1)
    INSERT INTO ar_invoices (
      company_id, number, customer_id, invoice_date, due_date, office, currency,
      lines, subtotal, vat_total, total, amount_paid, balance, status, notes
    )
    SELECT
      $1, 'NASEC/2026/INV-0042', c.id, '2026-05-01', '2026-05-31', 'dubai', 'AED',
      jsonb_build_array(
        jsonb_build_object('id','L1','description','Stage 3 - Schematic Design Fee (Marina Heights Tower)','qty',1,'unitPrice',450000,'vatCode','STD-5','accountCode','4000','amountExVat',450000,'vatAmount',22500,'amountIncVat',472500),
        jsonb_build_object('id','L2','description','MEP Coordination - Schematic Phase','qty',1,'unitPrice',180000,'vatCode','STD-5','accountCode','4020','amountExVat',180000,'vatAmount',9000,'amountIncVat',189000)
      ),
      630000, 31500, 661500, 0, 661500, 'sent', 'Seeded from E-Invoicing module'
    FROM c
    ON CONFLICT (number) DO UPDATE SET
      customer_id = EXCLUDED.customer_id,
      lines = EXCLUDED.lines,
      subtotal = EXCLUDED.subtotal,
      vat_total = EXCLUDED.vat_total,
      total = EXCLUDED.total,
      balance = EXCLUDED.balance,
      updated_at = now()
  `, [DEFAULT_COMPANY_ID]);

  await pool.query(`
    WITH profile AS (SELECT * FROM e_invoice_company_profiles WHERE company_id = $1 LIMIT 1),
    client AS (SELECT eic.*, c.id AS cust_id FROM e_invoice_clients eic LEFT JOIN customers c ON c.id = eic.customer_id WHERE eic.code = 'CLI-001' LIMIT 1),
    ar AS (SELECT id FROM ar_invoices WHERE number = 'NASEC/2026/INV-0042' LIMIT 1)
    INSERT INTO e_invoice_documents (
      company_id, direction, category, status, invoice_number, invoice_uuid, issue_date, due_date,
      currency_code, transaction_type_code, payment_means_code, scenario, seller, buyer, lines,
      tax_breakdown, total_net_amount, total_tax_amount, total_with_tax, amount_due,
      retention_expiry, xml_generated, pdf_generated, ar_invoice_id, e_invoice_client_id,
      customer_id, project_name, milestone, status_history
    )
    SELECT
      $1, 'issued', 'tax-invoice', 'confirmed', 'NASEC/2026/INV-0042',
      'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2026-05-01', '2026-05-31',
      'AED', '00001000', '30', 'continuous-supply',
      jsonb_build_object('name', profile.legal_name, 'tin', profile.tin, 'trn', profile.trn),
      jsonb_build_object('name', client.name, 'tin', client.tin, 'trn', client.trn),
      jsonb_build_array(
        jsonb_build_object('id','L1','description','Stage 3 - Schematic Design Fee (Marina Heights Tower)','itemName','Architectural Design Services - Schematic','quantity',1,'unitOfMeasure','EA','netPrice',450000,'grossPrice',472500,'baseQuantity',1,'netAmount',450000,'taxCategoryCode','S','taxRate',5,'vatAmountAED',22500,'lineAmountAED',450000,'itemType','S'),
        jsonb_build_object('id','L2','description','MEP Coordination - Schematic Phase','itemName','MEP Engineering Services','quantity',1,'unitOfMeasure','EA','netPrice',180000,'grossPrice',189000,'baseQuantity',1,'netAmount',180000,'taxCategoryCode','S','taxRate',5,'vatAmountAED',9000,'lineAmountAED',180000,'itemType','S')
      ),
      jsonb_build_array(jsonb_build_object('categoryCode','S','taxableAmount',630000,'taxAmount',31500,'rate',5)),
      630000, 31500, 661500, 661500, '2031-12-31', true, true,
      ar.id, client.id, client.cust_id, 'Marina Heights Tower', 'Stage 3 - Schematic Design',
      jsonb_build_array(
        jsonb_build_object('status','draft','timestamp','2026-05-01T08:00:00Z','message','Invoice created from project milestone'),
        jsonb_build_object('status','submitted','timestamp','2026-05-01T08:05:00Z','message','Submitted to ASP connector'),
        jsonb_build_object('status','validated','timestamp','2026-05-01T08:06:30Z','message','PINT-AE validation passed, XML generated'),
        jsonb_build_object('status','transmitted','timestamp','2026-05-01T08:07:00Z','message','Transmitted through 5-corner flow'),
        jsonb_build_object('status','confirmed','timestamp','2026-05-01T09:15:00Z','message','Buyer ASP confirmed receipt. FTA acknowledged.')
      )
    FROM profile, client, ar
    ON CONFLICT (invoice_uuid) DO UPDATE SET
      ar_invoice_id = EXCLUDED.ar_invoice_id,
      status = EXCLUDED.status,
      status_history = EXCLUDED.status_history,
      updated_at = now()
  `, [DEFAULT_COMPANY_ID]);

  await pool.query(`
    WITH supplier AS (SELECT id FROM suppliers WHERE code = 'SUP-EINV-GGS' LIMIT 1),
    profile AS (SELECT * FROM e_invoice_company_profiles WHERE company_id = $1 LIMIT 1)
    INSERT INTO e_invoice_documents (
      company_id, direction, category, status, invoice_number, invoice_uuid, issue_date, due_date,
      currency_code, transaction_type_code, payment_means_code, scenario, seller, buyer, lines,
      tax_breakdown, total_net_amount, total_tax_amount, total_with_tax, amount_due,
      supplier_id, project_name, po_ref, grn_ref, match_status, status_history
    )
    SELECT
      $1, 'received', 'tax-invoice', 'pending-approval', 'GGS/2026/0891',
      '91bc9a93-1bdb-4976-9a8f-81f83e721001', '2026-05-02', '2026-06-01',
      'AED', '00001000', '30', 'continuous-supply',
      jsonb_build_object('name','Gulf Geotechnical Surveys LLC','tin','1009876543','trn','100987654300003'),
      jsonb_build_object('name', profile.legal_name, 'tin', profile.tin, 'trn', profile.trn),
      jsonb_build_array(
        jsonb_build_object('id','L1','description','Soil investigation report - Phase 2 boreholes','itemName','Geotechnical Survey Services','quantity',1,'unitOfMeasure','EA','netPrice',45000,'grossPrice',47250,'baseQuantity',1,'netAmount',45000,'taxCategoryCode','S','taxRate',5,'vatAmountAED',2250,'lineAmountAED',45000,'itemType','S')
      ),
      jsonb_build_array(jsonb_build_object('categoryCode','S','taxableAmount',45000,'taxAmount',2250,'rate',5)),
      45000, 2250, 47250, 47250,
      supplier.id, 'Marina Heights Tower', 'PO-2026-0034', 'GRN-2026-0078', '3-way-matched',
      jsonb_build_array(jsonb_build_object('status','received','timestamp','2026-05-02T10:15:00Z','message','Received through ASP inbound channel'))
    FROM supplier, profile
    ON CONFLICT (invoice_uuid) DO UPDATE SET
      supplier_id = EXCLUDED.supplier_id,
      status = CASE WHEN e_invoice_documents.ap_bill_id IS NULL THEN EXCLUDED.status ELSE e_invoice_documents.status END,
      updated_at = now()
  `, [DEFAULT_COMPANY_ID]);

  const companyTables = [
    "users", "employees", "projects", "files", "coa_accounts", "customers", "suppliers",
    "ar_invoices", "ar_receipts", "ap_bills", "supplier_payments", "journal_entries",
    "vat_returns", "bank_accounts", "petty_cash_floats", "fixed_assets", "finance_items",
    "purchase_orders", "goods_received_notes",
    "leads", "contractor_companies",
  ];
  for (const table of companyTables) {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS company_id uuid`);
    await pool.query(`UPDATE ${table} SET company_id = $1 WHERE company_id IS NULL`, [DEFAULT_COMPANY_ID]);
    await pool.query(`CREATE INDEX IF NOT EXISTS ${table}_company_idx ON ${table} (company_id)`);
    await addFk(`${table}_company_fk`, table, "company_id", "companies(id)");
  }

  const branchTables = ["employees", "projects", "ar_invoices", "ap_bills", "journal_entries", "bank_accounts", "purchase_orders", "goods_received_notes"];
  for (const table of branchTables) {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS branch_id uuid`);
    await pool.query(`CREATE INDEX IF NOT EXISTS ${table}_branch_idx ON ${table} (branch_id)`);
    await addFk(`${table}_branch_fk`, table, "branch_id", "branches(id)");
  }
  await pool.query(`UPDATE employees SET branch_id = CASE WHEN office::text = 'cairo' THEN $2::uuid ELSE $1::uuid END WHERE branch_id IS NULL`, [DEFAULT_DUBAI_BRANCH_ID, DEFAULT_CAIRO_BRANCH_ID]);
  await pool.query(`UPDATE projects SET branch_id = CASE WHEN office = 'cairo' THEN $2::uuid ELSE $1::uuid END WHERE branch_id IS NULL`, [DEFAULT_DUBAI_BRANCH_ID, DEFAULT_CAIRO_BRANCH_ID]);
  await pool.query(`UPDATE bank_accounts SET branch_id = CASE WHEN office = 'cairo' THEN $2::uuid ELSE $1::uuid END WHERE branch_id IS NULL`, [DEFAULT_DUBAI_BRANCH_ID, DEFAULT_CAIRO_BRANCH_ID]);

  const departmentTables = ["employees", "ar_invoices", "ap_bills", "journal_entries", "purchase_orders", "goods_received_notes"];
  for (const table of departmentTables) {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS department_id uuid`);
    await pool.query(`CREATE INDEX IF NOT EXISTS ${table}_department_ref_idx ON ${table} (department_id)`);
    await addFk(`${table}_department_fk`, table, "department_id", "departments(id)");
  }

  const costCenterTables = ["projects", "ar_invoices", "ap_bills", "journal_entries", "purchase_orders", "goods_received_notes"];
  for (const table of costCenterTables) {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS cost_center_id uuid`);
    await pool.query(`CREATE INDEX IF NOT EXISTS ${table}_cost_center_idx ON ${table} (cost_center_id)`);
    await addFk(`${table}_cost_center_fk`, table, "cost_center_id", "cost_centers(id)");
  }

  const auditedTables = [
    "users", "notifications", "office_config", "files", "file_acl", "employees", "employee_compensation",
    "employee_bank_details", "employee_documents", "dependents", "leave_requests", "leave_balances",
    "leave_handovers", "training_records", "asset_assignments", "disciplinary_actions",
    "performance_reviews", "onboarding_checklists", "payroll_runs", "payslips", "letters_issued",
    "projects", "project_team_members", "project_stages", "stage_gate_approvals", "authority_submittals",
    "project_risks", "doc_folders", "project_documents", "drawings", "rfis", "project_items",
    "tasks", "task_timer_sessions", "task_messages", "timesheets", "geofences", "attendance_punches",
    "location_pings", "attendance_daily_rollup", "leads", "lead_activities", "lead_conversions",
    "coa_accounts", "customers", "suppliers", "ar_invoices", "ar_receipts", "ap_bills",
    "supplier_payments", "journal_entries", "vat_returns", "bank_accounts", "bank_transactions",
    "petty_cash_floats", "petty_cash_vouchers", "fixed_assets", "finance_items",
    "purchase_orders", "goods_received_notes",
    "e_invoice_company_profiles", "e_invoice_clients", "e_invoice_documents",
    "e_invoice_events", "e_invoice_webhook_logs",
    "contractor_companies", "contractor_users", "submittals", "submittal_revisions",
    "submittal_messages", "companies", "branches", "departments", "cost_centers",
    "exchange_rates", "fiscal_years", "fiscal_periods",
  ];
  for (const table of auditedTables) {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS created_by_user_id uuid`);
    await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS updated_by_user_id uuid`);
    await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS deleted_at timestamptz`);
    await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS deleted_by_user_id uuid`);
    await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now()`);
    await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()`);
    await pool.query(`CREATE INDEX IF NOT EXISTS ${table}_deleted_at_idx ON ${table} (deleted_at)`);
    await addFk(`${table}_created_by_user_fk`, table, "created_by_user_id", "users(id)");
    await addFk(`${table}_updated_by_user_fk`, table, "updated_by_user_id", "users(id)");
    await addFk(`${table}_deleted_by_user_fk`, table, "deleted_by_user_id", "users(id)");
  }

  const fileReferences: Array<[string, string, string]> = [
    ["ap_bills", "attachment_file_id", "ap_bills_attachment_file_fk"],
    ["ar_invoices", "attachment_file_id", "ar_invoices_attachment_file_fk"],
    ["e_invoice_documents", "xml_file_id", "e_invoice_documents_xml_file_fk"],
    ["e_invoice_documents", "pdf_file_id", "e_invoice_documents_pdf_file_fk"],
    ["employee_documents", "file_id", "employee_documents_file_fk"],
    ["journal_entries", "attachment_file_id", "journal_entries_attachment_file_fk"],
    ["letters_issued", "file_id", "letters_issued_file_fk"],
    ["payslips", "file_id", "payslips_file_fk"],
    ["petty_cash_vouchers", "receipt_file_id", "petty_cash_vouchers_receipt_file_fk"],
    ["project_documents", "file_store_id", "project_documents_file_store_fk"],
    ["purchase_orders", "attachment_file_id", "purchase_orders_attachment_file_fk"],
    ["goods_received_notes", "attachment_file_id", "goods_received_notes_attachment_file_fk"],
    ["submittal_messages", "attachment_file_id", "submittal_messages_attachment_file_fk"],
    ["task_messages", "file_store_id", "task_messages_file_store_fk"],
    ["training_records", "certificate_file_id", "training_records_certificate_file_fk"],
  ];
  for (const [table, column, name] of fileReferences) {
    await pool.query(`CREATE INDEX IF NOT EXISTS ${table}_${column}_idx ON ${table} (${column})`);
    await addFk(name, table, column, "files(id)");
  }

  await addFk("users_employee_fk", "users", "employee_id", "employees(id)");
  await addFk("employees_manager_employee_fk", "employees", "manager_employee_id", "employees(id)");
  await addFk("employees_assigned_project_fk", "employees", "assigned_project_id", "projects(id)");
  await addFk("doc_folders_parent_fk", "doc_folders", "parent_id", "doc_folders(id)");
  await addFk("journal_entries_reversal_fk", "journal_entries", "reversal_of", "journal_entries(id)");
  await addFk("leave_handovers_task_fk", "leave_handovers", "task_id", "tasks(id)");
  await addFk("ar_receipts_bank_account_fk", "ar_receipts", "bank_account_id", "bank_accounts(id)");
  await addFk("supplier_payments_bank_account_fk", "supplier_payments", "bank_account_id", "bank_accounts(id)");
  await addFk("project_items_project_fk", "project_items", "project_id", "projects(id)", "CASCADE");

  await pool.query(`CREATE INDEX IF NOT EXISTS project_items_project_kind_idx ON project_items (project_id, kind)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS project_items_kind_project_idx ON project_items (kind, project_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS audit_log_entity_at_idx ON audit_log (entity_type, entity_id, at DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS attendance_punches_employee_ts_desc_idx ON attendance_punches (employee_id, timestamp DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS location_pings_employee_ts_desc_idx ON location_pings (employee_id, timestamp DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS files_uploaded_by_user_idx ON files (uploaded_by_user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS project_documents_uploaded_by_user_idx ON project_documents (uploaded_by_user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS task_messages_user_idx ON task_messages (user_id)`);
  await createUniqueIndexIfClean("project_stages_project_code_uq", "project_stages", "project_id, sub_stage_code", "project_id IS NOT NULL AND sub_stage_code IS NOT NULL", "project_id, sub_stage_code");
  await createUniqueIndexIfClean("stage_gate_project_stage_gate_uq", "stage_gate_approvals", "project_id, stage_code, gate_code", "project_id IS NOT NULL AND stage_code IS NOT NULL AND gate_code IS NOT NULL", "project_id, stage_code, gate_code");
  await createUniqueIndexIfClean("drawings_project_number_uq", "drawings", "project_id, drawing_number", "project_id IS NOT NULL AND drawing_number IS NOT NULL", "project_id, drawing_number");
  await createUniqueIndexIfClean("rfis_project_reference_uq", "rfis", "project_id, reference", "project_id IS NOT NULL AND reference IS NOT NULL", "project_id, reference");
  await createUniqueIndexIfClean("payslips_run_employee_uq", "payslips", "payroll_run_id, employee_id", "payroll_run_id IS NOT NULL AND employee_id IS NOT NULL", "payroll_run_id, employee_id");
  await createUniqueIndexIfClean("payroll_runs_period_uq", "payroll_runs", "office, period_year, period_month", "office IS NOT NULL AND period_year IS NOT NULL AND period_month IS NOT NULL", "office, period_year, period_month");
  await createUniqueIndexIfClean("contractor_users_company_email_uq", "contractor_users", "company_id, lower(email)", "company_id IS NOT NULL AND email IS NOT NULL", "company_id, lower(email)");
  await createUniqueIndexIfClean("submittal_revisions_submittal_revision_uq", "submittal_revisions", "submittal_id, revision", "submittal_id IS NOT NULL AND revision IS NOT NULL", "submittal_id, revision");
  await createUniqueIndexIfClean("timesheets_user_week_uq", "timesheets", "user_id, week_start_date", "user_id IS NOT NULL AND week_start_date IS NOT NULL", "user_id, week_start_date");

  await addCheck("leave_requests_date_order_chk", "leave_requests", "to_date >= from_date");
  await addCheck("leave_requests_days_nonnegative_chk", "leave_requests", "days >= 0");
  await addCheck("projects_progress_range_chk", "projects", "progress >= 0 AND progress <= 100");
  await addCheck("projects_budget_consumed_nonnegative_chk", "projects", "budget_consumed >= 0");
  await addCheck("ar_invoices_amounts_nonnegative_chk", "ar_invoices", "subtotal >= 0 AND vat_total >= 0 AND total >= 0 AND amount_paid >= 0 AND balance >= 0");
  await addCheck("ap_bills_amounts_nonnegative_chk", "ap_bills", "subtotal >= 0 AND vat_total >= 0 AND total >= 0 AND amount_paid >= 0 AND balance >= 0");
  await addCheck("purchase_orders_amounts_nonnegative_chk", "purchase_orders", "subtotal >= 0 AND vat_total >= 0 AND total >= 0");
  await addCheck("e_invoice_documents_amounts_nonnegative_chk", "e_invoice_documents", "total_net_amount >= 0 AND total_tax_amount >= 0 AND total_with_tax >= 0 AND amount_due >= 0");
  await addCheck("e_invoice_documents_transaction_type_chk", "e_invoice_documents", "transaction_type_code ~ '^[01]{8}$'");
  await addCheck("e_invoice_company_profiles_retention_years_chk", "e_invoice_company_profiles", "retention_years >= 5");
  await addCheck("payslips_amounts_nonnegative_chk", "payslips", "gross >= 0 AND net >= 0");
  await addCheck("geofences_radius_positive_chk", "geofences", "radius_m > 0");
  await addCheck("attendance_accuracy_nonnegative_chk", "attendance_punches", "accuracy_m IS NULL OR accuracy_m >= 0");
  await addCheck("exchange_rates_positive_chk", "exchange_rates", "rate > 0");
  await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'info'`);
  await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS source_entity_type text`);
  await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS source_entity_id text`);
  await pool.query(`ALTER TABLE submittals ADD COLUMN IF NOT EXISTS contractor_user_display text`);
  await pool.query(`ALTER TYPE leave_type ADD VALUE IF NOT EXISTS 'permission'`);
  await pool.query(`ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS hours numeric(4,2)`);
  await pool.query(`ALTER TABLE leave_requests ALTER COLUMN hours TYPE numeric(4,2)`);
  await pool.query(`ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS start_time text`);
  await pool.query(`ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS end_time text`);
  await pool.query(`ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS effective_date date`);
  // Audit fix #3 — indexes for actively-queried FK columns (hot paths)
  await pool.query(`CREATE INDEX IF NOT EXISTS attendance_punches_project_idx ON attendance_punches (project_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS attendance_punches_geofence_idx ON attendance_punches (geofence_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS ar_invoices_project_idx ON ar_invoices (project_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS ar_receipts_customer_idx ON ar_receipts (customer_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS supplier_payments_supplier_idx ON supplier_payments (supplier_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS purchase_orders_company_status_date_idx ON purchase_orders (company_id, status, date DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS goods_received_notes_company_status_date_idx ON goods_received_notes (company_id, status, date DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS tasks_reporter_idx ON tasks (reporter_user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS tasks_project_idx ON tasks (project_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS contractor_users_user_idx ON contractor_users (user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS petty_cash_vouchers_project_idx ON petty_cash_vouchers (project_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS journal_entries_source_ref_idx ON journal_entries (source, source_ref_id)`);
  // Task list scoping runs assignee_user_ids @> '[uuid]' on every request
  await pool.query(`CREATE INDEX IF NOT EXISTS tasks_assignees_gin_idx ON tasks USING gin (assignee_user_ids)`);
  console.log("[migrate] column checks OK");

  try {
    const rlsPath = join(__dirname, "rls.sql");
    const sql = readFileSync(rlsPath, "utf8");
    console.log("[migrate] applying RLS policies...");
    await pool.query(sql);
    console.log("[migrate] RLS policies OK");
  } catch (err) {
    console.warn("[migrate] RLS policies skipped:", (err as Error).message);
  }

  await pool.end();
}

main().catch((err) => {
  console.error("[migrate] failed:", err);
  process.exit(1);
});

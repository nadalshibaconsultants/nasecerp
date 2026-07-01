-- Row-Level Security policies for Phase 0 foundation tables.
-- Per-request context is set in middleware/rls-context.ts via SET LOCAL:
--   app.user_id    uuid of authenticated user (or '' for unauthenticated)
--   app.role       role string from users.role
--   app.office     office string ('dubai'|'cairo'|'')
--   app.employee_id linked employee uuid (or '')

-- Helper: returns true if current role has full access ('*' equivalent)
CREATE OR REPLACE FUNCTION app_is_director() RETURNS boolean AS $$
  SELECT coalesce(current_setting('app.role', true), '') = 'director';
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS uuid AS $$
  SELECT nullif(current_setting('app.user_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_current_role() RETURNS text AS $$
  SELECT coalesce(current_setting('app.role', true), '');
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_current_office() RETURNS text AS $$
  SELECT coalesce(current_setting('app.office', true), '');
$$ LANGUAGE sql STABLE;

-- =====================================================================
-- USERS
-- =====================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select ON users;
CREATE POLICY users_select ON users
  FOR SELECT USING (
    app_is_director()
    OR app_current_role() = 'hr-manager'
    OR id = app_current_user_id()
  );

DROP POLICY IF EXISTS users_modify ON users;
CREATE POLICY users_modify ON users
  FOR ALL USING (app_is_director() OR app_current_role() = 'hr-manager')
  WITH CHECK (app_is_director() OR app_current_role() = 'hr-manager');

-- =====================================================================
-- REFRESH TOKENS — only owner reads; only system writes (bypass via SECURITY DEFINER if needed)
-- =====================================================================
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS refresh_tokens_self ON refresh_tokens;
CREATE POLICY refresh_tokens_self ON refresh_tokens
  FOR ALL USING (user_id = app_current_user_id() OR app_is_director())
  WITH CHECK (user_id = app_current_user_id() OR app_is_director());

-- =====================================================================
-- PASSWORD RESETS — owner only
-- =====================================================================
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS password_resets_self ON password_resets;
CREATE POLICY password_resets_self ON password_resets
  FOR ALL USING (user_id = app_current_user_id() OR app_is_director())
  WITH CHECK (user_id = app_current_user_id() OR app_is_director());

-- =====================================================================
-- AUDIT LOG — append-only; everyone reads own actions; directors & HR read all
-- =====================================================================
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_log_select ON audit_log;
CREATE POLICY audit_log_select ON audit_log
  FOR SELECT USING (
    app_is_director()
    OR app_current_role() = 'hr-manager'
    OR actor_user_id = app_current_user_id()
  );

DROP POLICY IF EXISTS audit_log_insert ON audit_log;
CREATE POLICY audit_log_insert ON audit_log FOR INSERT WITH CHECK (true);

-- Block UPDATE/DELETE outright by having no policy for them (RLS is deny-by-default).
-- Belt-and-braces: a trigger that refuses any UPDATE or DELETE even if a
-- superuser bypasses RLS. The only way to remove rows is `audit_log_purge` —
-- a SECURITY DEFINER procedure run by the audit-archive job (Phase 12).
CREATE OR REPLACE FUNCTION audit_log_no_modify() RETURNS trigger AS $$
BEGIN
  IF current_setting('app.audit_archive_allow', true) = 'true' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_no_update ON audit_log;
CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_no_modify();

DROP TRIGGER IF EXISTS audit_log_no_delete ON audit_log;
CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_no_modify();

-- =====================================================================
-- NOTIFICATIONS — own only
-- =====================================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_self ON notifications;
CREATE POLICY notifications_self ON notifications
  FOR ALL USING (user_id = app_current_user_id() OR app_is_director())
  WITH CHECK (user_id = app_current_user_id() OR app_is_director());

-- =====================================================================
-- OFFICE CONFIG — everyone reads, only director writes
-- =====================================================================
ALTER TABLE office_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS office_config_read ON office_config;
CREATE POLICY office_config_read ON office_config FOR SELECT USING (true);

DROP POLICY IF EXISTS office_config_write ON office_config;
CREATE POLICY office_config_write ON office_config
  FOR ALL USING (app_is_director())
  WITH CHECK (app_is_director());

-- =====================================================================
-- Enterprise reference data — companies, branches, currencies, fiscal periods
-- =====================================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS companies_select ON companies;
CREATE POLICY companies_select ON companies FOR SELECT USING (true);
DROP POLICY IF EXISTS companies_modify ON companies;
CREATE POLICY companies_modify ON companies
  FOR ALL USING (app_is_director())
  WITH CHECK (app_is_director());

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS branches_select ON branches;
CREATE POLICY branches_select ON branches FOR SELECT USING (true);
DROP POLICY IF EXISTS branches_modify ON branches;
CREATE POLICY branches_modify ON branches
  FOR ALL USING (app_is_director())
  WITH CHECK (app_is_director());

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS departments_select ON departments;
CREATE POLICY departments_select ON departments FOR SELECT USING (true);
DROP POLICY IF EXISTS departments_modify ON departments;
CREATE POLICY departments_modify ON departments
  FOR ALL USING (app_is_director() OR app_current_role() = 'hr-manager')
  WITH CHECK (app_is_director() OR app_current_role() = 'hr-manager');

ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cost_centers_select ON cost_centers;
CREATE POLICY cost_centers_select ON cost_centers FOR SELECT USING (true);
DROP POLICY IF EXISTS cost_centers_modify ON cost_centers;
CREATE POLICY cost_centers_modify ON cost_centers
  FOR ALL USING (app_is_director() OR app_current_role() IN ('finance-manager', 'hr-manager'))
  WITH CHECK (app_is_director() OR app_current_role() IN ('finance-manager', 'hr-manager'));

ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS currencies_select ON currencies;
CREATE POLICY currencies_select ON currencies FOR SELECT USING (true);
DROP POLICY IF EXISTS currencies_modify ON currencies;
CREATE POLICY currencies_modify ON currencies
  FOR ALL USING (app_is_director() OR app_current_role() = 'finance-manager')
  WITH CHECK (app_is_director() OR app_current_role() = 'finance-manager');

ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS exchange_rates_select ON exchange_rates;
CREATE POLICY exchange_rates_select ON exchange_rates FOR SELECT USING (true);
DROP POLICY IF EXISTS exchange_rates_modify ON exchange_rates;
CREATE POLICY exchange_rates_modify ON exchange_rates
  FOR ALL USING (app_is_director() OR app_current_role() = 'finance-manager')
  WITH CHECK (app_is_director() OR app_current_role() = 'finance-manager');

ALTER TABLE fiscal_years ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fiscal_years_select ON fiscal_years;
CREATE POLICY fiscal_years_select ON fiscal_years FOR SELECT USING (app_is_director() OR app_current_role() IN ('finance-manager', 'accountant'));
DROP POLICY IF EXISTS fiscal_years_modify ON fiscal_years;
CREATE POLICY fiscal_years_modify ON fiscal_years
  FOR ALL USING (app_is_director() OR app_current_role() = 'finance-manager')
  WITH CHECK (app_is_director() OR app_current_role() = 'finance-manager');

ALTER TABLE fiscal_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fiscal_periods_select ON fiscal_periods;
CREATE POLICY fiscal_periods_select ON fiscal_periods FOR SELECT USING (app_is_director() OR app_current_role() IN ('finance-manager', 'accountant'));
DROP POLICY IF EXISTS fiscal_periods_modify ON fiscal_periods;
CREATE POLICY fiscal_periods_modify ON fiscal_periods
  FOR ALL USING (app_is_director() OR app_current_role() = 'finance-manager')
  WITH CHECK (app_is_director() OR app_current_role() = 'finance-manager');

-- =====================================================================
-- FILES — uploader, file_acl grants, directors. ACL extended per module later.
-- =====================================================================
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS files_select ON files;
CREATE POLICY files_select ON files
  FOR SELECT USING (
    app_is_director()
    OR uploaded_by_user_id = app_current_user_id()
    OR app_current_role() IN ('hr-manager', 'finance-manager', 'pm', 'design-lead', 'accountant')
    OR EXISTS (
      SELECT 1 FROM file_acl fa
      WHERE fa.file_id = files.id
        AND fa.permission = 'read'
        AND (
          (fa.principal_type = 'user' AND fa.principal_id = app_current_user_id()::text)
          OR (fa.principal_type = 'role' AND fa.principal_id = app_current_role())
        )
    )
  );

DROP POLICY IF EXISTS files_insert ON files;
CREATE POLICY files_insert ON files FOR INSERT
  WITH CHECK (uploaded_by_user_id = app_current_user_id() OR app_is_director());

DROP POLICY IF EXISTS files_delete ON files;
CREATE POLICY files_delete ON files FOR DELETE
  USING (uploaded_by_user_id = app_current_user_id() OR app_is_director());

ALTER TABLE file_acl ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS file_acl_admin ON file_acl;
CREATE POLICY file_acl_admin ON file_acl
  FOR ALL USING (app_is_director() OR app_current_role() = 'hr-manager')
  WITH CHECK (app_is_director() OR app_current_role() = 'hr-manager');

-- =====================================================================
-- HR — Phase 1
-- =====================================================================
-- employees: director sees all; hr-manager sees own office; manager sees direct reports;
-- finance-manager reads only (for payroll); employee reads self.
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS employees_select ON employees;
CREATE POLICY employees_select ON employees FOR SELECT USING (
  app_is_director()
  OR (app_current_role() = 'hr-manager' AND office::text = app_current_office())
  OR app_current_role() IN ('finance-manager', 'pm')
  OR id = nullif(current_setting('app.employee_id', true), '')::uuid
  OR manager_employee_id = nullif(current_setting('app.employee_id', true), '')::uuid
);

DROP POLICY IF EXISTS employees_modify ON employees;
CREATE POLICY employees_modify ON employees FOR ALL
  USING (app_is_director() OR app_current_role() = 'hr-manager')
  WITH CHECK (app_is_director() OR app_current_role() = 'hr-manager');

-- Compensation: salary data is sensitive — director, hr-manager, finance-manager only.
ALTER TABLE employee_compensation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS employee_compensation_select ON employee_compensation;
CREATE POLICY employee_compensation_select ON employee_compensation FOR SELECT USING (
  app_is_director()
  OR app_current_role() IN ('hr-manager', 'finance-manager')
  OR employee_id = nullif(current_setting('app.employee_id', true), '')::uuid
);

DROP POLICY IF EXISTS employee_compensation_modify ON employee_compensation;
CREATE POLICY employee_compensation_modify ON employee_compensation FOR ALL
  USING (app_is_director() OR app_current_role() = 'hr-manager')
  WITH CHECK (app_is_director() OR app_current_role() = 'hr-manager');

-- Bank: even tighter — director, hr-manager, finance-manager, self.
ALTER TABLE employee_bank_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS employee_bank_details_select ON employee_bank_details;
CREATE POLICY employee_bank_details_select ON employee_bank_details FOR SELECT USING (
  app_is_director()
  OR app_current_role() IN ('hr-manager', 'finance-manager')
  OR employee_id = nullif(current_setting('app.employee_id', true), '')::uuid
);

DROP POLICY IF EXISTS employee_bank_details_modify ON employee_bank_details;
CREATE POLICY employee_bank_details_modify ON employee_bank_details FOR ALL
  USING (app_is_director() OR app_current_role() = 'hr-manager'
         OR employee_id = nullif(current_setting('app.employee_id', true), '')::uuid)
  WITH CHECK (app_is_director() OR app_current_role() = 'hr-manager'
              OR employee_id = nullif(current_setting('app.employee_id', true), '')::uuid);

-- Employee documents: same as employees plus self.
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS employee_documents_select ON employee_documents;
CREATE POLICY employee_documents_select ON employee_documents FOR SELECT USING (
  app_is_director()
  OR app_current_role() = 'hr-manager'
  OR employee_id = nullif(current_setting('app.employee_id', true), '')::uuid
);

DROP POLICY IF EXISTS employee_documents_modify ON employee_documents;
CREATE POLICY employee_documents_modify ON employee_documents FOR ALL
  USING (app_is_director() OR app_current_role() = 'hr-manager')
  WITH CHECK (app_is_director() OR app_current_role() = 'hr-manager');

-- Dependents: director, hr-manager, self.
ALTER TABLE dependents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dependents_select ON dependents;
CREATE POLICY dependents_select ON dependents FOR SELECT USING (
  app_is_director()
  OR app_current_role() = 'hr-manager'
  OR employee_id = nullif(current_setting('app.employee_id', true), '')::uuid
);

DROP POLICY IF EXISTS dependents_modify ON dependents;
CREATE POLICY dependents_modify ON dependents FOR ALL
  USING (app_is_director() OR app_current_role() = 'hr-manager'
         OR employee_id = nullif(current_setting('app.employee_id', true), '')::uuid)
  WITH CHECK (app_is_director() OR app_current_role() = 'hr-manager'
              OR employee_id = nullif(current_setting('app.employee_id', true), '')::uuid);

-- =====================================================================
-- HR Workflow — Phase 2
-- =====================================================================
-- Leave requests: self + manager (manager check is at API layer via project/dept) + HR + director
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS leave_requests_select ON leave_requests;
CREATE POLICY leave_requests_select ON leave_requests FOR SELECT USING (
  app_is_director()
  OR app_current_role() IN ('hr-manager', 'pm', 'design-lead', 'finance-manager')
  OR employee_id = nullif(current_setting('app.employee_id', true), '')::uuid
);
DROP POLICY IF EXISTS leave_requests_modify ON leave_requests;
CREATE POLICY leave_requests_modify ON leave_requests FOR ALL
  USING (app_is_director() OR app_current_role() = 'hr-manager'
         OR employee_id = nullif(current_setting('app.employee_id', true), '')::uuid)
  WITH CHECK (app_is_director() OR app_current_role() = 'hr-manager'
              OR employee_id = nullif(current_setting('app.employee_id', true), '')::uuid);

ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS leave_balances_select ON leave_balances;
CREATE POLICY leave_balances_select ON leave_balances FOR SELECT USING (
  app_is_director() OR app_current_role() = 'hr-manager'
  OR employee_id = nullif(current_setting('app.employee_id', true), '')::uuid
);
DROP POLICY IF EXISTS leave_balances_modify ON leave_balances;
CREATE POLICY leave_balances_modify ON leave_balances FOR ALL
  USING (app_is_director() OR app_current_role() = 'hr-manager')
  WITH CHECK (app_is_director() OR app_current_role() = 'hr-manager');

ALTER TABLE leave_handovers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS leave_handovers_select ON leave_handovers;
CREATE POLICY leave_handovers_select ON leave_handovers FOR SELECT USING (
  app_is_director() OR app_current_role() = 'hr-manager'
  OR cover_user_id = app_current_user_id()
);
DROP POLICY IF EXISTS leave_handovers_modify ON leave_handovers;
CREATE POLICY leave_handovers_modify ON leave_handovers FOR ALL
  USING (app_is_director() OR app_current_role() = 'hr-manager' OR cover_user_id = app_current_user_id())
  WITH CHECK (app_is_director() OR app_current_role() = 'hr-manager' OR cover_user_id = app_current_user_id());

-- Training: self + HR + director
ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS training_records_select ON training_records;
CREATE POLICY training_records_select ON training_records FOR SELECT USING (
  app_is_director() OR app_current_role() = 'hr-manager'
  OR employee_id = nullif(current_setting('app.employee_id', true), '')::uuid
);
DROP POLICY IF EXISTS training_records_modify ON training_records;
CREATE POLICY training_records_modify ON training_records FOR ALL
  USING (app_is_director() OR app_current_role() = 'hr-manager')
  WITH CHECK (app_is_director() OR app_current_role() = 'hr-manager');

-- Assets: self + HR + director
ALTER TABLE asset_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS asset_assignments_select ON asset_assignments;
CREATE POLICY asset_assignments_select ON asset_assignments FOR SELECT USING (
  app_is_director() OR app_current_role() = 'hr-manager'
  OR employee_id = nullif(current_setting('app.employee_id', true), '')::uuid
);
DROP POLICY IF EXISTS asset_assignments_modify ON asset_assignments;
CREATE POLICY asset_assignments_modify ON asset_assignments FOR ALL
  USING (app_is_director() OR app_current_role() = 'hr-manager')
  WITH CHECK (app_is_director() OR app_current_role() = 'hr-manager');

-- Disciplinary: HR + director only (very sensitive)
ALTER TABLE disciplinary_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS disciplinary_actions_select ON disciplinary_actions;
CREATE POLICY disciplinary_actions_select ON disciplinary_actions FOR SELECT USING (
  app_is_director() OR app_current_role() = 'hr-manager'
  OR employee_id = nullif(current_setting('app.employee_id', true), '')::uuid
);
DROP POLICY IF EXISTS disciplinary_actions_modify ON disciplinary_actions;
CREATE POLICY disciplinary_actions_modify ON disciplinary_actions FOR ALL
  USING (app_is_director() OR app_current_role() = 'hr-manager')
  WITH CHECK (app_is_director() OR app_current_role() = 'hr-manager');

-- Reviews: self + reviewer + HR + director
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS performance_reviews_select ON performance_reviews;
CREATE POLICY performance_reviews_select ON performance_reviews FOR SELECT USING (
  app_is_director() OR app_current_role() = 'hr-manager'
  OR employee_id = nullif(current_setting('app.employee_id', true), '')::uuid
  OR reviewer_user_id = app_current_user_id()
);
DROP POLICY IF EXISTS performance_reviews_modify ON performance_reviews;
CREATE POLICY performance_reviews_modify ON performance_reviews FOR ALL
  USING (app_is_director() OR app_current_role() = 'hr-manager' OR reviewer_user_id = app_current_user_id())
  WITH CHECK (app_is_director() OR app_current_role() = 'hr-manager' OR reviewer_user_id = app_current_user_id());

-- Onboarding: self + HR + director
ALTER TABLE onboarding_checklists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS onboarding_checklists_select ON onboarding_checklists;
CREATE POLICY onboarding_checklists_select ON onboarding_checklists FOR SELECT USING (
  app_is_director() OR app_current_role() = 'hr-manager'
  OR employee_id = nullif(current_setting('app.employee_id', true), '')::uuid
);
DROP POLICY IF EXISTS onboarding_checklists_modify ON onboarding_checklists;
CREATE POLICY onboarding_checklists_modify ON onboarding_checklists FOR ALL
  USING (app_is_director() OR app_current_role() = 'hr-manager')
  WITH CHECK (app_is_director() OR app_current_role() = 'hr-manager');

-- Payroll runs: director + HR + finance
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payroll_runs_select ON payroll_runs;
CREATE POLICY payroll_runs_select ON payroll_runs FOR SELECT USING (
  app_is_director() OR app_current_role() IN ('hr-manager', 'finance-manager', 'accountant')
);
DROP POLICY IF EXISTS payroll_runs_modify ON payroll_runs;
CREATE POLICY payroll_runs_modify ON payroll_runs FOR ALL
  USING (app_is_director() OR app_current_role() IN ('hr-manager', 'finance-manager'))
  WITH CHECK (app_is_director() OR app_current_role() IN ('hr-manager', 'finance-manager'));

-- Payslips: self + director + HR + finance
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payslips_select ON payslips;
CREATE POLICY payslips_select ON payslips FOR SELECT USING (
  app_is_director() OR app_current_role() IN ('hr-manager', 'finance-manager', 'accountant')
  OR employee_id = nullif(current_setting('app.employee_id', true), '')::uuid
);
DROP POLICY IF EXISTS payslips_modify ON payslips;
CREATE POLICY payslips_modify ON payslips FOR ALL
  USING (app_is_director() OR app_current_role() IN ('hr-manager', 'finance-manager'))
  WITH CHECK (app_is_director() OR app_current_role() IN ('hr-manager', 'finance-manager'));

-- Letters: self reads own; HR + director write
ALTER TABLE letters_issued ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS letters_issued_select ON letters_issued;
CREATE POLICY letters_issued_select ON letters_issued FOR SELECT USING (
  app_is_director() OR app_current_role() = 'hr-manager'
  OR employee_id = nullif(current_setting('app.employee_id', true), '')::uuid
);
DROP POLICY IF EXISTS letters_issued_modify ON letters_issued;
CREATE POLICY letters_issued_modify ON letters_issued FOR ALL
  USING (app_is_director() OR app_current_role() = 'hr-manager')
  WITH CHECK (app_is_director() OR app_current_role() = 'hr-manager');

-- =====================================================================
-- Projects — Phase 3
-- =====================================================================
-- Visibility: director sees all. Anyone with projects:read implicit by role
-- (pm, design-lead, site-engineer, hr-manager, finance-manager, bd-manager,
-- accountant) sees projects they are a team member of or PM of. Other roles
-- (employee) see only via direct team membership.
CREATE OR REPLACE FUNCTION app_is_team_member(p_project_id uuid) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_team_members ptm
    WHERE ptm.project_id = p_project_id
      AND ptm.user_id = app_current_user_id()
      AND ptm.removed_at IS NULL
  );
$$ LANGUAGE sql STABLE;

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS projects_select ON projects;
CREATE POLICY projects_select ON projects FOR SELECT USING (
  app_is_director()
  OR app_current_role() IN ('hr-manager', 'finance-manager', 'accountant', 'bd-manager')
  OR pm_user_id = app_current_user_id()
  OR design_lead_user_id = app_current_user_id()
  OR app_is_team_member(id)
);

DROP POLICY IF EXISTS projects_modify ON projects;
CREATE POLICY projects_modify ON projects FOR ALL
  USING (
    app_is_director()
    OR pm_user_id = app_current_user_id()
    OR (app_current_role() IN ('pm', 'design-lead', 'bd-manager') AND app_is_team_member(id))
  )
  WITH CHECK (
    app_is_director()
    OR pm_user_id = app_current_user_id()
    OR app_current_role() IN ('pm', 'design-lead', 'bd-manager')
  );

ALTER TABLE project_team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_team_members_select ON project_team_members;
CREATE POLICY project_team_members_select ON project_team_members FOR SELECT USING (
  app_is_director()
  OR user_id = app_current_user_id()
  OR app_is_team_member(project_id)
  OR app_current_role() IN ('hr-manager', 'finance-manager')
);
DROP POLICY IF EXISTS project_team_members_modify ON project_team_members;
CREATE POLICY project_team_members_modify ON project_team_members FOR ALL
  USING (
    app_is_director()
    OR EXISTS (SELECT 1 FROM projects p WHERE p.id = project_team_members.project_id AND p.pm_user_id = app_current_user_id())
  )
  WITH CHECK (
    app_is_director()
    OR EXISTS (SELECT 1 FROM projects p WHERE p.id = project_team_members.project_id AND p.pm_user_id = app_current_user_id())
  );

ALTER TABLE project_stages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_stages_select ON project_stages;
CREATE POLICY project_stages_select ON project_stages FOR SELECT USING (
  app_is_director() OR app_is_team_member(project_id)
  OR EXISTS (SELECT 1 FROM projects p WHERE p.id = project_stages.project_id
              AND (p.pm_user_id = app_current_user_id() OR p.design_lead_user_id = app_current_user_id()))
);
DROP POLICY IF EXISTS project_stages_modify ON project_stages;
CREATE POLICY project_stages_modify ON project_stages FOR ALL
  USING (
    app_is_director()
    OR EXISTS (SELECT 1 FROM projects p WHERE p.id = project_stages.project_id
                AND (p.pm_user_id = app_current_user_id() OR p.design_lead_user_id = app_current_user_id()))
  )
  WITH CHECK (
    app_is_director()
    OR EXISTS (SELECT 1 FROM projects p WHERE p.id = project_stages.project_id
                AND (p.pm_user_id = app_current_user_id() OR p.design_lead_user_id = app_current_user_id()))
  );

ALTER TABLE stage_gate_approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS stage_gate_approvals_select ON stage_gate_approvals;
CREATE POLICY stage_gate_approvals_select ON stage_gate_approvals FOR SELECT USING (
  app_is_director() OR app_is_team_member(project_id) OR requester_user_id = app_current_user_id()
);
DROP POLICY IF EXISTS stage_gate_approvals_modify ON stage_gate_approvals;
CREATE POLICY stage_gate_approvals_modify ON stage_gate_approvals FOR ALL
  USING (
    app_is_director()
    OR requester_user_id = app_current_user_id()
    OR app_current_role() IN ('pm', 'design-lead')
  )
  WITH CHECK (
    app_is_director()
    OR requester_user_id = app_current_user_id()
    OR app_current_role() IN ('pm', 'design-lead')
  );

ALTER TABLE authority_submittals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authority_submittals_select ON authority_submittals;
CREATE POLICY authority_submittals_select ON authority_submittals FOR SELECT USING (
  app_is_director() OR app_is_team_member(project_id)
  OR EXISTS (SELECT 1 FROM projects p WHERE p.id = authority_submittals.project_id
              AND (p.pm_user_id = app_current_user_id() OR p.design_lead_user_id = app_current_user_id()))
);
DROP POLICY IF EXISTS authority_submittals_modify ON authority_submittals;
CREATE POLICY authority_submittals_modify ON authority_submittals FOR ALL
  USING (
    app_is_director()
    OR app_current_role() IN ('pm', 'design-lead', 'site-engineer')
       AND (app_is_team_member(project_id)
            OR EXISTS (SELECT 1 FROM projects p WHERE p.id = authority_submittals.project_id
                        AND (p.pm_user_id = app_current_user_id() OR p.design_lead_user_id = app_current_user_id())))
  )
  WITH CHECK (
    app_is_director() OR app_current_role() IN ('pm', 'design-lead', 'site-engineer')
  );

-- =====================================================================
-- Project extras — Phase 4
-- =====================================================================
-- All project-extra tables follow the same pattern: SELECT requires team
-- membership / PM / design-lead / director; MODIFY requires director, PM,
-- design-lead, or site-engineer where applicable.
ALTER TABLE project_risks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_risks_select ON project_risks;
CREATE POLICY project_risks_select ON project_risks FOR SELECT USING (
  app_is_director() OR app_is_team_member(project_id)
  OR EXISTS (SELECT 1 FROM projects p WHERE p.id = project_risks.project_id
              AND (p.pm_user_id = app_current_user_id() OR p.design_lead_user_id = app_current_user_id()))
);
DROP POLICY IF EXISTS project_risks_modify ON project_risks;
CREATE POLICY project_risks_modify ON project_risks FOR ALL
  USING (
    app_is_director()
    OR (app_current_role() IN ('pm', 'design-lead', 'site-engineer')
        AND (app_is_team_member(project_id)
             OR EXISTS (SELECT 1 FROM projects p WHERE p.id = project_risks.project_id
                         AND (p.pm_user_id = app_current_user_id() OR p.design_lead_user_id = app_current_user_id()))))
  )
  WITH CHECK (
    app_is_director() OR app_current_role() IN ('pm', 'design-lead', 'site-engineer')
  );

ALTER TABLE doc_folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS doc_folders_select ON doc_folders;
CREATE POLICY doc_folders_select ON doc_folders FOR SELECT USING (
  app_is_director() OR app_is_team_member(project_id)
  OR EXISTS (SELECT 1 FROM projects p WHERE p.id = doc_folders.project_id
              AND (p.pm_user_id = app_current_user_id() OR p.design_lead_user_id = app_current_user_id()))
);
DROP POLICY IF EXISTS doc_folders_modify ON doc_folders;
CREATE POLICY doc_folders_modify ON doc_folders FOR ALL
  USING (
    app_is_director()
    OR (app_current_role() IN ('pm', 'design-lead')
        AND (app_is_team_member(project_id)
             OR EXISTS (SELECT 1 FROM projects p WHERE p.id = doc_folders.project_id
                         AND (p.pm_user_id = app_current_user_id() OR p.design_lead_user_id = app_current_user_id()))))
  )
  WITH CHECK (app_is_director() OR app_current_role() IN ('pm', 'design-lead'));

ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_documents_select ON project_documents;
CREATE POLICY project_documents_select ON project_documents FOR SELECT USING (
  app_is_director() OR app_is_team_member(project_id)
  OR EXISTS (SELECT 1 FROM projects p WHERE p.id = project_documents.project_id
              AND (p.pm_user_id = app_current_user_id() OR p.design_lead_user_id = app_current_user_id()))
);
DROP POLICY IF EXISTS project_documents_modify ON project_documents;
CREATE POLICY project_documents_modify ON project_documents FOR ALL
  USING (
    app_is_director()
    OR (app_current_role() IN ('pm', 'design-lead', 'site-engineer')
        AND (app_is_team_member(project_id)
             OR EXISTS (SELECT 1 FROM projects p WHERE p.id = project_documents.project_id
                         AND (p.pm_user_id = app_current_user_id() OR p.design_lead_user_id = app_current_user_id()))))
  )
  WITH CHECK (app_is_director() OR app_current_role() IN ('pm', 'design-lead', 'site-engineer'));

ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS drawings_select ON drawings;
CREATE POLICY drawings_select ON drawings FOR SELECT USING (
  app_is_director() OR app_is_team_member(project_id)
  OR EXISTS (SELECT 1 FROM projects p WHERE p.id = drawings.project_id
              AND (p.pm_user_id = app_current_user_id() OR p.design_lead_user_id = app_current_user_id()))
);
DROP POLICY IF EXISTS drawings_modify ON drawings;
CREATE POLICY drawings_modify ON drawings FOR ALL
  USING (app_is_director() OR app_current_role() IN ('pm', 'design-lead'))
  WITH CHECK (app_is_director() OR app_current_role() IN ('pm', 'design-lead'));

ALTER TABLE rfis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rfis_select ON rfis;
CREATE POLICY rfis_select ON rfis FOR SELECT USING (
  app_is_director() OR app_is_team_member(project_id)
  OR EXISTS (SELECT 1 FROM projects p WHERE p.id = rfis.project_id
              AND (p.pm_user_id = app_current_user_id() OR p.design_lead_user_id = app_current_user_id()))
);
DROP POLICY IF EXISTS rfis_modify ON rfis;
CREATE POLICY rfis_modify ON rfis FOR ALL
  USING (app_is_director() OR app_current_role() IN ('pm', 'design-lead', 'site-engineer'))
  WITH CHECK (app_is_director() OR app_current_role() IN ('pm', 'design-lead', 'site-engineer'));

ALTER TABLE project_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_items_select ON project_items;
CREATE POLICY project_items_select ON project_items FOR SELECT USING (
  app_is_director()
  OR app_current_role() IN ('hr-manager', 'finance-manager', 'accountant', 'bd-manager')
  OR (project_id IS NOT NULL AND app_is_team_member(project_id))
  OR (project_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM projects p WHERE p.id = project_items.project_id
          AND (p.pm_user_id = app_current_user_id() OR p.design_lead_user_id = app_current_user_id())))
);
DROP POLICY IF EXISTS project_items_modify ON project_items;
CREATE POLICY project_items_modify ON project_items FOR ALL
  USING (
    app_is_director()
    OR app_current_role() IN ('pm', 'design-lead', 'site-engineer')
    OR (project_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM projects p WHERE p.id = project_items.project_id
            AND p.pm_user_id = app_current_user_id()))
  )
  WITH CHECK (
    app_is_director()
    OR app_current_role() IN ('pm', 'design-lead', 'site-engineer')
  );

-- =====================================================================
-- Tasks + Timesheets — Phase 5
-- =====================================================================
-- Visibility:
--   - own tasks (assignee or reporter): always
--   - project tasks: team members + PM/design-lead of project
--   - director + HR + finance + BD: all
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tasks_select ON tasks;
CREATE POLICY tasks_select ON tasks FOR SELECT USING (
  app_is_director()
  OR app_current_role() IN ('hr-manager', 'finance-manager', 'bd-manager')
  OR assignee_user_id = app_current_user_id()
  OR reporter_user_id = app_current_user_id()
  OR (project_id IS NOT NULL AND app_is_team_member(project_id))
  OR (project_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM projects p WHERE p.id = tasks.project_id
          AND (p.pm_user_id = app_current_user_id() OR p.design_lead_user_id = app_current_user_id())))
);
DROP POLICY IF EXISTS tasks_modify ON tasks;
CREATE POLICY tasks_modify ON tasks FOR ALL
  USING (
    app_is_director()
    OR assignee_user_id = app_current_user_id()
    OR reporter_user_id = app_current_user_id()
    OR (project_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM projects p WHERE p.id = tasks.project_id
            AND p.pm_user_id = app_current_user_id()))
    OR app_current_role() IN ('pm', 'design-lead')
  )
  WITH CHECK (
    app_is_director()
    OR assignee_user_id = app_current_user_id()
    OR reporter_user_id = app_current_user_id()
    OR app_current_role() IN ('pm', 'design-lead')
  );

ALTER TABLE task_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS task_messages_select ON task_messages;
CREATE POLICY task_messages_select ON task_messages FOR SELECT USING (
  app_is_director()
  OR user_id = app_current_user_id()
  OR EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_messages.task_id
      AND (
        t.assignee_user_id = app_current_user_id()
        OR t.reporter_user_id = app_current_user_id()
        OR t.assignee_user_ids ? app_current_user_id()::text
        OR (t.project_id IS NOT NULL AND app_is_team_member(t.project_id))
      )
  )
);
DROP POLICY IF EXISTS task_messages_modify ON task_messages;
CREATE POLICY task_messages_modify ON task_messages FOR ALL
  USING (
    app_is_director()
    OR user_id = app_current_user_id()
    OR EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_messages.task_id
        AND (t.assignee_user_id = app_current_user_id() OR t.reporter_user_id = app_current_user_id())
    )
  )
  WITH CHECK (
    app_is_director()
    OR user_id = app_current_user_id()
    OR EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_messages.task_id
        AND (t.assignee_user_id = app_current_user_id() OR t.reporter_user_id = app_current_user_id())
    )
  );

-- Timer sessions: own only
ALTER TABLE task_timer_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS task_timer_sessions_self ON task_timer_sessions;
CREATE POLICY task_timer_sessions_self ON task_timer_sessions FOR ALL
  USING (user_id = app_current_user_id() OR app_is_director() OR app_current_role() = 'hr-manager')
  WITH CHECK (user_id = app_current_user_id() OR app_is_director());

-- Timesheets: own + approver chain + HR + director
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS timesheets_select ON timesheets;
CREATE POLICY timesheets_select ON timesheets FOR SELECT USING (
  app_is_director()
  OR app_current_role() IN ('hr-manager', 'finance-manager')
  OR user_id = app_current_user_id()
  OR approved_by_user_id = app_current_user_id()
);
DROP POLICY IF EXISTS timesheets_modify ON timesheets;
CREATE POLICY timesheets_modify ON timesheets FOR ALL
  USING (
    app_is_director()
    OR app_current_role() IN ('hr-manager', 'pm', 'design-lead')
    OR user_id = app_current_user_id()
  )
  WITH CHECK (
    app_is_director()
    OR app_current_role() IN ('hr-manager', 'pm', 'design-lead')
    OR user_id = app_current_user_id()
  );

-- =====================================================================
-- Attendance — Phase 6
-- =====================================================================
-- Geofences: everyone can read (needed to render maps); only director/PM/HR write.
ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS geofences_select ON geofences;
CREATE POLICY geofences_select ON geofences FOR SELECT USING (true);
DROP POLICY IF EXISTS geofences_modify ON geofences;
CREATE POLICY geofences_modify ON geofences FOR ALL
  USING (app_is_director() OR app_current_role() IN ('hr-manager', 'pm'))
  WITH CHECK (app_is_director() OR app_current_role() IN ('hr-manager', 'pm'));

-- Punches: own + HR + director + PM of project. Overrides require attendance:override.
ALTER TABLE attendance_punches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS attendance_punches_select ON attendance_punches;
CREATE POLICY attendance_punches_select ON attendance_punches FOR SELECT USING (
  app_is_director()
  OR app_current_role() IN ('hr-manager', 'finance-manager')
  OR employee_id = nullif(current_setting('app.employee_id', true), '')::uuid
  OR (project_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM projects p WHERE p.id = attendance_punches.project_id
          AND p.pm_user_id = app_current_user_id()))
);
DROP POLICY IF EXISTS attendance_punches_modify ON attendance_punches;
CREATE POLICY attendance_punches_modify ON attendance_punches FOR ALL
  USING (
    app_is_director() OR app_current_role() = 'hr-manager'
    OR employee_id = nullif(current_setting('app.employee_id', true), '')::uuid
  )
  WITH CHECK (
    app_is_director() OR app_current_role() = 'hr-manager'
    OR employee_id = nullif(current_setting('app.employee_id', true), '')::uuid
  );

-- Location pings: own + director + HR (privacy-sensitive)
ALTER TABLE location_pings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS location_pings_select ON location_pings;
CREATE POLICY location_pings_select ON location_pings FOR SELECT USING (
  app_is_director() OR app_current_role() = 'hr-manager'
  OR employee_id = nullif(current_setting('app.employee_id', true), '')::uuid
);
DROP POLICY IF EXISTS location_pings_modify ON location_pings;
CREATE POLICY location_pings_modify ON location_pings FOR ALL
  USING (
    app_is_director() OR app_current_role() = 'hr-manager'
    OR employee_id = nullif(current_setting('app.employee_id', true), '')::uuid
  )
  WITH CHECK (
    app_is_director() OR app_current_role() = 'hr-manager'
    OR employee_id = nullif(current_setting('app.employee_id', true), '')::uuid
  );

-- Daily rollup: HR + director + self
ALTER TABLE attendance_daily_rollup ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS attendance_daily_rollup_select ON attendance_daily_rollup;
CREATE POLICY attendance_daily_rollup_select ON attendance_daily_rollup FOR SELECT USING (
  app_is_director() OR app_current_role() IN ('hr-manager', 'finance-manager')
  OR employee_id = nullif(current_setting('app.employee_id', true), '')::uuid
);
DROP POLICY IF EXISTS attendance_daily_rollup_modify ON attendance_daily_rollup;
CREATE POLICY attendance_daily_rollup_modify ON attendance_daily_rollup FOR ALL
  USING (app_is_director() OR app_current_role() = 'hr-manager')
  WITH CHECK (app_is_director() OR app_current_role() = 'hr-manager');

-- =====================================================================
-- CRM — Phase 7
-- =====================================================================
-- Leads: BD-manager, PM, director, owner. Lead activities follow same visibility.
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS leads_select ON leads;
CREATE POLICY leads_select ON leads FOR SELECT USING (
  app_is_director()
  OR app_current_role() IN ('bd-manager', 'pm', 'finance-manager')
  OR owner_user_id = app_current_user_id()
);
DROP POLICY IF EXISTS leads_modify ON leads;
CREATE POLICY leads_modify ON leads FOR ALL
  USING (
    app_is_director()
    OR app_current_role() = 'bd-manager'
    OR owner_user_id = app_current_user_id()
  )
  WITH CHECK (
    app_is_director()
    OR app_current_role() = 'bd-manager'
    OR owner_user_id = app_current_user_id()
  );

ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lead_activities_select ON lead_activities;
CREATE POLICY lead_activities_select ON lead_activities FOR SELECT USING (
  app_is_director()
  OR app_current_role() IN ('bd-manager', 'pm', 'finance-manager')
  OR EXISTS (SELECT 1 FROM leads l WHERE l.id = lead_activities.lead_id AND l.owner_user_id = app_current_user_id())
);
DROP POLICY IF EXISTS lead_activities_modify ON lead_activities;
CREATE POLICY lead_activities_modify ON lead_activities FOR ALL
  USING (
    app_is_director()
    OR app_current_role() = 'bd-manager'
    OR EXISTS (SELECT 1 FROM leads l WHERE l.id = lead_activities.lead_id AND l.owner_user_id = app_current_user_id())
  )
  WITH CHECK (
    app_is_director()
    OR app_current_role() = 'bd-manager'
    OR EXISTS (SELECT 1 FROM leads l WHERE l.id = lead_activities.lead_id AND l.owner_user_id = app_current_user_id())
  );

ALTER TABLE lead_conversions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lead_conversions_all ON lead_conversions;
CREATE POLICY lead_conversions_all ON lead_conversions FOR ALL
  USING (app_is_director() OR app_current_role() IN ('bd-manager', 'pm'))
  WITH CHECK (app_is_director() OR app_current_role() IN ('bd-manager', 'pm'));

-- =====================================================================
-- Finance — Phase 8
-- =====================================================================
-- Most finance tables: director + finance-manager + accountant (read) /
-- finance-manager only (write). PM gets read on AR/AP related to their projects.
CREATE OR REPLACE FUNCTION app_can_read_finance() RETURNS boolean AS $$
  SELECT app_is_director() OR app_current_role() IN ('finance-manager', 'accountant');
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_can_write_finance() RETURNS boolean AS $$
  SELECT app_is_director() OR app_current_role() = 'finance-manager';
$$ LANGUAGE sql STABLE;

-- COA: read by all (needed for picklists); write by finance team.
ALTER TABLE coa_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS coa_accounts_select ON coa_accounts;
CREATE POLICY coa_accounts_select ON coa_accounts FOR SELECT USING (true);
DROP POLICY IF EXISTS coa_accounts_modify ON coa_accounts;
CREATE POLICY coa_accounts_modify ON coa_accounts FOR ALL
  USING (app_can_write_finance())
  WITH CHECK (app_can_write_finance());

-- Customers / Suppliers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customers_select ON customers;
CREATE POLICY customers_select ON customers FOR SELECT USING (
  app_can_read_finance() OR app_current_role() IN ('pm', 'bd-manager', 'design-lead')
);
DROP POLICY IF EXISTS customers_modify ON customers;
CREATE POLICY customers_modify ON customers FOR ALL
  USING (app_can_write_finance() OR app_current_role() = 'bd-manager')
  WITH CHECK (app_can_write_finance() OR app_current_role() = 'bd-manager');

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS suppliers_select ON suppliers;
CREATE POLICY suppliers_select ON suppliers FOR SELECT USING (
  app_can_read_finance() OR app_current_role() IN ('pm', 'design-lead')
);
DROP POLICY IF EXISTS suppliers_modify ON suppliers;
CREATE POLICY suppliers_modify ON suppliers FOR ALL
  USING (app_can_write_finance())
  WITH CHECK (app_can_write_finance());

-- AR invoices: finance + project PM
ALTER TABLE ar_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ar_invoices_select ON ar_invoices;
CREATE POLICY ar_invoices_select ON ar_invoices FOR SELECT USING (
  app_can_read_finance()
  OR (project_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM projects p WHERE p.id = ar_invoices.project_id
          AND p.pm_user_id = app_current_user_id()))
);
DROP POLICY IF EXISTS ar_invoices_modify ON ar_invoices;
CREATE POLICY ar_invoices_modify ON ar_invoices FOR ALL
  USING (app_can_write_finance() OR app_current_role() = 'accountant')
  WITH CHECK (app_can_write_finance() OR app_current_role() = 'accountant');

ALTER TABLE ar_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ar_receipts_all ON ar_receipts;
CREATE POLICY ar_receipts_all ON ar_receipts FOR ALL
  USING (app_can_read_finance())
  WITH CHECK (app_can_write_finance() OR app_current_role() = 'accountant');

-- AP bills: finance + project PM
ALTER TABLE ap_bills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ap_bills_select ON ap_bills;
CREATE POLICY ap_bills_select ON ap_bills FOR SELECT USING (app_can_read_finance());
DROP POLICY IF EXISTS ap_bills_modify ON ap_bills;
CREATE POLICY ap_bills_modify ON ap_bills FOR ALL
  USING (app_can_write_finance() OR app_current_role() = 'accountant')
  WITH CHECK (app_can_write_finance() OR app_current_role() = 'accountant');

-- Procurement: LPO / GRN transactions feed AP matching and purchasing control.
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS purchase_orders_select ON purchase_orders;
CREATE POLICY purchase_orders_select ON purchase_orders FOR SELECT USING (
  app_can_read_finance()
  OR app_current_role() IN ('pm', 'design-lead')
);
DROP POLICY IF EXISTS purchase_orders_modify ON purchase_orders;
CREATE POLICY purchase_orders_modify ON purchase_orders FOR ALL
  USING (app_can_write_finance())
  WITH CHECK (app_can_write_finance());

ALTER TABLE goods_received_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS goods_received_notes_select ON goods_received_notes;
CREATE POLICY goods_received_notes_select ON goods_received_notes FOR SELECT USING (
  app_can_read_finance()
  OR app_current_role() IN ('pm', 'design-lead')
);
DROP POLICY IF EXISTS goods_received_notes_modify ON goods_received_notes;
CREATE POLICY goods_received_notes_modify ON goods_received_notes FOR ALL
  USING (app_can_write_finance())
  WITH CHECK (app_can_write_finance());

ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS supplier_payments_all ON supplier_payments;
CREATE POLICY supplier_payments_all ON supplier_payments FOR ALL
  USING (app_can_read_finance())
  WITH CHECK (app_can_write_finance());

-- Journals: finance team only
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS journal_entries_select ON journal_entries;
CREATE POLICY journal_entries_select ON journal_entries FOR SELECT USING (app_can_read_finance());
DROP POLICY IF EXISTS journal_entries_modify ON journal_entries;
CREATE POLICY journal_entries_modify ON journal_entries FOR ALL
  USING (app_can_write_finance() OR app_current_role() = 'accountant')
  WITH CHECK (app_can_write_finance() OR app_current_role() = 'accountant');

-- VAT returns: finance only
ALTER TABLE vat_returns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vat_returns_all ON vat_returns;
CREATE POLICY vat_returns_all ON vat_returns FOR ALL
  USING (app_can_read_finance())
  WITH CHECK (app_can_write_finance());

-- Banking
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bank_accounts_all ON bank_accounts;
CREATE POLICY bank_accounts_all ON bank_accounts FOR ALL
  USING (app_can_read_finance())
  WITH CHECK (app_can_write_finance());

ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bank_transactions_all ON bank_transactions;
CREATE POLICY bank_transactions_all ON bank_transactions FOR ALL
  USING (app_can_read_finance())
  WITH CHECK (app_can_write_finance() OR app_current_role() = 'accountant');

-- Petty cash: finance + custodian
ALTER TABLE petty_cash_floats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS petty_cash_floats_select ON petty_cash_floats;
CREATE POLICY petty_cash_floats_select ON petty_cash_floats FOR SELECT USING (
  app_can_read_finance() OR custodian_user_id = app_current_user_id()
);
DROP POLICY IF EXISTS petty_cash_floats_modify ON petty_cash_floats;
CREATE POLICY petty_cash_floats_modify ON petty_cash_floats FOR ALL
  USING (app_can_write_finance())
  WITH CHECK (app_can_write_finance());

ALTER TABLE petty_cash_vouchers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS petty_cash_vouchers_select ON petty_cash_vouchers;
CREATE POLICY petty_cash_vouchers_select ON petty_cash_vouchers FOR SELECT USING (
  app_can_read_finance()
  OR EXISTS (SELECT 1 FROM petty_cash_floats f WHERE f.id = petty_cash_vouchers.float_id AND f.custodian_user_id = app_current_user_id())
);
DROP POLICY IF EXISTS petty_cash_vouchers_modify ON petty_cash_vouchers;
CREATE POLICY petty_cash_vouchers_modify ON petty_cash_vouchers FOR ALL
  USING (
    app_can_write_finance()
    OR EXISTS (SELECT 1 FROM petty_cash_floats f WHERE f.id = petty_cash_vouchers.float_id AND f.custodian_user_id = app_current_user_id())
  )
  WITH CHECK (
    app_can_write_finance()
    OR EXISTS (SELECT 1 FROM petty_cash_floats f WHERE f.id = petty_cash_vouchers.float_id AND f.custodian_user_id = app_current_user_id())
  );

-- Fixed assets: finance + HR (for asset assignment cross-reference)
ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fixed_assets_all ON fixed_assets;
CREATE POLICY fixed_assets_all ON fixed_assets FOR ALL
  USING (app_can_read_finance() OR app_current_role() = 'hr-manager')
  WITH CHECK (app_can_write_finance());

ALTER TABLE finance_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS finance_items_select ON finance_items;
CREATE POLICY finance_items_select ON finance_items FOR SELECT USING (app_can_read_finance());
DROP POLICY IF EXISTS finance_items_modify ON finance_items;
CREATE POLICY finance_items_modify ON finance_items FOR ALL
  USING (app_can_write_finance() OR app_current_role() = 'accountant')
  WITH CHECK (app_can_write_finance() OR app_current_role() = 'accountant');

-- E-Invoicing: finance controls setup/submission; project members can read
-- project-linked issued documents but cannot modify compliance records.
ALTER TABLE e_invoice_company_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS e_invoice_company_profiles_select ON e_invoice_company_profiles;
CREATE POLICY e_invoice_company_profiles_select ON e_invoice_company_profiles FOR SELECT USING (app_can_read_finance());
DROP POLICY IF EXISTS e_invoice_company_profiles_modify ON e_invoice_company_profiles;
CREATE POLICY e_invoice_company_profiles_modify ON e_invoice_company_profiles FOR ALL
  USING (app_can_write_finance())
  WITH CHECK (app_can_write_finance());

ALTER TABLE e_invoice_clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS e_invoice_clients_select ON e_invoice_clients;
CREATE POLICY e_invoice_clients_select ON e_invoice_clients FOR SELECT USING (
  app_can_read_finance() OR app_current_role() IN ('pm', 'bd-manager', 'design-lead')
);
DROP POLICY IF EXISTS e_invoice_clients_modify ON e_invoice_clients;
CREATE POLICY e_invoice_clients_modify ON e_invoice_clients FOR ALL
  USING (app_can_write_finance() OR app_current_role() = 'bd-manager')
  WITH CHECK (app_can_write_finance() OR app_current_role() = 'bd-manager');

ALTER TABLE e_invoice_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS e_invoice_documents_select ON e_invoice_documents;
CREATE POLICY e_invoice_documents_select ON e_invoice_documents FOR SELECT USING (
  app_can_read_finance()
  OR (project_id IS NOT NULL AND app_is_team_member(project_id))
);
DROP POLICY IF EXISTS e_invoice_documents_modify ON e_invoice_documents;
CREATE POLICY e_invoice_documents_modify ON e_invoice_documents FOR ALL
  USING (app_can_write_finance() OR app_current_role() = 'accountant')
  WITH CHECK (app_can_write_finance() OR app_current_role() = 'accountant');

ALTER TABLE e_invoice_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS e_invoice_events_select ON e_invoice_events;
CREATE POLICY e_invoice_events_select ON e_invoice_events FOR SELECT USING (
  app_can_read_finance()
  OR EXISTS (
    SELECT 1 FROM e_invoice_documents d
    WHERE d.id = e_invoice_events.document_id
      AND d.project_id IS NOT NULL
      AND app_is_team_member(d.project_id)
  )
);
DROP POLICY IF EXISTS e_invoice_events_insert ON e_invoice_events;
CREATE POLICY e_invoice_events_insert ON e_invoice_events FOR INSERT
  WITH CHECK (app_can_write_finance() OR app_current_role() = 'accountant');

ALTER TABLE e_invoice_webhook_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS e_invoice_webhook_logs_select ON e_invoice_webhook_logs;
CREATE POLICY e_invoice_webhook_logs_select ON e_invoice_webhook_logs FOR SELECT USING (app_can_read_finance());
DROP POLICY IF EXISTS e_invoice_webhook_logs_modify ON e_invoice_webhook_logs;
CREATE POLICY e_invoice_webhook_logs_modify ON e_invoice_webhook_logs FOR ALL
  USING (app_can_write_finance())
  WITH CHECK (app_can_write_finance());

-- =====================================================================
-- Contractor Portal — Phase 10
-- =====================================================================
-- Look up the contractor company linked to the current user.
CREATE OR REPLACE FUNCTION app_contractor_company_id() RETURNS uuid AS $$
  SELECT cu.company_id FROM contractor_users cu
  WHERE cu.user_id = app_current_user_id()
  LIMIT 1;
$$ LANGUAGE sql STABLE;

ALTER TABLE contractor_companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS contractor_companies_select ON contractor_companies;
CREATE POLICY contractor_companies_select ON contractor_companies FOR SELECT USING (
  app_is_director()
  OR app_current_role() IN ('pm', 'design-lead', 'site-engineer', 'hr-manager')
  OR id = app_contractor_company_id()
);
DROP POLICY IF EXISTS contractor_companies_modify ON contractor_companies;
CREATE POLICY contractor_companies_modify ON contractor_companies FOR ALL
  USING (app_is_director() OR app_current_role() IN ('pm', 'design-lead'))
  WITH CHECK (app_is_director() OR app_current_role() IN ('pm', 'design-lead'));

ALTER TABLE contractor_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS contractor_users_select ON contractor_users;
CREATE POLICY contractor_users_select ON contractor_users FOR SELECT USING (
  app_is_director()
  OR app_current_role() IN ('pm', 'design-lead', 'hr-manager')
  OR company_id = app_contractor_company_id()
);
DROP POLICY IF EXISTS contractor_users_modify ON contractor_users;
CREATE POLICY contractor_users_modify ON contractor_users FOR ALL
  USING (app_is_director() OR app_current_role() IN ('pm', 'design-lead') OR company_id = app_contractor_company_id())
  WITH CHECK (app_is_director() OR app_current_role() IN ('pm', 'design-lead') OR company_id = app_contractor_company_id());

-- Submittals: contractors see own company's only; consultants see project-linked ones
ALTER TABLE submittals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS submittals_select ON submittals;
CREATE POLICY submittals_select ON submittals FOR SELECT USING (
  app_is_director()
  OR app_current_role() IN ('pm', 'design-lead', 'site-engineer')
  OR (project_id IS NOT NULL AND app_is_team_member(project_id))
  OR contractor_company_id = app_contractor_company_id()
);
DROP POLICY IF EXISTS submittals_modify ON submittals;
CREATE POLICY submittals_modify ON submittals FOR ALL
  USING (
    app_is_director()
    OR app_current_role() IN ('pm', 'design-lead', 'site-engineer')
    OR contractor_company_id = app_contractor_company_id()
  )
  WITH CHECK (
    app_is_director()
    OR app_current_role() IN ('pm', 'design-lead', 'site-engineer')
    OR contractor_company_id = app_contractor_company_id()
  );

ALTER TABLE submittal_revisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS submittal_revisions_select ON submittal_revisions;
CREATE POLICY submittal_revisions_select ON submittal_revisions FOR SELECT USING (
  app_is_director()
  OR EXISTS (SELECT 1 FROM submittals s WHERE s.id = submittal_revisions.submittal_id
              AND (s.contractor_company_id = app_contractor_company_id()
                   OR app_current_role() IN ('pm', 'design-lead', 'site-engineer')))
);
DROP POLICY IF EXISTS submittal_revisions_modify ON submittal_revisions;
CREATE POLICY submittal_revisions_modify ON submittal_revisions FOR ALL
  USING (app_is_director() OR app_current_role() IN ('pm', 'design-lead', 'site-engineer'))
  WITH CHECK (app_is_director() OR app_current_role() IN ('pm', 'design-lead', 'site-engineer'));

ALTER TABLE submittal_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS submittal_messages_select ON submittal_messages;
CREATE POLICY submittal_messages_select ON submittal_messages FOR SELECT USING (
  app_is_director()
  OR EXISTS (SELECT 1 FROM submittals s WHERE s.id = submittal_messages.submittal_id
              AND (s.contractor_company_id = app_contractor_company_id()
                   OR app_current_role() IN ('pm', 'design-lead', 'site-engineer')
                   OR (s.project_id IS NOT NULL AND app_is_team_member(s.project_id))))
);
DROP POLICY IF EXISTS submittal_messages_insert ON submittal_messages;
CREATE POLICY submittal_messages_insert ON submittal_messages FOR INSERT WITH CHECK (
  app_is_director()
  OR EXISTS (SELECT 1 FROM submittals s WHERE s.id = submittal_messages.submittal_id
              AND (s.contractor_company_id = app_contractor_company_id()
                   OR app_current_role() IN ('pm', 'design-lead', 'site-engineer')))
);

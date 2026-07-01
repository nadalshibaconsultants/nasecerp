"""
NASEC ERP - SQLAlchemy ORM Models
Mirrors the frontend TypeScript types defined in client/src/lib/.
All entities use UUID primary keys and ISO timestamps.
"""
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, Float, ForeignKey, Integer,
    String, Text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


# --- AUTH ---

class User(Base):
    __tablename__ = "users"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username      = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    display_name  = Column(String(200), nullable=False)
    role          = Column(
        Enum(
            "director", "hr-manager", "finance-manager", "accountant",
            "pm", "design-lead", "site-engineer", "bd-manager",
            "employee", "contractor",
            name="user_role",
        ),
        nullable=False,
    )
    employee_id   = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    active        = Column(Boolean, default=True)
    avatar_color  = Column(String(30), nullable=True)
    last_login_at = Column(DateTime, nullable=True)
    created_at    = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", back_populates="user", uselist=False)
    projects_owned = relationship("Project", back_populates="pm_user", foreign_keys="Project.pm_user_id")


# --- HR / EMPLOYEES ---

class Employee(Base):
    __tablename__ = "employees"

    id                   = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code                 = Column(String(30), unique=True, nullable=False)
    first_name           = Column(String(100), nullable=False)
    last_name            = Column(String(100), nullable=False)
    arabic_name          = Column(String(200), nullable=True)
    gender               = Column(Enum("M", "F", name="gender_enum"), nullable=False)
    dob                  = Column(String(10), nullable=True)
    nationality          = Column(String(60), nullable=False)
    marital_status       = Column(Enum("single", "married", "divorced", "widowed", name="marital_enum"), nullable=True)
    email                = Column(String(255), unique=True, nullable=False)
    phone                = Column(String(30), nullable=False)
    emergency_phone      = Column(String(30), nullable=True)
    emergency_contact_name = Column(String(150), nullable=True)
    home_address         = Column(Text, nullable=True)
    photo_url            = Column(Text, nullable=True)
    office               = Column(Enum("dubai", "cairo", name="office_enum"), nullable=False)
    job_title            = Column(String(150), nullable=False)
    department           = Column(String(60), nullable=False)
    manager_employee_id  = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    status               = Column(
        Enum("active", "probation", "on-leave", "suspended", "terminated", "resigned", name="emp_status"),
        nullable=False, default="active",
    )
    join_date            = Column(String(10), nullable=False)
    end_date             = Column(String(10), nullable=True)
    work_location        = Column(Enum("Office", "Site", "Hybrid", name="work_loc_enum"), nullable=True)
    contract_type        = Column(
        Enum("limited", "unlimited", "part-time", "freelance", "consultant", name="contract_enum"),
        nullable=False,
    )
    contract_end_date    = Column(String(10), nullable=True)
    probation_end_date   = Column(String(10), nullable=True)
    salary               = Column(JSONB, nullable=True)
    passport_no          = Column(String(30), nullable=True)
    passport_expiry      = Column(String(10), nullable=True)
    emirates_id_no       = Column(String(30), nullable=True)
    emirates_id_expiry   = Column(String(10), nullable=True)
    visa_no              = Column(String(30), nullable=True)
    visa_expiry          = Column(String(10), nullable=True)
    visa_sponsor         = Column(String(20), nullable=True)
    labour_card_no       = Column(String(30), nullable=True)
    labour_card_expiry   = Column(String(10), nullable=True)
    dependents           = Column(JSONB, nullable=True)
    bank                 = Column(JSONB, nullable=True)
    documents            = Column(JSONB, nullable=True)
    assigned_project_id  = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)
    created_at           = Column(DateTime, default=datetime.utcnow)
    updated_at           = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user             = relationship("User", back_populates="employee", uselist=False)
    manager          = relationship("Employee", remote_side=[id])
    training_records = relationship("TrainingRecord", back_populates="employee", cascade="all, delete-orphan")
    asset_assignments = relationship("AssetAssignment", back_populates="employee", cascade="all, delete-orphan")
    disciplinary_records = relationship("DisciplinaryRecord", back_populates="employee", cascade="all, delete-orphan")
    performance_reviews  = relationship("PerformanceReview", back_populates="employee", cascade="all, delete-orphan")
    onboarding_records   = relationship("OnboardingRecord", back_populates="employee", cascade="all, delete-orphan")
    issued_letters       = relationship("IssuedLetter", back_populates="employee", cascade="all, delete-orphan")
    attendance_punches   = relationship("AttendancePunch", back_populates="employee", cascade="all, delete-orphan")
    leave_requests       = relationship("LeaveRequest", back_populates="employee", cascade="all, delete-orphan")


# --- HR EXTRAS ---

class TrainingRecord(Base):
    __tablename__ = "training_records"
    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id     = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    name            = Column(String(200), nullable=False)
    provider        = Column(String(200), nullable=True)
    category        = Column(
        Enum("professional", "safety", "technical", "soft-skills", "compliance", name="train_cat"),
        nullable=False,
    )
    issue_date      = Column(String(10), nullable=True)
    expiry_date     = Column(String(10), nullable=True)
    cost_aed        = Column(Float, nullable=True)
    certificate_url = Column(Text, nullable=True)
    notes           = Column(Text, nullable=True)
    employee = relationship("Employee", back_populates="training_records")


class AssetAssignment(Base):
    __tablename__ = "asset_assignments"
    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id      = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    type             = Column(String(30), nullable=False)
    identifier       = Column(String(100), nullable=False)
    description      = Column(Text, nullable=False)
    assigned_date    = Column(String(10), nullable=False)
    returned_date    = Column(String(10), nullable=True)
    condition        = Column(String(20), nullable=True)
    estimated_value  = Column(Float, nullable=True)
    notes            = Column(Text, nullable=True)
    employee = relationship("Employee", back_populates="asset_assignments")


class DisciplinaryRecord(Base):
    __tablename__ = "disciplinary_records"
    id                        = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id               = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    date                      = Column(String(10), nullable=False)
    type                      = Column(String(30), nullable=False)
    reason                    = Column(Text, nullable=False)
    detail                    = Column(Text, nullable=True)
    issued_by                 = Column(String(150), nullable=False)
    acknowledged_by_employee  = Column(Boolean, default=False)
    attached_docs             = Column(ARRAY(Text), nullable=True)
    employee = relationship("Employee", back_populates="disciplinary_records")


class PerformanceReview(Base):
    __tablename__ = "performance_reviews"
    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id       = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    period            = Column(String(20), nullable=False)
    reviewer_id       = Column(String(100), nullable=False)
    date              = Column(String(10), nullable=False)
    scores            = Column(JSONB, nullable=True)
    overall_rating    = Column(Float, nullable=False)
    manager_comments  = Column(Text, nullable=False)
    employee_comments = Column(Text, nullable=True)
    status            = Column(Enum("draft", "submitted", "acknowledged", name="review_status"), nullable=False)
    employee = relationship("Employee", back_populates="performance_reviews")


class OnboardingRecord(Base):
    __tablename__ = "onboarding_records"
    id                 = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id        = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    started_at         = Column(String(24), nullable=False)
    expected_join_date = Column(String(10), nullable=False)
    status             = Column(Enum("in-progress", "complete", "abandoned", name="onboard_status"), nullable=False)
    steps              = Column(JSONB, nullable=True)
    employee = relationship("Employee", back_populates="onboarding_records")


class IssuedLetter(Base):
    __tablename__ = "issued_letters"
    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id      = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    type             = Column(String(40), nullable=False)
    issue_date       = Column(String(10), nullable=False)
    issued_by        = Column(String(150), nullable=False)
    reference        = Column(String(100), nullable=False)
    file_name        = Column(String(255), nullable=True)
    recipient        = Column(String(200), nullable=True)
    content_snapshot = Column(Text, nullable=True)
    employee = relationship("Employee", back_populates="issued_letters")


# --- ATTENDANCE ---

class Geofence(Base):
    __tablename__ = "geofences"
    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id  = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    name        = Column(String(200), nullable=False)
    center      = Column(JSONB, nullable=False)
    radius_m    = Column(Float, nullable=False)
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    project = relationship("Project", back_populates="geofences")


class AttendancePunch(Base):
    __tablename__ = "attendance_punches"
    id                      = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id             = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    project_id              = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)
    timestamp               = Column(String(30), nullable=False)
    type                    = Column(Enum("in", "out", name="punch_type"), nullable=False)
    gps_lat                 = Column(Float, nullable=True)
    gps_lng                 = Column(Float, nullable=True)
    accuracy_m              = Column(Float, nullable=True)
    geofence_check          = Column(String(30), nullable=False)
    approved_by_employee_id = Column(UUID(as_uuid=True), nullable=True)
    note                    = Column(Text, nullable=True)
    device                  = Column(String(30), nullable=True)
    employee = relationship("Employee", back_populates="attendance_punches")


class LeaveRequest(Base):
    __tablename__ = "leave_requests"
    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    type        = Column(String(30), nullable=False)
    from_date   = Column(String(10), nullable=False)
    to_date     = Column(String(10), nullable=False)
    status      = Column(Enum("submitted", "approved", "rejected", name="leave_status"), nullable=False, default="submitted")
    approved_by = Column(String(100), nullable=True)
    note        = Column(Text, nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)
    employee = relationship("Employee", back_populates="leave_requests")


# --- PROJECTS ---

class Project(Base):
    __tablename__ = "projects"

    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code              = Column(String(30), unique=True, nullable=False)
    name_en           = Column(String(300), nullable=False)
    name_ar           = Column(String(300), nullable=True)
    stage             = Column(
        Enum("pipeline", "pre-contract", "post-contract", "completed", name="project_stage"),
        nullable=False,
    )
    health            = Column(Enum("on-track", "at-risk", "delayed", name="project_health"), nullable=False, default="on-track")
    type              = Column(String(100), nullable=True)
    plot_no           = Column(String(50), nullable=True)
    community         = Column(String(150), nullable=True)
    emirate           = Column(String(50), nullable=True)
    authority         = Column(String(100), nullable=True)
    client            = Column(String(200), nullable=True)
    contract_value    = Column(Float, nullable=True, default=0)
    fee_type          = Column(String(50), nullable=True)
    start_date        = Column(String(10), nullable=True)
    target_completion = Column(String(10), nullable=True)
    gfa               = Column(Float, nullable=True, default=0)
    plot_area          = Column(Float, nullable=True, default=0)
    floors             = Column(Integer, nullable=True, default=0)
    current_sub_stage  = Column(Integer, nullable=True, default=0)
    progress           = Column(Float, nullable=True, default=0)
    budget_consumed    = Column(Float, nullable=True, default=0)
    hours_logged       = Column(Float, nullable=True, default=0)
    hours_planned      = Column(Float, nullable=True, default=0)
    days_to_deadline   = Column(Integer, nullable=True, default=0)
    open_rfis          = Column(Integer, nullable=True, default=0)
    open_ncrs          = Column(Integer, nullable=True, default=0)
    pending_approvals  = Column(Integer, nullable=True, default=0)
    starred            = Column(Boolean, default=False)
    team_user_ids      = Column(ARRAY(Text), nullable=True)
    pm_user_id         = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at         = Column(DateTime, default=datetime.utcnow)
    updated_at         = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    pm_user   = relationship("User", back_populates="projects_owned", foreign_keys=[pm_user_id])
    tasks     = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    risks     = relationship("ProjectRisk", back_populates="project", cascade="all, delete-orphan")
    geofences = relationship("Geofence", back_populates="project", cascade="all, delete-orphan")
    modules   = relationship("ProjectModule", back_populates="project", cascade="all, delete-orphan")


# --- TASKS ---

class Task(Base):
    __tablename__ = "tasks"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title            = Column(String(300), nullable=False)
    description      = Column(Text, nullable=True)
    status           = Column(
        Enum("todo", "in-progress", "blocked", "done", name="task_status"),
        nullable=False, default="todo",
    )
    priority         = Column(
        Enum("low", "medium", "high", "urgent", name="task_priority"),
        nullable=False, default="medium",
    )
    category         = Column(String(30), nullable=True)
    project_id       = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)
    assignee_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reporter_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    due_date         = Column(String(10), nullable=True)
    tags             = Column(ARRAY(Text), nullable=True)
    created_at       = Column(DateTime, default=datetime.utcnow)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at     = Column(DateTime, nullable=True)

    project = relationship("Project", back_populates="tasks")


# --- RISKS (ISO 31000 / Dubai AEC) ---

class ProjectRisk(Base):
    __tablename__ = "project_risks"

    id                    = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id            = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    code                  = Column(String(30), nullable=False)
    title                 = Column(String(300), nullable=False)
    description           = Column(Text, nullable=False)
    category              = Column(String(30), nullable=False)
    phase                 = Column(Enum("pre-contract", "post-contract", "both", name="risk_phase"), nullable=False)
    stage_ref             = Column(String(20), nullable=True)
    authority_ref         = Column(String(100), nullable=True)
    inherent_probability  = Column(Integer, nullable=False)
    inherent_impact       = Column(Integer, nullable=False)
    residual_probability  = Column(Integer, nullable=True)
    residual_impact       = Column(Integer, nullable=True)
    treatment             = Column(Enum("avoid", "transfer", "mitigate", "accept", name="risk_treatment"), nullable=False)
    treatment_rationale   = Column(Text, nullable=True)
    cost_impact_aed       = Column(Float, nullable=True)
    schedule_impact_days  = Column(Integer, nullable=True)
    owner_user_id         = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    owner_display         = Column(String(200), nullable=True)
    raised_by_user_id     = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    raised_by_display     = Column(String(200), nullable=True)
    raised_at             = Column(String(24), nullable=False)
    trigger_conditions    = Column(Text, nullable=True)
    early_warning_signs   = Column(Text, nullable=True)
    contingency_plan      = Column(Text, nullable=True)
    linked_task_ids       = Column(ARRAY(Text), nullable=True)
    linked_document_ids   = Column(ARRAY(Text), nullable=True)
    linked_submittal_ids  = Column(ARRAY(Text), nullable=True)
    status                = Column(
        Enum("identified", "assessed", "treated", "monitoring", "escalated", "closed", "realised", name="risk_status"),
        nullable=False, default="identified",
    )
    review_frequency      = Column(String(20), nullable=False, default="monthly")
    next_review_date      = Column(String(10), nullable=True)
    last_reviewed_at      = Column(String(24), nullable=True)
    actions               = Column(JSONB, nullable=True)
    reviews               = Column(JSONB, nullable=True)
    closed_at             = Column(String(24), nullable=True)
    closure_reason        = Column(Text, nullable=True)
    lessons_learned       = Column(Text, nullable=True)
    created_at            = Column(DateTime, default=datetime.utcnow)
    updated_at            = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="risks")


# --- PROJECT MODULES ---

class ProjectModule(Base):
    __tablename__ = "project_modules"
    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name        = Column(String(150), nullable=False)
    project_id  = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    created_at  = Column(DateTime, default=datetime.utcnow)
    project = relationship("Project", back_populates="modules")
    rules   = relationship("Rule", back_populates="module", cascade="all, delete-orphan")


# --- RULES ENGINE (JSON-Logic) ---

class Rule(Base):
    __tablename__ = "rules"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name        = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    module_id   = Column(UUID(as_uuid=True), ForeignKey("project_modules.id"), nullable=True)
    condition   = Column(JSONB, nullable=False)
    action      = Column(JSONB, nullable=False)
    priority    = Column(Integer, nullable=False, default=0)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    module = relationship("ProjectModule", back_populates="rules")


# --- NOTIFICATIONS ---

class Notification(Base):
    __tablename__ = "notifications"
    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id     = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    title       = Column(String(300), nullable=False)
    body        = Column(Text, nullable=True)
    link        = Column(String(500), nullable=True)
    read        = Column(Boolean, default=False)
    created_at  = Column(DateTime, default=datetime.utcnow)


# --- AUDIT LOG ---

class AuditLogEntry(Base):
    __tablename__ = "audit_log"
    id        = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp = Column(DateTime, default=datetime.utcnow)
    actor     = Column(String(200), nullable=False)
    module    = Column(String(50), nullable=False)
    action    = Column(String(30), nullable=False)
    subject   = Column(Text, nullable=False)
    detail    = Column(Text, nullable=True)


# --- DOCUMENTS ---

class DocFolder(Base):
    __tablename__ = "doc_folders"
    id        = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name      = Column(String(200), nullable=False)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("doc_folders.id"), nullable=True)
    children  = relationship("DocFolder", backref="parent", remote_side=[id])
    files     = relationship("DocumentFile", back_populates="folder", cascade="all, delete-orphan")


class DocumentFile(Base):
    __tablename__ = "document_files"
    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    folder_id   = Column(UUID(as_uuid=True), ForeignKey("doc_folders.id"), nullable=True)
    name        = Column(String(300), nullable=False)
    file_url    = Column(Text, nullable=True)
    file_size   = Column(Integer, nullable=True)
    mime_type   = Column(String(100), nullable=True)
    uploaded_by = Column(String(200), nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)
    folder = relationship("DocFolder", back_populates="files")


# --- LEAVE HANDOVER ---

class LeaveHandover(Base):
    __tablename__ = "leave_handovers"
    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    leave_request_id  = Column(UUID(as_uuid=True), ForeignKey("leave_requests.id"), nullable=False)
    employee_id       = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    status            = Column(Enum("submitted", "approved", "rejected", name="handover_status"), nullable=False, default="submitted")
    task_assignments  = Column(JSONB, nullable=True)
    approved_by       = Column(String(200), nullable=True)
    created_at        = Column(DateTime, default=datetime.utcnow)
    updated_at        = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# --- STAGE-GATE APPROVALS ---

class StageGateApproval(Base):
    __tablename__ = "stage_gate_approvals"
    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id     = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    gate           = Column(String(10), nullable=False)
    approver_role  = Column(String(30), nullable=False)
    approver_id    = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    status         = Column(Enum("pending", "approved", "rejected", name="gate_status"), nullable=False, default="pending")
    comment        = Column(Text, nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow)
    decided_at     = Column(DateTime, nullable=True)

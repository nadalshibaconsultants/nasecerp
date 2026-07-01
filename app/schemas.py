"""
Pydantic schemas for NASEC ERP API request/response validation.
Mirrors the SQLAlchemy models in app/models.py.
"""
from __future__ import annotations
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, EmailStr, Field


# --- User ---

class UserCreate(BaseModel):
    username: str
    password: str
    display_name: str
    role: str
    employee_id: Optional[str] = None

class UserRead(BaseModel):
    id: str
    username: str
    display_name: str
    role: str
    employee_id: Optional[str] = None
    active: bool
    avatar_color: Optional[str] = None
    last_login_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    role: Optional[str] = None
    active: Optional[bool] = None
    avatar_color: Optional[str] = None


# --- Employee ---

class EmployeeCreate(BaseModel):
    code: str
    first_name: str
    last_name: str
    arabic_name: Optional[str] = None
    gender: str
    dob: Optional[str] = None
    nationality: str
    marital_status: Optional[str] = None
    email: str
    phone: str
    emergency_phone: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    home_address: Optional[str] = None
    photo_url: Optional[str] = None
    office: str
    job_title: str
    department: str
    manager_employee_id: Optional[str] = None
    status: str = "active"
    join_date: str
    end_date: Optional[str] = None
    work_location: Optional[str] = None
    contract_type: str
    contract_end_date: Optional[str] = None
    probation_end_date: Optional[str] = None
    salary: Optional[Dict[str, Any]] = None
    passport_no: Optional[str] = None
    passport_expiry: Optional[str] = None
    emirates_id_no: Optional[str] = None
    emirates_id_expiry: Optional[str] = None
    visa_no: Optional[str] = None
    visa_expiry: Optional[str] = None
    visa_sponsor: Optional[str] = None
    labour_card_no: Optional[str] = None
    labour_card_expiry: Optional[str] = None
    dependents: Optional[List[Dict[str, Any]]] = None
    bank: Optional[Dict[str, Any]] = None
    documents: Optional[List[Dict[str, Any]]] = None
    assigned_project_id: Optional[str] = None

class EmployeeRead(EmployeeCreate):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    office: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = None
    salary: Optional[Dict[str, Any]] = None


# --- Project ---

class ProjectCreate(BaseModel):
    code: str
    name_en: str
    name_ar: Optional[str] = None
    stage: str
    health: str = "on-track"
    type: Optional[str] = None
    plot_no: Optional[str] = None
    community: Optional[str] = None
    emirate: Optional[str] = None
    authority: Optional[str] = None
    client: Optional[str] = None
    contract_value: Optional[float] = 0
    fee_type: Optional[str] = None
    start_date: Optional[str] = None
    target_completion: Optional[str] = None
    gfa: Optional[float] = 0
    plot_area: Optional[float] = 0
    floors: Optional[int] = 0
    pm_user_id: Optional[str] = None

class ProjectRead(ProjectCreate):
    id: str
    current_sub_stage: Optional[int] = 0
    progress: Optional[float] = 0
    budget_consumed: Optional[float] = 0
    hours_logged: Optional[float] = 0
    hours_planned: Optional[float] = 0
    days_to_deadline: Optional[int] = 0
    open_rfis: Optional[int] = 0
    open_ncrs: Optional[int] = 0
    pending_approvals: Optional[int] = 0
    starred: bool = False
    team_user_ids: Optional[List[str]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class ProjectUpdate(BaseModel):
    name_en: Optional[str] = None
    name_ar: Optional[str] = None
    stage: Optional[str] = None
    health: Optional[str] = None
    client: Optional[str] = None
    progress: Optional[float] = None
    starred: Optional[bool] = None


# --- Task ---

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "todo"
    priority: str = "medium"
    category: Optional[str] = None
    project_id: Optional[str] = None
    assignee_user_id: Optional[str] = None
    reporter_user_id: Optional[str] = None
    due_date: Optional[str] = None
    tags: Optional[List[str]] = None

class TaskRead(TaskCreate):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee_user_id: Optional[str] = None
    due_date: Optional[str] = None


# --- ProjectRisk ---

class RiskCreate(BaseModel):
    project_id: str
    code: str
    title: str
    description: str
    category: str
    phase: str
    stage_ref: Optional[str] = None
    authority_ref: Optional[str] = None
    inherent_probability: int
    inherent_impact: int
    residual_probability: Optional[int] = None
    residual_impact: Optional[int] = None
    treatment: str
    treatment_rationale: Optional[str] = None
    cost_impact_aed: Optional[float] = None
    schedule_impact_days: Optional[int] = None
    owner_user_id: Optional[str] = None
    owner_display: Optional[str] = None
    raised_by_user_id: Optional[str] = None
    raised_by_display: Optional[str] = None
    raised_at: str
    trigger_conditions: Optional[str] = None
    early_warning_signs: Optional[str] = None
    contingency_plan: Optional[str] = None
    status: str = "identified"
    review_frequency: str = "monthly"
    actions: Optional[List[Dict[str, Any]]] = None
    reviews: Optional[List[Dict[str, Any]]] = None

class RiskRead(RiskCreate):
    id: str
    linked_task_ids: Optional[List[str]] = None
    linked_document_ids: Optional[List[str]] = None
    linked_submittal_ids: Optional[List[str]] = None
    next_review_date: Optional[str] = None
    last_reviewed_at: Optional[str] = None
    closed_at: Optional[str] = None
    closure_reason: Optional[str] = None
    lessons_learned: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class RiskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    residual_probability: Optional[int] = None
    residual_impact: Optional[int] = None
    treatment: Optional[str] = None
    actions: Optional[List[Dict[str, Any]]] = None


# --- ProjectModule ---

class ModuleCreate(BaseModel):
    name: str
    project_id: str

class ModuleRead(ModuleCreate):
    id: str
    created_at: Optional[datetime] = None

class ModuleUpdate(BaseModel):
    name: Optional[str] = None


# --- Rule ---

class RuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    module_id: Optional[str] = None
    condition: Dict[str, Any]
    action: Dict[str, Any]
    priority: int = 0
    is_active: bool = True

class RuleRead(RuleCreate):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class RuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    condition: Optional[Dict[str, Any]] = None
    action: Optional[Dict[str, Any]] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None


# --- RuleEvaluate ---

class RuleEvaluateRequest(BaseModel):
    context: Dict[str, Any] = Field(..., description="Data context to evaluate rules against")
    module_id: Optional[str] = None

class RuleEvaluateResult(BaseModel):
    rule_id: str
    rule_name: str
    matched: bool
    action: Optional[Dict[str, Any]] = None


# --- Auth ---

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead

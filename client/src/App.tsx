import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import MobileShell from "./components/mobile/MobileShell";
import MobileSiteHome from "./pages/MobileSiteHome";
import MyTasks from "./pages/MyTasks";
import { isNative, isMobileViewport } from "./lib/native/platform";
import { AuthProvider, useAuth } from "./lib/auth/AuthContext";
import { useEffect } from "react";
import { useLocation } from "wouter";
import AuthLoginPage from "./components/auth/LoginPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import HRModule from "./pages/HRModule";
import AttendanceModule from "./pages/AttendanceModule";
import FinanceModule from "./pages/FinanceModule";
import ProjectsModule from "./pages/ProjectsModule";
import TasksModule from "./pages/TasksModule";
import CRMModule from "./pages/CRMModule";
import DocumentsModule from "./pages/DocumentsModule";
import ReportsModule from "./pages/ReportsModule";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import ProjectCreate from "./pages/ProjectCreate";
import TaskCreate from "./pages/TaskCreate";
import TaskDetail from "./pages/TaskDetail";
import TimesheetEntry from "./pages/TimesheetEntry";
import DrawingRegister from "./pages/DrawingRegister";
import HRForms from "./pages/HRForms";
import InvoiceCreate from "./pages/InvoiceCreate";
import LeadCreate from "./pages/LeadCreate";
import AttendanceEntry from "./pages/AttendanceEntry";
import Approvals from "./pages/Approvals";
import ProjectDetail from "./pages/ProjectDetail";
import ChatPage from "@/pages/ChatPage";
import NasecWorkflow from "@/pages/NasecWorkflow";
import EInvoicing from "@/pages/EInvoicing";
import ProcurementModule from "@/pages/ProcurementModule";
import SelfService from "@/components/hr/SelfService";
import MyFinance from "@/pages/MyFinance";
import ContractorLogin from "./pages/ContractorLogin";
import ContractorDashboard from "./pages/ContractorDashboard";
import ContractorNewSubmittal from "./pages/ContractorNewSubmittal";
import ContractorSubmittals from "./pages/ContractorSubmittals";
import ContractorSubmittalDetail from "./pages/ContractorSubmittalDetail";
import ContractorInbox from "./pages/ContractorInbox";
import ContractorDrawings from "./pages/ContractorDrawings";
import ContractorStats from "./pages/ContractorStats";
import ContractorPortalLayout from "./components/ContractorPortalLayout";
import { clientHomePath } from "./lib/auth/client-home";

// Contractors keep their separate portal; clients use the main ERP dashboard.
function ContractorRedirect({ children }: { children: React.ReactNode }) {
  const { currentUser, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  useEffect(() => {
    if (isAuthenticated && currentUser?.role === "contractor") {
      navigate("/contractor-portal/dashboard");
    }
  }, [currentUser?.role, isAuthenticated, navigate]);
  if (isAuthenticated && currentUser?.role === "contractor") return null;
  return <>{children}</>;
}

function ClientEntryRedirect() {
  const { loading, isAuthenticated, currentUser } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (loading) return;
    navigate(isAuthenticated ? clientHomePath(currentUser) : "/login");
  }, [loading, isAuthenticated, currentUser, navigate]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="h-6 w-6 rounded-full border-2 border-muted border-t-foreground animate-spin" aria-label="Loading" />
    </div>
  );
}

function ClientDashboardRedirect({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (currentUser?.role === "client") navigate(clientHomePath(currentUser));
  }, [currentUser, navigate]);

  if (currentUser?.role === "client") return null;
  return <>{children}</>;
}

function ClientNoAccess() {
  const { currentUser } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    const home = clientHomePath(currentUser);
    if (home !== "/client/no-access") navigate(home);
  }, [currentUser, navigate]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
        <h1 className="text-lg font-semibold text-amber-950">No modules assigned</h1>
        <p className="mt-2 text-sm text-amber-800">
          Your client account is active, but the Director has not granted module access yet.
        </p>
      </div>
    </div>
  );
}

// Helper to wrap pages with both layout AND auth gate
const Internal = (Component: React.ComponentType, requirePerm?: any) => () => {
  const Shell =
    isNative() || isMobileViewport() ? MobileShell : DashboardLayout;
  return (
    <ProtectedRoute requirePerm={requirePerm}>
      <ContractorRedirect>
        <Shell>
          <Component />
        </Shell>
      </ContractorRedirect>
    </ProtectedRoute>
  );
};

function Router() {
  return (
    <Switch>
      {/* Public auth routes */}
      <Route path="/login" component={AuthLoginPage} />
      <Route path="/login-old" component={LoginPage} />

      {/* Contractor Portal — separate stack, no internal ERP access */}
      <Route path="/contractor-portal" component={ContractorLogin} />
      <Route
        path="/contractor-portal/dashboard"
        component={() => (
          <ContractorPortalLayout>
            <ContractorDashboard />
          </ContractorPortalLayout>
        )}
      />
      <Route
        path="/contractor-portal/new"
        component={() => (
          <ContractorPortalLayout>
            <ContractorNewSubmittal />
          </ContractorPortalLayout>
        )}
      />
      <Route
        path="/contractor-portal/submittals/:id"
        component={() => (
          <ContractorPortalLayout>
            <ContractorSubmittalDetail />
          </ContractorPortalLayout>
        )}
      />
      <Route
        path="/contractor-portal/submittals"
        component={() => (
          <ContractorPortalLayout>
            <ContractorSubmittals />
          </ContractorPortalLayout>
        )}
      />
      <Route
        path="/contractor-portal/inbox"
        component={() => (
          <ContractorPortalLayout>
            <ContractorInbox />
          </ContractorPortalLayout>
        )}
      />
      <Route
        path="/contractor-portal/drawings"
        component={() => (
          <ContractorPortalLayout>
            <ContractorDrawings />
          </ContractorPortalLayout>
        )}
      />
      <Route
        path="/contractor-portal/stats"
        component={() => (
          <ContractorPortalLayout>
            <ContractorStats />
          </ContractorPortalLayout>
        )}
      />

      {/* Client entry links now use the same ERP dashboard as the main app. */}
      <Route path="/client" component={ClientEntryRedirect} />
      <Route path="/client-portal" component={ClientEntryRedirect} />
      <Route path="/client-portal/dashboard" component={ClientEntryRedirect} />

      {/* Internal ERP — protected */}
      <Route
        path="/chat"
        component={() => (
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        )}
      />
      <Route path="/workflow" component={Internal(NasecWorkflow)} />
      <Route
        path="/dashboard"
        component={() => (
          <ProtectedRoute>
            <ContractorRedirect>
              <ClientDashboardRedirect>
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              </ClientDashboardRedirect>
            </ContractorRedirect>
          </ProtectedRoute>
        )}
      />
      <Route path="/client/no-access" component={Internal(ClientNoAccess)} />
      <Route
        path="/hr"
        component={Internal(HRModule, ["hr:read", "hr:payroll:read"])}
      />
      <Route path="/hr/forms" component={Internal(HRForms, "hr:write")} />
      <Route
        path="/my-hr"
        component={() => (
          <ProtectedRoute requirePerm="self:read">
            <DashboardLayout>
              <SelfService />
            </DashboardLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path="/my-finance"
        component={Internal(MyFinance, "self:read")}
      />
      <Route
        path="/attendance"
        component={Internal(AttendanceModule, ["attendance:read", "self:read"])}
      />
      <Route
        path="/attendance/entry"
        component={Internal(AttendanceEntry, "attendance:write")}
      />
      <Route
        path="/attendance/timesheet"
        component={Internal(TimesheetEntry, "attendance:write")}
      />
      <Route
        path="/finance"
        component={Internal(FinanceModule, "finance:read")}
      />
      <Route
        path="/finance/invoice/new"
        component={Internal(InvoiceCreate, "finance:invoices:write")}
      />
      <Route
        path="/finance/e-invoicing"
        component={Internal(EInvoicing, "finance:read")}
      />
      <Route
        path="/finance/procurement"
        component={Internal(ProcurementModule, "finance:read")}
      />
      <Route
        path="/projects"
        component={Internal(ProjectsModule, ["projects:read", "self:read", "client:portal"])}
      />
      <Route
        path="/projects/new"
        component={Internal(ProjectCreate, "projects:write")}
      />
      <Route
        path="/projects/pipeline/:id"
        component={Internal(ProjectDetail, ["projects:read", "self:read", "client:portal"])}
      />
      <Route
        path="/projects/pre-contract/:id"
        component={Internal(ProjectDetail, ["projects:read", "self:read", "client:portal"])}
      />
      <Route
        path="/projects/post-contract/:id"
        component={Internal(ProjectDetail, ["projects:read", "self:read", "client:portal"])}
      />
      <Route
        path="/projects/completed/:id"
        component={Internal(ProjectDetail, ["projects:read", "self:read", "client:portal"])}
      />
      <Route
        path="/projects/:id"
        component={Internal(ProjectDetail, ["projects:read", "self:read", "client:portal"])}
      />
      <Route path="/tasks" component={Internal(TasksModule, "tasks:read")} />
      <Route
        path="/tasks/new"
        component={Internal(TaskCreate, "tasks:write")}
      />
      <Route path="/tasks/:id" component={Internal(TaskDetail, "tasks:read")} />
      <Route path="/crm" component={Internal(CRMModule, "crm:read")} />
      <Route
        path="/crm/lead/new"
        component={Internal(LeadCreate, "crm:write")}
      />
      <Route
        path="/documents"
        component={Internal(DocumentsModule, "documents:read")}
      />
      <Route
        path="/documents/register"
        component={Internal(DrawingRegister, "documents:read")}
      />
      <Route
        path="/reports"
        component={Internal(ReportsModule, "reports:read")}
      />
      <Route path="/settings" component={Internal(SettingsPage, "settings:read")} />
      <Route path="/approvals" component={Internal(Approvals)} />
      <Route path="/mobile/site" component={Internal(MobileSiteHome)} />
      <Route path="/my-tasks" component={Internal(MyTasks, "self:read")} />
      <Route
        path="/"
        component={() => (
          <ProtectedRoute>
            <ContractorRedirect>
              <ClientDashboardRedirect>
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              </ClientDashboardRedirect>
            </ContractorRedirect>
          </ProtectedRoute>
        )}
      />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

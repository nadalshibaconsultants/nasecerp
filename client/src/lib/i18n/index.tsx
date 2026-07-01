/**
 * Minimal i18n — Arabic (RTL) + English. Persists in localStorage.
 * Toggle in DashboardLayout. Auto-sets <html dir="rtl"|"ltr"> + lang attribute.
 */
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export type Lang = "en" | "ar";
const STORAGE_KEY = "nasec-lang";

type Dict = Record<string, string>;

const EN: Dict = {
  "nav.dashboard": "Dashboard",
  "nav.hr": "HR & Workforce",
  "nav.attendance": "Attendance",
  "nav.my-hr": "My HR",
  "nav.my-tasks": "My Tasks",
  "nav.finance": "Finance",
  "nav.einvoicing": "E-Invoicing",
  "nav.procurement": "Procurement",
  "nav.projects": "Projects",
  "nav.tasks": "Tasks",
  "nav.crm": "CRM",
  "nav.documents": "Documents",
  "nav.reports": "Reports & BI",
  "nav.approvals": "Approvals",
  "nav.compliance": "Compliance Calendar",
  "nav.chat": "Chat",
  "nav.workflow": "NASEC Workflow",
  "nav.map": "Projects Map",
  "nav.ai": "AI Assistant",
  "nav.archive": "Project Archive",
  "nav.bim": "BIM Viewer",
  "nav.backup": "Backup & Restore",
  "common.signedInAs": "Signed in as",
  "common.search": "Search...",
  "common.signOut": "Sign out",
  "common.language": "Language",
  "common.save": "Save",
  "common.cancel": "Cancel",
};

const AR: Dict = {
  "nav.dashboard": "لوحة التحكم",
  "nav.hr": "الموارد البشرية",
  "nav.attendance": "الحضور",
  "nav.my-hr": "ملفي الشخصي",
  "nav.my-tasks": "مهامي",
  "nav.finance": "المالية",
  "nav.einvoicing": "الفوترة الإلكترونية",
  "nav.procurement": "المشتريات",
  "nav.projects": "المشاريع",
  "nav.tasks": "المهام",
  "nav.crm": "إدارة العملاء",
  "nav.documents": "المستندات",
  "nav.reports": "التقارير",
  "nav.approvals": "الموافقات",
  "nav.compliance": "تقويم الامتثال",
  "nav.chat": "الدردشة",
  "nav.workflow": "سير عمل ناسك",
  "nav.map": "خريطة المشاريع",
  "nav.ai": "المساعد الذكي",
  "nav.archive": "أرشيف المشاريع",
  "nav.bim": "عارض النموذج",
  "nav.backup": "النسخ الاحتياطي",
  "common.signedInAs": "مسجل الدخول كـ",
  "common.search": "بحث...",
  "common.signOut": "تسجيل الخروج",
  "common.language": "اللغة",
  "common.save": "حفظ",
  "common.cancel": "إلغاء",
};

const DICTS: Record<Lang, Dict> = { en: EN, ar: AR };

const I18nContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string }>({
  lang: "en", setLang: () => {}, t: (k) => k,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "ar" || stored === "en") return stored;
    } catch { /* noop */ }
    return "en";
  });
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    try { window.localStorage.setItem(STORAGE_KEY, lang); } catch { /* noop */ }
  }, [lang]);
  function setLang(l: Lang) { setLangState(l); }
  function t(k: string): string { return DICTS[lang][k] ?? DICTS.en[k] ?? k; }
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() { return useContext(I18nContext); }

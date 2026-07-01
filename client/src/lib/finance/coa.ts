/**
 * NASEC Chart of Accounts 2026.
 * Source: Chart of Accounts 2026 (1).doc
 */
import type { GLAccount } from "./types";

const now = new Date().toISOString();
const A = (
  code: string,
  name: string,
  type: GLAccount["type"],
  subType: GLAccount["subType"],
  extra: Partial<GLAccount> = {}
): GLAccount => ({
  id: `gl-${code}`,
  code,
  name,
  type,
  subType,
  isActive: true,
  createdAt: now,
  ...extra,
});

export const SEED_COA: GLAccount[] = [
  A("1000000", "ASSETS", "asset", "current-asset"),
  A("1100000", "CURRENT ASSETS", "asset", "current-asset", {
    parentCode: "1000000",
  }),
  A("1101000", "CASH IN HAND", "asset", "current-asset", {
    parentCode: "1100000",
    currency: "AED",
    isCash: true,
  }),
  A("1101001", "PETTY CASH ADVANCE", "asset", "current-asset", {
    parentCode: "1101000",
    currency: "AED",
    isCash: true,
  }),
  A("1101002", "CCW CASH FOR REFUND", "asset", "current-asset", {
    parentCode: "1101000",
    currency: "AED",
    isCash: true,
  }),
  A("1101003", "CASH COLLECTION", "asset", "current-asset", {
    parentCode: "1101000",
    currency: "AED",
    isCash: true,
  }),
  A("1101004", "HISTORICAL RECONSTRUCTION - CASH", "asset", "current-asset", {
    parentCode: "1101000",
    currency: "AED",
    isCash: true,
  }),
  A("1101100", "INVOICES GENERATED YEAR-2026", "asset", "current-asset", {
    parentCode: "1101000",
  }),
  A("1101101", "INVOICES - JAN.2026", "asset", "current-asset", {
    parentCode: "1101100",
  }),
  A("1101102", "INVOICES - FEB.2026", "asset", "current-asset", {
    parentCode: "1101100",
  }),
  A("1101103", "INVOICES - MAR.2026", "asset", "current-asset", {
    parentCode: "1101100",
  }),
  A("1101104", "INVOICES - APR.2026", "asset", "current-asset", {
    parentCode: "1101100",
  }),
  A("1101105", "INVOICES - MAY.2026", "asset", "current-asset", {
    parentCode: "1101100",
  }),
  A("1101106", "INVOICES - JUN.2026", "asset", "current-asset", {
    parentCode: "1101100",
  }),
  A("1101107", "INVOICES - JUL.2026", "asset", "current-asset", {
    parentCode: "1101100",
  }),
  A("1101108", "INVOICES - AUG.2026", "asset", "current-asset", {
    parentCode: "1101100",
  }),
  A("1101109", "INVOICES - SEP.2026", "asset", "current-asset", {
    parentCode: "1101100",
  }),
  A("1101110", "INVOICES - OCT.2026", "asset", "current-asset", {
    parentCode: "1101100",
  }),
  A("1101111", "INVOICES - NOV.2026", "asset", "current-asset", {
    parentCode: "1101100",
  }),
  A("1101112", "INVOICES - DEC.2026", "asset", "current-asset", {
    parentCode: "1101100",
  }),
  A("1102000", "BANKS", "asset", "current-asset", {
    parentCode: "1100000",
    currency: "AED",
    isBank: true,
  }),
  A("1102100", "COMMERCIAL BANK OF DUBAI", "asset", "current-asset", {
    parentCode: "1102000",
    currency: "AED",
    isBank: true,
  }),
  A("1102101", "CBD 1001577558", "asset", "current-asset", {
    parentCode: "1102100",
    currency: "AED",
    isBank: true,
  }),
  A("1102200", "BANK GUARANTEE", "asset", "current-asset", {
    parentCode: "1102000",
  }),
  A("1102201", "JVC PROJ BANK GUARANTEE", "asset", "current-asset", {
    parentCode: "1102200",
  }),
  A(
    "1102202",
    "WASL LABOUR CAMP R1104 BANK GUARANTEE",
    "asset",
    "current-asset",
    { parentCode: "1102200" }
  ),
  A(
    "1102203",
    "WASL SOUQ DISTRICT R1004 BANK GUARANTEE",
    "asset",
    "current-asset",
    { parentCode: "1102200" }
  ),
  A("1102300", "ABU DHABI COMMERCIAL BANK", "asset", "current-asset", {
    parentCode: "1102000",
    currency: "AED",
    isBank: true,
  }),
  A("1102301", "ADCB 14246809910001", "asset", "current-asset", {
    parentCode: "1102300",
    currency: "AED",
    isBank: true,
  }),
  A("1102302", "ADCB 14246809920001", "asset", "current-asset", {
    parentCode: "1102300",
    currency: "AED",
    isBank: true,
  }),
  A("1102400", "HISTORICAL RECONSTRUCTION - BANKS", "asset", "current-asset", {
    parentCode: "1102000",
    currency: "AED",
    isBank: true,
  }),
  A("1103000", "ACCOUNTS RECEIVABLES", "asset", "current-asset", {
    parentCode: "1100000",
    isControl: true,
  }),
  A("1103001", "CHEQUE RETURNS", "asset", "current-asset", {
    parentCode: "1103000",
  }),
  A("1103002", "RETENTION RECEIVABLE", "asset", "current-asset", {
    parentCode: "1103000",
  }),
  A("1103003", "A/R CLIENTS 2023", "asset", "current-asset", {
    parentCode: "1103000",
  }),
  A("1103004", "A/R CLIENTS 2024", "asset", "current-asset", {
    parentCode: "1103000",
  }),
  A("1103005", "OTHER RECEIVABLES", "asset", "current-asset", {
    parentCode: "1103000",
  }),
  A("1103006", "A/R CLIENTS 2025", "asset", "current-asset", {
    parentCode: "1103000",
  }),
  A("1103007", "HISTORICAL RECONSTRUCTION - A/R", "asset", "current-asset", {
    parentCode: "1103000",
  }),
  A("1104000", "STAFF LOANS", "asset", "current-asset", {
    parentCode: "1100000",
  }),
  A("1104001", "MOHD IBRAHIM", "asset", "current-asset", {
    parentCode: "1104000",
  }),
  A("1105000", "SECURITY DEPOSITS", "asset", "current-asset", {
    parentCode: "1100000",
  }),
  A("1105001", "VISA DEPOSIT", "asset", "current-asset", {
    parentCode: "1105000",
  }),
  A("1105002", "DEWA DEPOSIT", "asset", "current-asset", {
    parentCode: "1105000",
  }),
  A("1105003", "DXB MUNICIPALITY DEPOSIT", "asset", "current-asset", {
    parentCode: "1105000",
  }),
  A("1105004", "PERFORMANCE SECURITY", "asset", "current-asset", {
    parentCode: "1105000",
  }),
  A(
    "1105005",
    "HISTORICAL RECONSTRUCTION - DEPOSITS RECOVERABL",
    "asset",
    "current-asset",
    { parentCode: "1105000" }
  ),
  A(
    "1106000",
    "HISTORICAL RECONSTRUCTION - OTHER RECEIVABLES",
    "asset",
    "current-asset",
    { parentCode: "1100000" }
  ),
  A("1200000", "FIXED ASSETS", "asset", "fixed-asset", {
    parentCode: "1000000",
  }),
  A("1201000", "FURNITURE & FIXTURES", "asset", "fixed-asset", {
    parentCode: "1200000",
  }),
  A("1201001", "OFFICE FURNITURE", "asset", "fixed-asset", {
    parentCode: "1201000",
  }),
  A("1201002", "OFFICE DECORATION", "asset", "fixed-asset", {
    parentCode: "1201000",
  }),
  A("1202000", "VEHICLES", "asset", "fixed-asset", { parentCode: "1200000" }),
  A("1202001", "COMPANY OWNED VEHICLES", "asset", "fixed-asset", {
    parentCode: "1202000",
  }),
  A("1203000", "MACHINERIES & EQUIPMENTS", "asset", "fixed-asset", {
    parentCode: "1200000",
  }),
  A("1203001", "OFFICE EQUIPMENT", "asset", "fixed-asset", {
    parentCode: "1203000",
  }),
  A("1203002", "EQUIPMENTS FOR DAILY OPERATIONS", "asset", "fixed-asset", {
    parentCode: "1203000",
  }),
  A("1204000", "SOFTWARES", "asset", "fixed-asset", { parentCode: "1200000" }),
  A("1204001", "ENGINEERING SOFTWARES", "asset", "fixed-asset", {
    parentCode: "1204000",
  }),
  A("1205000", "YEARLY PREPAID EXPENSES", "asset", "fixed-asset", {
    parentCode: "1200000",
  }),
  A("1205001", "PREPAID EXPENSES Y-2026", "asset", "fixed-asset", {
    parentCode: "1205000",
  }),
  A(
    "1205002",
    "HISTORICAL RECONSTRUCTION - PREPAYMENTS",
    "asset",
    "fixed-asset",
    { parentCode: "1205000" }
  ),
  A("1206000", "PARTNERS DRAWING ACCOUNT", "asset", "fixed-asset", {
    parentCode: "1200000",
  }),
  A("1206001", "MOHD. HILAL BIN TARAF DRAWING A/C", "asset", "fixed-asset", {
    parentCode: "1206000",
  }),
  A("1207000", "LOAN TO AFFILIATES", "asset", "fixed-asset", {
    parentCode: "1200000",
  }),
  A("1207001", "NAS R/E BRANCH ACCOUNT", "asset", "fixed-asset", {
    parentCode: "1207000",
  }),
  A("1300000", "ACCUMULATED DEPRECIATION", "asset", "fixed-asset", {
    parentCode: "1000000",
  }),
  A("1301000", "ACCUM. DEP. FURNITURE & FIXTURES", "asset", "fixed-asset", {
    parentCode: "1300000",
  }),
  A("1301001", "ACCUM. DEP, OFFC FURNITURE", "asset", "fixed-asset", {
    parentCode: "1301000",
  }),
  A("1301002", "ACCUM. DEP, OFFC DECORATION", "asset", "fixed-asset", {
    parentCode: "1301000",
  }),
  A("1302000", "ACCUM. DEP. VEHICLES", "asset", "fixed-asset", {
    parentCode: "1300000",
  }),
  A("1302001", "ACCUM. DEP. CO. OWN VEHICLES", "asset", "fixed-asset", {
    parentCode: "1302000",
  }),
  A("1303000", "ACCUM. DEP. MACHINERIES & EQUIPMENTS", "asset", "fixed-asset", {
    parentCode: "1300000",
  }),
  A("1303001", "ACCUM. DEP. OFFICE EQUIPMENT", "asset", "fixed-asset", {
    parentCode: "1303000",
  }),
  A(
    "1303002",
    "ACCUM. DEP. EQUIP FOR DAILY OPERATIONS",
    "asset",
    "fixed-asset",
    { parentCode: "1303000" }
  ),
  A("1304000", "ACCUM. DEP. SOFTWARES", "asset", "fixed-asset", {
    parentCode: "1300000",
  }),
  A("1304001", "ACCUM. DEP. ENGR SOFTWARES", "asset", "fixed-asset", {
    parentCode: "1304000",
  }),
  A("2000000", "LIABILITIES", "liability", "current-liability"),
  A("2100000", "CURRENT LIABILITIES", "liability", "current-liability", {
    parentCode: "2000000",
  }),
  A("2101000", "P.D.C. PAYABLE", "liability", "current-liability", {
    parentCode: "2100000",
  }),
  A("2101001", "P.D.C. PAYABLE 2026", "liability", "current-liability", {
    parentCode: "2101000",
  }),
  A(
    "2102000",
    "SUPPLIERS / CONTRACTORS ACCOUNT",
    "liability",
    "current-liability",
    { parentCode: "2100000", isControl: true }
  ),
  A("2102001", "ICT INFORMATION SYSTEMS", "liability", "current-liability", {
    parentCode: "2102000",
  }),
  A("2102002", "ORIENT INSURANCE PJSC", "liability", "current-liability", {
    parentCode: "2102000",
  }),
  A("2102003", "SCHEDULE CONTRACTING", "liability", "current-liability", {
    parentCode: "2102000",
  }),
  A("2102004", "DEZIRE PROJECT CONSULTANT", "liability", "current-liability", {
    parentCode: "2102000",
  }),
  A("2102005", "UNION INSURANCE", "liability", "current-liability", {
    parentCode: "2102000",
  }),
  A("2102006", "AL WARQA SURVEYING", "liability", "current-liability", {
    parentCode: "2102000",
  }),
  A("2102007", "TRAKHEES (HASSAN-JVC)", "liability", "current-liability", {
    parentCode: "2102000",
  }),
  A(
    "2102008",
    "ALHAIKAL ALSALB CONTRACTING",
    "liability",
    "current-liability",
    { parentCode: "2102000" }
  ),
  A("2102009", "SUKOON INSURANCE", "liability", "current-liability", {
    parentCode: "2102000",
  }),
  A("2102010", "GLOBALTECH CONSULTANCY", "liability", "current-liability", {
    parentCode: "2102000",
  }),
  A(
    "2102011",
    "TRANSFAST ENGINEERING LABORATORY",
    "liability",
    "current-liability",
    { parentCode: "2102000" }
  ),
  A(
    "2102012",
    "STRUCTURFLEX MIDDLE EAST CONTRACTING",
    "liability",
    "current-liability",
    { parentCode: "2102000" }
  ),
  A("2102013", "ALFA MATRIX", "liability", "current-liability", {
    parentCode: "2102000",
  }),
  A(
    "2102014",
    "SAMAR KAREEM - SUBCONTRACTORS",
    "liability",
    "current-liability",
    { parentCode: "2102000" }
  ),
  A("2102015", "PAYABLE TO NAS REAL ESTATE", "liability", "current-liability", {
    parentCode: "2102000",
  }),
  A(
    "2102016",
    "JHS FINANCIAL & TAX CONSULTANT CO",
    "liability",
    "current-liability",
    { parentCode: "2102000" }
  ),
  A(
    "2102017",
    "AL WATHBA NATIONAL INSURANCE CO",
    "liability",
    "current-liability",
    { parentCode: "2102000" }
  ),
  A("2102018", "LAND ART STUDIO", "liability", "current-liability", {
    parentCode: "2102000",
  }),
  A(
    "2102019",
    "ELEVATE BUSINESS SOLUTIONS DMCC",
    "liability",
    "current-liability",
    { parentCode: "2102000", vatApplicable: true }
  ),
  A("2102020", "SPOGPRINT PORTAL LLC", "liability", "current-liability", {
    parentCode: "2102000",
  }),
  A("2102021", "LIFANG VISION", "liability", "current-liability", {
    parentCode: "2102000",
  }),
  A("2102022", "PROMARK CONSULTANTS", "liability", "current-liability", {
    parentCode: "2102000",
  }),
  A("2102023", "DEMONFOX", "liability", "current-liability", {
    parentCode: "2102000",
  }),
  A("2102024", "PAYABLE TO NAS TRAVELS", "liability", "current-liability", {
    parentCode: "2102000",
  }),
  A(
    "2102025",
    "HISTORICAL RECONSTRUCTION - A/P",
    "liability",
    "current-liability",
    { parentCode: "2102000" }
  ),
  A(
    "2102026",
    "RASHED LOOTAH CONSULTANCIES",
    "liability",
    "current-liability",
    { parentCode: "2102000" }
  ),
  A("2102027", "DAMAN INSURANCE", "liability", "current-liability", {
    parentCode: "2102000",
  }),
  A("2103000", "ADVANCE REVENUE", "liability", "current-liability", {
    parentCode: "2100000",
  }),
  A("2103001", "ADVANCE REVENUE RCV Y-2026", "liability", "current-liability", {
    parentCode: "2103000",
  }),
  A("2104000", "YEARLY PROVISIONS", "liability", "current-liability", {
    parentCode: "2100000",
  }),
  A("2104001", "PROVISION EMP. GRATUITY", "liability", "current-liability", {
    parentCode: "2104000",
  }),
  A(
    "2104002",
    "PROVISION EMP. LEAVE SALARY",
    "liability",
    "current-liability",
    { parentCode: "2104000" }
  ),
  A("2104003", "PROVISION EMP. AIR TICKETS", "liability", "current-liability", {
    parentCode: "2104000",
  }),
  A(
    "2104004",
    "PROVISION DOUBTFUL ACCOUNTS",
    "liability",
    "current-liability",
    { parentCode: "2104000" }
  ),
  A(
    "2104005",
    "PROVISION FOR CORPORATE TAX",
    "liability",
    "current-liability",
    { parentCode: "2104000" }
  ),
  A(
    "2104006",
    "HISTORICAL RECONSTRUCTION - ACCRUALS & PROVISION",
    "liability",
    "current-liability",
    { parentCode: "2104000" }
  ),
  A("2105000", "OUTSTANDING LIABLITIES", "liability", "current-liability", {
    parentCode: "2100000",
  }),
  A("2105001", "SUSPENSE ACCOUNT", "liability", "current-liability", {
    parentCode: "2105000",
  }),
  A("2105002", "COMMISSION PAYABLE", "liability", "current-liability", {
    parentCode: "2105000",
  }),
  A("2105003", "SALARIES PAYABLE", "liability", "current-liability", {
    parentCode: "2105000",
  }),
  A(
    "2200000",
    "NON-CURRENT LIABILITIES",
    "liability",
    "non-current-liability",
    { parentCode: "2000000" }
  ),
  A("2201000", "TAXATION", "liability", "non-current-liability", {
    parentCode: "2200000",
  }),
  A(
    "2201100",
    "5% OUTPUT VALUE ADDED TAX",
    "liability",
    "non-current-liability",
    { parentCode: "2201000", vatApplicable: true }
  ),
  A("2201101", "OUTPUT VAT - JAN.2026", "liability", "non-current-liability", {
    parentCode: "2201100",
    vatApplicable: true,
  }),
  A("2201102", "OUTPUT VAT - FEB.2026", "liability", "non-current-liability", {
    parentCode: "2201100",
    vatApplicable: true,
  }),
  A("2201103", "OUTPUT VAT - MAR.2026", "liability", "non-current-liability", {
    parentCode: "2201100",
    vatApplicable: true,
  }),
  A("2201104", "OUTPUT VAT - APR.2026", "liability", "non-current-liability", {
    parentCode: "2201100",
    vatApplicable: true,
  }),
  A("2201105", "OUTPUT VAT - MAY.2026", "liability", "non-current-liability", {
    parentCode: "2201100",
    vatApplicable: true,
  }),
  A("2201106", "OUTPUT VAT - JUN.2026", "liability", "non-current-liability", {
    parentCode: "2201100",
    vatApplicable: true,
  }),
  A("2201107", "OUTPUT VAT - JUL.2026", "liability", "non-current-liability", {
    parentCode: "2201100",
    vatApplicable: true,
  }),
  A("2201108", "OUTPUT VAT - AUG.2026", "liability", "non-current-liability", {
    parentCode: "2201100",
    vatApplicable: true,
  }),
  A("2201109", "OUTPUT VAT - SEP.2026", "liability", "non-current-liability", {
    parentCode: "2201100",
    vatApplicable: true,
  }),
  A("2201110", "OUTPUT VAT - OCT.2026", "liability", "non-current-liability", {
    parentCode: "2201100",
    vatApplicable: true,
  }),
  A("2201111", "OUTPUT VAT - NOV.2026", "liability", "non-current-liability", {
    parentCode: "2201100",
    vatApplicable: true,
  }),
  A("2201112", "OUTPUT VAT - DEC.2026", "liability", "non-current-liability", {
    parentCode: "2201100",
    vatApplicable: true,
  }),
  A("2201115", "OUTPUT VAT - NASEC", "liability", "non-current-liability", {
    parentCode: "2201100",
    vatApplicable: true,
  }),
  A(
    "2201200",
    "5% INPUT VALUE ADDED TAX",
    "liability",
    "non-current-liability",
    { parentCode: "2201000", vatApplicable: true }
  ),
  A("2201201", "INPUT VAT - JAN.2026", "liability", "non-current-liability", {
    parentCode: "2201200",
    vatApplicable: true,
  }),
  A("2201202", "INPUT VAT - FEB.2026", "liability", "non-current-liability", {
    parentCode: "2201200",
    vatApplicable: true,
  }),
  A("2201203", "INPUT VAT - MAR.2026", "liability", "non-current-liability", {
    parentCode: "2201200",
    vatApplicable: true,
  }),
  A("2201204", "INPUT VAT - APR.2026", "liability", "non-current-liability", {
    parentCode: "2201200",
    vatApplicable: true,
  }),
  A("2201205", "INPUT VAT - MAY.2026", "liability", "non-current-liability", {
    parentCode: "2201200",
    vatApplicable: true,
  }),
  A("2201206", "INPUT VAT - JUN.2026", "liability", "non-current-liability", {
    parentCode: "2201200",
    vatApplicable: true,
  }),
  A("2201207", "INPUT VAT - JUL.2026", "liability", "non-current-liability", {
    parentCode: "2201200",
    vatApplicable: true,
  }),
  A("2201208", "INPUT VAT - AUG.2026", "liability", "non-current-liability", {
    parentCode: "2201200",
    vatApplicable: true,
  }),
  A("2201209", "INPUT VAT - SEP.2026", "liability", "non-current-liability", {
    parentCode: "2201200",
    vatApplicable: true,
  }),
  A("2201210", "INPUT VAT - OCT.2026", "liability", "non-current-liability", {
    parentCode: "2201200",
    vatApplicable: true,
  }),
  A("2201211", "INPUT VAT - NOV.2026", "liability", "non-current-liability", {
    parentCode: "2201200",
    vatApplicable: true,
  }),
  A("2201212", "INPUT VAT - DEC.2026", "liability", "non-current-liability", {
    parentCode: "2201200",
    vatApplicable: true,
  }),
  A("2201215", "INPUT VAT - NASEC", "liability", "non-current-liability", {
    parentCode: "2201200",
    vatApplicable: true,
  }),
  A("3000000", "OWNERS EQUITY", "equity", "equity"),
  A("3100000", "CAPITAL ACCOUNT", "equity", "equity", {
    parentCode: "3000000",
  }),
  A("3101000", "CAPITAL PROVIDED BY MOHD HELAL", "equity", "equity", {
    parentCode: "3100000",
  }),
  A("3200000", "RETAINED EARNINGS", "equity", "retained-earnings", {
    parentCode: "3000000",
  }),
  A("3201000", "PROFIT & LOSS A/C", "equity", "retained-earnings", {
    parentCode: "3200000",
  }),
  A("3202000", "PRIOR YEAR ADJUSTMENT ACCOUNT", "equity", "retained-earnings", {
    parentCode: "3200000",
  }),
  A(
    "3203000",
    "PARTNERS CURRENT ACCOUNT - HILAL",
    "equity",
    "retained-earnings",
    { parentCode: "3200000" }
  ),
  A(
    "3204000",
    "PARTNERS CURRENT ACCOUNT - ELMEZYEN",
    "equity",
    "retained-earnings",
    { parentCode: "3200000" }
  ),
  A("4000000", "REVENUES", "income", "revenue"),
  A("4100000", "GENERAL OPERATING REVENUES", "income", "revenue", {
    parentCode: "4000000",
  }),
  A("4101000", "BASIC OPERATING REVENUES", "income", "revenue", {
    parentCode: "4100000",
    vatApplicable: true,
  }),
  A("4101001", "DESIGN REVENUE", "income", "revenue", {
    parentCode: "4101000",
    vatApplicable: true,
  }),
  A("4101002", "SUPERVISION REVENUE", "income", "revenue", {
    parentCode: "4101000",
    vatApplicable: true,
  }),
  A("4101003", "TENDER REVENUE", "income", "revenue", {
    parentCode: "4101000",
    vatApplicable: true,
  }),
  A("4101004", "PROF SERVICE RENDERED", "income", "revenue", {
    parentCode: "4101000",
    vatApplicable: true,
  }),
  A("4102000", "OTHER REVENUES", "income", "other-income", {
    parentCode: "4100000",
  }),
  A("5000000", "EXPENSES", "expense", "operating-expense"),
  A("5100000", "GENERAL OPERATION EXPENSES", "expense", "operating-expense", {
    parentCode: "5000000",
  }),
  A("5101000", "OPERATION EXPENSES", "expense", "cogs", {
    parentCode: "5100000",
  }),
  A("5101001", "DXB MUNICIPALITY FEES", "expense", "cogs", {
    parentCode: "5101000",
  }),
  A("5101002", "LAND DEPT FEES", "expense", "cogs", { parentCode: "5101000" }),
  A("5101003", "SOIL SURVEY & TESTING FEES", "expense", "cogs", {
    parentCode: "5101000",
  }),
  A("5101004", "INSURANCE EXPENSE", "expense", "cogs", {
    parentCode: "5101000",
  }),
  A("5101005", "PROFESSIONAL FEES & STUDIES", "expense", "cogs", {
    parentCode: "5101000",
  }),
  A("5101006", "LEGAL FEES EXP.", "expense", "cogs", { parentCode: "5101000" }),
  A("5101007", "OUTSOURCE PROF. FEES", "expense", "cogs", {
    parentCode: "5101000",
  }),
  A("5101008", "EGYPT OFFICE EXP.", "expense", "cogs", {
    parentCode: "5101000",
  }),
  A("5101009", "COMMISSION EXPENSE", "expense", "cogs", {
    parentCode: "5101000",
  }),
  A("5102000", "ADMINISTRATIVE EXPENSES", "expense", "admin-expense", {
    parentCode: "5100000",
  }),
  A("5102001", "RENT,SERVICE CHRG,RERA", "expense", "admin-expense", {
    parentCode: "5102000",
  }),
  A("5102002", "DEWA EXPENSES", "expense", "admin-expense", {
    parentCode: "5102000",
  }),
  A("5102003", "TELEPHONE & INTERNET", "expense", "admin-expense", {
    parentCode: "5102000",
  }),
  A("5102004", "PETROL EXPENSES", "expense", "admin-expense", {
    parentCode: "5102000",
  }),
  A(
    "5102005",
    "PARKING, TRANSPO & SALIK EXPENSES",
    "expense",
    "admin-expense",
    { parentCode: "5102000" }
  ),
  A("5102006", "VEHICLE REPAIRS & MAINTENANCE", "expense", "admin-expense", {
    parentCode: "5102000",
  }),
  A("5102007", "GOVT RELATED EXPENSES", "expense", "admin-expense", {
    parentCode: "5102000",
  }),
  A("5102008", "PRINTING & STATIONARY", "expense", "admin-expense", {
    parentCode: "5102000",
  }),
  A("5102009", "COMPUTER EXPENSES", "expense", "admin-expense", {
    parentCode: "5102000",
  }),
  A("5102010", "ADS & MARKETING EXPENSES", "expense", "operating-expense", {
    parentCode: "5102000",
  }),
  A("5102011", "OFFICE SUPPLIES", "expense", "operating-expense", {
    parentCode: "5102000",
  }),
  A("5102012", "REPAIRS & MAINTENANCE EXP", "expense", "operating-expense", {
    parentCode: "5102000",
  }),
  A("5102013", "BANK CHARGES", "expense", "finance-expense", {
    parentCode: "5102000",
  }),
  A("5102014", "AUDIT FEES", "expense", "operating-expense", {
    parentCode: "5102000",
  }),
  A("5102015", "MISCELLANEOUS EXP.", "expense", "operating-expense", {
    parentCode: "5102000",
  }),
  A("5102016", "BAD DEBTS EXPENSE", "expense", "operating-expense", {
    parentCode: "5102000",
  }),
  A("5102017", "DONATION EXP.", "expense", "operating-expense", {
    parentCode: "5102000",
  }),
  A("5102018", "DEPRECIATION EXPENSE", "expense", "operating-expense", {
    parentCode: "5102000",
  }),
  A("5102019", "TRAVEL EXPENSES", "expense", "operating-expense", {
    parentCode: "5102000",
  }),
  A("5102020", "SUBSCRIPTION EXPENSE", "expense", "operating-expense", {
    parentCode: "5102000",
  }),
  A("5102021", "IT FEES", "expense", "operating-expense", {
    parentCode: "5102000",
  }),
  A("5102022", "CORPORATE TAX EXPENSE", "expense", "operating-expense", {
    parentCode: "5102000",
  }),
  A("5103000", "EMPLOYEES EXPENSE", "expense", "operating-expense", {
    parentCode: "5100000",
  }),
  A("5103001", "SALARIES & WAGES", "expense", "operating-expense", {
    parentCode: "5103000",
  }),
  A("5103002", "LEAVE W/ WAGES", "expense", "operating-expense", {
    parentCode: "5103000",
  }),
  A("5103004", "AIR TICKET EXPENSE", "expense", "operating-expense", {
    parentCode: "5103000",
  }),
  A("5103005", "GRATUITY EXPENSE", "expense", "operating-expense", {
    parentCode: "5103000",
  }),
  A("5103006", "BONUS & INCENTIVES", "expense", "operating-expense", {
    parentCode: "5103000",
  }),
  A("5103007", "STAFF MEDICAL INSURANCE EXP", "expense", "operating-expense", {
    parentCode: "5103000",
  }),
  A("5103008", "LABOUR & IMMIGRATION", "expense", "operating-expense", {
    parentCode: "5103000",
  }),
  A("5103003", "PENSION EXPENSE", "expense", "operating-expense", {
    parentCode: "5103000",
  }),
];

export function accountByCode(
  code: string,
  accounts: GLAccount[] = SEED_COA
): GLAccount | undefined {
  return accounts.find(a => a.code === code);
}

export function accountsByType(
  type: GLAccount["type"],
  accounts: GLAccount[] = SEED_COA
): GLAccount[] {
  return accounts.filter(a => a.type === type);
}

export function expenseAccounts(accounts: GLAccount[] = SEED_COA): GLAccount[] {
  return accounts.filter(a => a.type === "expense");
}

export function revenueAccounts(accounts: GLAccount[] = SEED_COA): GLAccount[] {
  return accounts.filter(a => a.type === "income");
}

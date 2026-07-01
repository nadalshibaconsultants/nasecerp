# Team Tab Testing Notes - 2026-05-08

## Verification Results

### Pre-Contract Team Tab (Al Wasl Tower)
- ✅ Header shows "Design Team — Role Structure" with "NASEC-aligned role slots · Auto-assignment engine active"
- ✅ KPI cards show: Total Slots 13, Filled 13, Vacant 0, Fill Rate 100%
- ✅ Core Roles group (amber icon, 5/5 filled): PM, LA, LSE, LME, LQS
  - Each shows role code, title, stage range, allocation %, assigned employee with avatar, grade, department, workload bar
  - Method column shows "Auto-assigned" with lightning bolt icon
- ✅ Support Roles group (blue icon, 4/4 filled): LLA, SC, DC, INT
  - Method shows "PM assigned" with shield icon
- ✅ Junior Staff group (purple icon, 4/4 filled): JA1, JA2, JSE, JME
  - Method shows "Lead delegated" with users icon
- ✅ External Consultants section shows Buro Happold, Atelier Ten, Dubai Holding
- ✅ Delegate Mode button works (shows toast)
- ✅ Auto-Fill Vacancies button present
- ✅ Collapsible groups (click to expand/collapse)

### Acceptance Criteria Met
1. ✅ 3 groups visible: Core (auto), Support (manual), Junior (lead-delegated)
2. ✅ Each slot shows: code, title, stage range, allocation, assigned person, workload, method
3. ✅ Vacant slots show "Assign" button (tested on Dubai Creek project which has vacancies)
4. ✅ Assignment dialog shows recommended candidates with scoring
5. ✅ Post-Contract projects still show the old table format (verified on Marina Heights)

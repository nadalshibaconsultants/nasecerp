/**
 * Geofence-based site attendance — types.
 *
 * Each construction site / Pre-Contract office has an associated geofence
 * (center coordinate + radius). Mobile-app punches record:
 *   - employee, project, timestamp
 *   - GPS coordinates and accuracy
 *   - whether they passed the geofence check
 *   - any manual-override approval (PM-approved)
 *
 * Punches aggregate per-employee per-day into AttendanceDay records,
 * which feed payroll, project labor cost, and reporting.
 */

export type Geofence = {
  id: string;          // = projectId
  projectId: string;
  name: string;
  center: { lat: number; lng: number };
  radiusM: number;
  createdAt: string;
  updatedAt: string;
};

export type GeofenceCheck =
  | "passed"            // GPS inside geofence within accuracy
  | "failed-out"        // GPS clearly outside geofence
  | "failed-no-gps"     // device GPS disabled
  | "manual-override"   // PM approved offline punch
  | "office";           // office punch (no geofence)

export type PunchType = "in" | "out";

export type AttendancePunch = {
  id: string;
  employeeId: string;
  projectId?: string;        // undefined => office punch
  timestamp: string;          // ISO with time
  type: PunchType;
  gpsLat?: number;
  gpsLng?: number;
  accuracyM?: number;
  geofenceId?: string | null; // geofence used for the punch (server-side check)
  geofenceCheck: GeofenceCheck;
  approvedByEmployeeId?: string; // when manual-override
  note?: string;
  device?: "mobile-app" | "web-simulator" | "biometric-office";
};

// Status of a calendar day for an employee
export type DayStatus =
  | "present"        // any in-out window present
  | "absent"         // no punch and not weekend/holiday/leave
  | "leave"          // approved leave
  | "weekend"
  | "holiday"
  | "partial";       // punch in but no punch out (or vice versa)

export type AttendanceDay = {
  employeeId: string;
  date: string;             // YYYY-MM-DD
  projectId?: string;        // primary project of the day (longest stay)
  firstIn?: string;          // ISO
  lastOut?: string;          // ISO
  totalMinutes: number;     // total time on site (in minus out)
  normalMinutes: number;     // capped at 480 (8h)
  overtimeMinutes: number;   // anything over 480
  status: DayStatus;
  punchCount: number;
  flags: ("late" | "out-of-geofence" | "missing-out" | "ot-unapproved")[];
};

// Leave request — minimal model so absences are tracked correctly
export type LeaveRequest = {
  id: string;
  employeeId: string;
  type: "annual" | "sick" | "maternity" | "paternity" | "unpaid" | "compassionate" | "permission";
  /** Temporary permission only: duration in decimal hours (max 3) */
  hours?: number;
  /** Temporary permission window (within the 08:50–18:30 working day) */
  startTime?: string;
  endTime?: string;
  /** Back-on-duty date — the day the employee resumes work after the leave */
  effectiveDate?: string;
  fromDate: string;
  toDate: string;
  status: "submitted" | "approved" | "rejected";
  approvedBy?: string;
  note?: string;
  createdAt: string;
};

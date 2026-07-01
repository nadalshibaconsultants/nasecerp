# Contractor Portal — Implementation Checklist

## Portal Pages
- [ ] Contractor Login page (distinct from internal ERP)
- [ ] Contractor Dashboard (project picker, open submittals, SLA clocks, stats)
- [ ] Submittal Creation Wizard (discipline → type → form fields → auto-number)
- [ ] Submittal Detail/Status page (revision history, response workflow)
- [ ] Issued by Consultant inbox (NCR, SI, PC items from consultant)
- [ ] Drawings issued to contractor (read-only, watermarked)

## Auto-Routing Engine
- [ ] Routing Rules Matrix (Discipline × Type → Primary Reviewer + Approver + Watchers)
- [ ] Only Site (S-prefix) roles: SA, SS, SM, SE, SC, RE, BIM Coordinator, HSE Officer, PM, CM
- [ ] SLA timers with UAE working-day calculation (Mon-Fri, skip public holidays)
- [ ] Escalation logic (green → yellow → red)
- [ ] Override capability for PM with audit log

## Response Workflow
- [ ] Approved / Approved with Comments / Resubmit / Rejected / Need More Info
- [ ] Revision tracking (auto-increment on resubmit)
- [ ] SLA pause on "Need More Info"

## PM / Admin Features
- [ ] "Contractor Access" tab in Post-Contract projects ONLY
- [ ] Tab must NOT appear in Pre-Contract, Pipeline, or Completed projects
- [ ] Invite Contractor flow (company name, trade license, email, type, trades)
- [ ] Contractor Portal Settings (routing matrix, SLAs, permissions, watermark, holidays)

## Integration with Internal ERP
- [ ] Submittals auto-appear in Post-Contract project submittal logs
- [ ] "From Contractor Portal" source flag
- [ ] Site role badges on reviewers (SA, SS, SM, SE, SC, etc.)
- [ ] Project Chat notification on new contractor submittal

## Security & Access Control
- [ ] Contractor users see ONLY assigned Post-Contract projects
- [ ] Pre-Contract projects NEVER visible to contractors
- [ ] Audit log for all contractor actions
- [ ] Watermark on downloaded documents

## Demo Data
- [ ] Marina Heights Tower Post-Contract project with Site team assigned
- [ ] 1 Main Contractor (ABC Construction LLC) with 2 users
- [ ] 2 Sub-Contractors (1 MEP, 1 Façade) with 1 user each
- [ ] 8 demo submittals across types/disciplines showing auto-routing
- [ ] Multiple statuses: approved, approved with comments, resubmit required

## Acceptance Tests
- [ ] Pre-Contract project: NO "Contractor Access" tab
- [ ] Post-Contract project: "Contractor Access" tab present
- [ ] Contractor login → only Post-Contract projects visible
- [ ] MEP RFI → auto-routes to SM (Site Mechanical Engineer)
- [ ] PTW → routes to discipline engineer + HSE Officer
- [ ] EOT → routes to PM primary, CM consulted
- [ ] Façade SD → routes to SA + SS jointly
- [ ] Routing matrix admin shows ONLY Site role codes
- [ ] No internal data visible from contractor portal

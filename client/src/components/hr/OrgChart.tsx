import { useMemo } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, MapPin, Network, Users } from "lucide-react";
import { employeesStore } from "@/lib/stores";
import { useCollection } from "@/lib/store";
import type { Employee } from "@/lib/hr/types";

type ChartNode = {
  id: string;
  kind: "company" | "office" | "department" | "employee";
  title: string;
  subtitle?: string;
  count?: number;
  employee?: Employee;
  children: ChartNode[];
};

export default function OrgChart() {
  const employees = useCollection(employeesStore);
  const tree = useMemo(() => buildTree(employees), [employees]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <Network className="w-4 h-4" />
          Organisation Chart
        </h3>
        <Badge variant="outline" className="gap-1.5">
          <Users className="h-3.5 w-3.5" />
          {employees.length} employees
        </Badge>
      </div>

      <Card>
        <CardContent className="p-3 sm:p-4">
          {tree.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No employees available.</div>
          ) : (
            <div className="org-sheet">
              {tree.map((node) => (
                <TopDownNode key={node.id} node={node} depth={0} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function buildTree(employees: Employee[]): ChartNode[] {
  if (employees.length === 0) return [];

  const byId = new Map(employees.map((employee) => [employee.id, employee]));
  const hasManagerLinks = employees.some((employee) => employee.managerEmployeeId && byId.has(employee.managerEmployeeId));

  if (hasManagerLinks) {
    const childrenOf = new Map<string | undefined, Employee[]>();
    for (const employee of sortEmployees(employees)) {
      const managerId = employee.managerEmployeeId && byId.has(employee.managerEmployeeId) ? employee.managerEmployeeId : undefined;
      const children = childrenOf.get(managerId) || [];
      children.push(employee);
      childrenOf.set(managerId, children);
    }

    const buildEmployeeNode = (employee: Employee): ChartNode => ({
      id: employee.id,
      kind: "employee",
      title: fullName(employee),
      subtitle: `${employee.jobTitle} · ${employee.department}`,
      employee,
      children: (childrenOf.get(employee.id) || []).map(buildEmployeeNode),
    });

    return [{
      id: "company-root",
      kind: "company",
      title: "NASEC",
      subtitle: "Organisation hierarchy",
      count: employees.length,
      children: (childrenOf.get(undefined) || []).map(buildEmployeeNode),
    }];
  }

  const offices = groupBy(employees, (employee) => employee.office);
  return [{
    id: "company-root",
    kind: "company",
    title: "NASEC",
    subtitle: "Dubai and Cairo teams",
    count: employees.length,
    children: Array.from(offices.entries())
      .sort(([a], [b]) => officeLabel(a).localeCompare(officeLabel(b)))
      .map(([office, officeEmployees]) => {
        const departments = groupBy(officeEmployees, (employee) => employee.department);
        return {
          id: `office-${office}`,
          kind: "office",
          title: officeLabel(office),
          subtitle: "Office",
          count: officeEmployees.length,
          children: Array.from(departments.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([department, departmentEmployees]) => ({
              id: `department-${office}-${department}`,
              kind: "department",
              title: department,
              subtitle: "Department",
              count: departmentEmployees.length,
              children: sortEmployees(departmentEmployees).map((employee) => ({
                id: employee.id,
                kind: "employee",
                title: fullName(employee),
                subtitle: employee.jobTitle,
                employee,
                children: [],
              })),
            })),
        };
      }),
  }];
}

function TopDownNode({ node, depth }: { node: ChartNode; depth: number }) {
  if (node.kind === "department") return <DepartmentNode node={node} />;

  return (
    <div className="org-branch">
      <OrgNode node={node} compact={depth > 1} />
      {node.children.length > 0 && (
        <>
          <div className="org-vertical-line" />
          <div className={`org-level org-level-${node.children[0]?.kind || "employee"}`}>
            {node.children.map((child) => (
              <TopDownNode key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DepartmentNode({ node }: { node: ChartNode }) {
  return (
    <section className="org-department-card">
      <OrgNode node={node} compact />
      <div className="org-vertical-line org-vertical-line-sm" />
      <div className="org-people-grid">
        {node.children.map((child) => child.employee ? (
          <EmployeeChip key={child.id} employee={child.employee} subtitle={child.subtitle} />
        ) : (
          <TopDownNode key={child.id} node={child} depth={3} />
        ))}
      </div>
    </section>
  );
}

function OrgNode({ node, compact = false }: { node: ChartNode; compact?: boolean }) {
  if (node.kind === "employee" && node.employee) {
    if (compact) return <EmployeeChip employee={node.employee} subtitle={node.subtitle} />;

    return (
      <div className="org-node org-node-employee">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-slate-100 text-[11px] text-slate-700">
            {initials(node.employee)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 text-left">
          <div className="truncate text-sm font-semibold text-slate-900">{node.title}</div>
          <div className="truncate text-[11px] text-slate-500">{node.subtitle}</div>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-slate-400">
            <span>{node.employee.code}</span>
            <span>·</span>
            <span>{node.employee.status}</span>
          </div>
        </div>
      </div>
    );
  }

  const Icon = node.kind === "company" ? Building2 : node.kind === "office" ? MapPin : Users;

  return (
    <div className={`org-node org-node-${node.kind} ${compact ? "org-node-compact" : ""}`}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/80 ring-1 ring-black/5">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 text-left">
        <div className="truncate text-xs font-semibold">{node.title}</div>
        <div className="text-[10px] opacity-75">
          {node.subtitle}
          {typeof node.count === "number" ? ` · ${node.count}` : ""}
        </div>
      </div>
    </div>
  );
}

function EmployeeChip({ employee, subtitle }: { employee: Employee; subtitle?: string }) {
  return (
    <div className="org-person-chip">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback className="bg-slate-100 text-[10px] text-slate-700">
          {initials(employee)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="truncate text-[11px] font-semibold text-slate-900">{fullName(employee)}</div>
        <div className="truncate text-[10px] text-slate-500">{subtitle || employee.jobTitle}</div>
      </div>
    </div>
  );
}

function groupBy<T, K extends string>(items: T[], keyFor: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFor(item);
    const values = groups.get(key) || [];
    values.push(item);
    groups.set(key, values);
  }
  return groups;
}

function sortEmployees(employees: Employee[]): Employee[] {
  return [...employees].sort((a, b) => {
    const department = a.department.localeCompare(b.department);
    if (department !== 0) return department;
    return fullName(a).localeCompare(fullName(b));
  });
}

function fullName(employee: Employee): string {
  return `${employee.firstName} ${employee.lastName}`;
}

function initials(employee: Employee): string {
  return `${employee.firstName[0] || ""}${employee.lastName[0] || ""}`.toUpperCase();
}

function officeLabel(office: Employee["office"]): string {
  return office === "dubai" ? "Dubai Office" : "Cairo Office";
}

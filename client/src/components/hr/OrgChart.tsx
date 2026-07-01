import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Network } from "lucide-react";
import { employeesStore } from "@/lib/stores";
import { useCollection } from "@/lib/store";
import type { Employee } from "@/lib/hr/types";

export default function OrgChart() {
  const employees = useCollection(employeesStore);
  const tree = useMemo(() => buildTree(employees), [employees]);

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold flex items-center gap-2"><Network className="w-4 h-4" /> Organisation Chart</h3>
      <Card>
        <CardContent className="p-6 overflow-auto">
          <div className="space-y-2">
            {tree.map((node) => <Node key={node.id} node={node} depth={0} />)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

type N = { id: string; emp: Employee; children: N[] };

function buildTree(employees: Employee[]): N[] {
  const byId = new Map(employees.map((e) => [e.id, e]));
  const childrenOf = new Map<string | undefined, Employee[]>();
  for (const e of employees) {
    const k = e.managerEmployeeId;
    if (!childrenOf.has(k)) childrenOf.set(k, []);
    childrenOf.get(k)!.push(e);
  }
  function build(emp: Employee): N {
    return { id: emp.id, emp, children: (childrenOf.get(emp.id) || []).map(build) };
  }
  // Roots = employees with no manager OR manager not in list
  const roots = employees.filter((e) => !e.managerEmployeeId || !byId.has(e.managerEmployeeId));
  // Order by department for nicer output
  return roots.sort((a, b) => a.department.localeCompare(b.department)).map(build);
}

function Node({ node, depth }: { node: N; depth: number }) {
  return (
    <div style={{ marginLeft: depth * 24 }} className="border-l-2 border-slate-200 pl-3">
      <div className="flex items-center gap-2 py-1">
        <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{node.emp.firstName[0]}{node.emp.lastName[0]}</AvatarFallback></Avatar>
        <div>
          <div className="text-sm font-medium">{node.emp.firstName} {node.emp.lastName}</div>
          <div className="text-[10px] text-slate-500">{node.emp.jobTitle} · {node.emp.department}</div>
        </div>
      </div>
      {node.children.length > 0 && <div className="space-y-1">{node.children.map((c) => <Node key={c.id} node={c} depth={depth + 1} />)}</div>}
    </div>
  );
}

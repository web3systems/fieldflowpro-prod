import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function LeadAssigneeSelect({ companyId, value, onChange, members, className, placeholder = "Unassigned" }) {
  const [local, setLocal] = useState([]);
  const list = members || local;

  useEffect(() => {
    if (members || !companyId) return;
    base44.functions.invoke("getCompanyTeam", { company_id: companyId })
      .then(res => setLocal(res.data?.team || []))
      .catch(() => setLocal([]));
  }, [companyId, members]);

  return (
    <Select value={value || "unassigned"} onValueChange={v => onChange(v === "unassigned" ? "" : v)}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {list.map(m => {
          const key = m.user_id || m.user_email;
          if (!key) return null;
          return (
            <SelectItem key={key} value={key}>
              {m.user_name || m.user_email}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
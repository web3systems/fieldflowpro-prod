import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Building2, Users, Briefcase, CheckCircle, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function OnboardingBanner({ company, customers, jobs }) {
  const steps = [
    {
      done: !!(company?.phone && company?.email),
      label: "Complete company profile",
      desc: "Add phone, email & address",
      page: "Settings",
      icon: Building2,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      done: customers.length > 0,
      label: "Add your first customer",
      desc: "Start building your client list",
      page: "Customers",
      icon: Users,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      done: jobs.length > 0,
      label: "Create your first job",
      desc: "Schedule a service call",
      page: "Jobs",
      icon: Briefcase,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
  ];

  const completed = steps.filter(s => s.done).length;
  if (completed === steps.length) return null;

  return (
    <Card className="border-0 shadow-sm border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50/60 to-indigo-50/40">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Getting Started</h3>
            <p className="text-xs text-slate-500">{completed} of {steps.length} steps complete</p>
          </div>
          <div className="flex items-center gap-1.5">
            {steps.map((s, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-colors ${s.done ? "bg-blue-500" : "bg-slate-200"}`} />
            ))}
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-2">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <Link
                key={i}
                to={createPageUrl(step.page)}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  step.done
                    ? "bg-white/50 pointer-events-none"
                    : "bg-white hover:shadow-sm hover:bg-white"
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  step.done ? "bg-green-100" : step.bg
                }`}>
                  {step.done
                    ? <CheckCircle className="w-5 h-5 text-green-600" />
                    : <Icon className={`w-5 h-5 ${step.color}`} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${step.done ? "text-slate-400 line-through" : "text-slate-700"}`}>
                    {step.label}
                  </p>
                  {!step.done && (
                    <p className="text-xs text-slate-400 truncate">{step.desc}</p>
                  )}
                </div>
                {!step.done && <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
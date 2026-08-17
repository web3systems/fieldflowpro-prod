import { ChevronDown, Save, Mail, MessageSquare, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

// Save button with a dropdown for Send as Email / Send as Text / Collect Payment.
export default function InvoiceSaveDropdown({ onSave, disabled, saving }) {
  return (
    <div className="flex gap-2">
      <Button onClick={() => onSave("save")} disabled={disabled || saving} className="gap-1.5">
        {saving ? <><Save className="w-4 h-4 animate-pulse" />Saving...</> : <><Save className="w-4 h-4" />Save</>}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={disabled || saving} className="px-2">
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => onSave("email")} className="gap-2">
            <Mail className="w-4 h-4 text-blue-600" /> Save & Send as Email
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSave("sms")} className="gap-2">
            <MessageSquare className="w-4 h-4 text-blue-600" /> Save & Send as Text
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onSave("collect")} className="gap-2">
            <CreditCard className="w-4 h-4 text-blue-600" /> Save & Collect Payment
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
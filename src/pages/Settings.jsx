import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { Settings, Save, Building2, User, Link, Copy, Code2, Bell, MessageSquare, CheckCircle, CreditCard } from "lucide-react";
import StripeConnectCard from "../components/settings/StripeConnectCard";
import { Switch } from "@/components/ui/switch";
import BookingEmbedModal from "../components/booking/BookingEmbedModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
  const { activeCompany, refreshCompanies } = useApp();
  const [user, setUser] = useState(null);
  const [companyForm, setCompanyForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [userPrefs, setUserPrefs] = useState({ sms_consent: false, marketing_consent: false, notifications_enabled: true, phone: "" });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savedPrefs, setSavedPrefs] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (activeCompany) {
      setCompanyForm({ ...activeCompany });
    }
  }, [activeCompany]);

  async function loadUser() {
    const u = await base44.auth.me();
    setUser(u);
    setUserPrefs({
      sms_consent: u?.sms_consent ?? false,
      marketing_consent: u?.marketing_consent ?? false,
      notifications_enabled: u?.notifications_enabled ?? true,
      phone: u?.phone || "",
    });
  }

  async function saveUserPrefs() {
    setSavingPrefs(true);
    await base44.auth.updateMe(userPrefs);
    setSavingPrefs(false);
    setSavedPrefs(true);
    setTimeout(() => setSavedPrefs(false), 2500);
  }

  async function saveCompany() {
    setSaving(true);
    await base44.entities.Company.update(activeCompany.id, companyForm);
    await refreshCompanies();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-4 md:p-6 pb-24 lg:pb-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your account and company settings</p>
      </div>

      <Tabs defaultValue="company">
        <TabsList className="mb-6">
          <TabsTrigger value="company" className="gap-2">
            <Building2 className="w-4 h-4" /> Company
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-2">
            <User className="w-4 h-4" /> Account
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="w-4 h-4" /> Payments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          {activeCompany ? (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Company Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Company Name</Label>
                    <Input value={companyForm.name || ""} onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={companyForm.phone || ""} onChange={e => setCompanyForm({ ...companyForm, phone: e.target.value })} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={companyForm.email || ""} onChange={e => setCompanyForm({ ...companyForm, email: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <Label>Address</Label>
                    <Input value={companyForm.address || ""} onChange={e => setCompanyForm({ ...companyForm, address: e.target.value })} />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input value={companyForm.city || ""} onChange={e => setCompanyForm({ ...companyForm, city: e.target.value })} />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input value={companyForm.state || ""} onChange={e => setCompanyForm({ ...companyForm, state: e.target.value })} maxLength={2} />
                  </div>
                  <div>
                    <Label>ZIP Code</Label>
                    <Input value={companyForm.zip || ""} onChange={e => setCompanyForm({ ...companyForm, zip: e.target.value })} />
                  </div>
                  <div>
                   <Label>Website</Label>
                   <Input value={companyForm.website || ""} onChange={e => setCompanyForm({ ...companyForm, website: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                   <Label>Google / Yelp Review URL</Label>
                   <Input value={companyForm.google_review_url || ""} onChange={e => setCompanyForm({ ...companyForm, google_review_url: e.target.value })} placeholder="https://g.page/r/..." />
                   <p className="text-xs text-slate-400 mt-1">Used when sending review requests to customers after completed jobs.</p>
                  </div>
                  <div>
                    <Label>Default Tax Rate (%)</Label>
                    <Input type="number" min="0" max="100" step="0.1" value={companyForm.default_tax_rate ?? ""} onChange={e => setCompanyForm({ ...companyForm, default_tax_rate: parseFloat(e.target.value) || 0 })} placeholder="0" />
                  </div>
                  <div>
                    <Label>Industry</Label>
                    <Select value={companyForm.industry || ""} onValueChange={v => setCompanyForm({ ...companyForm, industry: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["cleaning", "landscaping", "handyman", "painting", "plumbing", "electrical", "hvac", "other"].map(i => (
                          <SelectItem key={i} value={i} className="capitalize">{i}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <p className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Link className="w-4 h-4" /> Customer Booking Link</p>
                  <p className="text-xs text-slate-500">Share this URL with customers so they can book services online.</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 truncate">
                      {window.location.origin}/Booking?company_id={activeCompany?.id}
                    </code>
                    <Button size="sm" variant="outline" className="gap-1.5 flex-shrink-0" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/Booking?company_id=${activeCompany?.id}`); }}>
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </Button>
                  </div>
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => setEmbedOpen(true)}>
                    <Code2 className="w-4 h-4" /> Get Website Embed Code
                  </Button>
                </div>
                <BookingEmbedModal open={embedOpen} onClose={() => setEmbedOpen(false)} company={activeCompany} />
                <div className="pt-2">
                  <Button onClick={saveCompany} disabled={saving} className="gap-2 bg-blue-600 hover:bg-blue-700">
                    <Save className="w-4 h-4" />
                    {saved ? "Saved!" : saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-8 text-center text-slate-400">
                No company selected.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="account">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Your Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                  {user?.full_name?.[0] || "U"}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{user?.full_name}</p>
                  <p className="text-sm text-slate-500">{user?.email}</p>
                  <p className="text-xs text-blue-600 font-medium capitalize mt-0.5">{user?.role?.replace("_", " ")}</p>
                </div>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm text-amber-700 font-medium">Profile Management</p>
                <p className="text-xs text-amber-600 mt-1">To update your name, email, or password, please use the platform settings.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4" />Communication Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-1 block">Phone number (for SMS)</Label>
                <Input
                  value={userPrefs.phone}
                  onChange={e => setUserPrefs(p => ({ ...p, phone: e.target.value }))}
                  placeholder="(555) 555-5555"
                  type="tel"
                />
              </div>

              <div className="space-y-3 divide-y divide-slate-100">
                {[
                  {
                    key: "notifications_enabled",
                    label: "Notifications enabled",
                    description: "Receive in-app and email notifications from this platform",
                    icon: Bell,
                  },
                  {
                    key: "sms_consent",
                    label: "SMS notifications",
                    description: "Receive job updates and reminders via text message",
                    icon: MessageSquare,
                  },
                  {
                    key: "marketing_consent",
                    label: "Marketing communications",
                    description: "Receive product updates, tips, and promotional content",
                    icon: MessageSquare,
                  },
                ].map(({ key, label, description, icon: Icon }) => (
                  <div key={key} className="flex items-center justify-between py-3 first:pt-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-slate-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{label}</p>
                        <p className="text-xs text-slate-400">{description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${userPrefs[key] ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                        {userPrefs[key] ? "Opted-in" : "Opted-out"}
                      </span>
                      <Switch
                        checked={!!userPrefs[key]}
                        onCheckedChange={v => setUserPrefs(p => ({ ...p, [key]: v }))}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Button onClick={saveUserPrefs} disabled={savingPrefs} className="gap-2 bg-blue-600 hover:bg-blue-700">
                {savedPrefs ? <><CheckCircle className="w-4 h-4" />Saved!</> : savingPrefs ? "Saving..." : <><Save className="w-4 h-4" />Save Preferences</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
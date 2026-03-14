import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

function genId() { return Math.random().toString(36).slice(2); }

const emptyAddr = { id: "", label: "", address: "", city: "", state: "", zip: "" };

export default function CustomerAddresses({ customer, onUpdate }) {
  const addresses = customer.service_addresses || [];
  const [addingNew, setAddingNew] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...emptyAddr });

  function startAdd() {
    setForm({ ...emptyAddr, id: genId() });
    setAddingNew(true);
    setEditingId(null);
  }

  function startEdit(addr) {
    setForm({ ...addr });
    setEditingId(addr.id);
    setAddingNew(false);
  }

  async function saveAddr() {
    let updated;
    if (addingNew) {
      updated = [...addresses, form];
    } else {
      updated = addresses.map(a => a.id === form.id ? form : a);
    }
    await onUpdate({ service_addresses: updated });
    setAddingNew(false);
    setEditingId(null);
  }

  async function deleteAddr(id) {
    await onUpdate({ service_addresses: addresses.filter(a => a.id !== id) });
  }

  const isEditing = (id) => editingId === id;

  return (
    <div className="bg-white rounded-xl shadow-sm border-0 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">{addresses.length} service address{addresses.length !== 1 ? "es" : ""}</h3>
        <Button variant="outline" size="sm" onClick={startAdd} className="h-7 text-xs gap-1">
          <Plus className="w-3 h-3" /> Add
        </Button>
      </div>

      <div className="space-y-2">
        {addresses.map(addr => (
          <div key={addr.id} className="border border-slate-100 rounded-lg p-3">
            {isEditing(addr.id) ? (
              <AddressForm form={form} setForm={setForm} onSave={saveAddr} onCancel={() => setEditingId(null)} />
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  {addr.label && <p className="text-xs font-semibold text-slate-500 uppercase mb-0.5">{addr.label}</p>}
                  <p className="text-sm text-slate-800">{addr.address}</p>
                  <p className="text-xs text-slate-500">{[addr.city, addr.state, addr.zip].filter(Boolean).join(", ")}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 text-slate-400 hover:text-slate-700"><MoreVertical className="w-4 h-4" /></button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => startEdit(addr)}><Pencil className="w-3.5 h-3.5 mr-2" />Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteAddr(addr.id)} className="text-red-600"><Trash2 className="w-3.5 h-3.5 mr-2" />Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        ))}
      </div>

      {addingNew && (
        <div className="border border-blue-100 rounded-lg p-3 mt-2 bg-blue-50/30">
          <AddressForm form={form} setForm={setForm} onSave={saveAddr} onCancel={() => setAddingNew(false)} />
        </div>
      )}
    </div>
  );
}

function AddressForm({ form, setForm, onSave, onCancel }) {
  return (
    <div className="space-y-2">
      <Input placeholder="Label (e.g. Home, Office)" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} className="text-sm h-7" />
      <Input placeholder="Street address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="text-sm h-7" />
      <div className="grid grid-cols-3 gap-1.5">
        <Input placeholder="City" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="text-sm h-7 col-span-2" />
        <Input placeholder="ST" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} className="text-sm h-7" maxLength={2} />
      </div>
      <Input placeholder="ZIP" value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} className="text-sm h-7" />
      <div className="flex gap-1.5">
        <Button size="sm" onClick={onSave} className="flex-1 h-7 text-xs bg-blue-600 hover:bg-blue-700">Save</Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="flex-1 h-7 text-xs">Cancel</Button>
      </div>
    </div>
  );
}
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";

const STANDARD_SERVICES = {
  cleaning: [
    { name: "Standard House Cleaning", category: "Residential", description: "Full interior cleaning including all rooms", unit_price: 150, unit: "flat" },
    { name: "Deep Cleaning", category: "Residential", description: "Thorough top-to-bottom cleaning including appliances and baseboards", unit_price: 250, unit: "flat" },
    { name: "Move-In / Move-Out Cleaning", category: "Residential", description: "Complete cleaning for move-ins or move-outs", unit_price: 300, unit: "flat" },
    { name: "Office Cleaning", category: "Commercial", description: "Regular office and workspace cleaning", unit_price: 200, unit: "flat" },
    { name: "Window Cleaning (Interior)", category: "Add-On", description: "Interior window cleaning per visit", unit_price: 75, unit: "flat" },
    { name: "Window Cleaning (Exterior)", category: "Add-On", description: "Exterior window cleaning per visit", unit_price: 100, unit: "flat" },
    { name: "Carpet Cleaning", category: "Add-On", description: "Steam or dry carpet cleaning per room", unit_price: 60, unit: "per_unit" },
    { name: "Oven Cleaning", category: "Add-On", description: "Deep oven interior cleaning", unit_price: 50, unit: "flat" },
    { name: "Refrigerator Cleaning", category: "Add-On", description: "Interior refrigerator cleaning", unit_price: 45, unit: "flat" },
    { name: "Post-Construction Cleaning", category: "Specialty", description: "Cleaning after renovation or construction", unit_price: 400, unit: "flat" },
  ],
  landscaping: [
    { name: "Lawn Mowing", category: "Maintenance", description: "Regular lawn mowing and edging", unit_price: 60, unit: "flat" },
    { name: "Hedge Trimming", category: "Maintenance", description: "Trimming and shaping hedges and shrubs", unit_price: 80, unit: "flat" },
    { name: "Leaf Removal", category: "Seasonal", description: "Raking and removing leaves from property", unit_price: 120, unit: "flat" },
    { name: "Mulching", category: "Maintenance", description: "Applying mulch to flower beds and garden areas", unit_price: 150, unit: "flat" },
    { name: "Fertilization", category: "Lawn Care", description: "Lawn fertilization treatment", unit_price: 100, unit: "flat" },
    { name: "Weed Control", category: "Lawn Care", description: "Herbicide treatment for weed prevention", unit_price: 90, unit: "flat" },
    { name: "Sprinkler System Winterization", category: "Seasonal", description: "Blow-out and winterize irrigation system", unit_price: 120, unit: "flat" },
    { name: "Tree Trimming", category: "Tree Services", description: "Trimming and pruning trees", unit_price: 200, unit: "flat" },
    { name: "Sod Installation", category: "Installation", description: "New sod laying per square foot", unit_price: 2, unit: "per_sqft" },
    { name: "Landscape Design Consultation", category: "Design", description: "On-site landscape design consultation", unit_price: 150, unit: "flat" },
  ],
  handyman: [
    { name: "General Repairs", category: "Repairs", description: "Miscellaneous home repairs and fixes", unit_price: 75, unit: "hourly" },
    { name: "Drywall Repair", category: "Repairs", description: "Patching holes and cracks in drywall", unit_price: 100, unit: "flat" },
    { name: "Door Installation", category: "Installation", description: "Interior or exterior door installation", unit_price: 150, unit: "flat" },
    { name: "Furniture Assembly", category: "Assembly", description: "Assembling flat-pack and boxed furniture", unit_price: 65, unit: "hourly" },
    { name: "TV Mounting", category: "Installation", description: "Wall mounting flat-screen TVs", unit_price: 120, unit: "flat" },
    { name: "Ceiling Fan Installation", category: "Installation", description: "Installing or replacing ceiling fans", unit_price: 130, unit: "flat" },
    { name: "Gutter Cleaning", category: "Maintenance", description: "Clearing debris from gutters and downspouts", unit_price: 150, unit: "flat" },
    { name: "Caulking & Sealing", category: "Repairs", description: "Caulking bathrooms, windows, and doors", unit_price: 80, unit: "flat" },
    { name: "Flooring Repair", category: "Repairs", description: "Repairing damaged flooring sections", unit_price: 100, unit: "flat" },
    { name: "Shelf & Cabinet Installation", category: "Installation", description: "Installing shelves, cabinets, and storage", unit_price: 90, unit: "flat" },
  ],
  painting: [
    { name: "Interior Room Painting", category: "Interior", description: "Painting walls and ceilings per room", unit_price: 300, unit: "per_unit" },
    { name: "Exterior House Painting", category: "Exterior", description: "Full exterior house paint job", unit_price: 2500, unit: "flat" },
    { name: "Trim & Baseboard Painting", category: "Interior", description: "Painting trim, baseboards, and molding", unit_price: 150, unit: "flat" },
    { name: "Cabinet Painting", category: "Specialty", description: "Painting kitchen or bathroom cabinets", unit_price: 600, unit: "flat" },
    { name: "Deck & Fence Staining", category: "Exterior", description: "Staining and sealing decks or fences", unit_price: 400, unit: "flat" },
    { name: "Accent Wall", category: "Interior", description: "Single accent wall with special finish or color", unit_price: 200, unit: "flat" },
    { name: "Ceiling Painting", category: "Interior", description: "Painting ceilings per room", unit_price: 150, unit: "per_unit" },
    { name: "Pressure Washing", category: "Prep", description: "Pressure washing surfaces before painting", unit_price: 200, unit: "flat" },
    { name: "Wallpaper Removal", category: "Prep", description: "Removing existing wallpaper", unit_price: 250, unit: "flat" },
    { name: "Commercial Painting", category: "Commercial", description: "Interior or exterior commercial space painting", unit_price: 85, unit: "hourly" },
  ],
  plumbing: [
    { name: "Leak Repair", category: "Repairs", description: "Finding and repairing pipe leaks", unit_price: 150, unit: "flat" },
    { name: "Drain Cleaning", category: "Maintenance", description: "Clearing clogged drains", unit_price: 125, unit: "flat" },
    { name: "Toilet Installation", category: "Installation", description: "Installing new or replacement toilet", unit_price: 200, unit: "flat" },
    { name: "Faucet Installation", category: "Installation", description: "Installing new faucets in kitchen or bathroom", unit_price: 150, unit: "flat" },
    { name: "Water Heater Installation", category: "Installation", description: "Installing tank or tankless water heater", unit_price: 800, unit: "flat" },
    { name: "Sewer Line Cleaning", category: "Maintenance", description: "Hydro-jetting or snaking sewer lines", unit_price: 300, unit: "flat" },
    { name: "Pipe Replacement", category: "Repairs", description: "Replacing corroded or damaged pipes", unit_price: 95, unit: "hourly" },
    { name: "Water Softener Installation", category: "Installation", description: "Installing water softener system", unit_price: 500, unit: "flat" },
    { name: "Sump Pump Installation", category: "Installation", description: "Installing or replacing sump pump", unit_price: 600, unit: "flat" },
    { name: "Emergency Plumbing", category: "Emergency", description: "After-hours emergency plumbing service", unit_price: 200, unit: "hourly" },
  ],
  electrical: [
    { name: "Outlet Installation", category: "Installation", description: "Installing new electrical outlets", unit_price: 150, unit: "flat" },
    { name: "Light Fixture Installation", category: "Installation", description: "Installing ceiling lights and fixtures", unit_price: 120, unit: "flat" },
    { name: "Panel Upgrade", category: "Upgrades", description: "Electrical panel upgrade or replacement", unit_price: 2000, unit: "flat" },
    { name: "Circuit Breaker Replacement", category: "Repairs", description: "Replacing faulty circuit breakers", unit_price: 200, unit: "flat" },
    { name: "EV Charger Installation", category: "Installation", description: "Installing Level 2 EV charging station", unit_price: 800, unit: "flat" },
    { name: "Ceiling Fan Wiring", category: "Installation", description: "Wiring and installing ceiling fans", unit_price: 150, unit: "flat" },
    { name: "Smoke/CO Detector Installation", category: "Safety", description: "Installing smoke and carbon monoxide detectors", unit_price: 80, unit: "per_unit" },
    { name: "Whole-Home Surge Protection", category: "Safety", description: "Installing whole-home surge protector", unit_price: 350, unit: "flat" },
    { name: "Electrical Inspection", category: "Inspection", description: "Full home electrical safety inspection", unit_price: 200, unit: "flat" },
    { name: "Emergency Electrical Service", category: "Emergency", description: "After-hours emergency electrical repairs", unit_price: 200, unit: "hourly" },
  ],
  hvac: [
    { name: "AC Tune-Up", category: "Maintenance", description: "Annual air conditioner maintenance and tuning", unit_price: 150, unit: "flat" },
    { name: "Furnace Tune-Up", category: "Maintenance", description: "Annual furnace maintenance and inspection", unit_price: 150, unit: "flat" },
    { name: "AC Installation", category: "Installation", description: "Installing new central air conditioning unit", unit_price: 3500, unit: "flat" },
    { name: "Furnace Installation", category: "Installation", description: "Installing new furnace or heating system", unit_price: 3000, unit: "flat" },
    { name: "Duct Cleaning", category: "Maintenance", description: "Cleaning air ducts throughout the home", unit_price: 400, unit: "flat" },
    { name: "Filter Replacement", category: "Maintenance", description: "Replacing HVAC air filters", unit_price: 60, unit: "flat" },
    { name: "Thermostat Installation", category: "Installation", description: "Installing smart or programmable thermostat", unit_price: 200, unit: "flat" },
    { name: "Refrigerant Recharge", category: "Repairs", description: "Recharging AC refrigerant levels", unit_price: 250, unit: "flat" },
    { name: "Heat Pump Installation", category: "Installation", description: "Installing heat pump system", unit_price: 5000, unit: "flat" },
    { name: "Emergency HVAC Service", category: "Emergency", description: "After-hours emergency HVAC repairs", unit_price: 200, unit: "hourly" },
  ],
  other: [
    { name: "Consultation", category: "General", description: "Initial consultation and assessment", unit_price: 100, unit: "flat" },
    { name: "Hourly Labor", category: "General", description: "General labor billed hourly", unit_price: 75, unit: "hourly" },
    { name: "Service Call", category: "General", description: "Service call and diagnostic fee", unit_price: 80, unit: "flat" },
    { name: "Emergency Service", category: "Emergency", description: "After-hours emergency service", unit_price: 150, unit: "hourly" },
  ],
};

export default function StandardServicesCatalog({ company, existingServices, onServicesAdded }) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(false);

  const industry = company?.industry || "other";
  const catalog = STANDARD_SERVICES[industry] || STANDARD_SERVICES.other;

  // Check which catalog items already exist (by name)
  const existingNames = new Set(existingServices.map(s => s.name.toLowerCase()));

  const newItems = catalog.filter(item => !existingNames.has(item.name.toLowerCase()));

  if (newItems.length === 0) return null;

  function toggleSelect(name) {
    setSelected(prev => ({ ...prev, [name]: !prev[name] }));
  }

  function selectAll() {
    const all = {};
    newItems.forEach(item => { all[item.name] = true; });
    setSelected(all);
  }

  function selectNone() {
    setSelected({});
  }

  const selectedCount = Object.values(selected).filter(Boolean).length;

  async function handleAdd() {
    const toAdd = newItems.filter(item => selected[item.name]);
    if (!toAdd.length) return;
    setLoading(true);
    await Promise.all(toAdd.map(item =>
      base44.entities.Service.create({
        ...item,
        company_id: company.id,
        is_active: false,
        taxable: true,
      })
    ));
    setSelected({});
    setLoading(false);
    onServicesAdded();
  }

  return (
    <div className="mb-6 border border-blue-200 rounded-xl bg-blue-50/50 overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-blue-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-blue-500" />
          <div>
            <p className="font-semibold text-slate-800">Standard Services for {industry.charAt(0).toUpperCase() + industry.slice(1)}</p>
            <p className="text-sm text-slate-500">{newItems.length} standard services available to add</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {expanded && (
        <div className="border-t border-blue-200 px-5 pb-5">
          <div className="flex items-center justify-between py-3">
            <p className="text-sm text-slate-500">Select services to add (will be inactive by default)</p>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">Select all</button>
              <span className="text-slate-300">|</span>
              <button onClick={selectNone} className="text-xs text-slate-500 hover:underline">Clear</button>
            </div>
          </div>
          <div className="space-y-2">
            {newItems.map(item => (
              <label key={item.name} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3 cursor-pointer hover:bg-slate-50">
                <Checkbox
                  checked={!!selected[item.name]}
                  onCheckedChange={() => toggleSelect(item.name)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800 text-sm">{item.name}</span>
                    <Badge variant="outline" className="text-xs">{item.category}</Badge>
                  </div>
                  {item.description && <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-slate-700">${item.unit_price}</p>
                  <p className="text-xs text-slate-400">{item.unit === "flat" ? "flat rate" : item.unit === "hourly" ? "/hr" : item.unit === "per_sqft" ? "/sqft" : "/unit"}</p>
                </div>
              </label>
            ))}
          </div>
          {selectedCount > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <Button onClick={handleAdd} disabled={loading} className="gap-2">
                {loading ? "Adding..." : `Add ${selectedCount} Service${selectedCount > 1 ? "s" : ""} (Inactive)`}
              </Button>
              <p className="text-xs text-slate-400">You can activate them from the list below</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
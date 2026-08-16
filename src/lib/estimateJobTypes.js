// Job-type catalog for the New Estimate intake wizard.
// Each job type has a set of questions, a list of adjustable cost `params`
// (editable by admins via the Estimator Config admin page), and a template
// builder that produces pre-populated line items, scope of work, and a checklist.
//
// Company pricing standard defaults (Chittenden County, VT):
//   - Labor bill rate: $85/hr
//   - Material markup: 30% over cost
//
// Admins can override labor_rate, material_markup_pct, and any per-job-type
// param via the EstimatorConfig entity. The build() functions accept an
// optional `config` object and resolve each cost with fallback to defaults.
//
// Line item shape: { description, category, quantity, unit_price, total }

export const DEFAULT_LABOR_RATE = 85;
export const DEFAULT_MATERIAL_MARKUP_PCT = 30;

// Resolve a config record into a normalized shape used by builders.
export function resolveConfig(config) {
  return {
    labor_rate: Number(config?.labor_rate) || DEFAULT_LABOR_RATE,
    material_markup_pct: Number(config?.material_markup_pct) || DEFAULT_MATERIAL_MARKUP_PCT,
    job_type_costs: config?.job_type_costs || {},
  };
}

// Backwards-compatible exports (used by code that hasn't been passed a config)
export const LABOR_RATE = DEFAULT_LABOR_RATE;
export const MATERIAL_MARKUP = DEFAULT_MATERIAL_MARKUP_PCT / 100;

// Read an overridden cost for a job type + param, falling back to its default.
function getCost(typeId, paramId, defaultVal, cfg) {
  const v = cfg?.job_type_costs?.[typeId]?.[paramId];
  if (v === undefined || v === null || v === "" || isNaN(Number(v))) return Number(defaultVal);
  return Number(v);
}

// Apply markup to a material's raw cost
function mat(cost, markupPct) {
  const m = (Number(markupPct) || DEFAULT_MATERIAL_MARKUP_PCT) / 100;
  return Number((cost * (1 + m)).toFixed(2));
}
// Labor line: hours × rate
function labor(hours, description, rate) {
  const r = Number(rate) || DEFAULT_LABOR_RATE;
  const h = Number(hours);
  return {
    description,
    category: "service",
    quantity: Number(h.toFixed(2)),
    unit_price: r,
    total: Number((h * r).toFixed(2)),
  };
}
// Material line
function material(description, quantity, cost, markupPct) {
  const q = Number(quantity) || 0;
  const up = mat(cost, markupPct);
  return {
    description,
    category: "material",
    quantity: Number(q.toFixed(2)),
    unit_price: up,
    total: Number((q * up).toFixed(2)),
  };
}

export const JOB_TYPES = [
  {
    id: "fence",
    label: "Fence",
    icon: "Fence",
    description: "Install or replace fencing",
    questions: [
      { id: "install_type", label: "New install or replacement?", type: "select", options: ["New install", "Replacement", "Repair section"] },
      { id: "linear_ft", label: "Linear feet", type: "number", placeholder: "100" },
      { id: "fence_type", label: "Fence type", type: "select", options: ["Cedar privacy", "Chain-link", "Split rail", "Vinyl/PVC", "Stockade", "Other"] },
      { id: "height_ft", label: "Height (ft)", type: "number", placeholder: "6" },
    ],
    params: [
      { id: "labor_per_lf", label: "Labor hours per LF (install)", default: 0.08, unit: "hr" },
      { id: "tearoff_per_lf", label: "Tear-off hours per LF (replacement)", default: 0.1, unit: "hr" },
      { id: "post_cost", label: "4x4 PT post (raw cost)", default: 28, unit: "$" },
      { id: "concrete_bag_cost", label: "80lb concrete bag (raw cost)", default: 7.5, unit: "$" },
      { id: "panel_hardware_cost", label: "Panel hardware / screws (lot)", default: 45, unit: "$" },
      { id: "panel_cedar", label: "Cedar privacy panel 8ft (raw cost)", default: 95, unit: "$" },
      { id: "panel_stockade", label: "Stockade panel 8ft (raw cost)", default: 85, unit: "$" },
      { id: "panel_chainlink", label: "Chain-link panel 8ft (raw cost)", default: 75, unit: "$" },
      { id: "panel_vinyl", label: "Vinyl/PVC panel 8ft (raw cost)", default: 140, unit: "$" },
      { id: "panel_splitrail", label: "Split-rail section 8ft (raw cost)", default: 60, unit: "$" },
      { id: "panel_other", label: "Other panel 8ft (raw cost)", default: 80, unit: "$" },
      { id: "debris_haul", label: "Debris haul-away (replacement)", default: 150, unit: "$" },
    ],
    build(a, config) {
      const cfg = resolveConfig(config);
      const c = (id, d) => getCost("fence", id, d, cfg);
      const lf = Number(a.linear_ft) || 0;
      const height = Number(a.height_ft) || 6;
      const panelWidth = 8;
      const panels = Math.max(1, Math.ceil(lf / panelWidth));
      const posts = Math.max(2, panels + 1);
      const isReplace = a.install_type === "Replacement";
      const tearOffHours = isReplace ? lf * c("tearoff_per_lf", 0.1) : 0;
      const installHours = lf * c("labor_per_lf", 0.08) + tearOffHours;
      const items = [
        labor(installHours, `Labor — ${a.install_type || "install"} fence (${lf} LF × ${height}ft, pre-built panels)`, cfg.labor_rate),
        material("4x4 pressure-treated posts", posts, c("post_cost", 28), cfg.material_markup_pct),
        material("80lb concrete mix (bags)", posts, c("concrete_bag_cost", 7.5), cfg.material_markup_pct),
      ];
      const panelCostByType = {
        "Cedar privacy": c("panel_cedar", 95),
        "Stockade": c("panel_stockade", 85),
        "Chain-link": c("panel_chainlink", 75),
        "Vinyl/PVC": c("panel_vinyl", 140),
        "Split rail": c("panel_splitrail", 60),
        "Other": c("panel_other", 80),
      };
      const panelCost = panelCostByType[a.fence_type] ?? c("panel_other", 80);
      const panelLabel = a.fence_type === "Split rail"
        ? `Pre-built split-rail sections (${panelWidth}ft)`
        : `Pre-built ${a.fence_type || "fence"} panels (${panelWidth}ft × ${height}ft)`;
      items.push(material(panelLabel, panels, panelCost, cfg.material_markup_pct));
      items.push(material("Panel hardware / brackets / screws (lot)", 1, c("panel_hardware_cost", 45), cfg.material_markup_pct));
      if (isReplace) items.push(material("Debris haul-away & disposal", 1, c("debris_haul", 150), cfg.material_markup_pct));
      return {
        title: `${a.fence_type || "Fence"} ${a.install_type || "Install"} — ${lf} LF`,
        scope_of_work: `<p><strong>${a.fence_type || "Fence"} ${a.install_type || "Install"}</strong></p><p>Install ${lf} linear feet of ${height}ft ${a.fence_type || "fence"} at the property using pre-built ${panelWidth}ft panels. Includes post setting in concrete, panel hanging/attachment, hardware, and site cleanup${isReplace ? ". Existing fence to be removed and hauled away first." : "."}</p><p>Exclusions: gate hardware (quoted separately if needed), rock/obstruction excavation, landscape restoration beyond fence line.</p>`,
        line_items: items,
        checklist: [
          { item: "Verify property lines / utilities (Dig Safe)", completed: false },
          { item: "Set posts plumb in concrete", completed: false },
          { item: "Hang and secure pre-built panels", completed: false },
          { item: "Cleanup and final walk-through", completed: false },
        ],
      };
    },
  },
  {
    id: "flooring",
    label: "Flooring",
    icon: "Grid2x2",
    description: "Install or repair floors",
    questions: [
      { id: "install_type", label: "New install or replacement?", type: "select", options: ["New install", "Replacement", "Repair"] },
      { id: "floor_type", label: "Flooring type", type: "select", options: ["LVP / Laminate", "Hardwood", "Tile", "Carpet", "Sheet vinyl"] },
      { id: "sqft", label: "Square feet", type: "number", placeholder: "200" },
      { id: "demo", label: "Tear out existing floor?", type: "select", options: ["Yes", "No"] },
    ],
    params: [
      { id: "labor_per_sqft", label: "Labor hours per sqft (non-tile)", default: 0.035, unit: "hr" },
      { id: "labor_per_sqft_tile", label: "Labor hours per sqft (tile)", default: 0.06, unit: "hr" },
      { id: "demo_per_sqft", label: "Demo hours per sqft", default: 0.04, unit: "hr" },
      { id: "lvp_cost", label: "LVP/Laminate planks (raw $/sqft)", default: 3.2, unit: "$" },
      { id: "underlayment_cost", label: "Underlayment (raw $/sqft)", default: 0.45, unit: "$" },
      { id: "hardwood_cost", label: "Hardwood flooring (raw $/sqft)", default: 6.5, unit: "$" },
      { id: "tile_cost", label: "Tile (raw $/sqft)", default: 4.5, unit: "$" },
      { id: "thinset_cost", label: "Thinset mortar 50lb bag (raw $)", default: 32, unit: "$" },
      { id: "grout_cost", label: "Grout 25lb bag (raw $)", default: 22, unit: "$" },
      { id: "carpet_cost", label: "Carpet (raw $/sqft)", default: 3.5, unit: "$" },
      { id: "carpet_pad_cost", label: "Carpet padding (raw $/sqft)", default: 0.6, unit: "$" },
      { id: "sheet_vinyl_cost", label: "Sheet vinyl (raw $/sqft)", default: 2.5, unit: "$" },
      { id: "transition_cost", label: "Transition strips / thresholds (lot)", default: 35, unit: "$" },
      { id: "floor_prep_cost", label: "Floor prep / leveling compound (lot)", default: 60, unit: "$" },
      { id: "debris_haul", label: "Debris haul-away (demo)", default: 120, unit: "$" },
    ],
    build(a, config) {
      const cfg = resolveConfig(config);
      const c = (id, d) => getCost("flooring", id, d, cfg);
      const sqft = Number(a.sqft) || 0;
      const demoHours = a.demo === "Yes" ? sqft * c("demo_per_sqft", 0.04) : 0;
      const laborRate = a.floor_type === "Tile" ? c("labor_per_sqft_tile", 0.06) : c("labor_per_sqft", 0.035);
      const installHours = sqft * laborRate + demoHours;
      const items = [
        labor(installHours, `Labor — ${a.floor_type || "flooring"} ${a.install_type || "install"} (${sqft} sqft)`, cfg.labor_rate),
      ];
      if (a.floor_type === "LVP / Laminate") {
        items.push(material("LVP/Laminate planks (sqft)", sqft * 1.1, c("lvp_cost", 3.2), cfg.material_markup_pct));
        items.push(material("Underlayment (sqft)", sqft, c("underlayment_cost", 0.45), cfg.material_markup_pct));
      } else if (a.floor_type === "Hardwood") {
        items.push(material("Hardwood flooring (sqft)", sqft * 1.1, c("hardwood_cost", 6.5), cfg.material_markup_pct));
      } else if (a.floor_type === "Tile") {
        items.push(material("Tile (sqft)", sqft * 1.1, c("tile_cost", 4.5), cfg.material_markup_pct));
        items.push(material("Thinset mortar (50lb bags)", Math.ceil(sqft / 75), c("thinset_cost", 32), cfg.material_markup_pct));
        items.push(material("Grout (25lb bags)", Math.ceil(sqft / 100), c("grout_cost", 22), cfg.material_markup_pct));
      } else if (a.floor_type === "Carpet") {
        items.push(material("Carpet (sqft)", sqft * 1.1, c("carpet_cost", 3.5), cfg.material_markup_pct));
        items.push(material("Carpet padding (sqft)", sqft, c("carpet_pad_cost", 0.6), cfg.material_markup_pct));
      } else {
        items.push(material("Sheet vinyl (sqft)", sqft * 1.1, c("sheet_vinyl_cost", 2.5), cfg.material_markup_pct));
      }
      items.push(material("Transition strips / thresholds (lot)", 1, c("transition_cost", 35), cfg.material_markup_pct));
      items.push(material("Floor prep / leveling compound (lot)", 1, c("floor_prep_cost", 60), cfg.material_markup_pct));
      if (a.demo === "Yes") items.push(material("Debris haul-away & disposal", 1, c("debris_haul", 120), cfg.material_markup_pct));
      return {
        title: `${a.floor_type || "Flooring"} ${a.install_type || "Install"} — ${sqft} sqft`,
        scope_of_work: `<p><strong>${a.floor_type || "Flooring"} ${a.install_type || "Install"}</strong></p><p>${a.install_type || "Install"} ${sqft} sqft of ${a.floor_type || "flooring"}${a.demo === "Yes" ? " after tear-out and haul-away of existing floor" : ""}. Includes floor prep, underlayment as needed, installation, and transitions.</p><p>Exclusions: subfloor structural repair, moving furniture, baseboard replacement.</p>`,
        line_items: items,
        checklist: [
          { item: "Acclimate flooring per manufacturer", completed: false },
          { item: "Floor prep / clean / level", completed: false },
          { item: "Install flooring", completed: false },
          { item: "Install transitions & cleanup", completed: false },
        ],
      };
    },
  },
  {
    id: "roofing",
    label: "Roofing",
    icon: "Home",
    description: "Repair or replace a roof",
    questions: [
      { id: "scope", label: "Repair or full replacement?", type: "select", options: ["Repair", "Full replacement"] },
      { id: "sqft", label: "Roof area (sqft)", type: "number", placeholder: "1200" },
      { id: "roof_type", label: "Roof type", type: "select", options: ["Asphalt shingle", "Metal", "Rubber/EPDM (flat)", "Other"] },
      { id: "layers", label: "Layers to tear off", type: "number", placeholder: "1" },
    ],
    params: [
      { id: "tear_hours_per_square_per_layer", label: "Tear-off hours per square per layer", default: 1.5, unit: "hr" },
      { id: "install_hours_per_square", label: "Install hours per square (full)", default: 2.5, unit: "hr" },
      { id: "repair_hours", label: "Repair labor hours (flat)", default: 4, unit: "hr" },
      { id: "shingle_bundle_cost", label: "Architectural shingles bundle (raw $)", default: 38, unit: "$" },
      { id: "underlayment_roll_cost", label: "Synthetic underlayment 10-sq roll (raw $)", default: 95, unit: "$" },
      { id: "metal_panel_cost", label: "Metal roofing panel (raw $/sqft)", default: 3.8, unit: "$" },
      { id: "epdm_cost", label: "EPDM rubber membrane (raw $/sqft)", default: 2.2, unit: "$" },
      { id: "epdm_adhesive_cost", label: "EPDM adhesive / seam tape (lot)", default: 120, unit: "$" },
      { id: "ice_water_roll_cost", label: "Ice & water shield roll (raw $)", default: 85, unit: "$" },
      { id: "drip_edge_cost", label: "Drip edge 10ft piece (raw $)", default: 14, unit: "$" },
      { id: "flashing_cost", label: "Flashing / step flashing (lot)", default: 85, unit: "$" },
      { id: "roofing_fasteners_cost", label: "Roofing nails / fasteners (lot)", default: 45, unit: "$" },
      { id: "dumpster_cost", label: "Dumpster / debris disposal", default: 350, unit: "$" },
      { id: "repair_material_cost", label: "Repair material bundle (raw $)", default: 38, unit: "$" },
      { id: "repair_underlayment_cost", label: "Repair underlayment roll (raw $)", default: 85, unit: "$" },
      { id: "repair_flashing_cost", label: "Repair flashing / sealant / fasteners (lot)", default: 65, unit: "$" },
    ],
    build(a, config) {
      const cfg = resolveConfig(config);
      const c = (id, d) => getCost("roofing", id, d, cfg);
      const sqft = Number(a.sqft) || 0;
      const squares = Math.ceil(sqft / 100);
      const isFull = a.scope === "Full replacement";
      const tearHours = isFull ? (Number(a.layers) || 1) * squares * c("tear_hours_per_square_per_layer", 1.5) : 0;
      const installHours = isFull ? squares * c("install_hours_per_square", 2.5) : c("repair_hours", 4);
      const items = [
        labor(tearHours + installHours, `Labor — roof ${a.scope || "repair"} (${sqft} sqft)`, cfg.labor_rate),
      ];
      if (isFull) {
        if (a.roof_type === "Asphalt shingle") {
          items.push(material("Architectural shingles (bundles)", squares * 3, c("shingle_bundle_cost", 38), cfg.material_markup_pct));
          items.push(material("Synthetic underlayment (10-sq roll)", Math.ceil(squares / 10), c("underlayment_roll_cost", 95), cfg.material_markup_pct));
        } else if (a.roof_type === "Metal") {
          items.push(material("Metal roofing panels (sqft)", sqft * 1.1, c("metal_panel_cost", 3.8), cfg.material_markup_pct));
          items.push(material("Underlayment (10-sq roll)", Math.ceil(squares / 10), c("underlayment_roll_cost", 95), cfg.material_markup_pct));
        } else {
          items.push(material("EPDM rubber membrane (sqft)", sqft * 1.1, c("epdm_cost", 2.2), cfg.material_markup_pct));
          items.push(material("Adhesive / seam tape (lot)", 1, c("epdm_adhesive_cost", 120), cfg.material_markup_pct));
        }
        items.push(material("Ice & water shield (VT) (roll)", Math.ceil(squares / 5), c("ice_water_roll_cost", 85), cfg.material_markup_pct));
        items.push(material("Drip edge (10ft pieces)", Math.ceil(sqft / 100 * 2), c("drip_edge_cost", 14), cfg.material_markup_pct));
        items.push(material("Flashing / step flashing (lot)", 1, c("flashing_cost", 85), cfg.material_markup_pct));
        items.push(material("Roofing nails / fasteners (lot)", 1, c("roofing_fasteners_cost", 45), cfg.material_markup_pct));
        items.push(material("Dumpster / debris disposal", 1, c("dumpster_cost", 350), cfg.material_markup_pct));
      } else {
        items.push(material("Shingles / matching material (bundle)", 2, c("repair_material_cost", 38), cfg.material_markup_pct));
        items.push(material("Underlayment / ice & water (roll)", 1, c("repair_underlayment_cost", 85), cfg.material_markup_pct));
        items.push(material("Flashing / sealant / fasteners (lot)", 1, c("repair_flashing_cost", 65), cfg.material_markup_pct));
      }
      return {
        title: `Roof ${a.scope || "Repair"} — ${a.roof_type || ""} ${sqft} sqft`,
        scope_of_work: `<p><strong>Roof ${a.scope || "Repair"} — ${a.roof_type || ""}</strong></p><p>${isFull ? `Full tear-off of ${a.layers || 1} existing layer(s) and installation of new ${a.roof_type || "roofing"} over ${sqft} sqft.` : `Targeted repair of ${a.roof_type || "roofing"} over approx ${sqft} sqft.`} Includes ice & water shield at eaves (Vermont code), drip edge, flashing, and disposal.</p><p>Exclusions: structural sheathing repair (quoted per sheet on site), skylight replacement, gutter work.</p>`,
        line_items: items,
        checklist: [
          { item: "Protect landscaping / tarps", completed: false },
          { item: "Tear-off / inspect deck", completed: false },
          { item: "Install underlayment + ice & water", completed: false },
          { item: "Install roofing + flashing", completed: false },
          { item: "Magnet sweep & cleanup", completed: false },
        ],
      };
    },
  },
  {
    id: "painting",
    label: "Painting",
    icon: "PaintRoller",
    description: "Interior or exterior painting",
    questions: [
      { id: "area", label: "Interior or exterior?", type: "select", options: ["Interior", "Exterior"] },
      { id: "sqft", label: "Surface area (sqft)", type: "number", placeholder: "400" },
      { id: "prep", label: "Prep required?", type: "select", options: ["Minimal", "Patch & sand", "Full scrape & prime"] },
      { id: "coats", label: "Number of coats", type: "number", placeholder: "2" },
    ],
    params: [
      { id: "paint_hours_per_sqft_per_coat", label: "Paint hours per sqft per coat", default: 0.01, unit: "hr" },
      { id: "prep_minimal_per_sqft", label: "Prep hours per sqft (minimal)", default: 0.005, unit: "hr" },
      { id: "prep_patch_per_sqft", label: "Prep hours per sqft (patch & sand)", default: 0.015, unit: "hr" },
      { id: "prep_scrape_per_sqft", label: "Prep hours per sqft (full scrape & prime)", default: 0.03, unit: "hr" },
      { id: "sqft_per_gallon", label: "Coverage sqft per gallon", default: 350, unit: "sqft" },
      { id: "paint_gallon_cost", label: "Paint gallon (raw $)", default: 45, unit: "$" },
      { id: "primer_gallon_cost", label: "Primer gallon (raw $)", default: 32, unit: "$" },
      { id: "brushes_rollers_cost", label: "Brushes / rollers / pans (lot)", default: 35, unit: "$" },
      { id: "drop_cloths_cost", label: "Drop cloths / plastic / tape (lot)", default: 40, unit: "$" },
      { id: "caulk_sealant_cost", label: "Caulk / sealant (lot, exterior)", default: 25, unit: "$" },
    ],
    build(a, config) {
      const cfg = resolveConfig(config);
      const c = (id, d) => getCost("painting", id, d, cfg);
      const sqft = Number(a.sqft) || 0;
      const coats = Number(a.coats) || 2;
      const prepKey = a.prep === "Full scrape & prime" ? "prep_scrape_per_sqft" : a.prep === "Patch & sand" ? "prep_patch_per_sqft" : "prep_minimal_per_sqft";
      const prepHours = sqft * c(prepKey, 0.005);
      const paintHours = sqft * c("paint_hours_per_sqft_per_coat", 0.01) * coats + prepHours;
      const sqftPerGal = c("sqft_per_gallon", 350);
      const gallons = Math.ceil((sqft * coats) / sqftPerGal);
      const items = [
        labor(paintHours, `Labor — ${a.area || "interior"} painting (${sqft} sqft, ${coats} coats)`, cfg.labor_rate),
      ];
      if (a.prep === "Full scrape & prime") items.push(material("Primer (gallons)", Math.ceil(sqft / sqftPerGal), c("primer_gallon_cost", 32), cfg.material_markup_pct));
      items.push(material("Paint (gallons)", gallons, c("paint_gallon_cost", 45), cfg.material_markup_pct));
      items.push(material("Brushes / rollers / pans (lot)", 1, c("brushes_rollers_cost", 35), cfg.material_markup_pct));
      items.push(material("Drop cloths / plastic / tape (lot)", 1, c("drop_cloths_cost", 40), cfg.material_markup_pct));
      if (a.area === "Exterior") items.push(material("Caulk / sealant (lot)", 1, c("caulk_sealant_cost", 25), cfg.material_markup_pct));
      return {
        title: `${a.area || "Interior"} Painting — ${sqft} sqft`,
        scope_of_work: `<p><strong>${a.area || "Interior"} Painting — ${sqft} sqft</strong></p><p>Prep: ${a.prep || "minimal"}. Apply ${coats} coat(s) of quality paint. Includes protecting floors/furniture, ${a.prep === "Full scrape & prime" ? "scraping, priming, " : ""}patching as needed, and cleanup.</p><p>Exclusions: drywall repair beyond spot patching, lead/asbestos abatement, spray equipment rental.</p>`,
        line_items: items,
        checklist: [
          { item: "Protect floors / furniture", completed: false },
          { item: "Prep surfaces (patch / sand / prime)", completed: false },
          { item: "Cut in & roll coats", completed: false },
          { item: "Final walk-through & cleanup", completed: false },
        ],
      };
    },
  },
  {
    id: "driveway",
    label: "Driveway",
    icon: "Truck",
    description: "Seal, resurface, or install a driveway",
    questions: [
      { id: "scope", label: "Scope", type: "select", options: ["Sealcoat", "Resurface", "New install", "Repair"] },
      { id: "type", label: "Surface type", type: "select", options: ["Asphalt", "Concrete", "Gravel"] },
      { id: "sqft", label: "Square feet", type: "number", placeholder: "800" },
    ],
    params: [
      { id: "seal_hours_per_sqft", label: "Sealcoat hours per sqft", default: 0.005, unit: "hr" },
      { id: "seal_base_hours", label: "Sealcoat base hours", default: 1, unit: "hr" },
      { id: "repair_hours", label: "Repair labor hours (flat)", default: 3, unit: "hr" },
      { id: "concrete_hours_per_sqft", label: "Concrete hours per sqft", default: 0.04, unit: "hr" },
      { id: "asphalt_hours_per_sqft", label: "Asphalt hours per sqft", default: 0.02, unit: "hr" },
      { id: "install_base_hours", label: "Install base hours", default: 2, unit: "hr" },
      { id: "sealer_pail_cost", label: "Sealer 5-gal pail (raw $)", default: 45, unit: "$" },
      { id: "sealer_coverage_sqft", label: "Sealer coverage sqft per pail", default: 250, unit: "sqft" },
      { id: "crack_filler_cost", label: "Crack filler (lot)", default: 35, unit: "$" },
      { id: "cold_patch_cost", label: "Cold patch / repair material (lot)", default: 85, unit: "$" },
      { id: "concrete_cost", label: "Concrete (raw $/sqft)", default: 6.5, unit: "$" },
      { id: "rebar_cost", label: "Rebar / mesh reinforcement (lot)", default: 200, unit: "$" },
      { id: "forms_cost", label: "Forms / expansion joints (lot)", default: 85, unit: "$" },
      { id: "gravel_cost", label: "Gravel / base material (raw $/sqft)", default: 1.2, unit: "$" },
      { id: "compaction_cost", label: "Compaction / grading (lot)", default: 150, unit: "$" },
      { id: "asphalt_cost", label: "Hot-mix asphalt (raw $/sqft)", default: 4.5, unit: "$" },
      { id: "base_prep_cost", label: "Base prep / grading (lot)", default: 250, unit: "$" },
    ],
    build(a, config) {
      const cfg = resolveConfig(config);
      const c = (id, d) => getCost("driveway", id, d, cfg);
      const sqft = Number(a.sqft) || 0;
      let hours, items;
      if (a.scope === "Sealcoat") {
        hours = sqft * c("seal_hours_per_sqft", 0.005) + c("seal_base_hours", 1);
        items = [
          labor(hours, `Labor — sealcoat driveway (${sqft} sqft)`, cfg.labor_rate),
          material("Sealer (5-gal pails)", Math.ceil(sqft / c("sealer_coverage_sqft", 250)), c("sealer_pail_cost", 45), cfg.material_markup_pct),
          material("Crack filler (lot)", 1, c("crack_filler_cost", 35), cfg.material_markup_pct),
        ];
      } else if (a.scope === "Repair") {
        hours = c("repair_hours", 3);
        items = [
          labor(hours, "Labor — driveway repair / patching", cfg.labor_rate),
          material("Cold patch / repair material (lot)", 1, c("cold_patch_cost", 85), cfg.material_markup_pct),
        ];
      } else {
        hours = sqft * (a.type === "Concrete" ? c("concrete_hours_per_sqft", 0.04) : c("asphalt_hours_per_sqft", 0.02)) + c("install_base_hours", 2);
        items = [
          labor(hours, `Labor — ${a.scope} ${a.type || "asphalt"} driveway (${sqft} sqft)`, cfg.labor_rate),
        ];
        if (a.type === "Concrete") {
          items.push(material("Concrete (per sqft)", sqft, c("concrete_cost", 6.5), cfg.material_markup_pct));
          items.push(material("Rebar / mesh reinforcement (lot)", 1, c("rebar_cost", 200), cfg.material_markup_pct));
          items.push(material("Forms / expansion joints (lot)", 1, c("forms_cost", 85), cfg.material_markup_pct));
        } else if (a.type === "Gravel") {
          items.push(material("Gravel / base material (per sqft)", sqft, c("gravel_cost", 1.2), cfg.material_markup_pct));
          items.push(material("Compaction / grading (lot)", 1, c("compaction_cost", 150), cfg.material_markup_pct));
        } else {
          items.push(material("Hot-mix asphalt (per sqft)", sqft, c("asphalt_cost", 4.5), cfg.material_markup_pct));
          items.push(material("Base prep / grading (lot)", 1, c("base_prep_cost", 250), cfg.material_markup_pct));
        }
      }
      return {
        title: `Driveway ${a.scope} — ${a.type || ""} ${sqft} sqft`,
        scope_of_work: `<p><strong>Driveway ${a.scope} — ${a.type || ""}</strong></p><p>${a.scope} of ${sqft} sqft ${a.type || "asphalt"} driveway. Includes surface prep, material, and cleanup.</p><p>Exclusions: culvert work, extensive regrading, permits.</p>`,
        line_items: items,
        checklist: [
          { item: "Prep / clean / edge surface", completed: false },
          { item: "Apply material", completed: false },
          { item: "Cleanup & barricade until cured", completed: false },
        ],
      };
    },
  },
  {
    id: "gutters",
    label: "Gutters",
    icon: "CloudRain",
    description: "Clean, repair, or replace gutters",
    questions: [
      { id: "scope", label: "Scope", type: "select", options: ["Cleaning", "Repair", "Replacement"] },
      { id: "linear_ft", label: "Linear feet", type: "number", placeholder: "150" },
      { id: "gutter_type", label: "Gutter type", type: "select", options: ["5\" aluminum", "6\" aluminum", "Vinyl", "Other"] },
    ],
    params: [
      { id: "clean_hours_per_lf", label: "Cleaning hours per LF", default: 0.02, unit: "hr" },
      { id: "clean_base_hours", label: "Cleaning base hours", default: 1, unit: "hr" },
      { id: "repair_hours", label: "Repair labor hours (flat)", default: 2, unit: "hr" },
      { id: "replace_hours_per_lf", label: "Replacement hours per LF", default: 0.05, unit: "hr" },
      { id: "replace_base_hours", label: "Replacement base hours", default: 1, unit: "hr" },
      { id: "clean_debris_cost", label: "Debris bag-out / disposal (lot)", default: 35, unit: "$" },
      { id: "repair_hardware_cost", label: "Hangers / screws / sealant (lot)", default: 45, unit: "$" },
      { id: "gutter_cost_per_lf", label: "Gutter (raw $/LF)", default: 4.5, unit: "$" },
      { id: "downspout_cost_per_lf", label: "Downspout (raw $/LF)", default: 5.5, unit: "$" },
      { id: "gutter_hardware_cost", label: "Hangers / end caps / elbows (lot)", default: 65, unit: "$" },
      { id: "gutter_sealant_cost", label: "Sealant / screws (lot)", default: 25, unit: "$" },
    ],
    build(a, config) {
      const cfg = resolveConfig(config);
      const c = (id, d) => getCost("gutters", id, d, cfg);
      const lf = Number(a.linear_ft) || 0;
      let hours, items;
      if (a.scope === "Cleaning") {
        hours = lf * c("clean_hours_per_lf", 0.02) + c("clean_base_hours", 1);
        items = [
          labor(hours, `Labor — gutter cleaning (${lf} LF)`, cfg.labor_rate),
          material("Debris bag-out / disposal (lot)", 1, c("clean_debris_cost", 35), cfg.material_markup_pct),
        ];
      } else if (a.scope === "Repair") {
        hours = c("repair_hours", 2);
        items = [
          labor(hours, "Labor — gutter repair / re-securing", cfg.labor_rate),
          material("Hangers / screws / sealant (lot)", 1, c("repair_hardware_cost", 45), cfg.material_markup_pct),
        ];
      } else {
        hours = lf * c("replace_hours_per_lf", 0.05) + c("replace_base_hours", 1);
        items = [
          labor(hours, `Labor — gutter replacement (${lf} LF)`, cfg.labor_rate),
          material(`${a.gutter_type || "5\" aluminum"} gutter (per LF)`, lf, c("gutter_cost_per_lf", 4.5), cfg.material_markup_pct),
          material("Downspouts (per LF)", Math.ceil(lf / 20) * 10, c("downspout_cost_per_lf", 5.5), cfg.material_markup_pct),
          material("Hangers / end caps / elbows (lot)", 1, c("gutter_hardware_cost", 65), cfg.material_markup_pct),
          material("Sealant / screws (lot)", 1, c("gutter_sealant_cost", 25), cfg.material_markup_pct),
        ];
      }
      return {
        title: `Gutters — ${a.scope} (${lf} LF)`,
        scope_of_work: `<p><strong>Gutters — ${a.scope}</strong></p><p>${a.scope} of approx ${lf} linear feet of ${a.gutter_type || "aluminum"} guttering. Includes ladder work, fastening, and cleanup.</p><p>Exclusions: fascia/soffit repair, underground drain tie-ins.</p>`,
        line_items: items,
        checklist: [
          { item: "Inspect & document existing condition", completed: false },
          { item: "Perform scope of work", completed: false },
          { item: "Flush / test downspouts", completed: false },
          { item: "Site cleanup", completed: false },
        ],
      };
    },
  },
  {
    id: "door",
    label: "Door",
    icon: "DoorClosed",
    description: "Install or replace doors",
    questions: [
      { id: "scope", label: "Install or replace?", type: "select", options: ["Install new", "Replace existing"] },
      { id: "door_type", label: "Interior or exterior?", type: "select", options: ["Interior", "Exterior"] },
      { id: "count", label: "Number of doors", type: "number", placeholder: "1" },
      { id: "prehung", label: "Pre-hung or slab?", type: "select", options: ["Pre-hung", "Slab only"] },
    ],
    params: [
      { id: "prehung_hours_per_door", label: "Pre-hung hours per door", default: 2, unit: "hr" },
      { id: "slab_hours_per_door", label: "Slab hours per door", default: 3, unit: "hr" },
      { id: "base_hours", label: "Base hours (per job)", default: 0.5, unit: "hr" },
      { id: "interior_door_cost", label: "Interior pre-hung door (raw $)", default: 120, unit: "$" },
      { id: "exterior_door_cost", label: "Exterior pre-hung door (raw $)", default: 220, unit: "$" },
      { id: "hinges_cost", label: "Hinges set (raw $)", default: 12, unit: "$" },
      { id: "interior_lockset_cost", label: "Interior knob / lockset (raw $)", default: 28, unit: "$" },
      { id: "exterior_lockset_cost", label: "Exterior knob / lockset (raw $)", default: 65, unit: "$" },
      { id: "trim_cost", label: "Trim / casing (lot)", default: 35, unit: "$" },
      { id: "shims_cost", label: "Shims / caulk / fasteners (lot)", default: 25, unit: "$" },
      { id: "haulaway_cost", label: "Old door haul-away (per door)", default: 20, unit: "$" },
    ],
    build(a, config) {
      const cfg = resolveConfig(config);
      const c = (id, d) => getCost("door", id, d, cfg);
      const count = Number(a.count) || 1;
      const hours = count * (a.prehung === "Pre-hung" ? c("prehung_hours_per_door", 2) : c("slab_hours_per_door", 3)) + c("base_hours", 0.5);
      const items = [
        labor(hours, `Labor — ${a.scope || "install"} ${count} ${a.door_type || "interior"} door(s)`, cfg.labor_rate),
        material(`${a.door_type || "Interior"} ${a.prehung || "pre-hung"} door`, count, a.door_type === "Exterior" ? c("exterior_door_cost", 220) : c("interior_door_cost", 120), cfg.material_markup_pct),
        material("Hinges (set)", count, c("hinges_cost", 12), cfg.material_markup_pct),
        material("Knob / lockset", count, a.door_type === "Exterior" ? c("exterior_lockset_cost", 65) : c("interior_lockset_cost", 28), cfg.material_markup_pct),
        material("Trim / casing (lot)", 1, c("trim_cost", 35), cfg.material_markup_pct),
        material("Shims / caulk / fasteners (lot)", 1, c("shims_cost", 25), cfg.material_markup_pct),
      ];
      if (a.scope === "Replace existing") items.push(material("Old door haul-away", count, c("haulaway_cost", 20), cfg.material_markup_pct));
      return {
        title: `${count} ${a.door_type || "Interior"} Door ${a.scope || "Install"}`,
        scope_of_work: `<p><strong>${count} ${a.door_type || "Interior"} Door ${a.scope || "Install"}</strong></p><p>${a.scope || "Install"} ${count} ${a.prehung || "pre-hung"} ${a.door_type || "interior"} door(s). Includes hardware, trim, shimming, and caulking.</p><p>Exclusions: framing/rough opening modification, custom jamb extension.</p>`,
        line_items: items,
        checklist: [
          { item: "Verify rough opening / fit", completed: false },
          { item: "Shim, plumb & secure", completed: false },
          { item: "Install hardware & trim", completed: false },
          { item: "Caulk & test operation", completed: false },
        ],
      };
    },
  },
  {
    id: "deck",
    label: "Deck / Porch",
    icon: "Hammer",
    description: "Build, repair, or replace a deck or railing",
    questions: [
      { id: "scope", label: "Scope", type: "select", options: ["New build", "Repair", "Replace boards", "Railing only"] },
      { id: "sqft", label: "Square feet (or LF for railing)", type: "number", placeholder: "200" },
      { id: "material", label: "Material", type: "select", options: ["Pressure-treated", "Composite", "Cedar"] },
    ],
    params: [
      { id: "railing_hours_per_lf", label: "Railing hours per LF", default: 0.08, unit: "hr" },
      { id: "railing_base_hours", label: "Railing base hours", default: 1, unit: "hr" },
      { id: "replace_boards_hours_per_sqft", label: "Replace boards hours per sqft", default: 0.04, unit: "hr" },
      { id: "replace_boards_base_hours", label: "Replace boards base hours", default: 1, unit: "hr" },
      { id: "repair_hours", label: "Repair labor hours (flat)", default: 4, unit: "hr" },
      { id: "new_hours_per_sqft", label: "New build hours per sqft", default: 0.08, unit: "hr" },
      { id: "new_base_hours", label: "New build base hours", default: 4, unit: "hr" },
      { id: "pt_railing_cost", label: "PT railing (raw $/LF)", default: 28, unit: "$" },
      { id: "composite_railing_cost", label: "Composite railing (raw $/LF)", default: 45, unit: "$" },
      { id: "railing_hardware_cost", label: "Railing posts / hardware (lot)", default: 85, unit: "$" },
      { id: "pt_board_cost", label: "PT deck boards (raw $/sqft)", default: 4.5, unit: "$" },
      { id: "composite_board_cost", label: "Composite deck boards (raw $/sqft)", default: 7.5, unit: "$" },
      { id: "replace_fasteners_cost", label: "Replace boards screws / fasteners (lot)", default: 45, unit: "$" },
      { id: "repair_lumber_cost", label: "Repair lumber / hardware (lot)", default: 120, unit: "$" },
      { id: "framing_lumber_cost", label: "PT framing lumber (lot, per sqft factor)", default: 1.2, unit: "$" },
      { id: "framing_lumber_min", label: "PT framing lumber minimum (lot)", default: 150, unit: "$" },
      { id: "concrete_anchors_cost", label: "Concrete / post anchors (lot)", default: 85, unit: "$" },
      { id: "joist_hangers_cost", label: "Joist hangers / hardware / fasteners (lot)", default: 95, unit: "$" },
      { id: "permit_disposal_cost", label: "Permit / debris disposal (lot)", default: 150, unit: "$" },
    ],
    build(a, config) {
      const cfg = resolveConfig(config);
      const c = (id, d) => getCost("deck", id, d, cfg);
      const sqft = Number(a.sqft) || 0;
      let hours, items;
      const boardCost = a.material === "Composite" ? c("composite_board_cost", 7.5) : c("pt_board_cost", 4.5);
      if (a.scope === "Railing only") {
        hours = sqft * c("railing_hours_per_lf", 0.08) + c("railing_base_hours", 1);
        items = [
          labor(hours, `Labor — railing (${sqft} LF)`, cfg.labor_rate),
          material(`${a.material || "PT"} railing (per LF)`, sqft, a.material === "Composite" ? c("composite_railing_cost", 45) : c("pt_railing_cost", 28), cfg.material_markup_pct),
          material("Posts / hardware (lot)", 1, c("railing_hardware_cost", 85), cfg.material_markup_pct),
        ];
      } else if (a.scope === "Replace boards") {
        hours = sqft * c("replace_boards_hours_per_sqft", 0.04) + c("replace_boards_base_hours", 1);
        items = [
          labor(hours, `Labor — replace deck boards (${sqft} sqft)`, cfg.labor_rate),
          material(`${a.material || "PT"} deck boards (sqft)`, sqft * 1.1, boardCost, cfg.material_markup_pct),
          material("Screws / fasteners (lot)", 1, c("replace_fasteners_cost", 45), cfg.material_markup_pct),
        ];
      } else if (a.scope === "Repair") {
        hours = c("repair_hours", 4);
        items = [
          labor(hours, "Labor — deck repair", cfg.labor_rate),
          material("Lumber / hardware (lot)", 1, c("repair_lumber_cost", 120), cfg.material_markup_pct),
        ];
      } else {
        hours = sqft * c("new_hours_per_sqft", 0.08) + c("new_base_hours", 4);
        items = [
          labor(hours, `Labor — new ${a.material || "PT"} deck (${sqft} sqft)`, cfg.labor_rate),
          material(`${a.material || "PT"} deck boards (sqft)`, sqft * 1.1, boardCost, cfg.material_markup_pct),
          material("Pressure-treated framing lumber (lot)", 1, Math.max(c("framing_lumber_min", 150), sqft * c("framing_lumber_cost", 1.2)), cfg.material_markup_pct),
          material("Concrete / post anchors (lot)", 1, c("concrete_anchors_cost", 85), cfg.material_markup_pct),
          material("Joist hangers / hardware / fasteners (lot)", 1, c("joist_hangers_cost", 95), cfg.material_markup_pct),
          material("Permit / debris disposal (lot)", 1, c("permit_disposal_cost", 150), cfg.material_markup_pct),
        ];
      }
      return {
        title: `Deck — ${a.scope} (${a.material || "PT"}, ${sqft} ${a.scope === "Railing only" ? "LF" : "sqft"})`,
        scope_of_work: `<p><strong>Deck — ${a.scope}</strong></p><p>${a.scope} of ${sqft} ${a.scope === "Railing only" ? "linear feet" : "sqft"} ${a.material || "pressure-treated"} deck. Includes framing/boards/hardware as scoped and cleanup.</p><p>Exclusions: roof/pergola, electrical, stain/seal (quoted separately).</p>`,
        line_items: items,
        checklist: [
          { item: "Verify footings / layout", completed: false },
          { item: "Frame / structural", completed: false },
          { item: "Install boards / railing", completed: false },
          { item: "Final inspection & cleanup", completed: false },
        ],
      };
    },
  },
  {
    id: "appliance",
    label: "Appliance Install",
    icon: "Plug",
    description: "Install or replace appliances and fixtures",
    questions: [
      { id: "appliance", label: "Appliance", type: "select", options: ["Dishwasher", "Ceiling fan", "Water heater", "Microwave / range hood", "Washer / dryer", "Other"] },
      { id: "scope", label: "New or replacement?", type: "select", options: ["New install", "Replace existing"] },
      { id: "count", label: "Quantity", type: "number", placeholder: "1" },
    ],
    params: [
      { id: "hours_dishwasher", label: "Dishwasher hours (each)", default: 1.5, unit: "hr" },
      { id: "hours_ceiling_fan", label: "Ceiling fan hours (each)", default: 1.5, unit: "hr" },
      { id: "hours_water_heater", label: "Water heater hours (each)", default: 2.5, unit: "hr" },
      { id: "hours_microwave", label: "Microwave / range hood hours (each)", default: 2, unit: "hr" },
      { id: "hours_washer_dryer", label: "Washer / dryer hours (each)", default: 1.5, unit: "hr" },
      { id: "hours_other", label: "Other hours (each)", default: 2, unit: "hr" },
      { id: "supplies_cost", label: "Installation supplies / connectors (lot)", default: 35, unit: "$" },
      { id: "haulaway_cost", label: "Old unit haul-away (each)", default: 25, unit: "$" },
    ],
    build(a, config) {
      const cfg = resolveConfig(config);
      const c = (id, d) => getCost("appliance", id, d, cfg);
      const count = Number(a.count) || 1;
      const hoursByKey = {
        "Dishwasher": "hours_dishwasher",
        "Ceiling fan": "hours_ceiling_fan",
        "Water heater": "hours_water_heater",
        "Microwave / range hood": "hours_microwave",
        "Washer / dryer": "hours_washer_dryer",
        "Other": "hours_other",
      };
      const hours = c(hoursByKey[a.appliance] || "hours_other", 2) * count;
      const items = [
        labor(hours, `Labor — ${a.scope || "install"} ${a.appliance || "appliance"} (×${count})`, cfg.labor_rate),
        material("Installation supplies / connectors / fittings (lot)", count, c("supplies_cost", 35), cfg.material_markup_pct),
      ];
      if (a.scope === "Replace existing") items.push(material("Old unit haul-away", count, c("haulaway_cost", 25), cfg.material_markup_pct));
      return {
        title: `${a.appliance || "Appliance"} ${a.scope || "Install"}`,
        scope_of_work: `<p><strong>${a.appliance || "Appliance"} ${a.scope || "Install"}</strong></p><p>${a.scope || "Install"} ${count} ${a.appliance || "appliance"}. Includes basic hookup, leveling, and test. Customer provides the appliance unless noted.</p><p>Exclusions: new dedicated circuit/plumbing runs, gas line work.</p>`,
        line_items: items,
        checklist: [
          { item: "Shut off utilities / verify connections", completed: false },
          { item: "Install & level unit", completed: false },
          { item: "Connect & test", completed: false },
          { item: "Cleanup", completed: false },
        ],
      };
    },
  },
  {
    id: "plumbing",
    label: "Plumbing",
    icon: "Wrench",
    description: "Sinks, toilets, faucets, and pipe repairs",
    questions: [
      { id: "work", label: "Type of work", type: "select", options: ["Sink/faucet", "Toilet", "Pipe repair", "Garbage disposal", "Other"] },
      { id: "count", label: "Number of fixtures", type: "number", placeholder: "1" },
      { id: "scope", label: "Install or repair?", type: "select", options: ["Install", "Repair", "Replace"] },
    ],
    params: [
      { id: "hours_sink", label: "Sink/faucet hours (each)", default: 1.5, unit: "hr" },
      { id: "hours_toilet", label: "Toilet hours (each)", default: 1.5, unit: "hr" },
      { id: "hours_pipe", label: "Pipe repair hours (each)", default: 2.5, unit: "hr" },
      { id: "hours_disposal", label: "Garbage disposal hours (each)", default: 1.5, unit: "hr" },
      { id: "hours_other", label: "Other hours (each)", default: 2, unit: "hr" },
      { id: "toilet_cost", label: "Toilet (raw $)", default: 140, unit: "$" },
      { id: "toilet_hardware_cost", label: "Wax ring / supply line / hardware (lot)", default: 25, unit: "$" },
      { id: "faucet_cost", label: "Faucet / fixture (raw $)", default: 95, unit: "$" },
      { id: "sink_hardware_cost", label: "Supply lines / drain parts / putty (lot)", default: 25, unit: "$" },
      { id: "disposal_cost", label: "Garbage disposal (raw $)", default: 130, unit: "$" },
      { id: "disposal_fittings_cost", label: "Disposal fittings / wiring (lot)", default: 25, unit: "$" },
      { id: "pipe_fittings_cost", label: "Pipe / fittings / supplies (lot)", default: 45, unit: "$" },
    ],
    build(a, config) {
      const cfg = resolveConfig(config);
      const c = (id, d) => getCost("plumbing", id, d, cfg);
      const count = Number(a.count) || 1;
      const hoursByKey = { "Sink/faucet": "hours_sink", "Toilet": "hours_toilet", "Pipe repair": "hours_pipe", "Garbage disposal": "hours_disposal", "Other": "hours_other" };
      const hours = c(hoursByKey[a.work] || "hours_other", 2) * count;
      const items = [
        labor(hours, `Labor — ${a.scope || "install"} ${a.work || "plumbing"} (×${count})`, cfg.labor_rate),
      ];
      if (a.work === "Toilet") {
        items.push(material("Toilet", count, c("toilet_cost", 140), cfg.material_markup_pct));
        items.push(material("Wax ring / supply line / hardware (lot)", count, c("toilet_hardware_cost", 25), cfg.material_markup_pct));
      } else if (a.work === "Sink/faucet") {
        items.push(material("Faucet / fixture", count, c("faucet_cost", 95), cfg.material_markup_pct));
        items.push(material("Supply lines / drain parts / putty (lot)", count, c("sink_hardware_cost", 25), cfg.material_markup_pct));
      } else if (a.work === "Garbage disposal") {
        items.push(material("Garbage disposal", count, c("disposal_cost", 130), cfg.material_markup_pct));
        items.push(material("Fittings / wiring (lot)", count, c("disposal_fittings_cost", 25), cfg.material_markup_pct));
      } else {
        items.push(material("Pipe / fittings / supplies (lot)", 1, c("pipe_fittings_cost", 45), cfg.material_markup_pct));
      }
      return {
        title: `${a.work || "Plumbing"} — ${a.scope || "Install"} (×${count})`,
        scope_of_work: `<p><strong>${a.work || "Plumbing"} — ${a.scope || "Install"}</strong></p><p>${a.scope || "Install"} ${count} ${a.work || "plumbing item"}. Includes basic hookup, leak test, and cleanup.</p><p>Exclusions: opening walls/repairing drywall, re-routing drain/water lines.</p>`,
        line_items: items,
        checklist: [
          { item: "Shut off water", completed: false },
          { item: "Perform install / repair", completed: false },
          { item: "Leak test", completed: false },
          { item: "Cleanup", completed: false },
        ],
      };
    },
  },
  {
    id: "electrical",
    label: "Electrical",
    icon: "Zap",
    description: "Outlets, switches, lights, and fans",
    questions: [
      { id: "work", label: "Type of work", type: "select", options: ["Outlet/receptacle", "Switch", "Light fixture", "Ceiling fan", "Other"] },
      { id: "count", label: "Number of fixtures", type: "number", placeholder: "1" },
      { id: "scope", label: "Install or repair?", type: "select", options: ["Install", "Repair", "Replace"] },
    ],
    params: [
      { id: "hours_outlet", label: "Outlet/receptacle hours (each)", default: 1, unit: "hr" },
      { id: "hours_switch", label: "Switch hours (each)", default: 1, unit: "hr" },
      { id: "hours_light", label: "Light fixture hours (each)", default: 1.5, unit: "hr" },
      { id: "hours_fan", label: "Ceiling fan hours (each)", default: 2, unit: "hr" },
      { id: "hours_other", label: "Other hours (each)", default: 1.5, unit: "hr" },
      { id: "device_cost", label: "Device / fixture (raw $)", default: 35, unit: "$" },
      { id: "fan_cost", label: "Ceiling fan fixture (raw $)", default: 120, unit: "$" },
      { id: "wire_hardware_cost", label: "Wire / boxes / plates / hardware (lot)", default: 20, unit: "$" },
    ],
    build(a, config) {
      const cfg = resolveConfig(config);
      const c = (id, d) => getCost("electrical", id, d, cfg);
      const count = Number(a.count) || 1;
      const hoursByKey = { "Outlet/receptacle": "hours_outlet", "Switch": "hours_switch", "Light fixture": "hours_light", "Ceiling fan": "hours_fan", "Other": "hours_other" };
      const hours = c(hoursByKey[a.work] || "hours_other", 1.5) * count;
      const items = [
        labor(hours, `Labor — ${a.scope || "install"} ${a.work || "electrical"} (×${count})`, cfg.labor_rate),
        material("Device / fixture", count, a.work === "Ceiling fan" ? c("fan_cost", 120) : c("device_cost", 35), cfg.material_markup_pct),
        material("Wire / boxes / cover plates / hardware (lot)", count, c("wire_hardware_cost", 20), cfg.material_markup_pct),
      ];
      return {
        title: `${a.work || "Electrical"} — ${a.scope || "Install"} (×${count})`,
        scope_of_work: `<p><strong>${a.work || "Electrical"} — ${a.scope || "Install"}</strong></p><p>${a.scope || "Install"} ${count} ${a.work || "electrical item"}. Includes breaker verification, device install, and test.</p><p>Exclusions: new circuit/home run, panel upgrade, opening/repairing drywall.</p>`,
        line_items: items,
        checklist: [
          { item: "Kill power / verify at device", completed: false },
          { item: "Install device / fixture", completed: false },
          { item: "Test & label", completed: false },
          { item: "Cleanup", completed: false },
        ],
      };
    },
  },
  {
    id: "general",
    label: "General Home Repairs",
    icon: "House",
    description: "Miscellaneous handyman work",
    questions: [
      { id: "description", label: "Describe the work", type: "text", placeholder: "e.g. fix drywall, hang shelves, repair trim" },
      { id: "hours", label: "Estimated labor hours", type: "number", placeholder: "3" },
      { id: "materials", label: "Estimated materials cost ($)", type: "number", placeholder: "100" },
    ],
    params: [],
    build(a, config) {
      const cfg = resolveConfig(config);
      const hours = Number(a.hours) || 2;
      const matCost = Number(a.materials) || 0;
      const items = [
        labor(hours, `Labor — ${a.description || "general repairs"}`, cfg.labor_rate),
      ];
      if (matCost > 0) items.push(material("Materials (allowance)", 1, matCost, cfg.material_markup_pct));
      return {
        title: a.description ? a.description.charAt(0).toUpperCase() + a.description.slice(1) : "General Home Repairs",
        scope_of_work: `<p><strong>General Home Repairs</strong></p><p>${a.description || "Miscellaneous handyman repairs as discussed with customer."} Estimated ${hours} hours of labor${matCost ? " plus materials allowance" : ""}.</p><p>Final materials billed at cost + ${cfg.material_markup_pct}% with receipts. Scope confirmed on site.</p>`,
        line_items: items,
        checklist: [
          { item: "Confirm scope with customer on site", completed: false },
          { item: "Perform repairs", completed: false },
          { item: "Cleanup & walk-through", completed: false },
        ],
      };
    },
  },
];

export function getJobType(id) {
  return JOB_TYPES.find(j => j.id === id);
}

// Recalculate totals from a set of line items
export function calcTotals(line_items, tax_rate = 0) {
  const subtotal = Number(line_items.reduce((s, i) => s + (i.total || 0), 0).toFixed(2));
  const taxable = Number(line_items.filter(i => i.category === "material").reduce((s, i) => s + (i.total || 0), 0).toFixed(2));
  const tax_amount = Number((taxable * ((tax_rate || 0) / 100)).toFixed(2));
  const total = Number((subtotal + tax_amount).toFixed(2));
  return { subtotal, tax_amount, total };
}
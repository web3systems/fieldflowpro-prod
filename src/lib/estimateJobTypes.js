// Job-type catalog for the New Estimate intake wizard.
// Each job type has a set of questions and a template builder that produces
// pre-populated line items, scope of work, and a checklist.
//
// Company pricing standard (Chittenden County, VT):
//   - Labor bill rate: $85/hr
//   - Material markup: 30% over cost
//
// Line item shape: { description, category, quantity, unit_price, total }

export const LABOR_RATE = 85;
export const MATERIAL_MARKUP = 0.30;

// Apply 30% markup to a material's raw cost
function mat(cost) {
  return Number((cost * (1 + MATERIAL_MARKUP)).toFixed(2));
}
// Labor line: hours × $85
function labor(hours, description = "Labor") {
  const h = Number(hours);
  return {
    description,
    category: "service",
    quantity: Number(h.toFixed(2)),
    unit_price: LABOR_RATE,
    total: Number((h * LABOR_RATE).toFixed(2)),
  };
}
// Material line
function material(description, quantity, cost) {
  const q = Number(quantity) || 0;
  const up = mat(cost);
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
    build(a) {
      const lf = Number(a.linear_ft) || 0;
      const height = Number(a.height_ft) || 6;
      const posts = Math.max(2, Math.ceil(lf / 8) + 1);
      const isReplace = a.install_type === "Replacement";
      const tearOffHours = isReplace ? lf * 0.1 : 0;
      const installHours = lf * 0.15 + tearOffHours;
      const items = [
        labor(installHours, `Labor — ${a.install_type || "install"} fence (${lf} LF × ${height}ft)`),
        material("4x4 pressure-treated posts", posts, 28),
        material("80lb concrete mix (bags)", posts, 7.5),
        material("2x4 horizontal rails", Math.ceil(lf / 8) * 2, 12),
      ];
      if (a.fence_type === "Cedar privacy" || a.fence_type === "Stockade") {
        items.push(material("Cedar pickets", Math.ceil(lf / 0.5), 6.5));
      } else if (a.fence_type === "Chain-link") {
        items.push(material("Chain-link fabric roll (per LF)", lf, 4.5));
        items.push(material("Top rail & tension wire (per LF)", lf, 3.5));
      } else if (a.fence_type === "Vinyl/PVC") {
        items.push(material("Vinyl privacy panels (8ft)", Math.ceil(lf / 8), 95));
      } else if (a.fence_type === "Split rail") {
        items.push(material("Split-rail posts", posts, 22));
        items.push(material("Split rails (2x per section)", Math.ceil(lf / 10) * 2, 14));
      } else {
        items.push(material("Fence boards/panels", Math.ceil(lf / 8), 60));
      }
      items.push(material("Screws / fasteners / hardware (lot)", 1, 45));
      if (isReplace) items.push(material("Debris haul-away & disposal", 1, 150));
      return {
        title: `${a.fence_type || "Fence"} ${a.install_type || "Install"} — ${lf} LF`,
        scope_of_work: `<p><strong>${a.fence_type || "Fence"} ${a.install_type || "Install"}</strong></p><p>Install ${lf} linear feet of ${height}ft ${a.fence_type || "fence"} at the property. Includes post setting in concrete, rail and picket/panel installation, hardware, and site cleanup${isReplace ? ". Existing fence to be removed and hauled away first." : "."}</p><p>Exclusions: gate hardware (quoted separately if needed), rock/obstruction excavation, landscape restoration beyond fence line.</p>`,
        line_items: items,
        checklist: [
          { item: "Verify property lines / utilities (Dig Safe)", completed: false },
          { item: "Set posts plumb in concrete", completed: false },
          { item: "Install rails and pickets/panels", completed: false },
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
    build(a) {
      const sqft = Number(a.sqft) || 0;
      const demoHours = a.demo === "Yes" ? sqft * 0.04 : 0;
      const installHours = sqft * (a.floor_type === "Tile" ? 0.06 : 0.035) + demoHours;
      const items = [
        labor(installHours, `Labor — ${a.floor_type || "flooring"} ${a.install_type || "install"} (${sqft} sqft)`),
      ];
      if (a.floor_type === "LVP / Laminate") {
        items.push(material("LVP/Laminate planks (sqft)", sqft * 1.1, 3.2));
        items.push(material("Underlayment (sqft)", sqft, 0.45));
      } else if (a.floor_type === "Hardwood") {
        items.push(material("Hardwood flooring (sqft)", sqft * 1.1, 6.5));
      } else if (a.floor_type === "Tile") {
        items.push(material("Tile (sqft)", sqft * 1.1, 4.5));
        items.push(material("Thinset mortar (50lb bags)", Math.ceil(sqft / 75), 32));
        items.push(material("Grout (25lb bags)", Math.ceil(sqft / 100), 22));
      } else if (a.floor_type === "Carpet") {
        items.push(material("Carpet (sqft)", sqft * 1.1, 3.5));
        items.push(material("Carpet padding (sqft)", sqft, 0.6));
      } else {
        items.push(material("Sheet vinyl (sqft)", sqft * 1.1, 2.5));
      }
      items.push(material("Transition strips / thresholds (lot)", 1, 35));
      items.push(material("Floor prep / leveling compound (lot)", 1, 60));
      if (a.demo === "Yes") items.push(material("Debris haul-away & disposal", 1, 120));
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
    build(a) {
      const sqft = Number(a.sqft) || 0;
      const squares = Math.ceil(sqft / 100);
      const isFull = a.scope === "Full replacement";
      const tearHours = isFull ? (Number(a.layers) || 1) * squares * 1.5 : 0;
      const installHours = isFull ? squares * 2.5 : 4;
      const items = [
        labor(tearHours + installHours, `Labor — roof ${a.scope || "repair"} (${sqft} sqft)`),
      ];
      if (isFull) {
        if (a.roof_type === "Asphalt shingle") {
          items.push(material("Architectural shingles (bundles)", squares * 3, 38));
          items.push(material("Synthetic underlayment (10-sq roll)", Math.ceil(squares / 10), 95));
        } else if (a.roof_type === "Metal") {
          items.push(material("Metal roofing panels (sqft)", sqft * 1.1, 3.8));
          items.push(material("Underlayment (10-sq roll)", Math.ceil(squares / 10), 95));
        } else {
          items.push(material("EPDM rubber membrane (sqft)", sqft * 1.1, 2.2));
          items.push(material("Adhesive / seam tape (lot)", 1, 120));
        }
        items.push(material("Ice & water shield (VT) (roll)", Math.ceil(squares / 5), 85));
        items.push(material("Drip edge (10ft pieces)", Math.ceil(sqft / 100 * 2), 14));
        items.push(material("Flashing / step flashing (lot)", 1, 85));
        items.push(material("Roofing nails / fasteners (lot)", 1, 45));
        items.push(material("Dumpster / debris disposal", 1, 350));
      } else {
        items.push(material("Shingles / matching material (bundle)", 2, 38));
        items.push(material("Underlayment / ice & water (roll)", 1, 85));
        items.push(material("Flashing / sealant / fasteners (lot)", 1, 65));
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
    build(a) {
      const sqft = Number(a.sqft) || 0;
      const coats = Number(a.coats) || 2;
      const prepHours = a.prep === "Full scrape & prime" ? sqft * 0.03 : a.prep === "Patch & sand" ? sqft * 0.015 : sqft * 0.005;
      const paintHours = sqft * 0.01 * coats + prepHours;
      const gallons = Math.ceil((sqft * coats) / 350);
      const items = [
        labor(paintHours, `Labor — ${a.area || "interior"} painting (${sqft} sqft, ${coats} coats)`),
      ];
      if (a.prep === "Full scrape & prime") items.push(material("Primer (gallons)", Math.ceil(sqft / 350), 32));
      items.push(material("Paint (gallons)", gallons, 45));
      items.push(material("Brushes / rollers / pans (lot)", 1, 35));
      items.push(material("Drop cloths / plastic / tape (lot)", 1, 40));
      if (a.area === "Exterior") items.push(material("Caulk / sealant (lot)", 1, 25));
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
    build(a) {
      const sqft = Number(a.sqft) || 0;
      let hours, items;
      if (a.scope === "Sealcoat") {
        hours = sqft * 0.005 + 1;
        items = [
          labor(hours, `Labor — sealcoat driveway (${sqft} sqft)`),
          material("Sealer (5-gal pails)", Math.ceil(sqft / 250), 45),
          material("Crack filler (lot)", 1, 35),
        ];
      } else if (a.scope === "Repair") {
        hours = 3;
        items = [
          labor(hours, "Labor — driveway repair / patching"),
          material("Cold patch / repair material (lot)", 1, 85),
        ];
      } else {
        hours = sqft * (a.type === "Concrete" ? 0.04 : 0.02) + 2;
        items = [
          labor(hours, `Labor — ${a.scope} ${a.type || "asphalt"} driveway (${sqft} sqft)`),
        ];
        if (a.type === "Concrete") {
          items.push(material("Concrete (per sqft)", sqft, 6.5));
          items.push(material("Rebar / mesh reinforcement (lot)", 1, 200));
          items.push(material("Forms / expansion joints (lot)", 1, 85));
        } else if (a.type === "Gravel") {
          items.push(material("Gravel / base material (per sqft)", sqft, 1.2));
          items.push(material("Compaction / grading (lot)", 1, 150));
        } else {
          items.push(material("Hot-mix asphalt (per sqft)", sqft, 4.5));
          items.push(material("Base prep / grading (lot)", 1, 250));
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
    build(a) {
      const lf = Number(a.linear_ft) || 0;
      let hours, items;
      if (a.scope === "Cleaning") {
        hours = lf * 0.02 + 1;
        items = [
          labor(hours, `Labor — gutter cleaning (${lf} LF)`),
          material("Debris bag-out / disposal (lot)", 1, 35),
        ];
      } else if (a.scope === "Repair") {
        hours = 2;
        items = [
          labor(hours, "Labor — gutter repair / re-securing"),
          material("Hangers / screws / sealant (lot)", 1, 45),
        ];
      } else {
        hours = lf * 0.05 + 1;
        items = [
          labor(hours, `Labor — gutter replacement (${lf} LF)`),
          material(`${a.gutter_type || "5\" aluminum"} gutter (per LF)`, lf, 4.5),
          material("Downspouts (per LF)", Math.ceil(lf / 20) * 10, 5.5),
          material("Hangers / end caps / elbows (lot)", 1, 65),
          material("Sealant / screws (lot)", 1, 25),
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
    build(a) {
      const count = Number(a.count) || 1;
      const hours = count * (a.prehung === "Pre-hung" ? 2 : 3) + 0.5;
      const items = [
        labor(hours, `Labor — ${a.scope || "install"} ${count} ${a.door_type || "interior"} door(s)`),
        material(`${a.door_type || "Interior"} ${a.prehung || "pre-hung"} door`, count, a.door_type === "Exterior" ? 220 : 120),
        material("Hinges (set)", count, 12),
        material("Knob / lockset", count, a.door_type === "Exterior" ? 65 : 28),
        material("Trim / casing (lot)", 1, 35),
        material("Shims / caulk / fasteners (lot)", 1, 25),
      ];
      if (a.scope === "Replace existing") items.push(material("Old door haul-away", count, 20));
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
    build(a) {
      const sqft = Number(a.sqft) || 0;
      let hours, items;
      if (a.scope === "Railing only") {
        hours = sqft * 0.08 + 1;
        items = [
          labor(hours, `Labor — railing (${sqft} LF)`),
          material(`${a.material || "PT"} railing (per LF)`, sqft, a.material === "Composite" ? 45 : 28),
          material("Posts / hardware (lot)", 1, 85),
        ];
      } else if (a.scope === "Replace boards") {
        hours = sqft * 0.04 + 1;
        items = [
          labor(hours, `Labor — replace deck boards (${sqft} sqft)`),
          material(`${a.material || "PT"} deck boards (sqft)`, sqft * 1.1, a.material === "Composite" ? 7.5 : 4.5),
          material("Screws / fasteners (lot)", 1, 45),
        ];
      } else if (a.scope === "Repair") {
        hours = 4;
        items = [
          labor(hours, "Labor — deck repair"),
          material("Lumber / hardware (lot)", 1, 120),
        ];
      } else {
        hours = sqft * 0.08 + 4;
        items = [
          labor(hours, `Labor — new ${a.material || "PT"} deck (${sqft} sqft)`),
          material(`${a.material || "PT"} deck boards (sqft)`, sqft * 1.1, a.material === "Composite" ? 7.5 : 4.5),
          material("Pressure-treated framing lumber (lot)", 1, Math.max(150, sqft * 1.2)),
          material("Concrete / post anchors (lot)", 1, 85),
          material("Joist hangers / hardware / fasteners (lot)", 1, 95),
          material("Permit / debris disposal (lot)", 1, 150),
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
    build(a) {
      const count = Number(a.count) || 1;
      const hoursByType = { "Dishwasher": 1.5, "Ceiling fan": 1.5, "Water heater": 2.5, "Microwave / range hood": 2, "Washer / dryer": 1.5, "Other": 2 };
      const hours = (hoursByType[a.appliance] || 2) * count;
      const items = [
        labor(hours, `Labor — ${a.scope || "install"} ${a.appliance || "appliance"} (×${count})`),
        material("Installation supplies / connectors / fittings (lot)", count, 35),
      ];
      if (a.scope === "Replace existing") items.push(material("Old unit haul-away", count, 25));
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
    build(a) {
      const count = Number(a.count) || 1;
      const hoursByWork = { "Sink/faucet": 1.5, "Toilet": 1.5, "Pipe repair": 2.5, "Garbage disposal": 1.5, "Other": 2 };
      const hours = (hoursByWork[a.work] || 2) * count;
      const items = [
        labor(hours, `Labor — ${a.scope || "install"} ${a.work || "plumbing"} (×${count})`),
      ];
      if (a.work === "Toilet") {
        items.push(material("Toilet", count, 140));
        items.push(material("Wax ring / supply line / hardware (lot)", count, 25));
      } else if (a.work === "Sink/faucet") {
        items.push(material("Faucet / fixture", count, 95));
        items.push(material("Supply lines / drain parts / putty (lot)", count, 25));
      } else if (a.work === "Garbage disposal") {
        items.push(material("Garbage disposal", count, 130));
        items.push(material("Fittings / wiring (lot)", count, 25));
      } else {
        items.push(material("Pipe / fittings / supplies (lot)", 1, 45));
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
    build(a) {
      const count = Number(a.count) || 1;
      const hoursByWork = { "Outlet/receptacle": 1, "Switch": 1, "Light fixture": 1.5, "Ceiling fan": 2, "Other": 1.5 };
      const hours = (hoursByWork[a.work] || 1.5) * count;
      const items = [
        labor(hours, `Labor — ${a.scope || "install"} ${a.work || "electrical"} (×${count})`),
        material("Device / fixture", count, a.work === "Ceiling fan" ? 120 : 35),
        material("Wire / boxes / cover plates / hardware (lot)", count, 20),
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
    build(a) {
      const hours = Number(a.hours) || 2;
      const matCost = Number(a.materials) || 0;
      const items = [
        labor(hours, `Labor — ${a.description || "general repairs"}`),
      ];
      if (matCost > 0) items.push(material("Materials (allowance)", 1, matCost));
      return {
        title: a.description ? a.description.charAt(0).toUpperCase() + a.description.slice(1) : "General Home Repairs",
        scope_of_work: `<p><strong>General Home Repairs</strong></p><p>${a.description || "Miscellaneous handyman repairs as discussed with customer."} Estimated ${hours} hours of labor${matCost ? " plus materials allowance" : ""}.</p><p>Final materials billed at cost + 30% with receipts. Scope confirmed on site.</p>`,
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
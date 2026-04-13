import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SERVICE_TREE = {
  "Labor": ["General Labor", "Skilled Labor", "Supervision"],
  "Installation": ["Flooring", "Cabinets & Millwork", "Doors & Windows", "Roofing", "Siding"],
  "Painting": ["Interior Painting", "Exterior Painting", "Staining & Finishing"],
  "Plumbing Services": ["Rough-In", "Finish Plumbing", "Drain & Sewer"],
  "Electrical Services": ["Rough-In Wiring", "Panel & Service", "Finish Electrical", "Low Voltage"],
  "HVAC Services": ["Ductwork", "Equipment Install", "Service & Repair"],
  "Cleaning": ["Post-Construction", "Pressure Washing", "Window Cleaning"],
  "Inspection & Consulting": ["Site Visit", "Estimate", "Code Compliance"],
  "Other": ["Miscellaneous"],
};

const MATERIAL_TREE = {
  "Lumber": ["Plywood & Sheathing", "Posts & Beams", "Dimensional Lumber (2x4, 2x6, etc.)", "Trim & Molding", "Engineered Wood"],
  "Concrete & Masonry": ["Concrete Mix", "Block & Brick", "Stucco & Mortar", "Rebar & Wire"],
  "Plumbing": ["PVC Pipe & Fittings", "Copper Pipe & Fittings", "PEX Tubing", "Valves & Controls", "Fixtures"],
  "Electrical": ["Wire & Cable", "Conduit", "Boxes & Devices", "Panels & Breakers", "Fixtures & Lighting"],
  "HVAC": ["Ductwork", "Insulation", "Vents & Registers", "Equipment"],
  "Roofing": ["Shingles", "Underlayment", "Flashing", "Gutters & Downspouts"],
  "Flooring": ["Hardwood", "Tile", "Laminate & LVP", "Carpet", "Subfloor"],
  "Drywall & Insulation": ["Drywall Sheets", "Joint Compound", "Tape & Beads", "Batt Insulation", "Rigid Foam"],
  "Doors & Windows": ["Interior Doors", "Exterior Doors", "Windows", "Hardware"],
  "Paint & Finishes": ["Interior Paint", "Exterior Paint", "Primer", "Stain & Sealer", "Caulk & Adhesive"],
  "Hardware & Fasteners": ["Nails & Screws", "Anchors & Bolts", "Straps & Connectors", "Hinges & Brackets"],
  "Landscaping": ["Soil & Mulch", "Pavers & Stone", "Plants & Sod", "Irrigation"],
  "Other": ["Miscellaneous"],
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { company_id } = await req.json();
    if (!company_id) return Response.json({ error: 'company_id required' }, { status: 400 });

    // Fetch all items that lack category/subcategory
    const allItems = await base44.asServiceRole.entities.Service.filter({ company_id });
    const toMigrate = allItems.filter(s => !s.category || !s.subcategory);

    if (toMigrate.length === 0) return Response.json({ migrated: 0, message: 'All items already categorized.' });

    // Ask AI to classify each item
    const prompt = `You are a construction/home-improvement supply catalog expert.
Classify each item below into the correct group and section from the provided trees.

SERVICE TREE (for item_type="service" or missing item_type):
${JSON.stringify(SERVICE_TREE, null, 2)}

MATERIAL TREE (for item_type="material"):
${JSON.stringify(MATERIAL_TREE, null, 2)}

Items to classify:
${toMigrate.map(s => `id:${s.id} | type:${s.item_type || 'service'} | name:${s.name} | desc:${s.description || ''}`).join('\n')}

Return a JSON array where each element is: { "id": "<id>", "item_type": "service"|"material", "category": "<group>", "subcategory": "<section>" }
Only use groups and sections that exist in the trees above. Default to "Other" / "Miscellaneous" if unsure.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                item_type: { type: "string" },
                category: { type: "string" },
                subcategory: { type: "string" }
              }
            }
          }
        }
      }
    });

    const classified = result?.items || [];
    let migrated = 0;

    for (const c of classified) {
      await base44.asServiceRole.entities.Service.update(c.id, {
        item_type: c.item_type,
        category: c.category,
        subcategory: c.subcategory,
      });
      migrated++;
    }

    return Response.json({ migrated, total: toMigrate.length });
  } catch (error) {
    console.error('migratePriceBookItems error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
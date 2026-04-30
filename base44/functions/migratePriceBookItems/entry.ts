import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Old Services page used these category values
// Map them deterministically to item_type + price book group/section
const LEGACY_CATEGORY_MAP = {
  "Labor":     { item_type: "service",  category: "Labor",    subcategory: "General Labor" },
  "Recurring": { item_type: "service",  category: "Other",    subcategory: "Miscellaneous" },
  "Materials": { item_type: "material", category: "Other",    subcategory: "Miscellaneous" },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { company_id } = await req.json();
    if (!company_id) return Response.json({ error: 'company_id required' }, { status: 400 });

    const allItems = await base44.asServiceRole.entities.Service.filter({ company_id });

    // Items that need migration: missing item_type (created via old Services page)
    const toMigrate = allItems.filter(s => !s.item_type);

    if (toMigrate.length === 0) {
      return Response.json({ migrated: 0, message: 'All items already categorized.' });
    }

    let migrated = 0;
    for (const item of toMigrate) {
      const mapping = LEGACY_CATEGORY_MAP[item.category] || LEGACY_CATEGORY_MAP["Labor"];
      await base44.asServiceRole.entities.Service.update(item.id, {
        item_type: mapping.item_type,
        category: mapping.category,
        subcategory: mapping.subcategory,
      });
      migrated++;
    }

    return Response.json({ migrated, total: toMigrate.length });
  } catch (error) {
    console.error('migratePriceBookItems error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
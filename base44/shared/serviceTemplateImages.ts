const root = 'https://media.base44.com/images/public/69b20e4261ce8a3e5bf093b0/';
export const serviceTemplateImages = {
  cleaning: { id: 'template-cleaning-hero', url: root + '314a48559_generated_image.png', alt: 'Illustrative cleaning professional caring for a bright modern kitchen' },
  handyman: { id: 'template-handyman-hero', url: root + '9a834b70b_generated_image.png', alt: 'Illustrative handyman installing a wooden shelf in a modern home' },
  roofing: { id: 'template-roofing-hero', url: root + '1ea60c53d_generated_image.png', alt: 'Illustrative home with a charcoal shingle roof and landscaped garden' },
  landscaping: { id: 'template-landscaping-hero', url: root + '9c79be553_generated_image.png', alt: 'Illustrative landscaped garden with a stone path and ornamental planting' },
  electrician: { id: 'template-electrician-hero', url: root + 'd76aa4472_generated_image.png', alt: 'Illustrative electrician inspecting a light fitting at an organized workbench' },
  plumbing: { id: 'template-plumbing-hero', url: root + 'd741ba26d_generated_image.png', alt: 'Illustrative plumber inspecting plumbing beneath a kitchen sink' },
  hvac: { id: 'template-hvac-hero', url: root + '581fb400d_generated_image.png', alt: 'Illustrative HVAC technician inspecting an outdoor air conditioning unit' },
  painting: { id: 'template-painting-hero', url: root + '2f42518b6_generated_image.png', alt: 'Illustrative painter applying sage paint in a light-filled room' },
  'pest-control': { id: 'template-pest-control-hero', url: root + '443ce3275_generated_image.png', alt: 'Illustrative pest inspection professional examining a home exterior' }
};
const byId = Object.fromEntries(Object.values(serviceTemplateImages).map(image => [image.id, image]));
export function getTemplateImage(id) { return Object.hasOwn(byId, id) ? byId[id] : undefined; }
export function templateImageAssets(document) {
  const blocks = [...document.pages.flatMap(p => p.blocks), ...(document.reusable || [])];
  return Object.fromEntries(blocks.filter(b => getTemplateImage(b.image_id)).map(b => [b.image_id, getTemplateImage(b.image_id).url]));
}
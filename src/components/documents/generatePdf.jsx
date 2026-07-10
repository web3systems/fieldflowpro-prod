import { jsPDF } from "jspdf";

// HoneyDo brand accent
const HONEYDO_GREEN = "#00c98d";
const LOGO_URL = "https://media.base44.com/images/public/69bd1fd514691e4ffa163087/3bbb62e9f_honey-doLogoHi-res.png";

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 201, b: 141 };
}

async function loadImageAsBase64(url) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function buildInvoiceHeader(doc, company, logoBase64, accentRgb) {
  const { r, g, b } = accentRgb;

  // Top green accent bar
  doc.setFillColor(r, g, b);
  doc.rect(0, 0, 210, 4, "F");

  // Logo top-left
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", 16, 10, 40, 20, undefined, "FAST");
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(r, g, b);
    doc.text(company?.name || "", 16, 24);
  }

  // Company info top-right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(company?.name || "", 194, 14, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  let cy = 20;
  if (company?.address) { doc.text(company.address, 194, cy, { align: "right" }); cy += 4.5; }
  if (company?.city || company?.state) {
    doc.text(`${company.city || ""}${company.state ? ", " + company.state : ""} ${company.zip || ""}`.trim(), 194, cy, { align: "right" });
    cy += 4.5;
  }
  if (company?.phone) { doc.text(company.phone, 194, cy, { align: "right" }); cy += 4.5; }
  if (company?.email) { doc.text(company.email, 194, cy, { align: "right" }); }

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(16, 36, 194, 36);

  return 44;
}

function buildDocumentMeta(doc, docType, docNumber, issuedDate, dueOrValidDate, dueLabel, status, customer, accentRgb, startY) {
  const { r, g, b } = accentRgb;
  let y = startY;

  // Doc type title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(r, g, b);
  doc.text(docType, 16, y);

  // Meta block (right side)
  const metaX = 130;
  const valX = 194;
  doc.setFontSize(8);

  const rows = [
    [`${docType} #:`, docNumber || "—"],
    ["Date:", issuedDate || "—"],
    [dueLabel, dueOrValidDate || "—"],
    ["Status:", (status || "draft").toUpperCase()],
  ];

  let metaY = y - 6;
  rows.forEach(([label, val]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text(label, metaX, metaY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    doc.text(val, valX, metaY, { align: "right" });
    metaY += 5.5;
  });

  y += 10;

  // Bill To box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(16, y, 80, 34, 2, 2, "F");
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(16, y, 80, 34, 2, 2, "S");

  // Green left accent strip
  doc.setFillColor(r, g, b);
  doc.roundedRect(16, y, 3, 34, 1, 1, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(r, g, b);
  doc.text(docType === "INVOICE" ? "BILL TO" : "PREPARED FOR", 22, y + 6);

  let byY = y + 12;
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  if (customer) {
    const name = customer.business_name || `${customer.first_name || ""} ${customer.last_name || ""}`.trim();
    doc.setFont("helvetica", "bold");
    doc.text(name || "—", 22, byY); byY += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    if (customer.email) { doc.text(customer.email, 22, byY); byY += 4.5; }
    if (customer.phone) { doc.text(customer.phone, 22, byY); byY += 4.5; }
    const addr = [customer.address, customer.city, customer.state].filter(Boolean).join(", ");
    if (addr) { doc.text(addr, 22, byY); }
  }

  y += 42;
  return y;
}

function buildLineItemsTable(doc, lineItems, startY, accentRgb) {
  const { r, g, b } = accentRgb;
  let y = startY;

  // Table header
  doc.setFillColor(r, g, b);
  doc.rect(16, y - 5, 178, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("DESCRIPTION", 20, y);
  doc.text("QTY", 122, y, { align: "right" });
  doc.text("UNIT PRICE", 158, y, { align: "right" });
  doc.text("AMOUNT", 192, y, { align: "right" });
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const DESC_LINE_H = 5;   // mm per line at 9pt
  const NOTE_LINE_H = 4.2; // mm per line at 7.5pt
  const ROW_PAD = 5;        // top + bottom padding per row

  (lineItems || []).forEach((item, idx) => {
    const descLines = doc.splitTextToSize(item.description || "—", 88);
    const noteText = item.notes || item.comments || "";
    const noteLines = noteText ? doc.splitTextToSize(noteText, 86) : [];
    const rowHeight = ROW_PAD + descLines.length * DESC_LINE_H + (noteLines.length > 0 ? noteLines.length * NOTE_LINE_H + 2 : 0) + ROW_PAD;

    // Page break BEFORE drawing the row if it won't fit
    if (y + rowHeight > 272) { doc.addPage(); y = 20; }

    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(16, y, 178, rowHeight, "F");
    }

    const textY = y + ROW_PAD;

    // Description
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(descLines, 20, textY);

    // Notes in italic gray below description
    if (noteLines.length > 0) {
      const noteY = textY + descLines.length * DESC_LINE_H + 2;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(120, 130, 150);
      doc.text(noteLines, 20, noteY);
    }

    // Qty / Unit price / Total — aligned to first description line
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(String(item.quantity ?? 1), 122, textY, { align: "right" });
    doc.text(`$${(item.unit_price || 0).toFixed(2)}`, 158, textY, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(`$${(item.total || 0).toFixed(2)}`, 192, textY, { align: "right" });

    y += rowHeight;

    // Row divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(16, y, 194, y);
  });

  y += 4;
  return y;
}

function buildTotals(doc, data, startY, accentRgb) {
  const { r, g, b } = accentRgb;
  let y = startY;

  doc.setFontSize(9);
  const labelX = 148;
  const valX = 192;

  const addRow = (label, value, colorOverride) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(label, labelX, y);
    doc.setTextColor(...(colorOverride || [30, 41, 59]));
    doc.text(value, valX, y, { align: "right" });
    y += 5.5;
  };

  addRow("Subtotal:", `$${(data.subtotal || 0).toFixed(2)}`);
  if (data.tax_amount > 0) addRow(`Tax (${data.tax_rate || 0}%):`, `$${(data.tax_amount || 0).toFixed(2)}`);
  if (data.discount > 0) addRow("Discount:", `-$${(data.discount || 0).toFixed(2)}`, [220, 38, 38]);

  // Total box
  doc.setFillColor(r, g, b);
  doc.roundedRect(130, y - 1, 64, 10, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL", 135, y + 6);
  doc.text(`$${(data.total || 0).toFixed(2)}`, valX, y + 6, { align: "right" });

  return y + 20;
}

function buildScopeOfWork(doc, scopeHtml, startY, accentRgb) {
  if (!scopeHtml) return startY;
  // Strip HTML tags to plain text
  const plain = scopeHtml
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!plain) return startY;

  const { r, g, b } = accentRgb;
  let y = startY;

  // Section page break if needed
  if (y > 230) { doc.addPage(); y = 20; }

  // Section header bar
  doc.setFillColor(r, g, b);
  doc.rect(16, y - 4, 178, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("SCOPE OF WORK", 20, y + 0.5);
  y += 10;

  // Body
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  const paragraphs = plain.split("\n");
  paragraphs.forEach(para => {
    if (!para.trim()) { y += 3; return; }
    const lines = doc.splitTextToSize(para.trim(), 170);
    if (y + lines.length * 5 > 272) { doc.addPage(); y = 20; }
    doc.text(lines, 20, y);
    y += lines.length * 5 + 2;
  });

  return y + 6;
}

function buildFooter(doc, company, accentRgb) {
  const { r, g, b } = accentRgb;
  const footerY = 278;

  doc.setDrawColor(r, g, b);
  doc.setLineWidth(0.5);
  doc.line(16, footerY - 4, 194, footerY - 4);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Thank you for your business! For questions, please contact us.", 105, footerY, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(180, 188, 200);
  doc.text(`${company?.name || ""} • Generated ${new Date().toLocaleDateString()}`, 105, footerY + 5, { align: "center" });
}

// ─── Public exports ──────────────────────────────────────────────────────────

export async function downloadInvoicePdf(invoice, customer, company) {
  const doc = new jsPDF();
  const accentRgb = hexToRgb(HONEYDO_GREEN);
  const logoBase64 = await loadImageAsBase64(LOGO_URL);

  let y = buildInvoiceHeader(doc, company, logoBase64, accentRgb);

  y = buildDocumentMeta(
    doc,
    "INVOICE",
    invoice.invoice_number || "",
    invoice.created_date ? new Date(invoice.created_date).toLocaleDateString() : "—",
    invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "—",
    "Due Date:",
    invoice.status || "draft",
    customer,
    accentRgb,
    y
  );

  y = buildLineItemsTable(doc, invoice.line_items, y, accentRgb);
  y = buildTotals(doc, invoice, y, accentRgb);

  if (invoice.scope_of_work) {
    y = buildScopeOfWork(doc, invoice.scope_of_work, y, accentRgb);
  }

  if (invoice.notes) {
    if (y > 258) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("NOTES", 16, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 95, 115);
    y += 4;
    doc.text(doc.splitTextToSize(invoice.notes, 170), 16, y);
  }

  buildFooter(doc, company, accentRgb);
  doc.save(`Invoice-${invoice.invoice_number || "draft"}.pdf`);
}

export async function downloadEstimatePdf(estimate, customer, company) {
  const doc = new jsPDF();
  const accentHex = company?.primary_color || HONEYDO_GREEN;
  const accentRgb = hexToRgb(accentHex);
  const logoBase64 = await loadImageAsBase64(LOGO_URL);

  let y = buildInvoiceHeader(doc, company, logoBase64, accentRgb);

  if (estimate.title) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(estimate.title, 16, y);
    y += 8;
  }

  y = buildDocumentMeta(
    doc,
    "ESTIMATE",
    estimate.estimate_number || "",
    estimate.created_date ? new Date(estimate.created_date).toLocaleDateString() : "—",
    estimate.valid_until ? new Date(estimate.valid_until).toLocaleDateString() : "—",
    "Valid Until:",
    estimate.status || "draft",
    customer,
    accentRgb,
    y
  );

  const options = estimate.options?.length > 0 ? estimate.options : null;

  if (options) {
    options.forEach((option, index) => {
      if (index > 0) {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.setLineDashPattern([2, 2], 0);
        doc.line(16, y, 194, y);
        doc.setLineDashPattern([], 0);
        y += 6;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text(`Option ${index + 1}: ${option.name || ""}`, 16, y);
      y += 5;

      if (option.notes) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        const noteLines = doc.splitTextToSize(option.notes, 170);
        // Page break if the notes block won't fit
        if (y + noteLines.length * 4.5 > 272) { doc.addPage(); y = 20; }
        doc.text(noteLines, 16, y);
        y += noteLines.length * 4.5 + 4; // advance by actual rendered height
      }

      y += 3;
      y = buildLineItemsTable(doc, option.line_items, y, accentRgb);
      y = buildTotals(doc, option, y, accentRgb);
      y += 4;
    });
  } else {
    y = buildLineItemsTable(doc, estimate.line_items, y, accentRgb);
    y = buildTotals(doc, estimate, y, accentRgb);
  }

  // Scope of Work section (after all line items / totals)
  if (estimate.scope_of_work) {
    y = buildScopeOfWork(doc, estimate.scope_of_work, y, accentRgb);
  }

  // Only show the top-level notes block if there are no options (option notes are already
  // rendered inline above each option's table — showing them again here would duplicate content).
  const hasOptions = estimate.options?.length > 0;
  if (estimate.notes && !hasOptions) {
    if (y > 258) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("NOTES", 16, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 95, 115);
    y += 4;
    doc.text(doc.splitTextToSize(estimate.notes, 170), 16, y);
  }

  buildFooter(doc, company, accentRgb);
  doc.save(`Estimate-${estimate.estimate_number || "draft"}.pdf`);
}
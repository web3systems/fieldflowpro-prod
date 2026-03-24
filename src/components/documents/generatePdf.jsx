import { jsPDF } from "jspdf";

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 37, g: 99, b: 235 };
}

function buildHeader(doc, docType, docNumber, company, accentHex) {
  const { r, g, b } = hexToRgb(accentHex || "#2563eb");
  doc.setFillColor(r, g, b);
  doc.rect(0, 0, 210, 38, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(company?.name || "", 20, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(docType, 190, 14, { align: "right" });
  doc.setFontSize(9);
  doc.text(docNumber || "", 190, 22, { align: "right" });

  const contact = [company?.phone, company?.email].filter(Boolean).join("  •  ");
  if (contact) {
    doc.setFontSize(8);
    doc.text(contact, 20, 30);
  }
}

function buildLineItemsTable(doc, lineItems, startY) {
  let y = startY;

  doc.setFillColor(241, 245, 249);
  doc.rect(16, y - 5, 178, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("DESCRIPTION", 20, y);
  doc.text("QTY", 122, y, { align: "right" });
  doc.text("UNIT PRICE", 155, y, { align: "right" });
  doc.text("AMOUNT", 190, y, { align: "right" });
  y += 5;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(16, y, 194, y);
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  (lineItems || []).forEach((item, idx) => {
    if (y > 265) { doc.addPage(); y = 20; }
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(16, y - 4, 178, 7, "F");
    }
    const descLines = doc.splitTextToSize(item.description || "—", 88);
    doc.text(descLines, 20, y);
    doc.text(String(item.quantity ?? 1), 122, y, { align: "right" });
    doc.text(`$${(item.unit_price || 0).toFixed(2)}`, 155, y, { align: "right" });
    doc.text(`$${(item.total || 0).toFixed(2)}`, 190, y, { align: "right" });
    y += descLines.length > 1 ? descLines.length * 4.5 + 2 : 7;
  });

  y += 2;
  doc.setDrawColor(226, 232, 240);
  doc.line(16, y, 194, y);
  return y + 5;
}

function buildTotals(doc, data, startY, accentHex) {
  let y = startY;
  const { r, g, b } = hexToRgb(accentHex || "#2563eb");

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  doc.setTextColor(71, 85, 105);
  doc.text("Subtotal:", 148, y);
  doc.setTextColor(30, 41, 59);
  doc.text(`$${(data.subtotal || 0).toFixed(2)}`, 190, y, { align: "right" });
  y += 5.5;

  if (data.tax_amount > 0) {
    doc.setTextColor(71, 85, 105);
    doc.text(`Tax (${data.tax_rate || 0}%):`, 148, y);
    doc.setTextColor(30, 41, 59);
    doc.text(`$${(data.tax_amount || 0).toFixed(2)}`, 190, y, { align: "right" });
    y += 5.5;
  }

  if (data.discount > 0) {
    doc.setTextColor(71, 85, 105);
    doc.text("Discount:", 148, y);
    doc.setTextColor(239, 68, 68);
    doc.text(`-$${(data.discount || 0).toFixed(2)}`, 190, y, { align: "right" });
    y += 5.5;
  }

  doc.setFillColor(r, g, b);
  doc.roundedRect(130, y - 1, 64, 10, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL", 135, y + 6);
  doc.text(`$${(data.total || 0).toFixed(2)}`, 190, y + 6, { align: "right" });

  return y + 18;
}

export function downloadInvoicePdf(invoice, customer, company) {
  const doc = new jsPDF();
  const accent = company?.primary_color || "#2563eb";

  buildHeader(doc, "INVOICE", invoice.invoice_number || "", company, accent);

  let y = 48;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("BILL TO", 20, y);
  doc.text("INVOICE DETAILS", 120, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  let leftY = y;
  if (customer) {
    doc.setFont("helvetica", "bold");
    doc.text(`${customer.first_name || ""} ${customer.last_name || ""}`, 20, leftY); leftY += 5;
    doc.setFont("helvetica", "normal");
    if (customer.email) { doc.text(customer.email, 20, leftY); leftY += 4.5; }
    if (customer.phone) { doc.text(customer.phone, 20, leftY); leftY += 4.5; }
    if (customer.address) { doc.text(customer.address, 20, leftY); leftY += 4.5; }
    if (customer.city) { doc.text(`${customer.city}${customer.state ? `, ${customer.state}` : ""}`, 20, leftY); }
  }

  const details = [
    ["Invoice #:", invoice.invoice_number || "—"],
    ["Date:", invoice.created_date ? new Date(invoice.created_date).toLocaleDateString() : "—"],
    ["Due Date:", invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "—"],
    ["Status:", (invoice.status || "draft").toUpperCase()],
  ];
  details.forEach(([label, val], i) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text(label, 120, y + i * 5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    doc.text(val, 155, y + i * 5.5);
  });

  y = Math.max(leftY + 4, y + details.length * 5.5 + 4) + 6;
  y = buildLineItemsTable(doc, invoice.line_items, y);
  y = buildTotals(doc, invoice, y, accent);

  if (invoice.notes) {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("NOTES", 20, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    y += 4;
    doc.text(doc.splitTextToSize(invoice.notes, 130), 20, y);
  }

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`${company?.name || ""} • Generated ${new Date().toLocaleDateString()}`, 105, 288, { align: "center" });

  doc.save(`Invoice-${invoice.invoice_number || "draft"}.pdf`);
}

export function downloadEstimatePdf(estimate, customer, company) {
  const doc = new jsPDF();
  const accent = company?.primary_color || "#059669";

  buildHeader(doc, "ESTIMATE", estimate.estimate_number || "", company, accent);

  let y = 48;

  if (estimate.title) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text(estimate.title, 20, y);
    y += 9;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("PREPARED FOR", 20, y);
  doc.text("ESTIMATE DETAILS", 120, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  let leftY = y;
  if (customer) {
    doc.setFont("helvetica", "bold");
    doc.text(`${customer.first_name || ""} ${customer.last_name || ""}`, 20, leftY); leftY += 5;
    doc.setFont("helvetica", "normal");
    if (customer.email) { doc.text(customer.email, 20, leftY); leftY += 4.5; }
    if (customer.phone) { doc.text(customer.phone, 20, leftY); leftY += 4.5; }
    if (customer.address) { doc.text(customer.address, 20, leftY); }
  }

  const details = [
    ["Estimate #:", estimate.estimate_number || "—"],
    ["Date:", estimate.created_date ? new Date(estimate.created_date).toLocaleDateString() : "—"],
    ["Valid Until:", estimate.valid_until ? new Date(estimate.valid_until).toLocaleDateString() : "—"],
    ["Status:", (estimate.status || "draft").toUpperCase()],
  ];
  details.forEach(([label, val], i) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text(label, 120, y + i * 5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    doc.text(val, 155, y + i * 5.5);
  });

  y = Math.max(leftY + 4, y + details.length * 5.5 + 4) + 6;

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

      // Option header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text(`Option ${index + 1}: ${option.name || ''}`, 20, y);
      y += 5;

      if (option.notes) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(doc.splitTextToSize(option.notes, 170), 20, y);
        y += 5;
      }

      y += 3;
      y = buildLineItemsTable(doc, option.line_items, y);
      y = buildTotals(doc, option, y, accent);
      y += 4;
    });
  } else {
    y = buildLineItemsTable(doc, estimate.line_items, y);
    y = buildTotals(doc, estimate, y, accent);
  }

  if (estimate.notes) {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("NOTES", 20, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    y += 4;
    doc.text(doc.splitTextToSize(estimate.notes, 130), 20, y);
  }

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`${company?.name || ""} • Generated ${new Date().toLocaleDateString()}`, 105, 288, { align: "center" });

  doc.save(`Estimate-${estimate.estimate_number || "draft"}.pdf`);
}
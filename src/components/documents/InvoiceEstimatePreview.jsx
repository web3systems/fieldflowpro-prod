import React from 'react';
import { format } from 'date-fns';

export default function InvoiceEstimatePreview({ 
  document, 
  customer, 
  company, 
  type = 'invoice',
  template
}) {
  if (!document || !customer || !company) {
    return <div className="p-8 text-center text-slate-500">Loading document...</div>;
  }

  const primaryColor = template?.header_color || company?.primary_color || '#3b82f6';
  const accentColor = template?.accent_color || '#1e293b';
  const logoUrl = template?.logo_url || company?.logo_url;
  const companyPhone = template?.company_phone || company?.phone;
  const companyEmail = template?.company_email || company?.email;
  const footerText = template?.footer_text;

  const lineItems = document.options?.[0]?.line_items || document.line_items || [];
  const subtotal = document.subtotal || 0;
  const taxAmount = document.tax_amount || 0;
  const discount = document.discount || 0;
  const total = document.total || 0;

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '59, 130, 246';
  };

  const rgb = hexToRgb(primaryColor);

  return (
    <div className="bg-white p-8 max-w-4xl mx-auto">
      <div className="flex gap-0" style={{ minHeight: '600px' }}>
        {/* Left Sidebar */}
        <div 
          className="w-32 flex flex-col items-center py-8 px-4"
          style={{ backgroundColor: primaryColor }}
        >
          {logoUrl && (
            <img 
              src={logoUrl} 
              alt={company.name} 
              className="w-24 h-24 object-contain mb-4"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          )}
          <div className="text-white text-center text-xs mt-4">
            <p className="font-bold text-sm">{company.name}</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 px-8 py-8 flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-start mb-12">
            <div>
              <h1 className="text-4xl font-bold" style={{ color: accentColor }}>
                {type.toUpperCase()}
              </h1>
            </div>
            <div className="text-right text-sm space-y-2" style={{ color: accentColor }}>
              <div>
                <p className="font-semibold">{type === 'estimate' ? 'Estimate To:' : 'Invoice To:'}</p>
                <p className="font-bold">{customer.first_name} {customer.last_name}</p>
                <p>{customer.address}</p>
                <p>{customer.city}, {customer.state} {customer.zip}</p>
              </div>
            </div>
          </div>

          {/* Document Details */}
          <div className="grid grid-cols-2 gap-8 mb-12">
            <div />
            <div className="text-right text-sm space-y-1" style={{ color: accentColor }}>
              {document.estimate_number && (
                <>
                  <p><span className="font-semibold">{type === 'estimate' ? 'Estimate' : 'Invoice'} No:</span> {document.estimate_number}</p>
                </>
              )}
              {document.due_date && (
                <p><span className="font-semibold">Due Date:</span> {format(new Date(document.due_date), 'MMM d, yyyy')}</p>
              )}
              {document.created_date && (
                <p><span className="font-semibold">{type === 'estimate' ? 'Estimate' : 'Invoice'} Date:</span> {format(new Date(document.created_date), 'MMM d, yyyy')}</p>
              )}
            </div>
          </div>

          {/* Table */}
          <table className="w-full mb-8 border-collapse">
            <thead>
              <tr style={{ backgroundColor: primaryColor }}>
                <th className="px-4 py-3 text-left text-white font-semibold text-sm">Item Description</th>
                <th className="px-4 py-3 text-center text-white font-semibold text-sm w-20">Price</th>
                <th className="px-4 py-3 text-center text-white font-semibold text-sm w-20">Quantity</th>
                <th className="px-4 py-3 text-right text-white font-semibold text-sm w-24">Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-700">{item.description}</td>
                  <td className="px-4 py-3 text-center text-sm text-slate-700">${(item.unit_price || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-center text-sm text-slate-700">{item.quantity || 1}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">${(item.total || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-8 flex-1">
            {/* Left column - Notes */}
            <div className="col-span-2">
              {document.notes && (
                <div className="bg-slate-50 p-4 rounded border-l-4" style={{ borderColor: primaryColor }}>
                  <p className="text-xs font-semibold text-slate-600 mb-1">NOTES</p>
                  <p className="text-sm text-slate-700">{document.notes}</p>
                </div>
              )}
            </div>

            {/* Right column - Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal:</span>
                <span className="font-semibold">${subtotal.toFixed(2)}</span>
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Tax ({((document.tax_rate || 0) * 100).toFixed(1)}%):</span>
                  <span className="font-semibold">${taxAmount.toFixed(2)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Discount:</span>
                  <span className="font-semibold">-${discount.toFixed(2)}</span>
                </div>
              )}
              <div 
                className="flex justify-between text-lg font-bold pt-3 border-t-2"
                style={{ borderColor: primaryColor, color: accentColor }}
              >
                <span>Grand Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-slate-300">
        <div className="grid grid-cols-3 gap-8 text-xs">
          <div>
            <p className="font-semibold mb-2" style={{ color: accentColor }}>COMPANY INFO</p>
            {companyPhone && <p>{companyPhone}</p>}
            {companyEmail && <p>{companyEmail}</p>}
            {company.address && <p>{company.address}</p>}
            {company.city && <p>{company.city}, {company.state} {company.zip}</p>}
          </div>
          <div className="text-center">
            {footerText && (
              <p className="text-slate-600 italic">{footerText}</p>
            )}
          </div>
          <div className="text-right text-slate-500">
            <p>© {new Date().getFullYear()} {company.name}</p>
            <p className="text-xs">Thank you for your business!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
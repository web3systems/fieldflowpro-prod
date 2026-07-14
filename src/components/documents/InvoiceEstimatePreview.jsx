import React from 'react';
import { format } from 'date-fns';

function LineItemTable({ lineItems, primaryColor }) {
  if (!lineItems || lineItems.length === 0) {
    return <p className="text-sm text-slate-400 italic py-4">No line items.</p>;
  }
  return (
    <table className="w-full mb-4 border-collapse">
      <thead>
        <tr style={{ backgroundColor: primaryColor }}>
          <th className="px-4 py-3 text-left text-white font-semibold text-sm">Item Description</th>
          <th className="px-4 py-3 text-center text-white font-semibold text-sm w-20">Price</th>
          <th className="px-4 py-3 text-center text-white font-semibold text-sm w-20">Qty</th>
          <th className="px-4 py-3 text-right text-white font-semibold text-sm w-24">Total</th>
        </tr>
      </thead>
      <tbody>
        {lineItems.map((item, idx) => (
          <tr key={idx} className="border-b border-slate-200">
            <td className="px-4 py-3 text-sm text-slate-700 align-top">
              <span>{item.description || '—'}</span>
              {(item.notes || item.comments) && (
                <p className="text-xs text-slate-400 italic mt-0.5">{item.notes || item.comments}</p>
              )}
            </td>
            <td className="px-4 py-3 text-center text-sm text-slate-700 align-top">${(item.unit_price || 0).toFixed(2)}</td>
            <td className="px-4 py-3 text-center text-sm text-slate-700 align-top">{item.quantity || 1}</td>
            <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900 align-top">${(item.total || 0).toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TotalsBlock({ data, primaryColor, accentColor }) {
  return (
    <div className="flex justify-end mb-4">
      <div className="w-64 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Subtotal:</span>
          <span className="font-semibold">${(data.subtotal || 0).toFixed(2)}</span>
        </div>
        {data.tax_amount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Tax ({(data.tax_rate || 0).toFixed(1)}%):</span>
            <span className="font-semibold">${(data.tax_amount || 0).toFixed(2)}</span>
          </div>
        )}
        {data.discount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Discount:</span>
            <span className="font-semibold text-red-600">-${(data.discount || 0).toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold pt-2 border-t-2" style={{ borderColor: primaryColor, color: accentColor }}>
          <span>Total:</span>
          <span>${(data.total || 0).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

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

  const hasOptions = type === 'estimate' && Array.isArray(document.options) && document.options.length > 0;
  const options = hasOptions ? document.options : null;

  return (
    <div className="bg-white p-8 max-w-4xl mx-auto">
      <div className="flex gap-0" style={{ minHeight: '600px' }}>
        {/* Left Sidebar */}
        <div
          className="w-32 flex flex-col items-center py-8 px-4 flex-shrink-0"
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
              {type === 'estimate' && document.title && (
                <p className="text-sm text-slate-500 mt-1">{document.title}</p>
              )}
            </div>
            <div className="text-right text-sm space-y-2" style={{ color: accentColor }}>
              <div>
                <p className="font-semibold">{type === 'estimate' ? 'Estimate To:' : 'Invoice To:'}</p>
                <p className="font-bold">{customer.business_name || [customer.first_name, customer.last_name].filter(Boolean).join(' ') || '—'}</p>
                <p>{customer.address}</p>
                <p>{[customer.city, customer.state, customer.zip].filter(Boolean).join(', ')}</p>
              </div>
            </div>
          </div>

          {/* Document Details */}
          <div className="grid grid-cols-2 gap-8 mb-10">
            <div />
            <div className="text-right text-sm space-y-1" style={{ color: accentColor }}>
              {document.estimate_number && (
                <p><span className="font-semibold">{type === 'estimate' ? 'Estimate' : 'Invoice'} No:</span> {document.estimate_number || document.invoice_number}</p>
              )}
              {document.invoice_number && (
                <p><span className="font-semibold">Invoice No:</span> {document.invoice_number}</p>
              )}
              {document.due_date && (
                <p><span className="font-semibold">Due Date:</span> {format(new Date(document.due_date), 'MMM d, yyyy')}</p>
              )}
              {document.valid_until && (
                <p><span className="font-semibold">Valid Until:</span> {format(new Date(document.valid_until), 'MMM d, yyyy')}</p>
              )}
              {document.created_date && (
                <p><span className="font-semibold">{type === 'estimate' ? 'Estimate' : 'Invoice'} Date:</span> {format(new Date(document.created_date), 'MMM d, yyyy')}</p>
              )}
            </div>
          </div>

          {/* Line items / options */}
          {options ? (
            <div className="space-y-6">
              {options.map((option, idx) => (
                <div key={option.id || idx} className={idx > 0 ? 'pt-6 border-t-2 border-dashed border-slate-200' : ''}>
                  <div className="mb-2">
                    <h3 className="text-base font-bold" style={{ color: accentColor }}>
                      Option {idx + 1}: {option.name || ''}
                    </h3>
                  </div>
                  <LineItemTable lineItems={option.line_items} primaryColor={primaryColor} />
                  {option.notes && (
                    <div className="mb-3 bg-slate-50 p-3 rounded border-l-4 text-sm text-slate-700" style={{ borderColor: primaryColor }}>
                      {option.notes}
                    </div>
                  )}
                  <TotalsBlock data={option} primaryColor={primaryColor} accentColor={accentColor} />
                </div>
              ))}
            </div>
          ) : (
            <>
              <LineItemTable lineItems={document.line_items} primaryColor={primaryColor} />
              <TotalsBlock data={document} primaryColor={primaryColor} accentColor={accentColor} />
            </>
          )}

          {/* Scope of Work */}
          {document.scope_of_work && (
            <div className="mt-8">
              <div className="text-white text-sm font-bold px-4 py-2 mb-3" style={{ backgroundColor: primaryColor }}>
                SCOPE OF WORK
              </div>
              <div
                className="prose prose-sm max-w-none text-slate-700 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_p]:my-2 [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_strong]:font-semibold"
                dangerouslySetInnerHTML={{ __html: document.scope_of_work }}
              />
            </div>
          )}

          {/* Notes */}
          {document.notes && !(hasOptions) && (
            <div className="mt-6 bg-slate-50 p-4 rounded border-l-4" style={{ borderColor: primaryColor }}>
              <p className="text-xs font-semibold text-slate-600 mb-1">NOTES</p>
              <p className="text-sm text-slate-700 whitespace-pre-line">{document.notes}</p>
            </div>
          )}
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
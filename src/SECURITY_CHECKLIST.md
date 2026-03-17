# FieldFlow Pro - Security Checklist for SaaS Launch

## Critical Fixes Required (P0)

### 1. Access Verification Across All Backend Functions
**Status**: ✅ IMPLEMENTED
**How to Fix**:
```javascript
import { verifyCompanyAccess, verifyEntityBelongsToCompany } from './verifyCompanyAccess.js';

Deno.serve(async (req) => {
  const user = await verifyCompanyAccess(req, companyId); // Verify user can access company
  
  const customer = await base44.entities.Customer.get(customerId);
  await verifyEntityBelongsToCompany(req, customer, 'customer', companyId); // Verify entity belongs to company
  
  // Proceed with operation
});
```

**Affected Functions** (audit these):
- [ ] sendPortalInvite.js - Line 1-20 (verify customer belongs to company)
- [ ] sendInvoiceEmail.js - verify invoice.company_id matches user's access
- [ ] sendReviewRequest.js - verify job.company_id matches user's access
- [ ] notifyJobScheduled.js - verify job.company_id matches user's access
- [ ] notifyNewCustomer.js - verify customer.company_id matches user's access
- [ ] All create/update/delete operations in backend

**Frontend Pages to Update** (add entity ownership validation):
- [ ] CustomerDetail.jsx - verify customer.company_id === activeCompany.id before operations
- [ ] JobDetail.jsx - verify job.company_id === activeCompany.id before operations
- [ ] EstimateDetail.jsx - verify estimate.company_id === activeCompany.id
- [ ] InvoiceDetail.jsx - verify invoice.company_id === activeCompany.id
- [ ] LeadDetail.jsx - verify lead.company_id === activeCompany.id (if it exists)

---

## High Priority Fixes (P1)

### 2. Subscription Status Enforcement
**Status**: 🟡 NOT IMPLEMENTED
**Implementation**:
Create `functions/checkSubscription.js` that:
- [ ] Checks if company subscription status is "active" or "trialing"
- [ ] Checks if trial_ends_at hasn't passed
- [ ] Enforces feature limits per plan (e.g., max 5 technicians on starter)
- [ ] Blocks operations on expired subscriptions

**Where to Call**:
- Dashboard load (show upgrade banner if trial expired)
- Job creation (check if limit reached)
- Team member creation (check if limit reached)
- Estimate/Invoice creation (check if limit reached)

### 3. Audit Logging for Sensitive Operations
**Status**: 🟡 NOT IMPLEMENTED
**Create** `functions/logAuditEvent.js` that logs to an `AuditLog` entity:
- [ ] User email + action (create/update/delete)
- [ ] Entity type + entity ID
- [ ] Timestamp + company_id
- [ ] Old vs new values (for updates)

**When to Call**:
- [ ] Delete customer, job, invoice (Customers.jsx line 102)
- [ ] Delete team member
- [ ] Update company settings
- [ ] Change subscription

### 4. Role Standardization
**Status**: 🟡 PARTIAL (roles exist but inconsistent)
**Action**:
Update `entities/User.json` to clarify roles:
```json
"role": {
  "type": "string",
  "enum": ["user", "admin"],
  "default": "user",
  "description": "user = technician/standard staff, admin = company admin/owner"
}
```
**Remove**: "super_admin", "manager" — consolidate to just admin.
**Impact**: Update Layout.jsx to only check `role === "admin"` (not "super_admin" or "manager")

---

## Medium Priority Fixes (P2)

### 5. URL Parameter Validation
**Status**: 🟡 PARTIAL
**Examples to Fix**:
- Customers.jsx:244 - `?customer_id=` param not validated
- Before navigating to detail page, verify entity ownership

### 6. Bulk Operations Audit Trail
**Status**: 🟡 NOT IMPLEMENTED
**Example**: Customers.jsx line 102-116 deletes related data silently
- [ ] Log each delete operation
- [ ] Add timestamp of who deleted what

### 7. CSV Export Filtering
**Status**: ✅ CURRENTLY SAFE (filters by activeCompany.id)
**Maintain**: Always export only filtered customers, not all

---

## Testing Checklist

### Multi-Tenant Isolation Test
- [ ] Create two test companies (A and B)
- [ ] Create user1 with access to company A only
- [ ] Create user2 with access to company B only
- [ ] Verify user1 cannot see company B data (even if they modify URL)
- [ ] Verify API calls fail when accessing cross-company data

### Subscription Enforcement Test
- [ ] Create trial company, verify it expires after 14 days
- [ ] Attempt to create job after trial expires → should fail with upgrade message
- [ ] Upgrade to starter plan, verify job creation works
- [ ] Reach technician limit on starter (should be 3) → should block 4th tech

### Audit Trail Test
- [ ] Delete a customer
- [ ] Verify AuditLog has entry: `{ user_email, action: "delete", entity: "Customer", timestamp }`

---

## Environment Setup

### Development (Test/Staging)
- [ ] Create separate Base44 app with Stripe TEST keys
- [ ] Test all subscription flows without hitting real payments
- [ ] Keep production database separate

### Production
- [ ] Use Stripe LIVE keys
- [ ] Enable audit logging to production database
- [ ] Set up alerts for failed operations in critical functions

---

## Compliance Notes

**PCI-DSS**: Never store card data directly. Stripe handles all payment processing.
**GDPR**: Implement data deletion for customers (cascading delete is partially done).
**Audit Trail**: Required for compliance. Add to P1 fixes.

---

## Sign-off

- [ ] All P0 fixes implemented and tested
- [ ] All P1 fixes implemented and tested
- [ ] Multi-tenant isolation verified
- [ ] Subscription enforcement verified
- [ ] Ready for SaaS launch
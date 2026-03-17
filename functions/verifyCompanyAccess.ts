import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Utility function to verify that a user has access to a specific company.
 * Returns user data if authorized, throws error if not.
 * 
 * Usage in other functions:
 * const user = await verifyCompanyAccess(req, companyId);
 */
export async function verifyCompanyAccess(req, companyId) {
  const base44 = createClientFromRequest(req);
  
  // Get authenticated user
  const user = await base44.auth.me();
  if (!user) {
    throw new Error('Unauthorized: User not authenticated');
  }

  // Super admins always have access
  if (user.role === 'super_admin' || user.role === 'admin') {
    return user;
  }

  // Regular users must have explicit access record
  const accessRecords = await base44.asServiceRole.entities.UserCompanyAccess.filter({
    user_email: user.email,
    company_id: companyId
  });

  if (accessRecords.length === 0) {
    throw new Error('Forbidden: User does not have access to this company');
  }

  return user;
}

/**
 * Utility to ensure an entity belongs to the allowed company before operating on it.
 * 
 * Usage:
 * await verifyEntityBelongsToCompany(req, entity, 'customer', companyId);
 */
export async function verifyEntityBelongsToCompany(req, entity, entityType, allowedCompanyId) {
  if (!entity) {
    throw new Error(`${entityType} not found`);
  }

  if (entity.company_id !== allowedCompanyId) {
    throw new Error(`Forbidden: ${entityType} does not belong to your company`);
  }

  return true;
}

Deno.serve(async (req) => {
  // This function is not meant to be called directly; it's a utility module
  return Response.json({ error: 'This is a utility function, not an endpoint' }, { status: 400 });
});
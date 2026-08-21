export class ComplianceError extends Error { constructor(code, message) { super(message); this.code = code; } }
const role = (actor, needed) => { if (actor.role !== needed) throw new ComplianceError('FORBIDDEN', 'The actor is not authorized for this supplier compliance transition.'); };
export function createComplianceRegistry() {
  const policies = new Map(); const audit = [];
  const log = (action, policyId, actor) => audit.push({ id: `AUD-${audit.length + 1}`, action, policyId, actor });
  const get = id => { const policy = policies.get(id); if (!policy) throw new ComplianceError('NOT_FOUND', 'The supplier compliance policy was not found.'); return policy; };
  return {
    define(actor, input) { role(actor, 'compliance-engineer'); if (!/^COMP-[A-Z0-9]{3,}$/.test(input.id || '') || !input.supplier || !input.standard) throw new ComplianceError('VALIDATION', 'Identifier, supplier, and compliance standard are required.'); if (policies.has(input.id)) throw new ComplianceError('CONFLICT', 'The compliance policy already exists.'); const policy = { id: input.id, supplier: input.supplier, standard: input.standard, state: 'draft' }; policies.set(policy.id, policy); log('policy.defined', policy.id, actor.id); return { ...policy }; },
    attest(actor, id, evidence) { role(actor, 'supplier-manager'); const policy = get(id); if (policy.state !== 'draft') throw new ComplianceError('CONFLICT', 'Only draft policies can receive attestations.'); if (!evidence || evidence.length < 30) throw new ComplianceError('VALIDATION', 'Compliance evidence is required.'); policy.state = 'attested'; log('policy.attested', id, actor.id); return { ...policy }; },
    approve(actor, id) { role(actor, 'compliance-governor'); const policy = get(id); if (policy.state !== 'attested') throw new ComplianceError('CONFLICT', 'Only attested policies can be approved.'); policy.state = 'approved'; log('policy.approved', id, actor.id); return { ...policy }; },
    exception(actor, id, reason) { role(actor, 'compliance-governor'); const policy = get(id); if (policy.state !== 'approved') throw new ComplianceError('CONFLICT', 'Only approved policies can open exceptions.'); if (!reason || reason.length < 15) throw new ComplianceError('VALIDATION', 'A detailed exception reason is required.'); policy.state = 'exception'; log('exception.opened', id, actor.id); return { ...policy }; },
    count: () => policies.size, audit: () => audit.map(item => ({ ...item }))
  };
}

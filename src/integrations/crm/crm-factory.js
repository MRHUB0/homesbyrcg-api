import { createCrmAdapter } from '../../providers/provider-factory.js';
import { createLeadRepository } from '../../repositories/lead-repository.js';
import { createCrmIdempotencyRepository } from '../../repositories/crm/idempotency-repository.js';
import { CrmSyncService } from './crm-sync-service.js';

export function createCrmSyncService(config) {
  const adapter = createCrmAdapter(config);

  return new CrmSyncService({
    adapter,
    leadRepository: createLeadRepository(config),
    idempotencyRepository: createCrmIdempotencyRepository(config),
    appEnvironment: config.appEnvironment,
  });
}

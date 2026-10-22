import { storageService } from '../storage';
import { LocalZoneRepository } from './LocalZoneRepository';

export const zoneRepository = new LocalZoneRepository({
  actor: () => storageService.getCurrentUser(),
  facilities: () => storageService.getFacilities(),
  orders: () => storageService.getWorkflow().orders,
});

import { nextAction } from '../../../services/BusinessService';
import { storageService } from '../../../services/storage';
import { Order } from '../../../types';
export function getOrderNextAction(order: Order) {
  return nextAction(order, storageService.getWorkflow());
}

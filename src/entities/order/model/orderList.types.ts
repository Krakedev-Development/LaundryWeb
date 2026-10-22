export type QuickTab =
  'ALL' | 'UNASSIGNED' | 'PICKUP_TODAY' | 'IN_PLANT' | 'DELIVERY' | 'CLOSED';
export interface OrderListFilters {
  searchQuery: string;
  mode: string;
  selectedStatus: string;
  selectedPriority: string;
  selectedFacility: string;
  selectedDriver: string;
  quickTab: QuickTab;
}

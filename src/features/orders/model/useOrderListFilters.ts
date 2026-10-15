import { useState } from 'react';
import { QuickTab } from '../../../entities/order/model/orderList.types';
export function useOrderListFilters() {
  const [searchQuery, setSearchQuery] = useState('');
  const [mode, setMode] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedFacility, setSelectedFacility] = useState<string>('ALL');
  const [selectedDriver, setSelectedDriver] = useState<string>('ALL');
  const [quickTab, setQuickTab] = useState<QuickTab>('ALL');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('ALL');
    setSelectedPriority('ALL');
    setSelectedFacility('ALL');
    setSelectedDriver('ALL');
    setQuickTab('ALL');
  };
  const activeFiltersCount =
    (selectedStatus !== 'ALL' ? 1 : 0) +
    (selectedPriority !== 'ALL' ? 1 : 0) +
    (selectedFacility !== 'ALL' ? 1 : 0) +
    (selectedDriver !== 'ALL' ? 1 : 0);
  return {
    searchQuery,
    mode,
    selectedStatus,
    selectedPriority,
    selectedFacility,
    selectedDriver,
    quickTab,
    showAdvancedFilters,
    setSearchQuery,
    setMode,
    setSelectedStatus,
    setSelectedPriority,
    setSelectedFacility,
    setSelectedDriver,
    setQuickTab,
    setShowAdvancedFilters,
    resetFilters,
    activeFiltersCount,
  };
}

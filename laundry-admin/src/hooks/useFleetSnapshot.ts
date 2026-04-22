import { useQuery } from '@tanstack/react-query'
import { fetchFleetSnapshot } from '@/services/fleetService'

export function useFleetSnapshot() {
  return useQuery({
    queryKey: ['fleet', 'snapshot'],
    queryFn: fetchFleetSnapshot,
    staleTime: 30_000,
  })
}

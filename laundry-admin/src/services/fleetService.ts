import type { FleetSnapshot } from '@/types'
import { mockFleetSnapshot } from '@/services/mockData'

const LATENCY_MS = 450

export async function fetchFleetSnapshot(): Promise<FleetSnapshot> {
  await new Promise((r) => setTimeout(r, LATENCY_MS))
  return structuredClone(mockFleetSnapshot)
}

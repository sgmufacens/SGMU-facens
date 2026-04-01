export type VehicleStatus = 'available' | 'in_use' | 'maintenance'
export type TripStatus = 'open' | 'closed'
export type ScheduleStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

export interface Branch {
  id: string
  name: string
  city: string
  address?: string
  created_at: string
}

export interface Collaborator {
  id: string
  name: string
  badge_number: string
  branch_id?: string
  is_active: boolean
  created_at: string
  branch?: Branch
}

export interface Vehicle {
  id: string
  plate: string
  model: string
  brand: string
  year: number
  color?: string
  branch_id?: string
  status: VehicleStatus
  created_at: string
  branch?: Branch
  active_trip?: Trip
}

export interface Trip {
  id: string
  vehicle_id: string
  collaborator_id: string
  origin_branch_id?: string
  destination_branch_id?: string
  destination_description?: string
  km_departure: number
  departed_at: string
  photos_departure: string[]
  notes_departure?: string
  km_arrival?: number
  arrived_at?: string
  photos_arrival: string[]
  notes_arrival?: string
  km_driven?: number
  status: TripStatus
  created_at: string
  vehicle?: Vehicle
  collaborator?: Collaborator
  origin_branch?: Branch
  destination_branch?: Branch
}

export interface Schedule {
  id: string
  vehicle_id: string
  collaborator_id: string
  origin_branch_id?: string
  destination_branch_id?: string
  destination_description?: string
  scheduled_departure: string
  estimated_return?: string
  notes?: string
  status: ScheduleStatus
  created_at: string
  vehicle?: Vehicle
  collaborator?: Collaborator
  origin_branch?: Branch
  destination_branch?: Branch
}

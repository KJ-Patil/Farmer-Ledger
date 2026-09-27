import type { GeoLocation } from './auth'

export type CropStatus = 'sown' | 'vegetative' | 'flowering' | 'harvested' | 'running' | 'completed'

export interface Crop {
  id: string
  plotId: string
  cropType: string
  variety: string
  season: string
  area: number
  sowingDate: string
  expectedHarvestDate: string
  actualHarvestDate?: string
  estimatedYield?: number
  estimatedYieldUnit?: 'quintal' | 'kg' | 'ton'
  actualYield?: number
  actualYieldUnit?: 'quintal' | 'kg' | 'ton'
  status: CropStatus
  isLocked?: boolean           // Completed crop financial lock
  completedDate?: string       // Date when crop cycle was marked completed
  timestamp: string
}

export interface Plot {
  id: string
  name: string
  gatNumber: string
  area: number
  areaUnit: 'acre' | 'hectare' | 'guntha'
  soilType: string // 'Black' | 'Medium' | 'Light'
  irrigationType: string // 'Well' | 'Borewell' | 'River' | 'Canal' | 'Pipeline' | 'Rainfed'
  waterAvailability: 'perennial' | 'seasonal'
  location?: GeoLocation
  photoUrl?: string
  timestamp: string
}


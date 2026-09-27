import { create } from 'zustand'
import { db, isMock } from '@/shared/services/firebase'
import { logger } from '@/shared/services/logger'
import type { Plot, Crop, CropStatus } from '../types/plot'
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  query, 
  orderBy 
} from 'firebase/firestore'

interface PlotStoreState {
  plots: Plot[]
  crops: Record<string, Crop[]> // Maps plotId to list of crops
  loading: boolean
  error: string | null
  
  fetchPlots: (mobileNumber: string) => Promise<void>
  createPlot: (mobileNumber: string, plotData: Omit<Plot, 'id' | 'timestamp'>) => Promise<string | null>
  fetchCrops: (mobileNumber: string, plotId: string) => Promise<void>
  createCrop: (mobileNumber: string, plotId: string, cropData: Omit<Crop, 'id' | 'plotId' | 'status' | 'timestamp'>) => Promise<string | null>
  updateCropStatus: (
    mobileNumber: string,
    plotId: string,
    cropId: string,
    status: CropStatus,
    harvestData?: { actualHarvestDate: string; actualYield: number; actualYieldUnit: 'quintal' | 'kg' | 'ton' }
  ) => Promise<boolean>
  updateCrop: (mobileNumber: string, plotId: string, cropId: string, cropData: Partial<Crop>) => Promise<boolean>
}

export const usePlotStore = create<PlotStoreState>((set, get) => ({
  plots: [],
  crops: {},
  loading: false,
  error: null,

  fetchPlots: async (mobileNumber: string) => {
    if (!mobileNumber) return
    set({ loading: true, error: null })
    try {
      let cleanMobile = mobileNumber.replace(/\D/g, '')
      if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
        cleanMobile = cleanMobile.substring(2)
      }

      
      if (isMock) {
        const localPlotsStr = localStorage.getItem(`farmer_plots_${cleanMobile}`)
        const localPlots = localPlotsStr ? JSON.parse(localPlotsStr) : []
        // Sort by timestamp desc
        localPlots.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        set({ plots: localPlots, loading: false })
      } else {
        const plotsRef = collection(db as any, 'users', cleanMobile, 'plots')
        const q = query(plotsRef, orderBy('timestamp', 'desc'))
        const snapshot = await getDocs(q)
        const fetchedPlots: Plot[] = []
        snapshot.forEach((docSnap) => {
          fetchedPlots.push({
            id: docSnap.id,
            ...docSnap.data()
          } as Plot)
        })
        set({ plots: fetchedPlots, loading: false })
      }
    } catch (err: any) {
      logger.error('Failed to fetch plots', err)
      set({ error: err.message || 'Failed to load plots', loading: false })
    }
  },

  createPlot: async (mobileNumber: string, plotData) => {
    if (!mobileNumber) return null
    set({ loading: true, error: null })
    try {
      let cleanMobile = mobileNumber.replace(/\D/g, '')
      if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
        cleanMobile = cleanMobile.substring(2)
      }

      const timestamp = new Date().toISOString()
      
      if (isMock) {
        const plotId = `plot-${Math.random().toString(36).substring(7)}`
        const newPlot: Plot = {
          id: plotId,
          ...plotData,
          timestamp
        }
        const currentPlots = get().plots
        const updatedPlots = [newPlot, ...currentPlots]
        set({ plots: updatedPlots, loading: false })
        localStorage.setItem(`farmer_plots_${cleanMobile}`, JSON.stringify(updatedPlots))
        logger.info('Mock plot registered locally', newPlot)
        return plotId
      } else {
        const plotsRef = collection(db as any, 'users', cleanMobile, 'plots')
        const docRef = await addDoc(plotsRef, {
          ...plotData,
          timestamp
        })
        const newPlot: Plot = {
          id: docRef.id,
          ...plotData,
          timestamp
        }
        const currentPlots = get().plots
        set({ plots: [newPlot, ...currentPlots], loading: false })
        logger.info('Firestore plot document written', newPlot)
        return docRef.id
      }
    } catch (err: any) {
      logger.error('Failed to create plot', err)
      set({ error: err.message || 'Failed to save plot', loading: false })
      return null
    }
  },

  fetchCrops: async (mobileNumber: string, plotId: string) => {
    if (!mobileNumber || !plotId) return
    set({ loading: true, error: null })
    try {
      let cleanMobile = mobileNumber.replace(/\D/g, '')
      if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
        cleanMobile = cleanMobile.substring(2)
      }

      
      if (isMock) {
        const localCropsStr = localStorage.getItem(`farmer_crops_${cleanMobile}_${plotId}`)
        const localCrops = localCropsStr ? JSON.parse(localCropsStr) : []
        localCrops.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        set((state) => ({
          crops: {
            ...state.crops,
            [plotId]: localCrops
          },
          loading: false
        }))
      } else {
        const cropsRef = collection(db as any, 'users', cleanMobile, 'plots', plotId, 'crops')
        const q = query(cropsRef, orderBy('timestamp', 'desc'))
        const snapshot = await getDocs(q)
        const fetchedCrops: Crop[] = []
        snapshot.forEach((docSnap) => {
          fetchedCrops.push({
            id: docSnap.id,
            plotId,
            ...docSnap.data()
          } as Crop)
        })
        set((state) => ({
          crops: {
            ...state.crops,
            [plotId]: fetchedCrops
          },
          loading: false
        }))
      }
    } catch (err: any) {
      logger.error('Failed to fetch crops', err)
      set({ error: err.message || 'Failed to load crops', loading: false })
    }
  },

  createCrop: async (mobileNumber: string, plotId: string, cropData) => {
    if (!mobileNumber || !plotId) return null
    set({ loading: true, error: null })
    try {
      let cleanMobile = mobileNumber.replace(/\D/g, '')
      if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
        cleanMobile = cleanMobile.substring(2)
      }

      const timestamp = new Date().toISOString()
      
      if (isMock) {
        const cropId = `crop-${Math.random().toString(36).substring(7)}`
        const newCrop: Crop = {
          id: cropId,
          plotId,
          ...cropData,
          status: 'sown',
          timestamp
        }
        const currentPlotCrops = get().crops[plotId] || []
        const updatedPlotCrops = [newCrop, ...currentPlotCrops]
        
        set((state) => ({
          crops: {
            ...state.crops,
            [plotId]: updatedPlotCrops
          },
          loading: false
        }))
        localStorage.setItem(`farmer_crops_${cleanMobile}_${plotId}`, JSON.stringify(updatedPlotCrops))
        logger.info('Mock crop registered locally', newCrop)
        return cropId
      } else {
        const cropsRef = collection(db as any, 'users', cleanMobile, 'plots', plotId, 'crops')
        const dataToSave = {
          ...cropData,
          status: 'sown',
          timestamp
        }
        const docRef = await addDoc(cropsRef, dataToSave)
        const newCrop: Crop = {
          id: docRef.id,
          plotId,
          ...dataToSave
        } as Crop
        const currentPlotCrops = get().crops[plotId] || []
        
        set((state) => ({
          crops: {
            ...state.crops,
            [plotId]: [newCrop, ...currentPlotCrops]
          },
          loading: false
        }))
        logger.info('Firestore crop document written', newCrop)
        return docRef.id
      }
    } catch (err: any) {
      logger.error('Failed to create crop', err)
      set({ error: err.message || 'Failed to save crop', loading: false })
      return null
    }
  },

  updateCropStatus: async (mobileNumber: string, plotId: string, cropId: string, status: CropStatus, harvestData?: any) => {
    if (!mobileNumber || !plotId || !cropId) return false
    set({ loading: true, error: null })
    try {
      let cleanMobile = mobileNumber.replace(/\D/g, '')
      if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
        cleanMobile = cleanMobile.substring(2)
      }

      const updateData = harvestData ? { status, ...harvestData } : { status }

      if (isMock) {
        const currentPlotCrops = get().crops[plotId] || []
        const updatedPlotCrops = currentPlotCrops.map((crop) => 
          crop.id === cropId ? { ...crop, ...updateData } : crop
        )
        set((state) => ({
          crops: {
            ...state.crops,
            [plotId]: updatedPlotCrops
          },
          loading: false
        }))
        localStorage.setItem(`farmer_crops_${cleanMobile}_${plotId}`, JSON.stringify(updatedPlotCrops))
        logger.info('Mock crop status updated locally', { cropId, status, harvestData })
        return true
      } else {
        const cropDocRef = doc(db as any, 'users', cleanMobile, 'plots', plotId, 'crops', cropId)
        await updateDoc(cropDocRef, updateData)
        
        const currentPlotCrops = get().crops[plotId] || []
        const updatedPlotCrops = currentPlotCrops.map((crop) => 
          crop.id === cropId ? { ...crop, ...updateData } : crop
        )
        
        set((state) => ({
          crops: {
            ...state.crops,
            [plotId]: updatedPlotCrops
          },
          loading: false
        }))
        logger.info('Firestore crop status updated', { cropId, status, harvestData })
        return true
      }
    } catch (err: any) {
      logger.error('Failed to update crop status', err)
      set({ error: err.message || 'Failed to update crop status', loading: false })
      return false
    }
  },

  updateCrop: async (mobileNumber: string, plotId: string, cropId: string, cropData: Partial<Crop>) => {
    if (!mobileNumber || !plotId || !cropId) return false
    set({ loading: true, error: null })
    try {
      let cleanMobile = mobileNumber.replace(/\D/g, '')
      if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
        cleanMobile = cleanMobile.substring(2)
      }

      if (isMock) {
        const currentPlotCrops = get().crops[plotId] || []
        const updatedPlotCrops = currentPlotCrops.map((crop) => 
          crop.id === cropId ? { ...crop, ...cropData } : crop
        )
        set((state) => ({
          crops: {
            ...state.crops,
            [plotId]: updatedPlotCrops
          },
          loading: false
        }))
        localStorage.setItem(`farmer_crops_${cleanMobile}_${plotId}`, JSON.stringify(updatedPlotCrops))
        logger.info('Mock crop updated locally', { cropId, cropData })
        return true
      } else {
        const cropDocRef = doc(db as any, 'users', cleanMobile, 'plots', plotId, 'crops', cropId)
        await updateDoc(cropDocRef, cropData)
        
        const currentPlotCrops = get().crops[plotId] || []
        const updatedPlotCrops = currentPlotCrops.map((crop) => 
          crop.id === cropId ? { ...crop, ...cropData } : crop
        )
        
        set((state) => ({
          crops: {
            ...state.crops,
            [plotId]: updatedPlotCrops
          },
          loading: false
        }))
        logger.info('Firestore crop updated', { cropId, cropData })
        return true
      }
    } catch (err: any) {
      logger.error('Failed to update crop', err)
      set({ error: err.message || 'Failed to update crop', loading: false })
      return false
    }
  }
}))

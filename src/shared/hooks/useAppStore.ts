import { create } from 'zustand'
import { db, isMock } from '@/shared/services/firebase'
import { enableNetwork, disableNetwork } from 'firebase/firestore'
import { logger } from '@/shared/services/logger'

interface AppState {
  isOnline: boolean
  syncQueueCount: number
  setOnline: (isOnline: boolean) => void
  setSyncQueueCount: (count: number) => void
  incrementSyncQueue: () => void
  decrementSyncQueue: () => void
}

export const useAppStore = create<AppState>((set) => ({
  isOnline: navigator.onLine,
  syncQueueCount: 0,
  setOnline: (isOnline) => {
    set({ isOnline })
    if (!isMock && db) {
      if (isOnline) {
        enableNetwork(db as any)
          .then(() => logger.info('Firestore network enabled via setOnline'))
          .catch((err) => logger.error('Failed to enable Firestore network', err))
      } else {
        disableNetwork(db as any)
          .then(() => logger.info('Firestore network disabled via setOnline'))
          .catch((err) => logger.error('Failed to disable Firestore network', err))
      }
    }
  },
  setSyncQueueCount: (syncQueueCount) => set({ syncQueueCount }),
  incrementSyncQueue: () => set((state) => ({ syncQueueCount: state.syncQueueCount + 1 })),
  decrementSyncQueue: () => set((state) => ({ syncQueueCount: Math.max(0, state.syncQueueCount - 1) })),
}))

// Synchronize initial network state on startup to prevent stale persistent offline state
if (!isMock && db) {
  if (navigator.onLine) {
    enableNetwork(db as any)
      .then(() => logger.info('Firestore network initialized to ONLINE on startup'))
      .catch((err) => logger.error('Failed to initialize Firestore network to ONLINE', err))
  } else {
    disableNetwork(db as any)
      .then(() => logger.info('Firestore network initialized to OFFLINE on startup'))
      .catch((err) => logger.error('Failed to initialize Firestore network to OFFLINE', err))
  }
}

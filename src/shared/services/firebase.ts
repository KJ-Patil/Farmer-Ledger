import { initializeApp, getApps, getApp } from 'firebase/app'
import { 
  getAuth, 
  type Auth, 
  type User, 
  type UserCredential 
} from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'
import { logger } from './logger'

// Read env variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const isConfigValid = !!(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId && 
  firebaseConfig.authDomain
)

let auth: Auth | MockAuth
let db: Firestore | MockFirestore
let storage: FirebaseStorage | MockStorage
let isMock = false

// Mock definitions to satisfy types and provide local development capability
class MockAuth {
  private listeners: ((user: User | null) => void)[] = []
  private currentUser: User | null = null

  constructor() {
    // Check local storage for mock session
    const savedUser = localStorage.getItem('mock_user')
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser)
      } catch {
        this.currentUser = null
      }
    }
  }

  onAuthStateChanged(callback: (user: User | null) => void) {
    this.listeners.push(callback)
    // Run callback immediately with current state
    setTimeout(() => callback(this.currentUser), 0)
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback)
    }
  }

  async signInWithEmailAndPassword(email: string): Promise<UserCredential> {
    logger.info(`Mock signing in with email: ${email}`)
    const mockUser = {
      uid: 'mock-uid-123',
      email,
      displayName: email.split('@')[0],
      emailVerified: true,
    } as unknown as User
    
    this.currentUser = mockUser
    localStorage.setItem('mock_user', JSON.stringify(mockUser))
    this.listeners.forEach(listener => listener(mockUser))

    return {
      user: mockUser,
      providerId: 'password',
      operationType: 'signIn',
    } as unknown as UserCredential
  }

  async signOut(): Promise<void> {
    logger.info('Mock signing out')
    this.currentUser = null
    localStorage.removeItem('mock_user')
    this.listeners.forEach(listener => listener(null))
  }

  async signInWithGoogle(): Promise<UserCredential> {
    logger.info('Mock signing in with Google')
    const mockUser = {
      uid: 'mock-google-uid-123',
      email: 'farmer.demo@gmail.com',
      displayName: 'Demo Farmer',
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256&h=256',
      emailVerified: true,
    } as unknown as User

    this.currentUser = mockUser
    localStorage.setItem('mock_user', JSON.stringify(mockUser))
    this.listeners.forEach(listener => listener(mockUser))

    return {
      user: mockUser,
      providerId: 'google.com',
      operationType: 'signIn',
    } as unknown as UserCredential
  }

  get getCurrentUser() {
    return this.currentUser
  }
}

class MockFirestore {
  // Simple in-memory storage fallback for mock queries
  private store: Record<string, Record<string, unknown>> = {}

  constructor() {
    logger.info('Mock Firestore database initialized')
  }

  getStore() {
    return this.store
  }
}

class MockStorage {
  constructor() {
    logger.info('Mock Firebase Storage initialized')
  }
}

if (isConfigValid) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
    auth = getAuth(app)
    db = getFirestore(app)
    storage = getStorage(app)
    isMock = false
    logger.info('Firebase initialized successfully.')
  } catch (error) {
    logger.error('Firebase initialization failed, falling back to mock mode', error)
    auth = new MockAuth()
    db = new MockFirestore()
    storage = new MockStorage()
    isMock = true
  }
} else {
  logger.warn('Firebase configuration missing in env. Mock mode enabled for development.')
  auth = new MockAuth()
  db = new MockFirestore()
  storage = new MockStorage()
  isMock = true
}

export { auth, db, storage, isMock }
export type { User }

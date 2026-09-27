/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand'
import { auth, db, isMock } from '../services/firebase'
import { logger } from '../services/logger'
import { i18n } from '../../lib/i18n'
import type { UserProfile, AppLanguage, MembershipType } from '../types/auth'
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore'
import { 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInWithPhoneNumber,
  GoogleAuthProvider,
  linkWithPopup,
  signInWithPopup,
  unlink
} from 'firebase/auth'

interface AuthStoreState {
  user: UserProfile | null
  loading: boolean
  error: string | null
  initialized: boolean
  otpCode: string | null // For storing generated OTP in mock mode
  confirmationResult: any | null // For storing real Firebase Phone confirmation
  guestLanguage: AppLanguage
  
  initialize: () => () => void
  sendOtp: (mobileNumber: string, appVerifier?: any) => Promise<boolean>
  verifyOtp: (otp: string) => Promise<boolean>
  registerFarmer: (data: Omit<UserProfile, 'uid' | 'registrationDate' | 'lastLoginDate' | 'status'> & { password?: string }) => Promise<boolean>
  signInWithPassword: (mobileNumber: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  updateLanguage: (lang: AppLanguage) => Promise<void>
  setGuestLanguage: (lang: AppLanguage) => void
  updateMembership: (membership: MembershipType) => Promise<void>
  clearError: () => void
  checkMobileRegistered: (mobileNumber: string) => Promise<boolean>
  checkEmailRegistered: (email: string) => Promise<boolean>
  linkGoogleAccount: () => Promise<boolean>
  unlinkGoogleAccount: () => Promise<boolean>
  signInWithGoogle: () => Promise<boolean>
  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>
}

// Helper to enforce timeout on Firestore promises (prevents hanging on disabled APIs / offline)
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = 10000, errorCode: string = 'auth/network-request-failed'): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      const err = new Error(errorCode) as any
      err.code = errorCode
      setTimeout(() => reject(err), timeoutMs)
    })
  ])
}

// Helper to convert mobile to a mock email for Firebase Auth compatibility
const getEmailFromMobile = (mobile: string) => `${mobile.replace(/\D/g, '')}@farmerledger.com`

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  user: null,
  loading: true,
  error: null,
  initialized: false,
  otpCode: null,
  confirmationResult: null,
  guestLanguage: (localStorage.getItem('guest_language') as AppLanguage) || 'en',

  clearError: () => set({ error: null }),

  setGuestLanguage: (guestLanguage) => {
    localStorage.setItem('guest_language', guestLanguage)
    i18n.changeLanguage(guestLanguage)
    set({ guestLanguage })
  },

  initialize: () => {
    logger.info('Initializing Auth State Listener')
    
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        set({ user: null, loading: false, initialized: true })
        return
      }

      set({ loading: true })
      try {
        // Resolve mobile number from email or phone
        let mobile = ''
        if (firebaseUser.phoneNumber) {
          mobile = firebaseUser.phoneNumber.replace(/\D/g, '')
        } else if (firebaseUser.email) {
          mobile = firebaseUser.email.split('@')[0].replace(/\D/g, '')
        }

        // Remove country code prefixes for standard comparison if length is 12 (e.g. 91xxxxxxxxxx)
        if (mobile.length === 12 && mobile.startsWith('91')) {
          mobile = mobile.substring(2)
        }

        if (!mobile) {
          throw new Error('errorNoMobile')
        }

        if (isMock) {
          const savedProfile = localStorage.getItem(`farmer_profile_${mobile}`)
          if (savedProfile) {
            const profile = JSON.parse(savedProfile) as UserProfile
            profile.lastLoginDate = new Date().toISOString()
            localStorage.setItem(`farmer_profile_${mobile}`, JSON.stringify(profile))
            i18n.changeLanguage(profile.language)
            set({ user: profile, loading: false, initialized: true })
          } else {
            // Fallback mock profile if not found
            const fallbackProfile: UserProfile = {
              uid: firebaseUser.uid,
              fullName: firebaseUser.displayName || 'Demo Farmer',
              mobileNumber: mobile,
              emailId: firebaseUser.email || undefined,
              village: 'Sukhdeo Nagar',
              taluka: 'Niphad',
              district: 'Nashik',
              state: 'Maharashtra',
              pincode: '422301',
              language: 'en',
              membershipType: 'free',
              registrationDate: new Date().toISOString(),
              lastLoginDate: new Date().toISOString(),
              status: 'active'
            }
            localStorage.setItem(`farmer_profile_${mobile}`, JSON.stringify(fallbackProfile))
            i18n.changeLanguage('en')
            set({ user: fallbackProfile, loading: false, initialized: true })
          }
        } else {
          // Real Firebase mode: retrieve user profile from Firestore indexed by mobile number
          const userDocRef = doc(db as any, 'users', mobile)
          const userDocSnap = await getDoc(userDocRef)

          if (userDocSnap.exists()) {
            let profile = userDocSnap.data() as UserProfile
            const lastLoginDate = new Date().toISOString()
            
            // Check if profile needs to be backported/synchronized from active Google credentials
            const googleProvider = firebaseUser.providerData.find(p => p.providerId === 'google.com')
            
            const updates: any = { lastLoginDate }
            let needsUpdate = false
            
            if (googleProvider) {
              if (!profile.googleUid) {
                profile.googleUid = googleProvider.uid || firebaseUser.uid
                updates.googleUid = googleProvider.uid || firebaseUser.uid
                needsUpdate = true
              }
              if (!profile.emailId && googleProvider.email) {
                profile.emailId = googleProvider.email
                updates.emailId = googleProvider.email
                needsUpdate = true
              }
              const photoURL = googleProvider.photoURL || firebaseUser.photoURL
              if (!profile.profilePhoto && photoURL) {
                profile.profilePhoto = photoURL
                updates.profilePhoto = photoURL
                needsUpdate = true
              }
            }
            
            if (needsUpdate) {
              await updateDoc(userDocRef, updates)
              logger.info('Auto-synchronized Google credential details to Firestore user document')
            } else {
              await updateDoc(userDocRef, { lastLoginDate })
            }
            
            i18n.changeLanguage(profile.language)
            set({ 
              user: { ...profile, lastLoginDate }, 
              loading: false, 
              initialized: true 
            })
          } else {
            // Document doesn't exist in Firestore yet (new user in middle of registration flow)
            set({ user: null, loading: false, initialized: true })
          }
        }
      } catch (err: any) {
        logger.error('Failed to fetch user profile', err)
        set({ error: err.code || err.message || 'errorFetchProfile', user: null, loading: false, initialized: true })
      }
    })

    return unsubscribe
  },

  sendOtp: async (mobileNumber: string, appVerifier?: any) => {
    set({ loading: true, error: null })
    try {
      const cleanMobile = mobileNumber.replace(/\D/g, '')
      
      if (isMock) {
        // Generate a random mock OTP code
        const randomOtp = Math.floor(100000 + Math.random() * 900000).toString()
        set({ otpCode: randomOtp, loading: false })
        logger.info(`Mock OTP generated for ${cleanMobile}: ${randomOtp}`)
        return true
      } else {
        // Real Firebase Phone authentication
        let formattedPhone = cleanMobile
        if (!formattedPhone.startsWith('+')) {
          // Format standard Indian phone code if not prefixed
          if (formattedPhone.length === 10) {
            formattedPhone = `+91${formattedPhone}`
          } else if (formattedPhone.length === 12 && formattedPhone.startsWith('91')) {
            formattedPhone = `+${formattedPhone}`
          } else {
            formattedPhone = `+${formattedPhone}`
          }
        }

        logger.info(`Requesting Firebase Phone OTP for: ${formattedPhone}`)
        const confirmation = await signInWithPhoneNumber(auth as any, formattedPhone, appVerifier)
        set({ confirmationResult: confirmation, loading: false })
        return true
      }
    } catch (err: any) {
      logger.error('Failed to send phone OTP', err)
      set({ error: err.code || err.message || 'Failed to send OTP', loading: false })
      return false
    }
  },

  verifyOtp: async (otp: string) => {
    set({ loading: true, error: null })
    try {
      if (isMock) {
        const activeOtp = get().otpCode
        if (otp === activeOtp || otp === '123456') { // Allow 123456 as master test bypass in mock mode
          set({ loading: false })
          return true
        }
        throw new Error('errorIncorrectOtp')
      } else {
        const confirmation = get().confirmationResult
        if (!confirmation) {
          throw new Error('errorNoSession')
        }

        logger.info('Confirming Firebase OTP code')
        await confirmation.confirm(otp)
        set({ loading: false })
        return true
      }
    } catch (err: any) {
      logger.error('OTP verification failed', err)
      set({ error: err.code || err.message || 'verificationFailed', loading: false })
      return false
    }
  },

  registerFarmer: async (data) => {
    set({ loading: true, error: null })
    try {
      let cleanMobile = data.mobileNumber.replace(/\D/g, '')
      if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
        cleanMobile = cleanMobile.substring(2)
      }

      let uid = ''
      
      if (isMock) {
        uid = `uid-${cleanMobile}`
        const mockUser = {
          uid,
          email: getEmailFromMobile(cleanMobile),
          phoneNumber: `+91${cleanMobile}`
        }
        localStorage.setItem('mock_user', JSON.stringify(mockUser))
      } else {
        if (!(auth as any).currentUser) {
          throw new Error('No authenticated phone session found')
        }
        uid = (auth as any).currentUser.uid
      }

      const profileData = { ...data }
      delete profileData.password
      const fullProfile: UserProfile = {
        ...profileData,
        mobileNumber: cleanMobile,
        uid,
        registrationDate: new Date().toISOString(),
        lastLoginDate: new Date().toISOString(),
        status: 'active'
      }

      if (isMock) {
        localStorage.setItem(`farmer_profile_${cleanMobile}`, JSON.stringify(fullProfile))
        const mockUser = JSON.parse(localStorage.getItem('mock_user') || '{}')
        const listeners = (auth as any).listeners || []
        listeners.forEach((l: any) => l(mockUser))
      } else {
        // Clean undefined fields so Firestore doesn't throw "Unsupported field value: undefined"
        const firestoreProfile = JSON.parse(JSON.stringify(fullProfile))
        // Write profile to Firestore, keying by the clean mobile number
        await withTimeout(setDoc(doc(db as any, 'users', cleanMobile), firestoreProfile), 10000)
      }

      i18n.changeLanguage(data.language)
      set({ user: fullProfile, loading: false })
      logger.info('User registration completed', fullProfile)
      return true
    } catch (err: any) {
      logger.error('Registration failed', err)
      set({ error: err.code || err.message || 'registerSuccess', loading: false })
      return false
    }
  },

  signInWithPassword: async (mobileNumber: string, password: string) => {
    set({ loading: true, error: null })
    try {
      let cleanMobile = mobileNumber.replace(/\D/g, '')
      if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
        cleanMobile = cleanMobile.substring(2)
      }

      const email = getEmailFromMobile(cleanMobile)
      
      if (isMock) {
        const profileStr = localStorage.getItem(`farmer_profile_${cleanMobile}`)
        if (!profileStr) {
          throw new Error('errorNoAccount')
        }

        const p = JSON.parse(profileStr) as UserProfile

        if (password !== 'Password123!' && password !== 'admin') {
          throw new Error('errorWrongPassword')
        }

        const mockUser = {
          uid: p.uid,
          email,
          phoneNumber: `+91${cleanMobile}`
        }
        localStorage.setItem('mock_user', JSON.stringify(mockUser))
        
        i18n.changeLanguage(p.language)
        const listeners = (auth as any).listeners || []
        listeners.forEach((l: any) => l(mockUser))
      } else {
        // Authentic Firebase Email/Password Sign-In
        await signInWithEmailAndPassword(auth as any, email, password)
      }

      set({ loading: false })
      return true
    } catch (err: any) {
      logger.error('Login failed', err)
      set({ error: err.code || err.message || 'Login failed', loading: false })
      return false
    }
  },

  signOut: async () => {
    set({ loading: true, error: null })
    try {
      if (isMock) {
        await auth.signOut()
      } else {
        await firebaseSignOut(auth as any)
      }
      set({ user: null, loading: false })
      logger.info('Sign out completed')
    } catch (err: any) {
      logger.error('Sign out failed', err)
      set({ error: err.code || err.message || 'Sign out failed', loading: false })
    }
  },

  updateLanguage: async (lang: AppLanguage) => {
    const activeUser = get().user
    if (!activeUser) return

    set({ loading: true })
    try {
      const updatedProfile = { ...activeUser, language: lang }
      let cleanMobile = activeUser.mobileNumber.replace(/\D/g, '')
      if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
        cleanMobile = cleanMobile.substring(2)
      }
      
      if (isMock) {
        localStorage.setItem(`farmer_profile_${cleanMobile}`, JSON.stringify(updatedProfile))
      } else {
        await updateDoc(doc(db as any, 'users', cleanMobile), { language: lang })
      }
      
      i18n.changeLanguage(lang)
      set({ user: updatedProfile, loading: false })
      logger.info(`Language updated to: ${lang}`)
    } catch (err: any) {
      set({ error: err.code || err.message || 'Failed to update language', loading: false })
    }
  },

  updateMembership: async (membership: MembershipType) => {
    const activeUser = get().user
    if (!activeUser) return

    set({ loading: true })
    try {
      const updatedProfile = { ...activeUser, membershipType: membership }
      let cleanMobile = activeUser.mobileNumber.replace(/\D/g, '')
      if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
        cleanMobile = cleanMobile.substring(2)
      }
      
      if (isMock) {
        localStorage.setItem(`farmer_profile_${cleanMobile}`, JSON.stringify(updatedProfile))
      } else {
        await updateDoc(doc(db as any, 'users', cleanMobile), { membershipType: membership })
      }
      
      set({ user: updatedProfile, loading: false })
      logger.info(`Membership updated to: ${membership}`)
    } catch (err: any) {
      set({ error: err.code || err.message || 'Failed to update membership', loading: false })
    }
  },

  checkMobileRegistered: async (mobileNumber: string) => {
    set({ loading: true, error: null })
    try {
      let cleanMobile = mobileNumber.replace(/\D/g, '')
      if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
        cleanMobile = cleanMobile.substring(2)
      }
      
      if (isMock) {
        const savedProfile = localStorage.getItem(`farmer_profile_${cleanMobile}`)
        set({ loading: false })
        return !!savedProfile
      } else {
        const userDocRef = doc(db as any, 'users', cleanMobile)
        const userDocSnap = await withTimeout(getDoc(userDocRef), 8000)
        set({ loading: false })
        return userDocSnap.exists()
      }
    } catch (err: any) {
      logger.error('Error checking if mobile is registered', err)
      set({ error: err.code || 'auth/network-request-failed', loading: false })
      return false
    }
  },

  checkEmailRegistered: async (email: string) => {
    set({ loading: true, error: null })
    try {
      if (!email) {
        set({ loading: false })
        return false
      }
      const cleanEmail = email.trim().toLowerCase()
      
      if (isMock) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith('farmer_profile_')) {
            try {
              const profile = JSON.parse(localStorage.getItem(key) || '{}')
              if (profile.emailId && profile.emailId.toLowerCase() === cleanEmail) {
                set({ loading: false })
                return true
              }
            } catch (e) {
              // Ignore
            }
          }
        }
        set({ loading: false })
        return false
      } else {
        const q = query(collection(db as any, 'users'), where('emailId', '==', cleanEmail))
        const querySnapshot = await withTimeout(getDocs(q), 8000)
        set({ loading: false })
        return !querySnapshot.empty
      }
    } catch (err: any) {
      logger.error('Error checking if email is registered', err)
      set({ error: err.code || 'auth/network-request-failed', loading: false })
      return false
    }
  },

  updateProfile: async (data: Partial<UserProfile>) => {
    const { user } = get()
    if (!user) return false
    set({ loading: true, error: null })
    try {
      const updatedProfile = { ...user, ...data }
      if (isMock) {
        localStorage.setItem(`farmer_profile_${user.mobileNumber}`, JSON.stringify(updatedProfile))
      } else {
        const userDocRef = doc(db as any, 'users', user.mobileNumber)
        // Clean undefined values
        const cleanUpdate = JSON.parse(JSON.stringify(data))
        await withTimeout(updateDoc(userDocRef, cleanUpdate), 8000)
      }
      set({ user: updatedProfile, loading: false })
      logger.info('User profile updated successfully', updatedProfile)
      return true
    } catch (err: any) {
      logger.error('Failed to update user profile', err)
      set({ error: err.code || err.message, loading: false })
      return false
    }
  },

  linkGoogleAccount: async () => {
    const { user } = get()
    if (!user) return false
    set({ loading: true, error: null })
    try {
      if (isMock) {
        const updatedProfile = { ...user, emailId: 'farmer.demo@gmail.com', googleUid: 'mock-google-123' }
        set({ user: updatedProfile, loading: false })
        localStorage.setItem(`farmer_profile_${user.mobileNumber}`, JSON.stringify(updatedProfile))
        return true
      } else {
        const currentUser = (auth as any).currentUser
        if (!currentUser) {
          throw new Error('No user is currently logged in to link.')
        }

        const provider = new GoogleAuthProvider()
        provider.setCustomParameters({ prompt: 'select_account' })
        
        const result = await linkWithPopup(currentUser, provider)
        
        const cleanMobile = user.mobileNumber
        const userDocRef = doc(db as any, 'users', cleanMobile)
        const updatedProfile = { 
          ...user, 
          emailId: result.user.email || user.emailId, 
          googleUid: result.user.uid,
          profilePhoto: user.profilePhoto || result.user.photoURL || undefined
        }
        await withTimeout(setDoc(userDocRef, updatedProfile), 8000)
        
        set({ user: updatedProfile, loading: false })
        logger.info('Google account linked successfully via linkWithPopup')
        return true
      }
    } catch (err: any) {
      if (err.code === 'auth/provider-already-linked' || err.code === 'auth/credential-already-in-use') {
        const currentUser = (auth as any).currentUser
        if (currentUser) {
          const googleProvider = currentUser.providerData.find((p: any) => p.providerId === 'google.com')
          if (googleProvider) {
            const cleanMobile = user.mobileNumber
            const userDocRef = doc(db as any, 'users', cleanMobile)
            const updatedProfile = { 
              ...user, 
              emailId: googleProvider.email || user.emailId, 
              googleUid: googleProvider.uid || currentUser.uid,
              profilePhoto: user.profilePhoto || googleProvider.photoURL || undefined
            }
            await withTimeout(setDoc(userDocRef, updatedProfile), 8000)
            set({ user: updatedProfile, loading: false })
            logger.info('Google account was already linked in Auth; healed Firestore user document.')
            return true
          }
        }
      }
      logger.error('Failed to link Google account', err)
      set({ error: err.code || err.message, loading: false })
      return false
    }
  },

  signInWithGoogle: async () => {
    set({ loading: true, error: null })
    try {
      if (isMock) {
        // Just sign in with default mock profile
        const mockMobile = '9130057189'
        const savedProfile = localStorage.getItem(`farmer_profile_${mockMobile}`)
        if (savedProfile) {
          const profile = JSON.parse(savedProfile) as UserProfile
          const mockUser = { uid: profile.uid, phoneNumber: `+91${mockMobile}` }
          localStorage.setItem('mock_user', JSON.stringify(mockUser))
          i18n.changeLanguage(profile.language)
          set({ user: profile, loading: false })
          return true
        } else {
          throw new Error('errorNoAccount')
        }
      } else {
        const provider = new GoogleAuthProvider()
        provider.setCustomParameters({ prompt: 'select_account' })
        const result = await signInWithPopup(auth as any, provider)
        
        // Find if there is a user document in Firestore with this googleUid or email
        const usersRef = collection(db as any, 'users')
        const q = query(usersRef, where('googleUid', '==', result.user.uid))
        const querySnapshot = await withTimeout(getDocs(q), 8000)
        
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0]
          let profile = userDoc.data() as UserProfile
          
          // Update profilePhoto from Google photoURL if not already defined
          if (!profile.profilePhoto && result.user.photoURL) {
            profile = { ...profile, profilePhoto: result.user.photoURL }
            await withTimeout(setDoc(userDoc.ref, profile), 8000)
          }

          i18n.changeLanguage(profile.language)
          set({ user: profile, loading: false })
          logger.info('Logged in successfully via Google link')
          return true
        } else {
          // Check by email fallback
          if (result.user.email) {
            const qEmail = query(usersRef, where('emailId', '==', result.user.email.trim().toLowerCase()))
            const querySnapshotEmail = await withTimeout(getDocs(qEmail), 8000)
            if (!querySnapshotEmail.empty) {
              const userDoc = querySnapshotEmail.docs[0]
              let profile = userDoc.data() as UserProfile
              
              // Link Google UID and save photoURL if applicable
              const updatedProfile = { 
                ...profile, 
                googleUid: result.user.uid,
                profilePhoto: profile.profilePhoto || result.user.photoURL || undefined
              }
              await withTimeout(setDoc(doc(db as any, 'users', profile.mobileNumber), updatedProfile), 8000)
              
              i18n.changeLanguage(profile.language)
              set({ user: updatedProfile, loading: false })
              logger.info('Logged in successfully via Google email match')
              return true
            }
          }
          
          // No registered account matches this Google account
          await firebaseSignOut(auth as any)
          throw new Error('errorNoAccount')
        }
      }
    } catch (err: any) {
      logger.error('Google Sign-In failed', err)
      set({ error: err.code || err.message || 'Google Login failed', loading: false })
      return false
    }
  },

  unlinkGoogleAccount: async () => {
    const { user } = get()
    if (!user) return false
    set({ loading: true, error: null })
    try {
      if (isMock) {
        const updatedProfile = { 
          ...user, 
          googleUid: undefined, 
          emailId: undefined, 
          profilePhoto: undefined 
        }
        set({ user: updatedProfile, loading: false })
        localStorage.setItem(`farmer_profile_${user.mobileNumber}`, JSON.stringify(updatedProfile))
        return true
      } else {
        const currentUser = (auth as any).currentUser
        if (!currentUser) {
          throw new Error('No user is currently logged in.')
        }

        // Unlink the google.com provider in Firebase Auth
        await unlink(currentUser, 'google.com')

        const cleanMobile = user.mobileNumber
        const userDocRef = doc(db as any, 'users', cleanMobile)
        
        // Remove Google-specific fields from the Firestore document representation
        const updatedProfile = { 
          ...user, 
          googleUid: undefined,
          emailId: undefined,
          profilePhoto: undefined
        }
        
        // Convert to plain object and remove undefined keys
        const cleanProfile = JSON.parse(JSON.stringify(updatedProfile))
        await withTimeout(setDoc(userDocRef, cleanProfile), 8000)

        set({ user: updatedProfile, loading: false })
        logger.info('Google account unlinked successfully')
        return true
      }
    } catch (err: any) {
      logger.error('Failed to unlink Google account', err)
      set({ error: err.code || err.message, loading: false })
      return false
    }
  }
}))

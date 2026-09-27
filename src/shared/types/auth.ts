export type MembershipType = 'free' | 'gold'
export type UserStatus = 'active' | 'blocked'
export type AppLanguage = 'mr' | 'en'

export interface GeoLocation {
  latitude: number
  longitude: number
  accuracy?: number
  address?: string // Resolved address (village/taluka)
}

export interface BankDetails {
  bankName?: string
  accountNumber?: string
  ifscCode?: string
}

export interface FamilyMember {
  name: string
  relation: string
  age?: number
}

export interface UserProfile {
  uid: string
  fullName: string
  mobileNumber: string
  emailId?: string
  village?: string
  taluka?: string
  district?: string
  state?: string
  pincode?: string
  geoLocation?: GeoLocation
  deviceId?: string
  language: AppLanguage
  membershipType: MembershipType
  registrationDate: string
  lastLoginDate: string
  status: UserStatus
  profilePhoto?: string
  googleUid?: string
  alternateMobile?: string
  aadhaarNumber?: string
  dob?: string
  farmerId?: string
  familyMembers?: FamilyMember[]
  bankDetails?: BankDetails
}

export interface AuthState {
  user: UserProfile | null
  loading: boolean
  error: string | null
}

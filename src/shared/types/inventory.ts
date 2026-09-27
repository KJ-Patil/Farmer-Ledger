import type { PaymentMode } from './ledger'

export type InventoryItemType = 'fertilizer' | 'seed' | 'pesticide' | 'other'

export type InventoryUnit = 
  | 'bag'      // गोणी (उदा. ५० किलो किंवा ४५ किलो)
  | 'kg'       // किलो
  | 'liter'    // लिटर
  | 'bottle'   // बाटली
  | 'packet'   // पाकीट
  | 'nos'      // नग (उदा. रोपे, ऊस बेणे कांड्या)

export interface InventoryItem {
  id: string
  name: string
  nameMr: string
  type: InventoryItemType
  unit: InventoryUnit
  currentStock: number      // शिल्लक साठा
  purchaseRate: number      // सरासरी खरेदी दर (प्रति एकक)
  totalPurchased: number    // एकूण खरेदी प्रमाण
  totalConsumed: number     // एकूण शेतात वापरलेले प्रमाण
  totalValue: number        // एकूण साठा मूल्य (currentStock * purchaseRate)
  notes?: string
  isCustom?: boolean        // वापरकर्त्याने तयार केलेली नवीन वस्तू
  createdAt: string
}

export interface InventoryPurchase {
  id: string
  itemId: string
  itemName: string
  itemType: InventoryItemType
  date: string
  supplierName: string      // कृषी केंद्र / दुकानाचे नाव
  quantity: number
  unit: InventoryUnit
  rate: number              // दर प्रति एकक
  totalAmount: number       // एकूण रक्कम (quantity * rate)
  paymentMode: PaymentMode  // 'cash' | 'credit' | 'bank' | 'upi' | 'cheque'
  billNumber?: string
  notes?: string
  timestamp: string
}

export interface InventoryConsumption {
  id: string
  itemId: string
  itemName: string
  itemType: InventoryItemType
  date: string
  plotId: string
  plotName: string
  cropId?: string
  cropName?: string
  cropSeason?: string
  quantity: number
  unit: InventoryUnit
  rate: number              // वापरलेल्या वेळीचा दर
  totalExpense: number      // प्रत्यक्ष खर्च (quantity * rate)
  notes?: string
  timestamp: string
  linkedTransactionId?: string // लेजरमधील स्वयंचलित खर्चाचा ID
}

// 80% Common Preloaded Input Master Catalog
export const PRELOADED_INVENTORY_MASTER: Omit<InventoryItem, 'id' | 'createdAt'>[] = [
  // 1. Fertilizers (खते)
  {
    name: 'Urea (Neem Coated)',
    nameMr: 'युरिया (युरिया खत - 45kg)',
    type: 'fertilizer',
    unit: 'bag',
    currentStock: 0,
    purchaseRate: 270,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: 'नायट्रोजन पुरवठा करणारे मुख्य खत',
    isCustom: false
  },
  {
    name: 'DAP (18:46:0)',
    nameMr: 'डीएपी (DAP 18:46:0 - 50kg)',
    type: 'fertilizer',
    unit: 'bag',
    currentStock: 0,
    purchaseRate: 1350,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: 'फॉस्फरस व नायट्रोजनयुक्त खत',
    isCustom: false
  },
  {
    name: 'NPK 10:26:26',
    nameMr: '१०:२६:२६ (NPK 10:26:26 - 50kg)',
    type: 'fertilizer',
    unit: 'bag',
    currentStock: 0,
    purchaseRate: 1470,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: 'कंद व दाणे भरण्यासाठी उत्तम खत',
    isCustom: false
  },
  {
    name: 'NPK 12:32:16',
    nameMr: '१२:३२:१६ (NPK 12:32:16 - 50kg)',
    type: 'fertilizer',
    unit: 'bag',
    currentStock: 0,
    purchaseRate: 1450,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: 'शेत पिकांसाठी संतुलित खत',
    isCustom: false
  },
  {
    name: 'MOP Potash (0:0:60)',
    nameMr: 'पोटॅश / एमओपी (0:0:60 - 50kg)',
    type: 'fertilizer',
    unit: 'bag',
    currentStock: 0,
    purchaseRate: 1700,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: 'पिकाची रोगप्रतिकारशक्ती व चमक वाढवते',
    isCustom: false
  },
  {
    name: 'Single Super Phosphate (SSP)',
    nameMr: 'सिंगल सुपर फॉस्फेट (SSP - 50kg)',
    type: 'fertilizer',
    unit: 'bag',
    currentStock: 0,
    purchaseRate: 450,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: 'फॉस्फरस, सल्फर व कॅल्शियम पुरवठा',
    isCustom: false
  },
  {
    name: 'Water Soluble 19:19:19',
    nameMr: '१९:१९:१९ (द्राव्य खत - 1kg)',
    type: 'fertilizer',
    unit: 'packet',
    currentStock: 0,
    purchaseRate: 150,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: 'ठिबक सिंचन व फवारणीसाठी उपयोगी',
    isCustom: false
  },
  {
    name: 'Micronutrient Mixture',
    nameMr: 'सूक्ष्म अन्नद्रव्ये (ग्रेड २ / लिटर)',
    type: 'fertilizer',
    unit: 'liter',
    currentStock: 0,
    purchaseRate: 350,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: 'झिंक, फेरस, कॉपर, बोरॉन घटक',
    isCustom: false
  },

  // 2. Seeds (बियाणे)
  {
    name: 'Onion Seeds (कांदा बियाणे)',
    nameMr: 'कांदा बियाणे (फुरसुंगी / पंचगंगा)',
    type: 'seed',
    unit: 'kg',
    currentStock: 0,
    purchaseRate: 1800,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: 'रब्बी / रांगडा कांदा बियाणे',
    isCustom: false
  },
  {
    name: 'Soybean Seeds (सोयाबीन)',
    nameMr: 'सोयाबीन बियाणे (JS 335 / KDS 726)',
    type: 'seed',
    unit: 'bag',
    currentStock: 0,
    purchaseRate: 2800,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: 'खरीप पेरणीसाठी प्रमाणित बियाणे',
    isCustom: false
  },
  {
    name: 'Wheat Seeds (गहू बियाणे)',
    nameMr: 'गहू बियाणे (लोकवन / समाधान)',
    type: 'seed',
    unit: 'bag',
    currentStock: 0,
    purchaseRate: 1600,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: 'रब्बी हंगामासाठी 40kg गोणी',
    isCustom: false
  },
  {
    name: 'Gram Seeds (हरभरा बियाणे)',
    nameMr: 'हरभरा बियाणे (विजय / दिग्विजय)',
    type: 'seed',
    unit: 'bag',
    currentStock: 0,
    purchaseRate: 3200,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: 'रब्बी कडधान्य बियाणे',
    isCustom: false
  },
  {
    name: 'Sugarcane Setts (ऊस बेणे)',
    nameMr: 'ऊस बेणे (को ८६०३२)',
    type: 'seed',
    unit: 'nos',
    currentStock: 0,
    purchaseRate: 3,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: 'एक डोळा / दोन डोळा ऊस कांड्या',
    isCustom: false
  },

  // 3. Pesticides & Crop Protection (औषधे व कीटकनाशके)
  {
    name: 'Coragen (कोराजन)',
    nameMr: 'कोराजन कीटकनाशक (60ml)',
    type: 'pesticide',
    unit: 'bottle',
    currentStock: 0,
    purchaseRate: 850,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: 'अळी व खोडकीड नियंत्रणासाठी',
    isCustom: false
  },
  {
    name: 'Chlorpyrifos 20% EC',
    nameMr: 'क्लोरोपायरीफॉस २०% (१ लिटर)',
    type: 'pesticide',
    unit: 'liter',
    currentStock: 0,
    purchaseRate: 480,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: 'हुमणी व जमिनीतील कीड नियंत्रणासाठी',
    isCustom: false
  },
  {
    name: 'Saaf Fungicide (साफ बुरशीनाशक)',
    nameMr: 'साफ बुरशीनाशक (500g)',
    type: 'pesticide',
    unit: 'packet',
    currentStock: 0,
    purchaseRate: 380,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: 'मॅन्कोझेब + कार्बेन्डाझिम युक्त आंतरप्रवाही बुरशीनाशक',
    isCustom: false
  },
  {
    name: 'Roundup Weedicide (राउंडअप)',
    nameMr: 'राउंडअप तणनाशक (१ लिटर)',
    type: 'pesticide',
    unit: 'liter',
    currentStock: 0,
    purchaseRate: 450,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: 'सर्व प्रकारच्या तण नियंत्रणासाठी',
    isCustom: false
  },
  {
    name: 'Plant Tonic / Growth Booster',
    nameMr: 'पिक टॉनिक व फुलोरा संजीवके (५०० मिली)',
    type: 'pesticide',
    unit: 'bottle',
    currentStock: 0,
    purchaseRate: 400,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: 'फुलगळ रोखण्यासाठी व उत्पादन वाढीसाठी',
    isCustom: false
  }
]

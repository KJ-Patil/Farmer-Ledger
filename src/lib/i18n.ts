import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { resources } from '../shared/locales'

// Try to hydrate language from session or localStorage
const savedLanguage = localStorage.getItem('guest_language') || 'en'

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values (xss protection)
    }
  })

export default i18n
export { i18n }

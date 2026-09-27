import { en } from './en'
import { mr } from './mr'

export const resources = {
  en: {
    translation: en
  },
  mr: {
    translation: mr
  }
} as const
export type TranslationKeys = keyof typeof mr

import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import * as Localization from "expo-localization"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Platform } from "react-native"

// Import translation files
import en from "./locales/en.json"
import hi from "./locales/hi.json"
import mr from "./locales/mr.json"

const LANGUAGE_DETECTOR = {
  type: "languageDetector",
  async: true,
  detect: async (callback) => {
    try {
      // Try to get saved language from AsyncStorage
      const savedLanguage = await AsyncStorage.getItem("user-language")
      if (savedLanguage) {
        callback(savedLanguage)
        return
      }

      // Fallback to device locale
      const deviceLocale = Localization.locale
      const languageCode = deviceLocale.split("-")[0]

      // Check if we support the device language
      const supportedLanguages = ["en", "hi", "mr"]
      const detectedLanguage = supportedLanguages.includes(languageCode) ? languageCode : "en"

      callback(detectedLanguage)
    } catch (error) {
      console.log("Error detecting language:", error)
      callback("en") // Default to English
    }
  },
  init: () => {},
  cacheUserLanguage: async (language) => {
    try {
      await AsyncStorage.setItem("user-language", language)
    } catch (error) {
      console.log("Error saving language:", error)
    }
  },
}

const __DEV__ = Platform.isDebuggingInChrome

i18n
  .use(LANGUAGE_DETECTOR)
  .use(initReactI18next)
  .init({
    compatibilityJSON: "v3",
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      mr: { translation: mr },
    },
    fallbackLng: "en",
    debug: __DEV__,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  })

export default i18n

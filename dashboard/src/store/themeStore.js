import { create } from 'zustand'

export const useThemeStore = create((set) => ({
  isDarkMode: true, // Mode sombre par défaut
  
  toggleDarkMode: () => {
    set((state) => {
      const newMode = !state.isDarkMode
      localStorage.setItem('darkMode', JSON.stringify(newMode))
      if (newMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      return { isDarkMode: newMode }
    })
  },
  
  initTheme: () => {
    const stored = localStorage.getItem('darkMode')
    if (stored !== null) {
      try {
        const isDark = JSON.parse(stored)
        if (isDark) {
          document.documentElement.classList.add('dark')
        }
        set({ isDarkMode: isDark })
      } catch (e) {
        localStorage.removeItem('darkMode')
        document.documentElement.classList.add('dark')
      }
    } else {
      // Par défaut, activer le mode sombre
      document.documentElement.classList.add('dark')
      localStorage.setItem('darkMode', 'true')
    }
  },
}))

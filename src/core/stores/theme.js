import { defineStore } from 'pinia'
import { AuthService } from "../../auth/services/auth-api.service.js"
import { configurationService } from "../../context/configuration/services/configuration-api.service.js";

export const useThemeStore = defineStore('theme', {
    state: () => ({
        currentTheme: 'auto',
        systemTheme: 'light',
        isInitialized: false
    }),

    getters: {
        effectiveTheme: (state) => {
            if (state.currentTheme === 'auto') {
                return state.systemTheme
            }
            return state.currentTheme
        },

        isDarkMode: (state) => {
            if (state.currentTheme === 'auto') {
                return state.systemTheme === 'dark'
            }
            return state.currentTheme === 'dark'
        },

        themeClass() {
            return this.isDarkMode ? 'dark-mode' : 'light-mode'
        }
    },

    actions: {
        detectSystemTheme() {
            if (typeof window === 'undefined') return

            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
            this.systemTheme = mediaQuery.matches ? 'dark' : 'light'

            mediaQuery.addEventListener('change', (e) => {
                this.systemTheme = e.matches ? 'dark' : 'light'
                if (this.currentTheme === 'auto') {
                    this.applyThemeToBody()
                }
            })
        },

        initializeForLogin() {
            this.detectSystemTheme()
            this.currentTheme = 'auto'
            this.applyThemeToBody()
            this.isInitialized = true
        },

        async initializeFromLogin() {
            try {
                this.detectSystemTheme()

                const user = AuthService.getCurrentUser()

                // 🔄 MEJORADO: Cargar configuración completa desde API
                try {
                    const configuration = await configurationService.loadCurrentUserSettings()

                    // Aplicar tema SIN guardarlo
                    this.currentTheme = configuration?.theme || 'auto'

                    // 🆕 NUEVO: Guardar configuración en sessionStorage para futuro uso
                    if (user && configuration) {
                        const updatedUser = {
                            ...user,
                            settings: configuration.toJSON() // Incluye tutorials y todo
                        }
                        sessionStorage.setItem('user', JSON.stringify(updatedUser))
                    }

                } catch (error) {
                    console.error('Error cargando configuración del usuario:', error)
                    this.currentTheme = user?.settings?.theme || 'auto'
                }

                this.applyThemeToBody()
                this.isInitialized = true

            } catch (error) {
                console.error('Error en initializeFromLogin:', error)
                this.currentTheme = 'auto'
                this.applyThemeToBody()
                this.isInitialized = true
            }
        },

        async initializeTheme() {
            if (this.isInitialized) return

            this.detectSystemTheme()

            const user = AuthService.getCurrentUser()

            // Primero intentar usar settings del sessionStorage
            if (user?.settings?.theme) {
                this.currentTheme = user.settings.theme
                this.applyThemeToBody()
                this.isInitialized = true
                return
            }

            // Solo cargar desde API si no hay usuario o settings
            if (user) {
                try {
                    const configuration = await configurationService.loadCurrentUserSettings()
                    this.currentTheme = configuration?.theme || 'auto'
                } catch (error) {
                    console.error('Error loading theme from API:', error)
                    this.currentTheme = 'auto'
                }
            } else {
                this.currentTheme = 'auto'
            }

            this.applyThemeToBody()
            this.isInitialized = true
        },

        async setTheme(theme) {
            this.applyTheme(theme) // Aplicar visualmente

            // Guardar en sessionStorage y API
            const user = AuthService.getCurrentUser()
            if (user) {
                const updatedUser = {
                    ...user,
                    settings: {
                        ...user.settings,
                        theme: theme
                    }
                }
                sessionStorage.setItem('user', JSON.stringify(updatedUser))

                // Guardar en API en background
                this.saveThemeToAPI(theme).catch(error => {
                    console.error('Error guardando tema en API:', error)
                })
            }
        },

        async saveThemeToAPI(theme) {
            try {
                const configuration = await configurationService.loadCurrentUserSettings()
                configuration.theme = theme
                await configurationService.saveCurrentUserSettings(configuration)
            } catch (error) {
                console.error('Error saving theme to API:', error)
                throw error
            }
        },

        applyThemeToBody() {
            if (typeof document === 'undefined') return

            document.body.classList.remove('light-mode', 'dark-mode')
            document.documentElement.removeAttribute('data-theme')
            document.body.classList.add(this.themeClass)
            document.documentElement.setAttribute('data-theme', this.effectiveTheme)
        },

        toggleTheme() {
            const themes = ['light', 'dark', 'auto']
            const currentIndex = themes.indexOf(this.currentTheme)
            const nextIndex = (currentIndex + 1) % themes.length
            this.setTheme(themes[nextIndex])
        },

        reset() {
            this.currentTheme = 'auto'
            this.systemTheme = 'light'
            this.isInitialized = false
        },

        getThemeInfo() {
            return {
                current: this.currentTheme,
                effective: this.effectiveTheme,
                system: this.systemTheme,
                isDark: this.isDarkMode,
                class: this.themeClass,
                isInitialized: this.isInitialized
            }
        },
        applyTheme(theme) {
            const validThemes = ['light', 'dark', 'auto']
            if (!validThemes.includes(theme)) {
                theme = 'auto'
            }

            this.currentTheme = theme
            this.applyThemeToBody()

            // NO guardar en API, solo aplicar visualmente
        },

    }
})
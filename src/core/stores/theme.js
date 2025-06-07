// src/stores/theme.js
import { defineStore } from 'pinia'
import { AuthService } from "../../auth/services/auth-api.service.js"
import { configurationService} from "../../context/configuration/services/configuration-api.service.js";

export const useThemeStore = defineStore('theme', {
    state: () => ({
        currentTheme: 'auto', // 'light', 'dark', 'auto'
        systemTheme: 'light',  // Detectado del sistema/navegador
        isInitialized: false   // Para evitar inicializaciones múltiples
    }),

    getters: {
        // Tema efectivo (resuelve 'auto' al tema del sistema)
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
        // Detectar tema del navegador/sistema
        detectSystemTheme() {
            if (typeof window === 'undefined') return

            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
            this.systemTheme = mediaQuery.matches ? 'dark' : 'light'

            // Listener para cambios en tiempo real
            mediaQuery.addEventListener('change', (e) => {
                this.systemTheme = e.matches ? 'dark' : 'light'
                if (this.currentTheme === 'auto') {
                    this.applyThemeToBody()
                }
            })
        },

        // MÉTODO ESPECÍFICO PARA LOGIN (sin usuario autenticado)
        initializeForLogin() {
            this.detectSystemTheme()
            this.currentTheme = 'auto'
            this.applyThemeToBody()
            this.isInitialized = true
        },

        // MÉTODO PARA DESPUÉS DEL LOGIN (con configuración del usuario)
        // MÉTODO PARA DESPUÉS DEL LOGIN (con configuración del usuario)
        async initializeFromLogin(userId = null) {
            try {
                this.detectSystemTheme()

                if (userId) {
                    const userConfig = await configurationService.getByUserId(userId)
                    if (userConfig?.theme) {
                        this.currentTheme = userConfig.theme

                        // ACTUALIZAR sessionStorage CON LA CONFIGURACIÓN COMPLETA
                        const currentUser = AuthService.getCurrentUser()
                        if (currentUser) {
                            const updatedUser = {
                                ...currentUser,
                                settings: userConfig
                            }
                            sessionStorage.setItem('user', JSON.stringify(updatedUser))
                        }
                    } else {
                        this.currentTheme = 'auto'
                    }
                } else {
                    const user = AuthService.getCurrentUser()
                    this.currentTheme = user?.settings?.theme || 'auto'
                }

                this.applyThemeToBody()
                this.isInitialized = true

            } catch (error) {
                console.error('Error cargando configuración del usuario:', error)
                this.currentTheme = 'auto'
                this.applyThemeToBody()
                this.isInitialized = true
            }
        },

        // Inicializar tema desde el usuario actual (para layouts)
        async initializeTheme() {
            if (this.isInitialized) return

            this.detectSystemTheme()

            const user = AuthService.getCurrentUser()
            if (user?.settings?.theme) {
                this.currentTheme = user.settings.theme
            } else if (user?.id) {
                try {
                    const userConfig = await configurationService.getByUserId(user.id)
                    this.currentTheme = userConfig?.theme || 'auto'
                } catch (error) {
                    this.currentTheme = 'auto'
                }
            } else {
                this.currentTheme = 'auto'
            }

            this.applyThemeToBody()
            this.isInitialized = true
        },

        // Cambiar tema (llamado cuando cambia el selector)
        async setTheme(theme) {
            const validThemes = ['light', 'dark', 'auto']
            if (!validThemes.includes(theme)) {
                theme = 'auto'
            }

            this.currentTheme = theme
            this.applyThemeToBody()

            // GUARDAR AUTOMÁTICAMENTE EN BD
            try {
                const user = AuthService.getCurrentUser()
                if (user?.id) {
                    await configurationService.saveOrUpdate(user.id, { theme })

                    // Actualizar sessionStorage
                    const updatedUser = {
                        ...user,
                        settings: {
                            ...user.settings,
                            theme
                        }
                    }
                    sessionStorage.setItem('user', JSON.stringify(updatedUser))
                }
            } catch (error) {
                console.error('Error guardando tema:', error)
            }
        },

        // Aplicar clase al body
        applyThemeToBody() {
            if (typeof document === 'undefined') return

            document.body.classList.remove('light-mode', 'dark-mode')
            document.documentElement.removeAttribute('data-theme')
            document.body.classList.add(this.themeClass)
            document.documentElement.setAttribute('data-theme', this.effectiveTheme)
        },

        // Toggle entre temas
        toggleTheme() {
            const themes = ['light', 'dark', 'auto']
            const currentIndex = themes.indexOf(this.currentTheme)
            const nextIndex = (currentIndex + 1) % themes.length
            this.setTheme(themes[nextIndex])
        },

        // Resetear estado (útil para logout)
        reset() {
            this.currentTheme = 'auto'
            this.systemTheme = 'light'
            this.isInitialized = false
        },

        // Para debug
        getThemeInfo() {
            return {
                current: this.currentTheme,
                effective: this.effectiveTheme,
                system: this.systemTheme,
                isDark: this.isDarkMode,
                class: this.themeClass,
                isInitialized: this.isInitialized
            }
        }
    }
})
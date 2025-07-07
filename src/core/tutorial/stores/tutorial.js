// src/core/tutorial/stores/tutorial.js
import { defineStore } from 'pinia'
import { AuthService } from '../../../auth/services/auth-api.service.js'

export const useTutorialStore = defineStore('tutorial', {
    state: () => ({
        // Estado del tutorial actual
        isActive: false,
        currentTutorial: null,
        currentStep: 0,
        tutorialSteps: [],

        // Configuración
        canSkipSteps: true,
        canSkipTutorial: true,

        // Overlay y UI
        showOverlay: false,
        highlightElement: null,
        tooltipPosition: { x: 0, y: 0 },

        // IDs de tutorials disponibles
        TUTORIAL_IDS: {
            MANAGER_LAYOUT: 'manager-layout',
            MANAGER_PROJECT: 'manager-project',
            SUPERVISOR_LAYOUT: 'supervisor-layout',
            ADMIN_LAYOUT: 'admin-layout'
        }
    }),

    getters: {
        // Obtener progreso del usuario actual
        userProgress: (state) => {
            const user = AuthService.getCurrentUser()
            if (!user) return { userId: null, completedTutorials: [] }

            const progress = JSON.parse(localStorage.getItem('tutorial_progress') || '{}')

            // Si es diferente usuario, retornar progreso vacío
            if (progress.userId !== user.id) {
                return { userId: user.id, completedTutorials: [] }
            }

            return progress
        },

        // Verificar si ya completó un tutorial específico
        hasCompletedTutorial: (state) => (tutorialId) => {
            const progress = state.userProgress
            return progress.completedTutorials?.includes(tutorialId) || false
        },

        // Paso actual
        currentStepData: (state) => {
            if (!state.tutorialSteps.length || state.currentStep < 0) return null
            return state.tutorialSteps[state.currentStep] || null
        },

        // Progreso del tutorial actual
        progress: (state) => {
            if (!state.tutorialSteps.length) return { current: 0, total: 0, percentage: 0 }

            return {
                current: state.currentStep + 1,
                total: state.tutorialSteps.length,
                percentage: Math.round(((state.currentStep + 1) / state.tutorialSteps.length) * 100)
            }
        },

        // Verificar si es el primer paso
        isFirstStep: (state) => state.currentStep === 0,

        // Verificar si es el último paso
        isLastStep: (state) => {
            return state.currentStep === state.tutorialSteps.length - 1
        }
    },

    actions: {
        // Inicializar tutorial
        async startTutorial(tutorialId, steps) {
            try {
                console.log('🎯 Iniciando tutorial:', tutorialId)

                // Verificar si ya completó este tutorial
                if (this.hasCompletedTutorial(tutorialId)) {
                    console.log('✅ Tutorial ya completado:', tutorialId)
                    return false
                }

                // Configurar estado
                this.currentTutorial = tutorialId
                this.tutorialSteps = steps.sort((a, b) => a.order - b.order)
                this.currentStep = 0
                this.isActive = true
                this.showOverlay = true

                // Destacar primer elemento
                await this.highlightCurrentStep()

                console.log('🚀 Tutorial iniciado correctamente')
                return true

            } catch (error) {
                console.error('❌ Error iniciando tutorial:', error)
                this.resetTutorial()
                return false
            }
        },

        // Ir al siguiente paso
        async nextStep() {
            if (this.isLastStep) {
                await this.completeTutorial()
                return
            }

            this.currentStep++
            await this.highlightCurrentStep()
            console.log(`📍 Paso ${this.currentStep + 1}/${this.tutorialSteps.length}`)
        },

        // Ir al paso anterior
        async previousStep() {
            if (this.isFirstStep) return

            this.currentStep--
            await this.highlightCurrentStep()
            console.log(`📍 Paso ${this.currentStep + 1}/${this.tutorialSteps.length}`)
        },

        // Saltar al paso específico
        async goToStep(stepIndex) {
            if (stepIndex < 0 || stepIndex >= this.tutorialSteps.length) return

            this.currentStep = stepIndex
            await this.highlightCurrentStep()
        },

        // Destacar elemento del paso actual
        async highlightCurrentStep() {
            const step = this.currentStepData
            if (!step) return

            try {
                console.log(`💡 Intentando destacar paso: ${step.title}`)
                console.log(`🎯 Buscando elemento: ${step.target}`)

                // Buscar elemento en el DOM
                const element = document.querySelector(step.target)
                if (!element) {
                    console.warn(`⚠️ Elemento no encontrado: ${step.target}`)
                    // Intentar buscar sin data-tutorial
                    const fallbackSelector = step.target.replace('[data-tutorial="', '.').replace('"]', '')
                    const fallbackElement = document.querySelector(fallbackSelector)
                    if (fallbackElement) {
                        console.log(`✅ Elemento encontrado con fallback: ${fallbackSelector}`)
                        fallbackElement.setAttribute('data-tutorial', step.target.match(/data-tutorial="([^"]+)"/)?.[1] || step.id)
                    } else {
                        return
                    }
                }

                const targetElement = element || document.querySelector(step.target)

                // Scroll al elemento si es necesario
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'center'
                })

                // Esperar un poco para el scroll
                await new Promise(resolve => setTimeout(resolve, 600))

                // Actualizar posición del tooltip
                this.updateTooltipPosition(targetElement, step.position)
                this.highlightElement = step.target

                console.log(`✅ Destacando: ${step.title}`)

            } catch (error) {
                console.error('❌ Error destacando elemento:', error)
            }
        },

        // Calcular posición del tooltip
        updateTooltipPosition(element, positionConfig = 'bottom') {
            const rect = element.getBoundingClientRect()
            const tooltipOffset = 20

            // Determinar el dispositivo actual
            const viewportWidth = window.innerWidth
            const deviceType = viewportWidth < 768 ? 'mobile' : viewportWidth < 1024 ? 'tablet' : 'desktop'

            // Obtener configuración de posición según dispositivo
            let position = positionConfig
            let offset = { x: 0, y: 0 }

            if (typeof positionConfig === 'object') {
                // Configuración responsive
                const deviceConfig = positionConfig[deviceType] || positionConfig.desktop || positionConfig
                position = deviceConfig.placement || 'bottom'
                offset = deviceConfig.offset || { x: 0, y: 0 }
            } else if (typeof positionConfig === 'string') {
                // Formato simple o con offset: 'right+20,-10'
                if (positionConfig.includes('+') || positionConfig.includes('-')) {
                    const parts = positionConfig.split(/([+-])/)
                    position = parts[0]
                    if (parts.length >= 3) {
                        const coords = parts.slice(1).join('').split(',')
                        offset.x = parseInt(coords[0]) || 0
                        offset.y = parseInt(coords[1]) || 0
                    }
                } else {
                    position = positionConfig
                }
            }

            let x, y

            switch (position) {
                case 'top':
                    x = rect.left + rect.width / 2 + offset.x
                    y = rect.top - tooltipOffset + offset.y
                    break
                case 'bottom':
                    x = rect.left + rect.width / 2 + offset.x
                    y = rect.bottom + tooltipOffset + offset.y
                    break
                case 'left':
                    x = rect.left - tooltipOffset + offset.x
                    y = rect.top + rect.height / 2 + offset.y
                    break
                case 'right':
                    x = rect.right + tooltipOffset + offset.x
                    y = rect.top + rect.height / 2 + offset.y
                    break
                case 'top-left':
                    x = rect.left + offset.x
                    y = rect.top - tooltipOffset + offset.y
                    break
                case 'top-right':
                    x = rect.right + offset.x
                    y = rect.top - tooltipOffset + offset.y
                    break
                case 'bottom-left':
                    x = rect.left + offset.x
                    y = rect.bottom + tooltipOffset + offset.y
                    break
                case 'bottom-right':
                    x = rect.right + offset.x
                    y = rect.bottom + tooltipOffset + offset.y
                    break
                default:
                    x = rect.left + rect.width / 2 + offset.x
                    y = rect.bottom + tooltipOffset + offset.y
            }

            this.tooltipPosition = { x, y }

            console.log(`📱 Dispositivo: ${deviceType}, Posición: ${position}, Offset: ${offset.x},${offset.y}`)
        },

        // Completar tutorial
        async completeTutorial() {
            try {
                console.log('🎉 Completando tutorial:', this.currentTutorial)

                // Guardar progreso en localStorage
                this.saveTutorialProgress(this.currentTutorial)

                // Reset estado
                this.resetTutorial()

                console.log('✅ Tutorial completado exitosamente')

            } catch (error) {
                console.error('❌ Error completando tutorial:', error)
            }
        },

        // Saltar tutorial completo
        async skipTutorial() {
            if (!this.canSkipTutorial) return

            console.log('⏭️ Saltando tutorial:', this.currentTutorial)

            // Marcar como completado aunque lo haya saltado
            this.saveTutorialProgress(this.currentTutorial)
            this.resetTutorial()
        },

        // Saltar paso actual
        async skipStep() {
            if (!this.canSkipSteps) return

            await this.nextStep()
        },

        // Pausar tutorial
        pauseTutorial() {
            this.showOverlay = false
            console.log('⏸️ Tutorial pausado')
        },

        // Reanudar tutorial
        resumeTutorial() {
            if (this.isActive) {
                this.showOverlay = true
                this.highlightCurrentStep()
                console.log('▶️ Tutorial reanudado')
            }
        },

        // Reset completo del tutorial
        resetTutorial() {
            this.isActive = false
            this.currentTutorial = null
            this.currentStep = 0
            this.tutorialSteps = []
            this.showOverlay = false
            this.highlightElement = null
            this.tooltipPosition = { x: 0, y: 0 }
        },

        // Guardar progreso en localStorage
        saveTutorialProgress(tutorialId) {
            const user = AuthService.getCurrentUser()
            if (!user) return

            const currentProgress = this.userProgress
            const updatedProgress = {
                userId: user.id,
                completedTutorials: [
                    ...(currentProgress.completedTutorials || []),
                    tutorialId
                ].filter((item, index, arr) => arr.indexOf(item) === index) // Remover duplicados
            }

            localStorage.setItem('tutorial_progress', JSON.stringify(updatedProgress))
            console.log('💾 Progreso guardado:', updatedProgress)
        },

        // Reset progreso de usuario (para testing o re-activar tutorials)
        resetUserProgress() {
            const user = AuthService.getCurrentUser()
            if (!user) return

            localStorage.removeItem('tutorial_progress')
            console.log('🔄 Progreso de usuario reseteado')
        },

        // Reset progreso de tutorial específico
        resetSpecificTutorial(tutorialId) {
            const user = AuthService.getCurrentUser()
            if (!user) return

            const currentProgress = this.userProgress
            const updatedProgress = {
                userId: user.id,
                completedTutorials: (currentProgress.completedTutorials || [])
                    .filter(id => id !== tutorialId)
            }

            localStorage.setItem('tutorial_progress', JSON.stringify(updatedProgress))
            console.log('🔄 Tutorial reseteado:', tutorialId)
        },

        // Verificar si debe mostrar tutorial (método de conveniencia)
        shouldShowTutorial(tutorialId) {
            const user = AuthService.getCurrentUser()
            if (!user) return false

            return !this.hasCompletedTutorial(tutorialId)
        }
    }
})
// src/core/tutorial/composables/useTutorial.js
import { computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useTutorialStore } from '../stores/tutorial.js'

export function useTutorial() {
    const tutorialStore = useTutorialStore()

    // Computed properties reactivos
    const isActive = computed(() => tutorialStore.isActive)
    const showOverlay = computed(() => tutorialStore.showOverlay)
    const currentStep = computed(() => tutorialStore.currentStepData)
    const progress = computed(() => tutorialStore.progress)
    const canSkipSteps = computed(() => tutorialStore.canSkipSteps)
    const canSkipTutorial = computed(() => tutorialStore.canSkipTutorial)
    const isFirstStep = computed(() => tutorialStore.isFirstStep)
    const isLastStep = computed(() => tutorialStore.isLastStep)
    const highlightElement = computed(() => tutorialStore.highlightElement)
    const tooltipPosition = computed(() => tutorialStore.tooltipPosition)

    // Métodos principales del tutorial
    const startTutorial = async (tutorialId, steps) => {
        console.log('🎯 [useTutorial] Iniciando tutorial:', tutorialId)

        // Verificar si debe mostrar
        if (! await shouldShowTutorial(tutorialId)) {
            console.log('✅ [useTutorial] Tutorial ya completado:', tutorialId)
            return false
        }

        // Esperar un tick para asegurar que el DOM esté listo
        await nextTick()

        return await tutorialStore.startTutorial(tutorialId, steps)
    }

    const nextStep = async () => {
        await tutorialStore.nextStep()
    }

    const previousStep = async () => {
        await tutorialStore.previousStep()
    }

    const skipStep = async () => {
        await tutorialStore.skipStep()
    }

    const skipTutorial = async () => {
        await tutorialStore.skipTutorial()
    }

    const completeTutorial = async () => {
        await tutorialStore.completeTutorial()
    }

    const pauseTutorial = () => {
        tutorialStore.pauseTutorial()
    }

    const resumeTutorial = () => {
        tutorialStore.resumeTutorial()
    }

    const resetTutorial = () => {
        tutorialStore.resetTutorial()
    }

    // Métodos de verificación
    const shouldShowTutorial = async (tutorialId) => {
        return await tutorialStore.shouldShowTutorial(tutorialId) // ← Agregar await
    }

    const hasCompletedTutorial = async (tutorialId) => {
        return await tutorialStore.hasCompletedTutorial(tutorialId) // ← Agregar await
    }

    // Métodos de gestión de progreso
    const resetUserProgress = async () => {
        await tutorialStore.resetUserProgress() // ← Agregar await
    }

    const resetSpecificTutorial = async (tutorialId) => {
        await tutorialStore.resetSpecificTutorial(tutorialId) // ← Agregar await
    }

    // Auto-trigger del tutorial para layouts
    const autoStartTutorial = async (tutorialId, steps, delay = 1000) => {
        console.log('🔄 [useTutorial] Verificando auto-inicio:', tutorialId)

        if (!await shouldShowTutorial(tutorialId)) {
            console.log('✅ [useTutorial] Tutorial ya visto:', tutorialId)
            return false
        }

        // Delay para asegurar que la UI esté completamente cargada
        setTimeout(async () => {
            console.log('🚀 [useTutorial] Auto-iniciando tutorial:', tutorialId)
            await startTutorial(tutorialId, steps)
        }, delay)

        return true
    }

    // Helper para configurar data-tutorial attributes automáticamente
    const setupTutorialTargets = (targetConfigs) => {
        onMounted(() => {
            nextTick(() => {
                targetConfigs.forEach(config => {
                    const element = document.querySelector(config.selector)
                    if (element && !element.hasAttribute('data-tutorial')) {
                        element.setAttribute('data-tutorial', config.id)
                        console.log(`🎯 Tutorial target configurado: ${config.id}`)
                    }
                })
            })
        })
    }

    // Cleanup al desmontar componente
    const cleanup = () => {
        if (isActive.value) {
            pauseTutorial()
        }
    }

    // Manejo de eventos del teclado
    const handleKeyPress = (event) => {
        if (!isActive.value) return

        switch (event.key) {
            case 'Escape':
                skipTutorial()
                break
            case 'ArrowLeft':
                if (!isFirstStep.value) previousStep()
                break
            case 'ArrowRight':
                if (!isLastStep.value) nextStep()
                else completeTutorial()
                break
            case ' ': // Spacebar
                event.preventDefault()
                if (!isLastStep.value) nextStep()
                else completeTutorial()
                break
        }
    }

    // Auto-configurar eventos de teclado
    onMounted(() => {
        document.addEventListener('keydown', handleKeyPress)
    })

    onUnmounted(() => {
        document.removeEventListener('keydown', handleKeyPress)
        cleanup()
    })

    // Helpers para componentes específicos
    const tutorialHelpers = {
        // Para ManagerLayout
        setupManagerLayout: () => {
            setupTutorialTargets([
                { id: 'notifications', selector: '.notification-bell' },
                { id: 'language', selector: '.language-switcher' },
                { id: 'proyectos', selector: '[data-tutorial="proyectos"]' },
                { id: 'estadisticas', selector: '[data-tutorial="estadisticas"]' },
                { id: 'configuracion', selector: '[data-tutorial="configuracion"]' }
            ])
        },

        // Para ProjectLayoutManager
        setupProjectLayout: () => {
            setupTutorialTargets([
                { id: 'back-button', selector: '.back-button' },
                { id: 'project-tabs', selector: '.tabs-nav' },
                { id: 'documentacion-tab', selector: '[data-tutorial="documentacion"]' },
                { id: 'personal-tab', selector: '[data-tutorial="personal"]' }
            ])
        },

        // Para SupervisorLayout
        setupSupervisorLayout: () => {
            setupTutorialTargets([
                { id: 'notifications', selector: '.notification-bell' },
                { id: 'language', selector: '.language-switcher' },
                { id: 'personal', selector: '[data-tutorial="personal"]' },
                { id: 'inventario', selector: '[data-tutorial="inventario"]' }
            ])
        },

        // Para AdminLayout
        setupAdminLayout: () => {
            setupTutorialTargets([
                { id: 'notifications', selector: '.notification-bell' },
                { id: 'language', selector: '.language-switcher' },
                { id: 'dashboard', selector: '[data-tutorial="dashboard"]' },
                { id: 'usuarios', selector: '[data-tutorial="usuarios"]' }
            ])
        }
    }

    // Método de conveniencia para layouts completos
    const initializeLayoutTutorial = async (layoutType, tutorialSteps, autoStart = true) => {
        console.log(`🎯 [useTutorial] Inicializando tutorial para layout: ${layoutType}`)

        // Configurar targets según el layout
        switch (layoutType) {
            case 'manager':
                tutorialHelpers.setupManagerLayout()
                break
            case 'project':
                tutorialHelpers.setupProjectLayout()
                break
            case 'supervisor':
                tutorialHelpers.setupSupervisorLayout()
                break
            case 'admin':
                tutorialHelpers.setupAdminLayout()
                break
        }

        // Auto-iniciar si es necesario
        if (autoStart) {
            const tutorialId = tutorialStore.TUTORIAL_IDS[`${layoutType.toUpperCase()}_LAYOUT`] ||
                tutorialStore.TUTORIAL_IDS[layoutType.toUpperCase()]

            if (tutorialId) {
                return await autoStartTutorial(tutorialId, tutorialSteps)
            }
        }

        return false
    }

    // Métodos para debugging/desarrollo
    const dev = {
        // Forzar inicio de tutorial (ignorar si ya se completó)
        forceStart: async (tutorialId, steps) => {
            console.log('🔧 [DEV] Forzando inicio de tutorial:', tutorialId)
            return await tutorialStore.startTutorial(tutorialId, steps)
        },

        // Log del estado actual
        logState: () => {
            console.log('🔍 [DEV] Estado del tutorial:', {
                isActive: isActive.value,
                currentTutorial: tutorialStore.currentTutorial,
                currentStep: tutorialStore.currentStep,
                progress: progress.value,
                userProgress: tutorialStore.userProgress
            })
        },

        // Reset todo (para testing)
        resetAll: () => {
            tutorialStore.resetUserProgress()
            tutorialStore.resetTutorial()
            console.log('🔧 [DEV] Todo reseteado')
        }
    }

    return {
        // Estado reactivo
        isActive,
        showOverlay,
        currentStep,
        progress,
        canSkipSteps,
        canSkipTutorial,
        isFirstStep,
        isLastStep,
        highlightElement,
        tooltipPosition,

        // Métodos principales
        startTutorial,
        nextStep,
        previousStep,
        skipStep,
        skipTutorial,
        completeTutorial,
        pauseTutorial,
        resumeTutorial,
        resetTutorial,

        // Verificaciones
        shouldShowTutorial,
        hasCompletedTutorial,

        // Gestión de progreso
        resetUserProgress,
        resetSpecificTutorial,

        // Helpers de auto-configuración
        autoStartTutorial,
        setupTutorialTargets,
        initializeLayoutTutorial,
        tutorialHelpers,

        // Para desarrollo
        dev,

        // IDs de tutorials
        TUTORIAL_IDS: tutorialStore.TUTORIAL_IDS
    }
}
<template>
  <teleport to="body">
    <transition name="tutorial-fade" appear>
      <div v-if="showOverlay" class="tutorial-overlay" @click="handleOverlayClick">
        <!-- Spotlight/Darkening Effect -->
        <div class="tutorial-backdrop" :style="backdropStyle"></div>

        <!-- Highlighted Element Ring -->
        <div
            v-if="highlightedElementRect && !showWelcomeBanner"
            class="tutorial-highlight-ring"
            :style="highlightRingStyle"
        ></div>

        <!-- Tooltip -->
        <div
            v-if="currentStep && tooltipPosition.x && tooltipPosition.y && !showWelcomeBanner"
            class="tutorial-tooltip"
            :class="[`tooltip-${currentStep.position || 'bottom'}`, { 'tooltip-compact': isCompact }]"
            :style="tooltipStyle"
        >
          <!-- Tooltip Arrow -->
          <div class="tooltip-arrow" :class="`arrow-${currentStep.position || 'bottom'}`"></div>

          <!-- Header -->
          <div class="tooltip-header">
            <h3 class="tooltip-title">{{ currentStep.title }}</h3>
            <button
                class="tooltip-close"
                @click="confirmSkipTutorial"
                :title="messages.buttons.skipTutorial"
            >
              <i class="pi pi-times"></i>
            </button>
          </div>

          <!-- Content -->
          <div class="tooltip-content">
            <p class="tooltip-description">{{ currentStep.description }}</p>
          </div>

          <!-- Progress Bar -->
          <div v-if="showProgress" class="tooltip-progress">
            <div class="progress-bar">
              <div
                  class="progress-fill"
                  :style="{ width: `${progress.percentage}%` }"
              ></div>
            </div>
            <span class="progress-text">
              {{ progress.current }} / {{ progress.total }}
            </span>
          </div>

          <!-- Navigation -->
          <div class="tooltip-actions">
            <div class="actions-left">
              <button
                  v-if="!isFirstStep"
                  class="btn-secondary btn-small"
                  @click="handlePrevious"
              >
                <i class="pi pi-chevron-left"></i>
                {{ messages.buttons.previous }}
              </button>
            </div>

            <div class="actions-center">
              <button
                  v-if="canSkipSteps && !currentStep.optional === false"
                  class="btn-ghost btn-small"
                  @click="handleSkipStep"
              >
                {{ messages.buttons.skip }}
              </button>
            </div>

            <div class="actions-right">
              <button
                  class="btn-primary btn-small"
                  @click="handleNext"
              >
                {{ isLastStep ? messages.buttons.finish : messages.buttons.next }}
                <i v-if="!isLastStep" class="pi pi-chevron-right"></i>
                <i v-else class="pi pi-check"></i>
              </button>
            </div>
          </div>

          <!-- Keyboard Hints -->
          <div v-if="showKeyboardHints" class="tooltip-hints">
            <small>
              <kbd>Esc</kbd> {{ messages.buttons.skipTutorial }}
            </small>
          </div>
        </div>

        <!-- Welcome Message (first step) -->
        <div
            v-if="showWelcomeBanner"
            class="tutorial-welcome-banner"
        >
          <div class="welcome-content">
            <h2>{{ messages.welcome }}</h2>
            <div class="welcome-actions">
              <button class="btn-ghost" @click="confirmSkipTutorial">
                {{ messages.buttons.skipTutorial }}
              </button>
              <button class="btn-primary" @click="handleNext">
                Comenzar Tour
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>

  </teleport>
</template>

<script>
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useTutorial } from '../composables/useTutorial.js'
import AppNotification from '../../components/AppNotification.vue'

export default {
  name: 'TutorialOverlay',
  components: {
    AppNotification
  },
  props: {
    // Configuración de visualización
    compact: {
      type: Boolean,
      default: false
    },
    showProgress: {
      type: Boolean,
      default: true
    },
    showKeyboardHints: {
      type: Boolean,
      default: true
    },
    showWelcomeMessage: {
      type: Boolean,
      default: true
    },

    // Personalización de estilos
    primaryColor: {
      type: String,
      default: '#FF5F01'
    },
    backgroundColor: {
      type: String,
      default: 'rgba(0, 0, 0, 0.5)'
    },

    // Mensajes personalizados
    customMessages: {
      type: Object,
      default: () => ({})
    }
  },
  setup(props) {
    // Tutorial composable
    const {
      isActive,
      showOverlay,
      currentStep,
      progress,
      isFirstStep,
      isLastStep,
      canSkipSteps,
      highlightElement,
      tooltipPosition,
      nextStep,
      previousStep,
      skipStep,
      skipTutorial,
      completeTutorial
    } = useTutorial()

    // Reactive refs
    const showWelcomeBanner = ref(false)
    const highlightedElementRect = ref(null)
    const tooltipElement = ref(null)
    const resizeObserver = ref(null)

    // Notification state
    const showSkipConfirmation = ref(false)
    const skipConfirmationMessage = ref('')


    // Computed properties
    const isCompact = computed(() => props.compact)

    const messages = computed(() => ({
      welcome: '¡Bienvenido! Te guiaremos por las funciones principales.',
      buttons: {
        next: 'Siguiente',
        previous: 'Anterior',
        skip: 'Saltar',
        finish: 'Finalizar',
        skipTutorial: 'Saltar Tutorial'
      },
      ...props.customMessages
    }))

    // Styles computed
    const backdropStyle = computed(() => {
      if (showWelcomeBanner.value) {
        return { backgroundColor: props.backgroundColor }
      }
      if (!highlightedElementRect.value) {
        return { backgroundColor: props.backgroundColor }
      }

      const rect = highlightedElementRect.value
      const padding = 8

      // Crear un clip-path que corte un agujero en el backdrop
      const clipPath = `polygon(
        0% 0%,
        0% 100%,
        ${rect.left - padding}px 100%,
        ${rect.left - padding}px ${rect.top - padding}px,
        ${rect.right + padding}px ${rect.top - padding}px,
        ${rect.right + padding}px ${rect.bottom + padding}px,
        ${rect.left - padding}px ${rect.bottom + padding}px,
        ${rect.left - padding}px 100%,
        100% 100%,
        100% 0%
      )`

      return {
        backgroundColor: props.backgroundColor,
        clipPath
      }
    })

    const highlightRingStyle = computed(() => {
      if (!highlightedElementRect.value) return {}

      const rect = highlightedElementRect.value
      const padding = 8

      return {
        left: `${rect.left - padding}px`,
        top: `${rect.top - padding}px`,
        width: `${rect.width + (padding * 2)}px`,
        height: `${rect.height + (padding * 2)}px`,
        borderColor: props.primaryColor,
        boxShadow: `0 0 0 2px ${props.primaryColor}40, 0 0 20px ${props.primaryColor}60`
      }
    })

    const tooltipStyle = computed(() => {
      if (!tooltipPosition.value.x || !tooltipPosition.value.y || !currentStep.value) return {}

      const maxWidth = props.compact ? 280 : 350
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const tooltipPadding = 20
      const rect = highlightedElementRect.value

      let left = tooltipPosition.value.x
      let top = tooltipPosition.value.y


      // Ajustar si se sale de la pantalla
      if (left + maxWidth > viewportWidth - tooltipPadding) {
        left = viewportWidth - maxWidth - tooltipPadding
      }
      if (left < tooltipPadding) {
        left = tooltipPadding
      }

      const estimatedTooltipHeight = 200
      if (top + estimatedTooltipHeight > viewportHeight - tooltipPadding) {
        top = viewportHeight - estimatedTooltipHeight - tooltipPadding
      }
      if (top < tooltipPadding) {
        top = tooltipPadding
      }

      return {
        left: `${left}px`,
        top: `${top}px`,
        maxWidth: `${maxWidth}px`,
        '--primary-color': props.primaryColor,
        transform: 'translateZ(0)', // Force hardware acceleration
        opacity: rect ? 1 : 0,
        transition: 'all 0.3s ease'
      }
    })

    // Methods
    const updateHighlightedElement = async () => {
      if (showWelcomeBanner.value) {
        highlightedElementRect.value = null
        return
      }
      if (!highlightElement.value) {
        highlightedElementRect.value = null
        return
      }

      await nextTick()

      // Esperar un poco más para asegurar que el DOM esté renderizado
      setTimeout(() => {
        const element = document.querySelector(highlightElement.value)
        if (!element) {
          console.warn(`Tutorial element not found: ${highlightElement.value}`)
          highlightedElementRect.value = null
          return
        }

        // Scroll suave al elemento
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        })

        // Esperar a que termine el scroll antes de calcular posición
        setTimeout(() => {
          const rect = element.getBoundingClientRect()
          highlightedElementRect.value = {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height
          }

          console.log('📍 Element highlighted:', {
            selector: highlightElement.value,
            rect: highlightedElementRect.value
          })
        }, 500)
      }, 100)
    }

    const handleNext = async () => {
      if (showWelcomeBanner.value) {
        showWelcomeBanner.value = false
        // Forzar actualización después de ocultar welcome
        await nextTick()
        updateHighlightedElement()
        return
      }

      if (isLastStep.value) {
        await completeTutorial()
      } else {
        await nextStep()
      }
    }

    const handlePrevious = async () => {
      await previousStep()
    }

    const handleSkipStep = async () => {
      await skipStep()
    }

    const handleSkipTutorial = async () => {
      skipConfirmationMessage.value = messages.value.skip || '¿Estás seguro de que quieres saltar este tutorial?'
      showSkipConfirmation.value = true
    }

    const confirmSkipTutorial = async () => {
      showSkipConfirmation.value = false
      await skipTutorial()
    }

    const cancelSkipTutorial = () => {
      showSkipConfirmation.value = false
    }

    const handleOverlayClick = (event) => {
      // Solo cerrar si hace clic en el backdrop, con confirmación
      if (event.target.classList.contains('tutorial-backdrop')) {
        handleSkipTutorial()
      }
    }

    const setupResizeObserver = () => {
      if (!window.ResizeObserver) return

      resizeObserver.value = new ResizeObserver(() => {
        updateHighlightedElement()
      })

      // Observe the body for any layout changes
      resizeObserver.value.observe(document.body)
    }

    const cleanupResizeObserver = () => {
      if (resizeObserver.value) {
        resizeObserver.value.disconnect()
        resizeObserver.value = null
      }
    }

    // Watchers
    watch(highlightElement, () => {
      console.log('🔄 Highlight element changed:', highlightElement.value)
      updateHighlightedElement()
    }, { immediate: true })

    watch(currentStep, (newStep) => {
      console.log('🔄 Current step changed:', newStep?.title)
      if (newStep && newStep.id === 'welcome' && props.showWelcomeMessage) {
        showWelcomeBanner.value = true
      } else {
        showWelcomeBanner.value = false
      }

      if (newStep) {
        updateHighlightedElement()
      }
    }, { immediate: true })

    // Lifecycle
    onMounted(() => {
      setupResizeObserver()
    })

    onUnmounted(() => {
      cleanupResizeObserver()
    })

    return {

      // State
      showOverlay,
      currentStep,
      progress,
      isFirstStep,
      isLastStep,
      canSkipSteps,
      highlightedElementRect,
      tooltipPosition,

      // Notification state
      showSkipConfirmation,
      skipConfirmationMessage,
      showWelcomeBanner,

      // Computed
      isCompact,
      messages,
      backdropStyle,
      highlightRingStyle,
      tooltipStyle,

      // Methods
      handleNext,
      handlePrevious,
      handleSkipStep,
      handleSkipTutorial,
      confirmSkipTutorial,
      cancelSkipTutorial,
      handleOverlayClick
    }
  }
}
</script>

<style scoped>
.tutorial-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  pointer-events: auto;
}

.tutorial-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.8));
  backdrop-filter: blur(8px);
  transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
}

.tutorial-highlight-ring {
  position: absolute;
  border: 3px solid transparent;
  border-radius: 12px;
  pointer-events: none;
  transition: all 0.01s ease;
  z-index: 10000;
  background: linear-gradient(135deg, #3b82f6, #60a5fa) border-box;
  -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: subtract;
  mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  mask-composite: subtract;
  box-shadow:
      0 0 0 1px rgba(59, 130, 246, 0.4),
      0 0 20px rgba(59, 130, 246, 0.3),
      0 0 40px rgba(59, 130, 246, 0.1);
  animation: pulse-ring 2s ease-in-out infinite;
}

@keyframes pulse-ring {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.02);
    opacity: 0.8;
  }
}

.tutorial-tooltip {
  position: relative;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  box-shadow:
      0 20px 40px rgba(0, 0, 0, 0.1),
      0 8px 24px rgba(0, 0, 0, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
  padding: 0;
  z-index: 10001;
  max-width: 380px;
  min-width: 320px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  border: 1px solid rgba(255, 255, 255, 0.3);
  transform: translateY(0);
  transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
  animation: tooltip-appear 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes tooltip-appear {
  0% {
    opacity: 0;
    transform: translateY(20px) scale(0.9);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.tutorial-tooltip.tooltip-compact {
  max-width: 300px;
  min-width: 260px;
}

.tooltip-arrow {
  position: absolute;
  width: 16px;
  height: 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  transform: rotate(45deg);
  z-index: -1;
}

.tooltip-arrow.arrow-bottom {
  top: -9px;
  left: 50%;
  margin-left: -8px;
  border-top: none;
  border-left: none;
}

.tooltip-arrow.arrow-top {
  bottom: -9px;
  left: 50%;
  margin-left: -8px;
  border-bottom: none;
  border-right: none;
}

.tooltip-arrow.arrow-left {
  right: -9px;
  top: 50%;
  margin-top: -8px;
  border-left: none;
  border-bottom: none;
}

.tooltip-arrow.arrow-right {
  left: -9px;
  top: 50%;
  margin-top: -8px;
  border-right: none;
  border-top: none;
}

.tooltip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 24px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
  border-radius: 20px 20px 0 0;
}

.tooltip-title {
  margin: 0;
  color: #FF5F01;
  font-size: 1.25rem;
  font-weight: 700;
  -webkit-background-clip: text;
  background-clip: text;
  letter-spacing: -0.025em;
}

.tooltip-close {
  background: rgba(0, 0, 0, 0.05);
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 12px;
  color: #666;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tooltip-close:hover {
  background: rgba(255, 95, 1, 0.1);
  color: var(--primary-color, #FF5F01);
  transform: scale(1.1);
}

.tooltip-content {
  padding: 20px 24px;
  background: rgba(255, 255, 255, 0.02);
}

.tooltip-description {
  margin: 0;
  line-height: 1.6;
  color: #555;
  font-size: 1rem;
  font-weight: 400;
}

.tooltip-progress {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  background: linear-gradient(135deg, rgba(255, 95, 1, 0.05), rgba(255, 133, 52, 0.03));
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  backdrop-filter: blur(10px);
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-color, #FF5F01), #ff8534);
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 3px;
  position: relative;
  overflow: hidden;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.progress-text {
  font-size: 0.875rem;
  color: #666;
  font-weight: 600;
  min-width: 45px;
  text-align: center;
}

.tooltip-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 24px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  gap: 12px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 0 0 20px 20px;
}

.actions-left,
.actions-center,
.actions-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.actions-center {
  flex: 1;
  justify-content: center;
}

.btn-primary,
.btn-secondary,
.btn-ghost {
  padding: 12px 20px;
  border-radius: 14px;
  border: none;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  overflow: hidden;
  letter-spacing: -0.025em;
}

.btn-small {
  padding: 8px 16px;
  font-size: 0.875rem;
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary-color, #FF5F01), #ff8534);
  color: white;
  box-shadow:
      0 4px 16px rgba(255, 95, 1, 0.3),
      0 2px 8px rgba(255, 95, 1, 0.2);
}

.btn-primary::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.6s;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow:
      0 8px 24px rgba(255, 95, 1, 0.4),
      0 4px 12px rgba(255, 95, 1, 0.3);
}

.btn-primary:hover::before {
  left: 100%;
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.8);
  color: #333;
  border: 1px solid rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.95);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.btn-ghost {
  background: transparent;
  color: #666;
  backdrop-filter: blur(10px);
}

.btn-ghost:hover {
  background: rgba(255, 95, 1, 0.1);
  color: var(--primary-color, #FF5F01);
  transform: scale(1.05);
}

.tooltip-hints {
  padding: 12px 24px 16px;
  text-align: center;
  color: #888;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.01));
  border-radius: 0 0 20px 20px;
}

.tooltip-hints kbd {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border: 1px solid #ced4da;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 0.75rem;
  color: #495057;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin: 0 2px;
}

.tutorial-welcome-banner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(30px);
  border-radius: 24px;
  box-shadow:
      0 32px 64px rgba(0, 0, 0, 0.15),
      0 16px 32px rgba(0, 0, 0, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
  padding: 40px;
  text-align: center;
  max-width: 480px;
  z-index: 10002;
  border: 1px solid rgba(255, 255, 255, 0.3);
  animation: banner-appear 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes banner-appear {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

.welcome-content h2 {
  color:#FF5F01;
  margin: 0 0 32px;
  background: linear-gradient(135deg, #FF5F01, #ff7a27);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.05em;
}

.welcome-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

/* Transitions */
.tutorial-fade-enter-active,
.tutorial-fade-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.tutorial-fade-enter-from,
.tutorial-fade-leave-to {
  opacity: 0;
  backdrop-filter: blur(0px);
}

/* Responsive */
@media (max-width: 768px) {
  .tutorial-tooltip {
    max-width: calc(100vw - 32px);
    min-width: auto;
    margin: 16px;
  }

  .tooltip-header,
  .tooltip-content,
  .tooltip-actions {
    padding: 16px 20px;
  }

  .tooltip-actions {
    flex-direction: column;
    gap: 12px;
  }

  .actions-left,
  .actions-center,
  .actions-right {
    width: 100%;
    justify-content: center;
  }

  .tutorial-welcome-banner {
    max-width: calc(100vw - 32px);
    padding: 32px 24px;
    margin: 16px;
  }

  .btn-primary,
  .btn-secondary,
  .btn-ghost {
    width: 100%;
    justify-content: center;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .tutorial-tooltip {
    border: 2px solid #000;
    background: #fff;
  }

  .tooltip-header {
    border-bottom: 2px solid #000;
  }

  .btn-primary {
    background: #000;
    color: #fff;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .tutorial-backdrop,
  .tutorial-highlight-ring,
  .progress-fill,
  .btn-primary,
  .btn-secondary,
  .btn-ghost,
  .tutorial-tooltip {
    transition: none;
    animation: none;
  }

  .progress-fill::after {
    display: none;
  }

  .btn-primary::before {
    display: none;
  }
}
</style>
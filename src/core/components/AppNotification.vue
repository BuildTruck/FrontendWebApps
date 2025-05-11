<script>
import AppButton from './AppButton.vue'

export default {
  name: 'AppNotification',
  components: {
    AppButton
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    message: {
      type: String,
      default: 'Operación completada'
    },
    type: {
      type: String,
      default: 'success',
      validator: (value) => ['success', 'error', 'warning', 'info'].includes(value)
    },
    autoClose: {
      type: Boolean,
      default: false
    },
    duration: {
      type: Number,
      default: 3000
    },
    buttonText: {
      type: String,
      default: 'Aceptar'
    }
  },
  emits: ['update:modelValue', 'close'],
  data() {
    return {
      isVisible: this.modelValue,
      timer: null
    }
  },
  watch: {
    modelValue(newVal) {
      this.isVisible = newVal;
      if (newVal && this.autoClose) {
        this.startAutoCloseTimer();
      } else if (!newVal) {
        this.clearAutoCloseTimer();
      }
    }
  },
  mounted() {
    if (this.isVisible && this.autoClose) {
      this.startAutoCloseTimer();
    }
  },
  beforeUnmount() {
    this.clearAutoCloseTimer();
  },
  methods: {
    close() {
      this.isVisible = false;
      this.$emit('update:modelValue', false);
      this.$emit('close');
    },
    startAutoCloseTimer() {
      this.clearAutoCloseTimer();
      this.timer = setTimeout(() => {
        this.close();
      }, this.duration);
    },
    clearAutoCloseTimer() {
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
    }
  }
}
</script>

<template>
  <Teleport to="body">
    <div
        v-if="isVisible"
        class="app-notification-overlay"
        @click="close"
    >
      <div
          class="app-notification"
          :class="`app-notification--${type}`"
          @click.stop
      >
        <div class="app-notification-content">
          <div class="app-notification-icon">
            <i v-if="type === 'success'" class="pi pi-check-circle"></i>
            <i v-else-if="type === 'error'" class="pi pi-times-circle"></i>
            <i v-else-if="type === 'warning'" class="pi pi-exclamation-triangle"></i>
            <i v-else-if="type === 'info'" class="pi pi-info-circle"></i>
          </div>
          <div class="app-notification-message">{{ message }}</div>
          <button
              class="app-notification-close"
              @click="close"
              aria-label="Cerrar notificación"
          >
            <i class="pi pi-times"></i>
          </button>
        </div>

        <div class="app-notification-actions">
          <app-button
              :label="buttonText"
              variant="primary"
              @click="close"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style>
.app-notification-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;
}

.app-notification {
  background-color: white;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 1.5rem;
  width: 400px;
  max-width: 95vw;
  animation: slideUp 0.3s ease-out;
}

.app-notification-content {
  display: flex;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.app-notification-icon {
  margin-right: 1rem;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.app-notification-icon i {
  display: flex;
}

.app-notification--success .app-notification-icon {
  color: #FF5F01;
}

.app-notification--error .app-notification-icon {
  color: #f44336;
}

.app-notification--warning .app-notification-icon {
  color: #ff9800;
}

.app-notification--info .app-notification-icon {
  color: #2196f3;
}

.app-notification-message {
  flex-grow: 1;
  font-size: 1rem;
  color: #333;
  padding-top: 0.25rem;
}

.app-notification-close {
  background: transparent;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 0.5rem;
}

.app-notification-close:hover {
  color: #333;
}

.app-notification-actions {
  display: flex;
  justify-content: flex-end;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
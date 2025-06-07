<script>
import { useThemeStore } from '../stores/theme.js';

export default {
  name: 'ThemeSwitcher',
  props: {
    modelValue: {
      type: String,
      default: 'auto'
    },
    label: {
      type: String,
      default: ''
    }
  },
  emits: ['update:modelValue'],
  setup() {
    const themeStore = useThemeStore();
    return { themeStore };
  },
  data() {
    return {
      themeOptions: [
        {
          value: 'light',
          label: this.$t('settings.themes.light'),
          icon: 'pi pi-sun',
          description: this.$t('settings.themes.lightDescription')
        },
        {
          value: 'dark',
          label: this.$t('settings.themes.dark'),
          icon: 'pi pi-moon',
          description: this.$t('settings.themes.darkDescription')
        },
        {
          value: 'auto',
          label: this.$t('settings.themes.auto'),
          icon: 'pi pi-desktop',
          description: this.$t('settings.themes.autoDescription')
        }
      ]
    };
  },
  computed: {
    systemIsDark() {
      return this.themeStore.systemTheme === 'dark';
    }
  },
  methods: {
    selectTheme(theme) {
      this.$emit('update:modelValue', theme);
    },

    getOptionIcon(option) {
      if (option.value === 'auto') {
        return this.systemIsDark ? 'pi pi-moon' : 'pi pi-sun';
      }
      return option.icon;
    },

    getOptionTitle(option) {
      if (option.value === 'auto') {
        return this.$t('settings.themes.autoTooltip', {
          current: this.systemIsDark ? this.$t('settings.themes.dark') : this.$t('settings.themes.light')
        });
      }
      return option.description;
    },

    getOptionSubtitle(option) {
      if (option.value === 'auto') {
        return this.systemIsDark ? this.$t('settings.themes.dark') : this.$t('settings.themes.light');
      }
      return null;
    }
  }
};
</script>

<template>
  <div class="theme-switcher">
    <label v-if="label" class="theme-switcher-label">{{ label }}</label>
    <div class="theme-options">
      <div
          v-for="option in themeOptions"
          :key="option.value"
          class="theme-option"
          :class="{
            'active': modelValue === option.value,
            'system-dark': option.value === 'auto' && systemIsDark,
            'system-light': option.value === 'auto' && !systemIsDark
          }"
          @click="selectTheme(option.value)"
          :title="getOptionTitle(option)"
      >
        <div class="theme-option-icon">
          <i :class="getOptionIcon(option)"></i>
        </div>
        <div class="theme-option-content">
          <span class="theme-option-label">{{ option.label }}</span>
          <span v-if="getOptionSubtitle(option)" class="theme-option-subtitle">
            {{ getOptionSubtitle(option) }}
          </span>
        </div>
        <div v-if="modelValue === option.value" class="theme-option-check">
          <i class="pi pi-check"></i>
        </div>
      </div>
    </div>
  </div>
</template>



<style scoped>
/* ========================================
   THEME SWITCHER COMPONENT
   ======================================== */
.theme-switcher {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.theme-switcher-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 0;
}

.theme-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 12px;
  padding: 0.5rem;
  background-color: #fff;
}

.theme-option {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  background-color: transparent;
}

.theme-option:hover {
  background-color: #f5f5f5;
  transform: translateY(-1px);
}

.theme-option.active {
  background-color: rgba(255, 95, 1, 0.1);
  border-color: #FF5F01;
  box-shadow: 0 2px 8px rgba(255, 95, 1, 0.2);
}

.theme-option-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #f8f9fa;
  transition: all 0.2s ease;
}

.theme-option.active .theme-option-icon {
  background-color: #FF5F01;
  color: white;
}

.theme-option-icon i {
  font-size: 1.25rem;
  color: #333;
  transition: color 0.2s ease;
}

.theme-option.active .theme-option-icon i {
  color: white;
}

/* Estilos especiales para el modo automático */
.theme-option.system-dark .theme-option-icon {
  background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
}

.theme-option.system-light .theme-option-icon {
  background: linear-gradient(135deg, #ffd89b 0%, #ff9a9e 100%);
}

.theme-option.system-dark .theme-option-icon i,
.theme-option.system-light .theme-option-icon i {
  color: white;
}

.theme-option-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.theme-option-label {
  font-weight: 500;
  color: #333;
  font-size: 1rem;
}

.theme-option-subtitle {
  font-size: 0.875rem;
  color: #666;
  font-style: italic;
}

.theme-option-check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #FF5F01;
  color: white;
  font-size: 0.875rem;
}

/* Animaciones */
@keyframes checkmark {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.theme-option.active .theme-option-check {
  animation: checkmark 0.3s ease-out;
}

/* Responsive */
@media (max-width: 768px) {
  .theme-options {
    gap: 0.25rem;
  }

  .theme-option {
    padding: 0.75rem;
    gap: 0.75rem;
  }

  .theme-option-icon {
    width: 36px;
    height: 36px;
  }

  .theme-option-icon i {
    font-size: 1.125rem;
  }

  .theme-option-label {
    font-size: 0.875rem;
  }

  .theme-option-subtitle {
    font-size: 0.75rem;
  }
}
</style>
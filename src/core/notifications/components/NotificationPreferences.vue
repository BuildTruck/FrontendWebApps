<script>
import { ref, reactive, computed, onMounted } from 'vue';
import { AuthService} from "../../../auth/services/auth-api.service.js";
import { notificationPreferencesService } from '../services/notification-preferences.service.js';
import { NotificationPreferences} from "../models/notification-preferences.entity.js";
import {notificationSoundService} from "../services/notification-sound.service.js";

export default {
  name: 'NotificationPreferences',
  props: {
    notificationSummary: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['close', 'updated'],
  setup(props, { emit }) {
    // State
    const loading = ref(true);
    const saving = ref(false);
    const showSuccess = ref(false);
    const error = ref('');
    const fileInput = ref(null);

    // Data
    const preferences = ref(new NotificationPreferences());
    const user = ref(AuthService.getCurrentUser());

    const globalSettings = reactive({
      soundEnabled: notificationSoundService.getSettings().enabled,
      volume: notificationSoundService.getSettings().volume,
      desktopNotifications: false,
      digestEmail: false,
      digestFrequency: 'daily'
    });
    const updateSoundSettings = () => {
      console.log('🔧 Actualizando configuración de sonidos:', {
        enabled: globalSettings.soundEnabled,
        volume: globalSettings.volume
      });
      notificationSoundService.setEnabled(globalSettings.soundEnabled);
      notificationSoundService.setVolume(globalSettings.volume);
      saveGlobalSettings();
    };
    // Computed
    const hasChanges = computed(() => {
      // Simple change detection - in real app you might want more sophisticated tracking
      return true;
    });

    // Methods
    const loadPreferences = async () => {
      try {
        loading.value = true;
        error.value = '';

        const prefs = await notificationPreferencesService.getPreferences();
        preferences.value = prefs;

        // Load global settings from localStorage or API
        loadGlobalSettings();

      } catch (err) {
        error.value = err.message || 'Error al cargar preferencias';
      } finally {
        loading.value = false;
      }
    };
    const testSound = () => {
      console.log('🎵 Probando sonido...');
      notificationSoundService.playSound('default');
    };
    const loadGlobalSettings = () => {
      const saved = localStorage.getItem('notificationGlobalSettings');
      if (saved) {
        try {
          Object.assign(globalSettings, JSON.parse(saved));
        } catch (e) {
          console.error('Error parsing global settings:', e);
        }
      }
    };

    const savePreferences = async () => {
      try {
        saving.value = true;
        error.value = '';

        await notificationPreferencesService.updatePreferences(preferences.value);
        saveGlobalSettings();

        showSuccess.value = true;
        setTimeout(() => {
          showSuccess.value = false;
        }, 3000);

        emit('updated');

      } catch (err) {
        error.value = err.message || 'Error al guardar preferencias';
      } finally {
        saving.value = false;
      }
    };

    const saveGlobalSettings = () => {
      localStorage.setItem('notificationGlobalSettings', JSON.stringify(globalSettings));
    };

    const updateGlobalSettings = () => {
      saveGlobalSettings();
    };

    const updatePreference = async (preference) => {
      try {
        await notificationPreferencesService.updatePreference(
            preference.context,
            preference.inAppEnabled,
            preference.emailEnabled,
            preference.minimumPriority
        );

        emit('updated');

      } catch (err) {
        error.value = err.message || 'Error al actualizar preferencia';
      }
    };

    const toggleContext = async (context, enabled) => {
      const preference = preferences.value.getByContext(context);
      if (preference) {
        if (enabled) {
          preference.enableInApp();
        } else {
          preference.disableAll();
        }
        await updatePreference(preference);
      }
    };

    const enableAll = async () => {
      try {
        await notificationPreferencesService.enableAll();
        await loadPreferences();
        emit('updated');
      } catch (err) {
        error.value = err.message || 'Error al habilitar todas las notificaciones';
      }
    };

    const disableAll = async () => {
      try {
        await notificationPreferencesService.disableAll();
        await loadPreferences();
        emit('updated');
      } catch (err) {
        error.value = err.message || 'Error al deshabilitar todas las notificaciones';
      }
    };

    const enableOnlyCritical = async () => {
      try {
        await notificationPreferencesService.enableOnlyCritical();
        await loadPreferences();
        emit('updated');
      } catch (err) {
        error.value = err.message || 'Error al configurar solo críticas';
      }
    };

    const applyRoleDefaults = async () => {
      try {
        await notificationPreferencesService.applyRoleBasedSettings(user.value?.role || 'Manager');
        await loadPreferences();
        emit('updated');
      } catch (err) {
        error.value = err.message || 'Error al aplicar configuración por rol';
      }
    };

    const resetToDefaults = async () => {
      const confirmed = confirm('¿Estás seguro de que quieres resetear todas las preferencias a los valores por defecto?');
      if (!confirmed) return;

      try {
        await notificationPreferencesService.resetToDefaults();
        await loadPreferences();
        emit('updated');
      } catch (err) {
        error.value = err.message || 'Error al resetear preferencias';
      }
    };

    const exportPreferences = async () => {
      try {
        const exportData = await notificationPreferencesService.exportPreferences();

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `notification-preferences-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

      } catch (err) {
        error.value = err.message || 'Error al exportar preferencias';
      }
    };

    const triggerImport = () => {
      fileInput.value?.click();
    };

    const importPreferences = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const importData = JSON.parse(text);

        await notificationPreferencesService.importPreferences(importData);
        await loadPreferences();
        emit('updated');

        // Reset file input
        event.target.value = '';

      } catch (err) {
        error.value = err.message || 'Error al importar preferencias';
      }
    };

    const getContextNotificationCount = (context) => {
      return props.notificationSummary?.byContext?.[context] || 0;
    };

    const getPreferencePreview = (preference) => {
      const channels = [];
      if (preference.inAppEnabled) channels.push('App');
      if (preference.emailEnabled) channels.push('Email');

      if (channels.length === 0) return 'Deshabilitado';

      const channelText = channels.join(' + ');
      const priorityText = preference.priorityDisplayName;

      return `${channelText} • Desde ${priorityText}`;
    };

    // Lifecycle
    onMounted(() => {
      loadPreferences();
    });

    return {
      // State
      loading,
      saving,
      showSuccess,
      error,
      fileInput,
      preferences,
      globalSettings,

      // Computed
      hasChanges,

      // Methods
      updateSoundSettings,
      testSound,
      loadPreferences,
      savePreferences,
      updatePreference,
      updateGlobalSettings,
      toggleContext,
      enableAll,
      disableAll,
      enableOnlyCritical,
      applyRoleDefaults,
      resetToDefaults,
      exportPreferences,
      triggerImport,
      importPreferences,
      getContextNotificationCount,
      getPreferencePreview
    };
  }
};
</script>

<template>
  <div class="notification-preferences">
    <!-- Header -->
    <div class="preferences-header">
      <h4>{{ $t('notifications.preferences.title') }}</h4>
      <button @click="$emit('close')" class="btn-close">
        <i class="pi pi-times"></i>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner"></i>
      {{ $t('notifications.preferences.loading') }}
    </div>

    <!-- Content -->
    <div v-else class="preferences-content">
      <!-- Quick Actions -->
      <div class="quick-actions">
        <h5>{{ $t('notifications.preferences.quickActions') }}</h5>
        <div class="action-buttons">
          <button @click="enableAll" class="btn-action enable">
            <i class="pi pi-check-circle"></i>
            {{ $t('notifications.preferences.enableAll') }}
          </button>
          <button @click="disableAll" class="btn-action disable">
            <i class="pi pi-times-circle"></i>
            {{ $t('notifications.preferences.disableAll') }}
          </button>
          <button @click="enableOnlyCritical" class="btn-action critical">
            <i class="pi pi-exclamation-triangle"></i>
            {{ $t('notifications.preferences.onlyCritical') }}
          </button>
          <button @click="applyRoleDefaults" class="btn-action role">
            <i class="pi pi-user"></i>
            {{ $t('notifications.preferences.roleDefaults') }}
          </button>
        </div>
      </div>

      <!-- Context Preferences -->
      <div class="context-preferences">
        <h5>{{ $t('notifications.preferences.byContext') }}</h5>

        <div
            v-for="preference in preferences.preferences"
            :key="preference.context"
            class="preference-item"
            :class="{
            'disabled': preference.isFullyDisabled,
            'enabled': preference.isFullyEnabled
          }"
        >
          <!-- Context Header -->
          <div class="preference-header">
            <div class="context-info">
              <i :class="preference.contextIcon"></i>
              <span class="context-name">
                {{ $t(`notifications.contexts.${preference.context.toLowerCase()}`) }}
              </span>
              <span
                  v-if="getContextNotificationCount(preference.context) > 0"
                  class="context-count"
              >
                {{ getContextNotificationCount(preference.context) }}
              </span>
            </div>

            <!-- Master Toggle -->
            <label class="toggle-switch">
              <input
                  type="checkbox"
                  :checked="!preference.isFullyDisabled"
                  @change="toggleContext(preference.context, $event.target.checked)"
              >
              <span class="slider"></span>
            </label>
          </div>

          <!-- Detailed Settings -->
          <div v-if="!preference.isFullyDisabled" class="preference-details">
            <!-- Channel Settings -->
            <div class="channel-settings">
              <div class="setting-group">
                <label class="setting-label">
                  <input
                      type="checkbox"
                      v-model="preference.inAppEnabled"
                      @change="updatePreference(preference)"
                  >
                  <i class="pi pi-desktop"></i>
                  {{ $t('notifications.preferences.inApp') }}
                </label>
              </div>

              <div class="setting-group">
                <label class="setting-label">
                  <input
                      type="checkbox"
                      v-model="preference.emailEnabled"
                      @change="updatePreference(preference)"
                  >
                  <i class="pi pi-envelope"></i>
                  {{ $t('notifications.preferences.email') }}
                </label>
              </div>
            </div>

            <!-- Priority Settings -->
            <div class="priority-settings">
              <label class="priority-label">
                {{ $t('notifications.preferences.minimumPriority') }}:
              </label>
              <select
                  v-model="preference.minimumPriority"
                  @change="updatePreference(preference)"
                  class="priority-select"
              >
                <option value="LOW">{{ $t('notifications.priorities.low') }}</option>
                <option value="NORMAL">{{ $t('notifications.priorities.normal') }}</option>
                <option value="HIGH">{{ $t('notifications.priorities.high') }}</option>
                <option value="CRITICAL">{{ $t('notifications.priorities.critical') }}</option>
              </select>
            </div>

            <!-- Preview -->
            <div class="preference-preview">
              <span class="preview-text">
                {{ getPreferencePreview(preference) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Advanced Settings -->
      <div class="advanced-settings">
        <h5>{{ $t('notifications.preferences.advanced') }}</h5>

        <!-- Global Settings -->
        <div class="setting-group">
          <label class="setting-label">
            <input
                type="checkbox"
                v-model="globalSettings.soundEnabled"
                @change="updateSoundSettings"
            >
            <i class="pi pi-volume-up"></i>
            {{ $t('notifications.preferences.soundEnabled') }}
          </label>
        </div>

        <!-- Control de volumen -->
        <div v-if="globalSettings.soundEnabled" class="volume-control">
          <label class="priority-label">
            {{ $t('notifications.preferences.volume') }}:
          </label>
          <div class="volume-slider-container">
            <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                v-model.number="globalSettings.volume"
                @input="updateSoundSettings"
                class="volume-slider"
            >
            <span class="volume-display">{{ Math.round(globalSettings.volume * 100) }}%</span>
          </div>

          <!-- Botón de prueba -->
          <button @click="testSound" class="btn-test-sound">
            <i class="pi pi-play"></i>
            {{ $t('notifications.preferences.testSound') }}
          </button>
        </div>

        <div class="setting-group">
          <label class="setting-label">
            <input
                type="checkbox"
                v-model="globalSettings.desktopNotifications"
                @change="updateGlobalSettings"
            >
            <i class="pi pi-window-maximize"></i>
            {{ $t('notifications.preferences.desktopNotifications') }}
          </label>
        </div>

        <div class="setting-group">
          <label class="setting-label">
            <input
                type="checkbox"
                v-model="globalSettings.digestEmail"
                @change="updateGlobalSettings"
            >
            <i class="pi pi-calendar"></i>
            {{ $t('notifications.preferences.digestEmail') }}
          </label>
        </div>

        <!-- Digest Frequency -->
        <div v-if="globalSettings.digestEmail" class="digest-settings">
          <label class="priority-label">
            {{ $t('notifications.preferences.digestFrequency') }}:
          </label>
          <select
              v-model="globalSettings.digestFrequency"
              @change="updateGlobalSettings"
              class="priority-select"
          >
            <option value="daily">{{ $t('notifications.preferences.daily') }}</option>
            <option value="weekly">{{ $t('notifications.preferences.weekly') }}</option>
            <option value="monthly">{{ $t('notifications.preferences.monthly') }}</option>
          </select>
        </div>
      </div>

      <!-- Export/Import -->
      <div class="export-import">
        <h5>{{ $t('notifications.preferences.exportImport') }}</h5>
        <div class="action-buttons">
          <button @click="exportPreferences" class="btn-action export">
            <i class="pi pi-download"></i>
            {{ $t('notifications.preferences.export') }}
          </button>
          <button @click="triggerImport" class="btn-action import">
            <i class="pi pi-upload"></i>
            {{ $t('notifications.preferences.import') }}
          </button>
          <input
              ref="fileInput"
              type="file"
              accept=".json"
              @change="importPreferences"
              style="display: none"
          >
        </div>
      </div>

      <!-- Save/Reset Actions -->
      <div class="footer-actions">
        <button @click="resetToDefaults" class="btn-secondary">
          {{ $t('notifications.preferences.resetDefaults') }}
        </button>
        <button @click="savePreferences" class="btn-primary" :disabled="saving">
          <i v-if="saving" class="pi pi-spin pi-spinner"></i>
          {{ saving ? $t('notifications.preferences.saving') : $t('notifications.preferences.save') }}
        </button>
      </div>

      <!-- Success Message -->
      <div v-if="showSuccess" class="success-message">
        <i class="pi pi-check-circle"></i>
        {{ $t('notifications.preferences.savedSuccessfully') }}
      </div>

      <!-- Error Message -->
      <div v-if="error" class="error-message">
        <i class="pi pi-exclamation-triangle"></i>
        {{ error }}
      </div>
    </div>
  </div>
</template>
<style scoped>
.notification-preferences {
  margin: 0 auto;
  background: transparent;
  border-radius: 0;
  display: flex;
  flex-direction: column;
}

.preferences-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0 1.5rem 0;
  border-bottom: 2px solid rgba(255, 95, 1, 0.1);
  margin-bottom: 2rem;
}

.preferences-header h4 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #FF5F01;
}

.btn-close {
  display: none; /* Oculto porque ahora es una tab */
}

.loading-state {
  padding: 4rem 2rem;
  text-align: center;
  color: #666;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.loading-state i {
  font-size: 2rem;
  color: #FF5F01;
  margin-bottom: 1rem;
  display: block;
}

.preferences-content {
  flex: 1;
  overflow-y: visible;
  padding: 0;
}

/* Secciones principales */
.quick-actions,
.context-preferences,
.advanced-settings,
.export-import {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 95, 1, 0.1);
}

.quick-actions h5,
.context-preferences h5,
.advanced-settings h5,
.export-import h5 {
  margin: 0 0 1.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #FF5F01;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.quick-actions h5::before {
  content: "⚡";
}

.context-preferences h5::before {
  content: "🔔";
}

.advanced-settings h5::before {
  content: "⚙️";
}

.export-import h5::before {
  content: "📁";
}

/* Botones de acción */
.action-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.btn-action {
  padding: 1rem 1.5rem;
  border: 2px solid #ddd;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.btn-action::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.btn-action:hover::before {
  left: 100%;
}

.btn-action i {
  font-size: 1.2rem;
}

.btn-action.enable {
  color: #28a745;
  border-color: #28a745;
}

.btn-action.enable:hover {
  background: #28a745;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
}

.btn-action.disable {
  color: #dc3545;
  border-color: #dc3545;
}

.btn-action.disable:hover {
  background: #dc3545;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
}

.btn-action.critical {
  color: #fd7e14;
  border-color: #fd7e14;
}

.btn-action.critical:hover {
  background: #fd7e14;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(253, 126, 20, 0.3);
}

.btn-action.role {
  color: #FF5F01;
  border-color: #FF5F01;
}

.btn-action.role:hover {
  background: #FF5F01;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 95, 1, 0.3);
}

.btn-action.export,
.btn-action.import {
  color: #6c757d;
  border-color: #6c757d;
}

.btn-action.export:hover,
.btn-action.import:hover {
  background: #6c757d;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(108, 117, 125, 0.3);
}

/* Items de preferencias */
.preference-item {
  border: 2px solid #eaeaea;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  transition: all 0.3s ease;
  overflow: hidden;
  background: #fafafa;
}

.preference-item.disabled {
  opacity: 0.6;
  background: #f8f9fa;
  border-color: #dee2e6;
}

.preference-item.enabled {
  border-color: #FF5F01;
  background: #fff8f5;
  box-shadow: 0 2px 8px rgba(255, 95, 1, 0.1);
}

.preference-header {
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  background: white;
}

.context-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.context-info i {
  font-size: 1.5rem;
  color: #FF5F01;
  width: 24px;
  text-align: center;
}

.context-name {
  font-weight: 600;
  color: #333;
  font-size: 1.1rem;
}

.context-count {
  background: linear-gradient(135deg, #FF5F01, #e5550a);
  color: white;
  border-radius: 12px;
  padding: 4px 8px;
  font-size: 0.75rem;
  font-weight: 600;
  min-width: 24px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(255, 95, 1, 0.3);
}

/* Toggle switch mejorado */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 52px;
  height: 28px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.3s;
  border-radius: 28px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.slider:before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

input:checked + .slider {
  background: linear-gradient(135deg, #FF5F01, #e5550a);
}

input:checked + .slider:before {
  transform: translateX(24px);
}

.preference-details {
  padding: 1.5rem;
  background: white;
}

.channel-settings {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.setting-group {
  margin-bottom: 1rem;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.95rem;
  color: #333;
  cursor: pointer;
  padding: 0.75rem;
  border-radius: 8px;
  transition: background-color 0.2s ease;
  font-weight: 500;
}

.setting-label:hover {
  background-color: rgba(255, 95, 1, 0.05);
}

.setting-label input[type="checkbox"] {
  margin: 0;
  width: 18px;
  height: 18px;
  accent-color: #FF5F01;
}

.setting-label i {
  color: #FF5F01;
  font-size: 1.1rem;
}

.priority-settings {
  margin-bottom: 1.5rem;
}

.priority-label {
  display: block;
  margin-bottom: 0.75rem;
  font-size: 0.95rem;
  color: #333;
  font-weight: 600;
}

.priority-select {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 0.9rem;
  background: white;
  transition: all 0.2s ease;
}

.priority-select:focus {
  outline: none;
  border-color: #FF5F01;
  box-shadow: 0 0 0 3px rgba(255, 95, 1, 0.1);
}

.preference-preview {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  padding: 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  color: #666;
  border-left: 4px solid #FF5F01;
  font-weight: 500;
}

.digest-settings {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(255, 95, 1, 0.05);
  border-radius: 8px;
  border-left: 3px solid #FF5F01;
}

/* Footer actions */
.footer-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding: 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.btn-primary,
.btn-secondary {
  padding: 0.875rem 2rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 120px;
  justify-content: center;
}

.btn-primary {
  background: linear-gradient(135deg, #FF5F01, #e5550a);
  color: white;
  box-shadow: 0 2px 8px rgba(255, 95, 1, 0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 95, 1, 0.4);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-secondary {
  background: white;
  color: #333;
  border: 2px solid #ddd;
}

.btn-secondary:hover {
  background: #f8f9fa;
  border-color: #adb5bd;
  transform: translateY(-1px);
}

/* Mensajes */
.success-message,
.error-message {
  margin-top: 1.5rem;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 500;
}

.success-message {
  background: linear-gradient(135deg, #d4edda, #c3e6cb);
  color: #155724;
  border: 2px solid #c3e6cb;
}

.error-message {
  background: linear-gradient(135deg, #f8d7da, #f5c6cb);
  color: #721c24;
  border: 2px solid #f5c6cb;
}

.success-message i,
.error-message i {
  font-size: 1.2rem;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .notification-preferences {
    max-width: 100%;
    padding: 0 1rem;
  }

  .action-buttons {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }
}

@media (max-width: 768px) {
  .quick-actions,
  .context-preferences,
  .advanced-settings,
  .export-import {
    padding: 1.5rem;
  }

  .preferences-header h4 {
    font-size: 1.25rem;
  }

  .action-buttons {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .channel-settings {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .footer-actions {
    flex-direction: column-reverse;
    padding: 1.5rem;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .notification-preferences {
    padding: 0 0.5rem;
  }

  .quick-actions,
  .context-preferences,
  .advanced-settings,
  .export-import {
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .preference-header {
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .context-info {
    width: 100%;
  }

  .toggle-switch {
    align-self: flex-end;
  }

  .preferences-header {
    padding: 0 0 1rem 0;
    margin-bottom: 1rem;
  }

  .preferences-header h4 {
    font-size: 1.1rem;
  }
}

/* Animaciones */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.preference-item,
.quick-actions,
.context-preferences,
.advanced-settings,
.export-import {
  animation: fadeInUp 0.5s ease-out;
}

.preference-item:nth-child(even) {
  animation-delay: 0.1s;
}

.preference-item:nth-child(odd) {
  animation-delay: 0.2s;
}
.volume-control {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(255, 95, 1, 0.05);
  border-radius: 8px;
  border-left: 3px solid #FF5F01;
}

.volume-slider-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.volume-slider {
  flex: 1;
  height: 6px;
  background: #ddd;
  outline: none;
  border-radius: 3px;
  appearance: none;
}

.volume-slider::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  background: #FF5F01;
  border-radius: 50%;
  cursor: pointer;
}

.volume-display {
  font-size: 0.8rem;
  color: #666;
  min-width: 40px;
  font-weight: 600;
}

.btn-test-sound {
  padding: 0.5rem 1rem;
  background: #FF5F01;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  align-self: flex-start;
}

.btn-test-sound:hover {
  background: #e5550a;
  transform: translateY(-1px);
}
.priority-select {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 0.9rem;
  background: white;
  transition: all 0.2s ease;
  color: #333; /* ← Texto negro */
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  appearance: none; /* Quitar estilo nativo */
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.5rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
  padding-right: 2.5rem;
}

.priority-select:focus {
  outline: none;
  border-color: #FF5F01;
  box-shadow: 0 0 0 3px rgba(255, 95, 1, 0.1);
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23FF5F01' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
}

.priority-select:hover {
  border-color: #FF5F01;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* Estilos para las opciones del select */
.priority-select option {
  background: white;
  color: #333; /* ← Texto negro */
  padding: 0.5rem;
  font-weight: 500;
  border-radius: 4px;
  margin: 2px 0;
}

.priority-select option:hover {
  background: #f8f9fa;
}

.priority-select option:checked {
  background: #FF5F01;
  color: white;
}

/* También aplicar a otros selects en filtros si los hay */
.notification-filters select {
  padding: 10px 16px;
  border: 2px solid transparent;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%);
  color: #333; /* ← Texto negro */
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.9);
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.5rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
  padding-right: 2.5rem;
}

.notification-filters select option {
  background: white;
  color: #333; /* ← Texto negro */
  padding: 0.5rem;
  font-weight: 500;
}

.notification-filters select:focus {
  outline: none;
  border-color: #FF5F01;
  box-shadow: 0 0 0 4px rgba(255, 95, 1, 0.15), 0 8px 25px rgba(255, 95, 1, 0.2);
  transform: translateY(-2px);
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23FF5F01' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
}

.notification-filters select:hover {
  border-color: rgba(255, 95, 1, 0.3);
  color: #FF5F01;
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 8px 25px rgba(255, 95, 1, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.9);
}
</style>
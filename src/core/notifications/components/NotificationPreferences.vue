<script>
import { ref, reactive, computed, onMounted } from 'vue';
import { AuthService} from "../../../auth/services/auth-api.service.js";
import { notificationPreferencesService } from '../services/notification-preferences.service.js';
import { NotificationPreferences} from "../models/notification-preferences.entity.js";

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
      soundEnabled: true,
      desktopNotifications: false,
      digestEmail: false,
      digestFrequency: 'daily'
    });

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
                @change="updateGlobalSettings"
            >
            <i class="pi pi-volume-up"></i>
            {{ $t('notifications.preferences.soundEnabled') }}
          </label>
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
  background: white;
  border-radius: 8px;
  max-height: 600px;
  display: flex;
  flex-direction: column;
}

.preferences-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eaeaea;
}

.preferences-header h4 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
}

.btn-close {
  padding: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  color: #666;
  transition: all 0.2s ease;
}

.btn-close:hover {
  background: #f5f5f5;
  color: #333;
}

.loading-state {
  padding: 32px;
  text-align: center;
  color: #666;
}

.preferences-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.quick-actions,
.context-preferences,
.advanced-settings,
.export-import {
  margin-bottom: 24px;
}

.quick-actions h5,
.context-preferences h5,
.advanced-settings h5,
.export-import h5 {
  margin: 0 0 12px 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #333;
}

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-action {
  padding: 6px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-action.enable {
  color: #28a745;
  border-color: #28a745;
}

.btn-action.enable:hover {
  background: #28a745;
  color: white;
}

.btn-action.disable {
  color: #dc3545;
  border-color: #dc3545;
}

.btn-action.disable:hover {
  background: #dc3545;
  color: white;
}

.btn-action.critical {
  color: #fd7e14;
  border-color: #fd7e14;
}

.btn-action.critical:hover {
  background: #fd7e14;
  color: white;
}

.btn-action.role {
  color: #FF5F01;
  border-color: #FF5F01;
}

.btn-action.role:hover {
  background: #FF5F01;
  color: white;
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
}

.preference-item {
  border: 1px solid #eaeaea;
  border-radius: 6px;
  margin-bottom: 12px;
  transition: all 0.2s ease;
}

.preference-item.disabled {
  opacity: 0.6;
  background: #f8f9fa;
}

.preference-item.enabled {
  border-color: #FF5F01;
  background: #fff8f5;
}

.preference-header {
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
}

.context-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.context-name {
  font-weight: 500;
  color: #333;
}

.context-count {
  background: #FF5F01;
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 0.7rem;
  font-weight: 600;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
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
  transition: 0.2s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.2s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #FF5F01;
}

input:checked + .slider:before {
  transform: translateX(20px);
}

.preference-details {
  padding: 12px;
}

.channel-settings {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.setting-group {
  margin-bottom: 8px;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: #333;
  cursor: pointer;
}

.setting-label input[type="checkbox"] {
  margin: 0;
}

.priority-settings {
  margin-bottom: 12px;
}

.priority-label {
  display: block;
  margin-bottom: 4px;
  font-size: 0.85rem;
  color: #333;
  font-weight: 500;
}

.priority-select {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.85rem;
}

.preference-preview {
  background: #f8f9fa;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  color: #666;
  border-left: 3px solid #FF5F01;
}

.digest-settings {
  margin-top: 8px;
  margin-left: 20px;
}

.footer-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eaeaea;
}

.btn-primary,
.btn-secondary {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-primary {
  background: #FF5F01;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #e5550a;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #333;
  border: 1px solid #ddd;
}

.btn-secondary:hover {
  background: #f5f5f5;
}

.success-message,
.error-message {
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 6px;
}

.success-message {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

/* Responsive */
@media (max-width: 768px) {
  .notification-preferences {
    max-height: 500px;
  }

  .preferences-content {
    padding: 12px;
  }

  .channel-settings {
    flex-direction: column;
    gap: 8px;
  }

  .action-buttons {
    flex-direction: column;
  }

  .footer-actions {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .preference-header {
    padding: 8px;
  }

  .context-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .preferences-header {
    padding: 12px;
  }
}
</style>
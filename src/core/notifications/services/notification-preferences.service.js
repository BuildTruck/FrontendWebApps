// notifications/services/notification-preferences.service.js
import http from "../../services/http.service.js";
import { NotificationPreference , NotificationPreferences} from "../models/notification-preferences.entity.js";

export const notificationPreferencesService = {
    /**
     * Obtener todas las preferencias del usuario
     */
    async getPreferences() {
        try {
            const response = await http.get('/notification-preferences');
            return NotificationPreferences.fromApiResponse(response.data);
        } catch (error) {
            console.error('Error fetching notification preferences:', error);
            throw new Error('Error al cargar preferencias de notificaciones');
        }
    },

    /**
     * Actualizar preferencias del usuario
     */
    async updatePreferences(preferences) {
        try {
            const payload = preferences instanceof NotificationPreferences
                ? preferences.toApiPayload()
                : preferences;

            await http.put('/notification-preferences', payload);
            return true;
        } catch (error) {
            console.error('Error updating notification preferences:', error);
            throw new Error('Error al actualizar preferencias de notificaciones');
        }
    },

    /**
     * Actualizar una preferencia específica por contexto
     */
    async updatePreference(context, inAppEnabled, emailEnabled, minimumPriority = 'NORMAL') {
        try {
            const preference = new NotificationPreference({
                context,
                inAppEnabled,
                emailEnabled,
                minimumPriority
            });

            await http.put('/notification-preferences', [preference.toApiPayload()]);
            return true;
        } catch (error) {
            console.error('Error updating notification preference:', error);
            throw new Error(`Error al actualizar preferencia de ${context}`);
        }
    },

    /**
     * Crear preferencias por defecto para un usuario
     */
    async createDefaults() {
        try {
            // El backend debería crear automáticamente las preferencias por defecto
            // si no existen, pero podemos forzar la creación
            const response = await http.post('/notification-preferences/defaults');
            return NotificationPreferences.fromApiResponse(response.data);
        } catch (error) {
            console.error('Error creating default preferences:', error);
            throw new Error('Error al crear preferencias por defecto');
        }
    },

    /**
     * Resetear a preferencias por defecto
     */
    async resetToDefaults() {
        try {
            await http.post('/notification-preferences/reset');
            return await this.getPreferences();
        } catch (error) {
            console.error('Error resetting preferences to defaults:', error);
            throw new Error('Error al resetear preferencias');
        }
    },

    /**
     * Habilitar todas las notificaciones
     */
    async enableAll() {
        try {
            const preferences = await this.getPreferences();
            preferences.enableAll();
            await this.updatePreferences(preferences);
            return preferences;
        } catch (error) {
            console.error('Error enabling all notifications:', error);
            throw new Error('Error al habilitar todas las notificaciones');
        }
    },

    /**
     * Deshabilitar todas las notificaciones
     */
    async disableAll() {
        try {
            const preferences = await this.getPreferences();
            preferences.disableAll();
            await this.updatePreferences(preferences);
            return preferences;
        } catch (error) {
            console.error('Error disabling all notifications:', error);
            throw new Error('Error al deshabilitar todas las notificaciones');
        }
    },

    /**
     * Habilitar solo notificaciones críticas
     */
    async enableOnlyCritical() {
        try {
            const preferences = await this.getPreferences();

            // Configurar cada preferencia para solo críticas
            preferences.preferences.forEach(pref => {
                pref.inAppEnabled = true;
                pref.emailEnabled = true;
                pref.minimumPriority = 'CRITICAL';
            });

            await this.updatePreferences(preferences);
            return preferences;
        } catch (error) {
            console.error('Error enabling only critical notifications:', error);
            throw new Error('Error al configurar solo notificaciones críticas');
        }
    },

    /**
     * Habilitar notificaciones por contexto específico
     */
    async enableContext(context, inApp = true, email = false) {
        try {
            const preferences = await this.getPreferences();
            const preference = preferences.getByContext(context);

            if (preference) {
                preference.inAppEnabled = inApp;
                preference.emailEnabled = email;
                await this.updatePreferences(preferences);
            }

            return preferences;
        } catch (error) {
            console.error('Error enabling context notifications:', error);
            throw new Error(`Error al habilitar notificaciones de ${context}`);
        }
    },

    /**
     * Deshabilitar notificaciones por contexto específico
     */
    async disableContext(context) {
        try {
            const preferences = await this.getPreferences();
            const preference = preferences.getByContext(context);

            if (preference) {
                preference.disableAll();
                await this.updatePreferences(preferences);
            }

            return preferences;
        } catch (error) {
            console.error('Error disabling context notifications:', error);
            throw new Error(`Error al deshabilitar notificaciones de ${context}`);
        }
    },

    /**
     * Obtener preferencia por contexto
     */
    async getPreferenceByContext(context) {
        try {
            const preferences = await this.getPreferences();
            return preferences.getByContext(context);
        } catch (error) {
            console.error('Error fetching preference by context:', error);
            throw new Error(`Error al cargar preferencia de ${context}`);
        }
    },

    /**
     * Verificar si debe recibir notificación según preferencias
     */
    async shouldReceiveNotification(context, priority, channel = 'inApp') {
        try {
            const preferences = await this.getPreferences();
            return preferences.shouldReceive(context, priority, channel);
        } catch (error) {
            console.error('Error checking notification preference:', error);
            return false; // Por defecto no enviar si hay error
        }
    },

    /**
     * Obtener contextos habilitados
     */
    async getEnabledContexts(channel = 'inApp') {
        try {
            const preferences = await this.getPreferences();
            return preferences.getEnabledContexts(channel);
        } catch (error) {
            console.error('Error fetching enabled contexts:', error);
            return [];
        }
    },

    /**
     * Configuración rápida por rol
     */
    async applyRoleBasedSettings(role) {
        try {
            const preferences = await this.getPreferences();

            switch (role) {
                case 'Admin':
                    // Admins reciben todo
                    preferences.preferences.forEach(pref => {
                        pref.inAppEnabled = true;
                        pref.emailEnabled = pref.context === 'SYSTEM' || pref.context === 'INCIDENTS';
                        pref.minimumPriority = 'NORMAL';
                    });
                    break;

                case 'Manager':
                    // Managers reciben proyectos, personal, materiales, maquinaria e incidentes
                    preferences.preferences.forEach(pref => {
                        if (['PROJECTS', 'PERSONNEL', 'MATERIALS', 'MACHINERY', 'INCIDENTS'].includes(pref.context)) {
                            pref.inAppEnabled = true;
                            pref.emailEnabled = pref.context === 'INCIDENTS';
                            pref.minimumPriority = 'NORMAL';
                        } else {
                            pref.inAppEnabled = false;
                            pref.emailEnabled = false;
                        }
                    });
                    break;

                case 'Supervisor':
                    // Supervisores reciben personal, materiales, maquinaria e incidentes
                    preferences.preferences.forEach(pref => {
                        if (['PERSONNEL', 'MATERIALS', 'MACHINERY', 'INCIDENTS'].includes(pref.context)) {
                            pref.inAppEnabled = true;
                            pref.emailEnabled = pref.context === 'INCIDENTS';
                            pref.minimumPriority = 'HIGH';
                        } else {
                            pref.inAppEnabled = false;
                            pref.emailEnabled = false;
                        }
                    });
                    break;
            }

            await this.updatePreferences(preferences);
            return preferences;
        } catch (error) {
            console.error('Error applying role-based settings:', error);
            throw new Error('Error al aplicar configuración por rol');
        }
    },

    /**
     * Exportar preferencias actuales
     */
    async exportPreferences() {
        try {
            const preferences = await this.getPreferences();
            return {
                exportDate: new Date().toISOString(),
                preferences: preferences.toApiPayload()
            };
        } catch (error) {
            console.error('Error exporting preferences:', error);
            throw new Error('Error al exportar preferencias');
        }
    },

    /**
     * Importar preferencias
     */
    async importPreferences(exportedData) {
        try {
            if (!exportedData.preferences) {
                throw new Error('Formato de importación inválido');
            }

            await this.updatePreferences(exportedData.preferences);
            return await this.getPreferences();
        } catch (error) {
            console.error('Error importing preferences:', error);
            throw new Error('Error al importar preferencias');
        }
    }
};
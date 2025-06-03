import { BaseService } from '../../../core/services/base.service.js';
import { AuthService } from '../../../auth/services/auth-api.service.js';
import { Configuration } from '../models/configuration.entity.js';

class ConfigurationService extends BaseService {
    constructor() {
        super('/user_settings');
    }

    /**
     * Obtiene la configuración de un usuario por su ID.
     * @param {string} userId - El ID del usuario.
     * @returns {Promise<Object|null>} - La configuración del usuario o null si no se encuentra.
     */
    async getByUserId(userId) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        try {
            const response = await this.getAll({ user_id: userId });
            return response.data.length ? response.data[0] : null;
        } catch (error) {
            if (error.response && error.response.status === 404) {
                return null;
            }
            console.error(`Error getting user settings for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Crea o actualiza la configuración de un usuario según si ya existe.
     * @param {string} userId - El ID del usuario.
     * @param {Object} configData - Los datos de configuración.
     * @returns {Promise<Object>} - La configuración creada o actualizada.
     */
    async saveOrUpdate(userId, configData) {
        if (!userId) {
            throw new Error('User ID is required');
        }
        if (!configData) {
            throw new Error('Configuration data is required');
        }

        try {
            const existing = await this.getByUserId(userId);
            if (existing) {
                return await this.update(existing.id, { ...existing, ...configData });
            } else {
                return await this.create({ user_id: userId, ...configData });
            }
        } catch (error) {
            console.error(`Error saving or updating settings for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Actualiza la configuración del usuario.
     * @param {string} userId - El ID del usuario.
     * @param {Object} settings - Los nuevos settings.
     * @returns {Promise<Object>} - La configuración actualizada.
     */
    async updateSettings(userId, settings) {
        try {
            return await this.saveOrUpdate(userId, settings);
        } catch (error) {
            console.error(`Error updating settings for user ${userId}:`, error);
            throw error;
        }
    }

    // ========================================
    // MÉTODOS DE LÓGICA DE NEGOCIO
    // ========================================

    /**
     * Obtiene el ID del usuario actual de forma consistente
     * @returns {string|null} - El ID del usuario actual
     */
    getCurrentUserId() {
        const user = AuthService.getCurrentUser();
        return user?.id || user?.user_id || user?.userId || user?.User_id || null;
    }

    /**
     * Carga la configuración del usuario actual
     * @returns {Promise<Configuration>} - La configuración cargada
     */
    async loadCurrentUserSettings() {
        try {
            const user = AuthService.getCurrentUser();

            if (!user) {
                console.log('No user logged in, using default configuration');
                return new Configuration();
            }

            const userId = this.getCurrentUserId();

            if (!userId) {
                console.log('Could not get user ID, using default configuration');
                return new Configuration();
            }

            // Intentar cargar desde sessionStorage primero
            if (user?.settings) {
                console.log('Loading settings from sessionStorage');
                return new Configuration(user.settings);
            }

            // Si no hay settings en sessionStorage, cargar desde API
            console.log('Loading settings from API');
            const settingsFromAPI = await this.getByUserId(userId);

            if (settingsFromAPI) {
                // Actualizar sessionStorage con los datos cargados
                const updatedUser = {
                    ...user,
                    settings: settingsFromAPI
                };
                sessionStorage.setItem("user", JSON.stringify(updatedUser));
                console.log('SessionStorage updated with API settings');

                return new Configuration(settingsFromAPI);
            } else {
                console.log('No settings found in API, using defaults');
                return new Configuration();
            }

        } catch (error) {
            console.error('Error loading user settings:', error);
            return new Configuration();
        }
    }

    /**
     * Guarda la configuración del usuario actual
     * @param {Configuration} configuration - La configuración a guardar
     * @returns {Promise<Object>} - La respuesta del servidor
     */
    async saveCurrentUserSettings(configuration) {
        const user = AuthService.getCurrentUser();

        if (!user) {
            throw new Error('No user logged in');
        }

        const userId = this.getCurrentUserId();

        if (!userId) {
            throw new Error('Could not get user ID');
        }

        // Convertir a formato API (con booleanos)
        const apiData = configuration.toAPIFormat();
        apiData.user_id = userId;

        console.log('Saving settings to API');

        // Enviar a la API
        const response = await this.updateSettings(userId, apiData);

        // Actualizar sessionStorage
        const updatedUser = {
            ...user,
            settings: apiData
        };
        sessionStorage.setItem("user", JSON.stringify(updatedUser));
        console.log('SessionStorage updated');

        return response;
    }

    /**
     * Limpia la configuración del usuario del sessionStorage
     */
    clearUserSettings() {
        const user = AuthService.getCurrentUser();
        if (user) {
            const updatedUser = { ...user };
            delete updatedUser.settings;
            sessionStorage.setItem("user", JSON.stringify(updatedUser));
        }
    }
}

export const configurationService = new ConfigurationService();
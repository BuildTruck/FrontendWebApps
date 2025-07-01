import { BaseService } from '../../../core/services/base.service.js';
import { AuthService } from '../../../auth/services/auth-api.service.js';
import { Configuration } from '../models/configuration.entity.js';

class ConfigurationService extends BaseService {
    constructor() {
        // CAMBIO 1: Solo cambiar el endpoint
        super('/configurations');
    }

    async getByUserId(userId) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        try {
            // CAMBIO 2: Para la API real, hacer GET directo (sin parámetros user_id)
            // La API real maneja automáticamente el usuario autenticado
            const response = await this.getAll();
            return response.data || null;
        } catch (error) {
            if (error.response && error.response.status === 404) {
                return null;
            }
            console.error(`Error getting user settings for user ${userId}:`, error);
            throw error;
        }
    }

    async saveOrUpdate(userId, configData) {
        if (!userId) {
            throw new Error('User ID is required');
        }
        if (!configData) {
            throw new Error('Configuration data is required');
        }

        try {
            // CAMBIO 3: Para la API real, usar PUT directo (sin verificar si existe)
            // La API real maneja create/update automáticamente
            return await this.updateViaAPI(configData);
        } catch (error) {
            console.error(`Error saving or updating settings for user ${userId}:`, error);
            console.error('🔍 Backend error details:', error.response?.data); // ⭐ AGREGAR ESTA LÍNEA
            throw error;
        }
    }

    // NUEVO MÉTODO: Para hacer PUT directo sin ID
    async updateViaAPI(configData) {
        console.log('🚀 Datos enviando a API:', configData);

        // DEBUG: Verificar el token
        const token = sessionStorage.getItem('token');
        console.log('🔑 Token:', token ? 'Existe' : 'No existe');

        // DEBUG: Verificar el header Authorization
        const http = await import('../../../core/services/http.service.js');

        const response = await http.default.put(this.resourceEndpoint, configData);
        return response;
    }
    async updateSettings(userId, settings) {
        try {
            return await this.saveOrUpdate(userId, settings);
        } catch (error) {
            console.error(`Error updating settings for user ${userId}:`, error);
            throw error;
        }
    }

    getCurrentUserId() {
        const user = AuthService.getCurrentUser();
        return user?.id || user?.user_id || user?.userId || user?.User_id || null;
    }

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

            if (user?.settings) {
                console.log('Loading settings from sessionStorage');
                return new Configuration(user.settings);
            }

            console.log('Loading settings from API');
            const settingsFromAPI = await this.getByUserId(userId);

            if (settingsFromAPI) {
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

    async saveCurrentUserSettings(configuration) {
        const user = AuthService.getCurrentUser();

        if (!user) {
            throw new Error('No user logged in');
        }

        const userId = this.getCurrentUserId();

        if (!userId) {
            throw new Error('Could not get user ID');
        }

        const apiData = configuration.toAPIFormat();
        // CAMBIO 4: No necesitas enviar user_id, la API lo maneja automáticamente
        // apiData.user_id = userId; // Comentado

        console.log('Saving settings to API');

        const response = await this.updateSettings(userId, apiData);

        const updatedUser = {
            ...user,
            settings: apiData
        };
        sessionStorage.setItem("user", JSON.stringify(updatedUser));
        console.log('SessionStorage updated');

        return response;
    }

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
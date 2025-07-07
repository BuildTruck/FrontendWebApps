import { AuthService } from '../../../auth/services/auth-api.service.js';
import { Configuration } from '../models/configuration.entity.js';
import http from '../../../core/services/http.service.js';

class ConfigurationService {
    constructor() {
        this.baseEndpoint = '/configuration-settings';
    }

    // GET /api/v1/configuration-settings/user/{userId}
    async getByUserId(userId) {
        try {
            const response = await http.get(`${this.baseEndpoint}/user/${userId}`);
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                return null; // No settings found
            }
            console.error(`Error getting user settings for user ${userId}:`, error);
            throw error;
        }
    }

    // POST /api/v1/configuration-settings (crear nuevo)
    async create(configData) {
        try {
            const response = await http.post(this.baseEndpoint, configData);
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    // PUT /api/v1/configuration-settings/{id} (actualizar existente)
    async update(id, configData) {
        try {
            const response = await http.put(`${this.baseEndpoint}/${id}`, configData);
            return response.data;
        } catch (error) {
            console.error(`Error updating configuration ${id}:`, error);
            throw error;
        }
    }

    // Método principal para guardar (crea o actualiza automáticamente)
    async saveOrUpdate(userId, configData) {
        try {
            return await this.create(configData);
        } catch (createError) {
            if (createError.response?.status === 400) {
                try {
                    const existing = await this.getByUserId(userId);
                    if (existing && existing.id) {
                        return await this.update(existing.id, configData);
                    }
                } catch (getError) {
                    console.error('Error getting existing configuration:', getError);
                }
            }
            throw createError;
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
                return new Configuration();
            }

            const userId = this.getCurrentUserId();

            if (!userId) {
                return new Configuration();
            }

            // Si ya tiene settings en sessionStorage, usarlos
            if (user?.settings && Object.keys(user.settings).length > 0) {
                return new Configuration(user.settings);
            }

            // Cargar desde API
            try {
                const settingsFromAPI = await this.getByUserId(userId);

                if (settingsFromAPI) {
                    const configuration = Configuration.fromAPI(settingsFromAPI);

                    // Actualizar sessionStorage
                    const updatedUser = { ...user, settings: configuration.toJSON() };
                    sessionStorage.setItem("user", JSON.stringify(updatedUser));
                    return configuration;
                } else {
                    return new Configuration();
                }
            } catch (apiError) {
                if (apiError.response?.status === 404) {
                    return new Configuration();
                }
                throw apiError;
            }

        } catch (error) {
            console.error('Error loading user settings:', error);
            return new Configuration();
        }
    }

    async saveCurrentUserSettings(configuration) {
        try {
            const user = AuthService.getCurrentUser();

            if (!user) {
                throw new Error('No user logged in');
            }

            const userId = this.getCurrentUserId();

            if (!userId) {
                throw new Error('Could not get user ID');
            }

            const apiData = configuration.toAPIFormat();
            apiData.userId = userId;

            const response = await this.saveOrUpdate(userId, apiData);

            // Actualizar sessionStorage
            const updatedUser = { ...user, settings: apiData };
            sessionStorage.setItem("user", JSON.stringify(updatedUser));

            return response;
        } catch (error) {
            console.error('Error saving user settings:', error);
            throw error;
        }
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
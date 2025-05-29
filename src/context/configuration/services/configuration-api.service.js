import { BaseService } from '../../../core/services/base.service.js';

class ConfigurationService extends BaseService {
    constructor() {
        super('/user_settings'); // Verifica que este endpoint coincida con el de tu API
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
                // Si no hay configuración aún, MockAPI responde 404
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
}

export const configurationService = new ConfigurationService();
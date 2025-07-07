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
            console.log('🔍 [CONFIG] Usuario actual:', user);

            if (!user) {
                console.log('❌ [CONFIG] No hay usuario');
                return new Configuration();
            }

            const userId = this.getCurrentUserId();
            console.log('🔍 [CONFIG] User ID:', userId);

            // Intentar cargar desde API
            const settingsFromAPI = await this.getByUserId(userId);
            console.log('🔍 [CONFIG] Settings desde API:', settingsFromAPI);

            if (settingsFromAPI) {
                const configuration = Configuration.fromAPI(settingsFromAPI);
                console.log('🔍 [CONFIG] Configuration creada:', configuration);
                console.log('🔍 [CONFIG] Tutorials:', configuration.getTutorials());
                return configuration;
            }

            return new Configuration();
        } catch (error) {
            console.error('❌ [CONFIG] Error:', error);
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

    // ========== MÉTODOS PARA TUTORIALES ==========

// Obtener progreso de tutoriales del usuario actual
    async getTutorialProgress() {
        try {
            const configuration = await this.loadCurrentUserSettings();
            return configuration.getTutorials();
        } catch (error) {
            console.error('Error getting tutorial progress:', error);
            return {};
        }
    }

// Verificar si un tutorial específico está completado
    async isTutorialCompleted(tutorialId) {
        try {
            const configuration = await this.loadCurrentUserSettings();
            return configuration.isTutorialCompleted(tutorialId);
        } catch (error) {
            console.error('Error checking tutorial completion:', error);
            return false;
        }
    }

// Marcar tutorial como completado
    async markTutorialCompleted(tutorialId) {
        try {
            const configuration = await this.loadCurrentUserSettings();

            // NUEVO: Validar que la configuración sea válida antes de marcar
            if (!configuration.isValid()) {
                console.warn('⚠️ Configuración inválida, recreando...');
                const newConfig = new Configuration({ userId: this.getCurrentUserId() });
                newConfig.markTutorialCompleted(tutorialId);
                await this.saveCurrentUserSettings(newConfig);
            } else {
                configuration.markTutorialCompleted(tutorialId);
                await this.saveCurrentUserSettings(configuration);
            }

            console.log(`✅ Tutorial '${tutorialId}' marcado como completado`);
            return true;
        } catch (error) {
            console.error(`Error marking tutorial '${tutorialId}' as completed:`, error);

            // MEJORADO: Log más detallado del error
            if (error.response) {
                console.error('❌ Response status:', error.response.status);
                console.error('❌ Response data:', error.response.data);
            }

            throw error;
        }
    }

// Resetear tutorial específico
    async resetTutorial(tutorialId) {
        try {
            const configuration = await this.loadCurrentUserSettings();
            configuration.resetTutorial(tutorialId);

            await this.saveCurrentUserSettings(configuration);

            console.log(`🔄 Tutorial '${tutorialId}' reseteado`);
            return true;
        } catch (error) {
            console.error(`Error resetting tutorial '${tutorialId}':`, error);
            throw error;
        }
    }

// Resetear todos los tutoriales
    async resetAllTutorials() {
        try {
            const configuration = await this.loadCurrentUserSettings();
            configuration.resetAllTutorials();

            await this.saveCurrentUserSettings(configuration);

            console.log('🔄 Todos los tutoriales reseteados');
            return true;
        } catch (error) {
            console.error('Error resetting all tutorials:', error);
            throw error;
        }
    }

// Obtener lista de tutoriales completados
    async getCompletedTutorials() {
        try {
            const configuration = await this.loadCurrentUserSettings();
            return configuration.getCompletedTutorials();
        } catch (error) {
            console.error('Error getting completed tutorials:', error);
            return [];
        }
    }


    async markMultipleTutorialsCompleted(tutorialIds) {
        try {
            const configuration = await this.loadCurrentUserSettings();

            tutorialIds.forEach(tutorialId => {
                configuration.markTutorialCompleted(tutorialId);
            });

            await this.saveCurrentUserSettings(configuration);

            console.log(`✅ Tutoriales marcados como completados: ${tutorialIds.join(', ')}`);
            return true;
        } catch (error) {
            console.error('Error marking multiple tutorials as completed:', error);
            throw error;
        }
    }
}

export const configurationService = new ConfigurationService();
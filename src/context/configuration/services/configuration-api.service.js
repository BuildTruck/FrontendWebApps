// configuration-api.service.js
import { BaseService } from '../../../core/services/base.service'
import { Configuration } from '../models/configuration.entity'

// Creamos una instancia para trabajar sobre el recurso 'users'
const userService = new BaseService('/users')

export const ConfigurationService = {
    /**
     * Obtiene la configuración (settings) de un usuario
     * @param {string} userId
     * @returns {Promise<Configuration>}
     */
    async getByUserId(userId) {
        const { data: user } = await userService.getById(userId)
        return new Configuration(user.settings)
    },

    /**
     * Actualiza la configuración de un usuario
     * @param {string} userId
     * @param {Configuration} config
     * @returns {Promise}
     */
    async updateSettings(userId, config) {
        const { data: user } = await userService.getById(userId)

        return await userService.update(userId, {
            ...user,
            settings: config.toJSON()
        })
    }
}

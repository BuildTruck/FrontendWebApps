// src/context/admin/services/user-api.service.js
import { BaseService} from "./base.service.js";

class UserService extends BaseService {
    constructor() {
        super('/users')
    }

    // Métodos específicos para usuarios
    async getUsersByRole(role) {
        return await this.getAll({ role })
    }

    /**
     * Genera email corporativo automático
     * @param {string} name - Nombre del usuario
     * @param {number} id - ID del usuario
     * @returns {string} - Email corporativo generado
     */
    generateCorporateEmail(name, id) {
        // Normalizar el nombre: sin espacios, sin acentos, en minúsculas
        const normalizedName = name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
            .replace(/[^a-z0-9]/g, '') // Solo letras y números
            .substring(0, 10) // Máximo 10 caracteres

        return `${normalizedName}${id}@buildtruck.com`
    }

    /**
     * Genera preview del email corporativo
     * @param {string} name - Nombre del usuario
     * @returns {string} - Preview del email
     */
    generateEmailPreview(name) {
        if (!name || name.trim() === '') {
            return 'nombre{id}@buildtruck.com'
        }

        const normalizedName = name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 10)

        return `${normalizedName}{id}@buildtruck.com`
    }

    async createUser(userData) {
        try {
            // 1. Crear usuario sin email corporativo final
            const userToCreate = {
                ...userData,
                email: 'temporal@buildtruck.com', // Email temporal
                createdAt: new Date(new Date().toLocaleString("en-US", {
                    timeZone: "America/Lima"
                })).toISOString(),
                lastLogin: null,
                permissions: userData.permissions || []
            }

            // 2. Crear el usuario
            const response = await this.create(userToCreate)
            const createdUser = response.data

            // 3. Generar email corporativo con el ID real
            const corporateEmail = this.generateCorporateEmail(userData.name, createdUser.id)

            // 4. Actualizar usuario con el email corporativo final
            const updatedUser = {
                ...createdUser,
                email: corporateEmail,
                updatedAt: new Date(new Date().toLocaleString("en-US", {
                    timeZone: "America/Lima"
                })).toISOString()
            }

            await this.update(createdUser.id, updatedUser)

            // 5. Retornar el usuario con el email corporativo
            return {
                ...response,
                data: {
                    ...updatedUser
                }
            }

        } catch (error) {
            console.error('Error creando usuario:', error)
            throw error
        }
    }

    async updateUser(id, userData) {
        try {
            // Si se está actualizando el nombre, regenerar el email corporativo
            const shouldUpdateEmail = userData.name && userData.name.trim() !== ''

            const userToUpdate = {
                ...userData,
                updatedAt: new Date().toISOString()
            }

            // Regenerar email corporativo si se cambió el nombre
            if (shouldUpdateEmail) {
                userToUpdate.email = this.generateCorporateEmail(userData.name, id)
            }

            return await this.update(id, userToUpdate)
        } catch (error) {
            console.error('Error actualizando usuario:', error)
            throw error
        }
    }

    async deleteUser(id) {
        return await this.delete(id)
    }

    // Métodos de conveniencia
    async getManagers() {
        return await this.getUsersByRole('manager')
    }

    async getSupervisors() {
        return await this.getUsersByRole('supervisor')
    }

    async getAdmins() {
        return await this.getUsersByRole('admin')
    }

    async getAvailableSupervisors() {
        const response = await this.getUsersByRole('supervisor')
        const availableSupervisors = response.data.filter(supervisor => !supervisor.projectId)
        return { data: availableSupervisors }
    }

    async updateLastLogin(id) {
        const user = await this.getById(id)
        const updatedUser = {
            ...user.data,
            lastLogin: new Date().toISOString()
        }
        return await this.update(id, updatedUser)
    }

    async assignProjectToSupervisor(supervisorId, projectId) {
        const supervisor = await this.getById(supervisorId)
        const updatedSupervisor = {
            ...supervisor.data,
            projectId: projectId,
            updatedAt: new Date().toISOString()
        }
        return await this.update(supervisorId, updatedSupervisor)
    }

    async unassignProjectFromSupervisor(supervisorId) {
        const supervisor = await this.getById(supervisorId)
        const updatedSupervisor = {
            ...supervisor.data,
            projectId: null,
            updatedAt: new Date().toISOString()
        }
        return await this.update(supervisorId, updatedSupervisor)
    }

    /**
     * Verifica si un email ya existe
     * @param {string} email - Email a verificar
     * @param {number} excludeId - ID a excluir de la búsqueda (para edición)
     * @returns {Promise<boolean>} - True si el email ya existe
     */
    async emailExists(email, excludeId = null) {
        try {
            const response = await this.getAll()
            const users = response.data || []

            return users.some(user =>
                user.email === email &&
                (excludeId === null || user.id !== excludeId)
            )
        } catch (error) {
            console.error('Error verificando email:', error)
            return false
        }
    }
}

export const userService = new UserService()
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

    // ✅ NUEVO MÉTODO: Compresión de imágenes para fotos de perfil
    /**
     * Comprime una imagen a base64 con calidad reducida para foto de perfil
     * @param {File} file - Archivo de imagen
     * @param {number} maxWidth - Ancho máximo (por defecto 200px)
     * @param {number} quality - Calidad de compresión (0.1 - 1.0, por defecto 0.7)
     * @returns {Promise<string>} - Base64 comprimido
     */
    compressProfileImage(file, maxWidth = 200, quality = 0.7) {
        return new Promise((resolve, reject) => {
            if (!file || !file.type.startsWith('image/')) {
                reject(new Error('El archivo debe ser una imagen'));
                return;
            }

            // Validar tamaño máximo del archivo (5MB)
            const maxFileSize = 5 * 1024 * 1024;
            if (file.size > maxFileSize) {
                reject(new Error('La imagen es demasiado grande. Máximo 5MB.'));
                return;
            }

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                try {
                    // Calcular nuevas dimensiones manteniendo la proporción
                    const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
                    const newWidth = Math.round(img.width * ratio);
                    const newHeight = Math.round(img.height * ratio);

                    // Configurar canvas
                    canvas.width = newWidth;
                    canvas.height = newHeight;

                    // Mejorar calidad del redimensionado
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';

                    // Dibujar imagen redimensionada
                    ctx.drawImage(img, 0, 0, newWidth, newHeight);

                    // Convertir a base64 con compresión
                    const compressedBase64 = canvas.toDataURL('image/jpeg', quality);

                    // Log del tamaño final
                    const finalSize = Math.round(compressedBase64.length / 1024);
                    console.log(`Imagen comprimida: ${finalSize}KB`);

                    resolve(compressedBase64);
                } catch (error) {
                    reject(new Error('Error al procesar la imagen'));
                }
            };

            img.onerror = () => {
                reject(new Error('Error al cargar la imagen'));
            };

            // Crear URL temporal para la imagen
            img.src = URL.createObjectURL(file);
        });
    }
}

export const userService = new UserService()
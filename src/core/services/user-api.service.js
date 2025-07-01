import http from "./http.service.js";

class UserService {
    constructor() {
        this.basePath = '/users'
    }

    async getAll() {
        try {
            const response = await http.get(this.basePath)
            return {
                data: response.data,
                status: response.status
            }
        } catch (error) {
            console.error('Error obteniendo usuarios:', error)
            throw error
        }
    }

    async getById(id) {
        try {
            const response = await http.get(`${this.basePath}/${id}`)
            return {
                data: response.data,
                status: response.status
            }
        } catch (error) {
            console.error('Error obteniendo usuario:', error)
            throw error
        }
    }

    async createUser(userData) {
        try {
            const userToCreate = {
                name: userData.name,
                lastName: userData.lastName,
                role: userData.role,
                personalEmail: userData.personalEmail,
                phone: userData.phone
            }

            const response = await http.post(this.basePath, userToCreate)

            return {
                data: response.data,
                status: response.status
            }
        } catch (error) {
            console.error('Error creando usuario:', error)
            throw error
        }
    }

    async updateUser(id, userData) {
        try {
            const userToUpdate = {
                name: userData.name,
                lastName: userData.lastName,
                personalEmail: userData.personalEmail,
                role: userData.role
            }

            const response = await http.put(`${this.basePath}/${id}`, userToUpdate)

            return {
                data: response.data,
                status: response.status
            }
        } catch (error) {
            console.error('Error actualizando usuario:', error)
            throw error
        }
    }
    async updateProfile(id, profileData) {
        try {
            const userToUpdate = {
                name: profileData.name,
                lastName: profileData.lastName,
                personalEmail: profileData.personalEmail,
                role: profileData.role,
                photo: profileData.photo
            }

            const response = await http.put(`${this.basePath}/${id}`, userToUpdate)

            return {
                data: response.data,
                status: response.status
            }
        } catch (error) {
            console.error('Error actualizando perfil:', error)
            throw error
        }
    }
    async deleteUser(id) {
        try {
            await http.delete(`${this.basePath}/${id}`)
            return { success: true }
        } catch (error) {
            console.error('Error eliminando usuario:', error)
            throw error
        }
    }

    async changePassword(id, currentPassword, newPassword) {
        try {
            const response = await http.put(`${this.basePath}/${id}/password`, {
                currentPassword,
                newPassword
            })
            return { success: true }
        } catch (error) {
            console.error('Error cambiando contraseña:', error)
            throw error
        }
    }

    async uploadProfileImage(id, imageFile) {
        try {
            if (!imageFile || !imageFile.type.startsWith('image/')) {
                throw new Error('El archivo debe ser una imagen (JPG, PNG, etc.)');
            }

            if (imageFile.size > 5 * 1024 * 1024) {
                throw new Error('La imagen es demasiado grande. Máximo 5MB');
            }

            const formData = new FormData();
            formData.append('file', imageFile);

            const response = await http.post(`${this.basePath}/${id}/profile-image`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            return {
                data: response.data,
                status: response.status
            };
        } catch (error) {
            console.error('Error subiendo imagen:', error);
            throw error;
        }
    }

    async deleteProfileImage(id) {
        try {
            const response = await http.delete(`${this.basePath}/${id}/profile-image`)
            return {
                data: response.data,
                status: response.status
            }
        } catch (error) {
            console.error('Error eliminando imagen:', error)
            throw error
        }
    }

    async getUsersByRole(role) {
        try {
            const response = await this.getAll()
            const filteredUsers = response.data.filter(user => user.role === role)
            return {
                data: filteredUsers,
                status: response.status
            }
        } catch (error) {
            console.error('Error obteniendo usuarios por rol:', error)
            throw error
        }
    }

    async getManagers() {
        return await this.getUsersByRole('Manager')
    }

    async getSupervisors() {
        return await this.getUsersByRole('Supervisor')
    }

    async getAdmins() {
        return await this.getUsersByRole('Admin')
    }

    async emailExists(email, excludeId = null) {
        try {
            const response = await this.getAll()
            const users = response.data || []

            return users.some(user =>
                (user.email === email || user.personalEmail === email) &&
                (excludeId === null || user.id !== excludeId)
            )
        } catch (error) {
            console.error('Error verificando email:', error)
            return false
        }
    }

    generateEmailPreview(name, lastName = '') {
        if (!name || name.trim() === '') {
            return 'nombre.apellido@buildtruck.com'
        }

        const normalizeName = (text) => text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '')

        const normalizedName = normalizeName(name.trim())

        if (!lastName || lastName.trim() === '') {
            return `${normalizedName}.apellido@buildtruck.com`
        }

        const normalizedLastName = normalizeName(lastName.trim())
        return `${normalizedName}.${normalizedLastName}@buildtruck.com`
    }

    async create(userData) {
        return await this.createUser(userData)
    }

    async update(id, userData) {
        return await this.updateUser(id, userData)
    }

    async delete(id) {
        return await this.deleteUser(id)
    }


}

export const userService = new UserService()
import {BaseService} from '../../../core/services/base.service'
import {Projects} from '../models/projects.entity'
import http from '../../../core/services/http.service'
import {AuthService} from "../../../auth/services/auth-api.service.js";

class ProjectsService extends BaseService {
    constructor() {
        super('/projects')
    }

    async getProjectsByManager(managerId) {
        try {
            const response = await http.get(`/projects/by-manager/${managerId}`)
            if (response.data && Array.isArray(response.data)) {
                response.data = response.data.map(project => new Projects(project))
            }
            return response
        } catch (error) {
            console.error('Error obteniendo proyectos del manager:', error)
            throw error
        }
    }

    async getProjectById(projectId) {
        try {
            const user = AuthService.getCurrentUser()
            if (!user) throw new Error('Usuario no autenticado')

            const response = await http.get(`/projects/by-manager/${user.id}`)
            if (!response.data || !Array.isArray(response.data)) {
                throw new Error('Respuesta del backend inválida')
            }

            const project = response.data.find(p => String(p.id) === String(projectId))
            if (!project) throw new Error(`Proyecto con ID ${projectId} no encontrado`)

            return { data: project }
        } catch (error) {
            console.error('Error en getProjectById:', error)
            throw error
        }
    }

    async getAvailableSupervisors() {
        try {
            const userService = new BaseService('/users')
            const response = await userService.getAll()

            const availableSupervisors = response.data
                .filter(user => ['supervisor', 'Supervisor', 'SUPERVISOR'].includes(user.role))
                .filter(supervisor => !supervisor.projectId || supervisor.projectId === null || supervisor.projectId === undefined || supervisor.projectId === "")
                .map(supervisor => ({
                    value: supervisor.id.toString(),
                    label: supervisor.email || supervisor.name,
                    email: supervisor.email,
                    name: supervisor.name
                }))

            return { data: availableSupervisors }
        } catch (error) {
            console.error('Error obteniendo supervisores disponibles:', error)
            throw error
        }
    }

    async findSupervisorBy(field, value) {
        try {
            const userService = new BaseService('/users')
            const response = await userService.getAll()

            const supervisor = response.data.find(user =>
                user[field] === value && ['supervisor', 'Supervisor', 'SUPERVISOR'].includes(user.role)
            )

            return { data: supervisor || null }
        } catch (error) {
            console.error(`Error buscando supervisor por ${field}:`, error)
            throw error
        }
    }

    async getSupervisorByEmail(email) { return this.findSupervisorBy('email', email) }
    async getSupervisorByName(name) {
        const response = await this.findSupervisorBy('name', name)
        if (!response.data) {
            return this.findSupervisorBy('fullName', name)
        }
        return response
    }

    async validateSupervisorAvailability(supervisorId) {
        try {
            if (!supervisorId) return true

            const userService = new BaseService('/users')
            const response = await userService.getById(supervisorId)
            const supervisor = response.data

            const isValidRole = supervisor && ['supervisor', 'Supervisor'].includes(supervisor.role)
            const isAvailable = !supervisor.projectId || supervisor.projectId === null || supervisor.projectId === undefined || supervisor.projectId === ""

            return isValidRole && isAvailable
        } catch (error) {
            console.error('Error validando disponibilidad del supervisor:', error)
            return false
        }
    }

    validateFileSize(file, maxSizeMB = 5) {
        return !file || file.size <= (maxSizeMB * 1024 * 1024)
    }

    async uploadProjectImage(file) {
        if (!file) return null
        if (!file.type.startsWith('image/')) throw new Error('El archivo debe ser una imagen (JPG, PNG, etc.)')
        if (!this.validateFileSize(file, 10)) throw new Error('La imagen es demasiado grande. Máximo 10MB permitido.')
        return file
    }

    async updateManagerProjects(managerId, projectId) {
        try {
            const userService = new BaseService('/users')
            const response = await userService.getById(managerId)
            const manager = response.data

            if (!manager || manager.role !== 'manager') throw new Error('Manager no encontrado o rol incorrecto')

            if (!manager.projects) manager.projects = []
            if (!manager.projects.includes(projectId)) {
                manager.projects.push(projectId)
                await userService.update(managerId, manager)
            }
        } catch (error) {
            console.error('Error actualizando proyectos del manager:', error)
            throw error
        }
    }

    async assignSupervisorToProject(supervisorId, projectId) {
        try {
            const userService = new BaseService('/users')
            const response = await userService.getById(supervisorId)
            const supervisor = response.data

            if (!supervisor || supervisor.role !== 'supervisor') throw new Error('Supervisor no encontrado o rol incorrecto')
            if (supervisor.projectId && supervisor.projectId !== projectId) throw new Error('Este supervisor ya tiene un proyecto asignado')

            supervisor.projectId = projectId
            await userService.update(supervisorId, supervisor)
            return { data: supervisor }
        } catch (error) {
            console.error('Error asignando supervisor:', error)
            throw error
        }
    }

    async createProject(projectData, imageFile = null) {
        try {
            if (!(projectData instanceof Projects)) projectData = new Projects(projectData)

            if (projectData.supervisorId) {
                const supervisorAvailable = await this.validateSupervisorAvailability(projectData.supervisorId)
                if (!supervisorAvailable) throw new Error('El supervisor seleccionado ya tiene un proyecto asignado o no existe')
            }

            if (imageFile && !this.validateFileSize(imageFile, 10)) throw new Error('La imagen es demasiado grande. Máximo 10MB permitido.')

            const formData = new FormData()
            formData.append('Name', projectData.name)
            formData.append('Description', projectData.description)
            formData.append('ManagerId', projectData.managerId)
            formData.append('Location', projectData.location)
            formData.append('State', projectData.state)

            if (projectData.start_date) formData.append('StartDate', projectData.start_date)
            if (projectData.coordinates) formData.append('Coordinates', JSON.stringify(projectData.coordinates))
            if (imageFile) formData.append('ImageFile', imageFile)
            if (projectData.supervisorId) formData.append('SupervisorId', projectData.supervisorId)

            return await http.post('/projects/create', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
        } catch (error) {
            console.error('Error creando proyecto completo:', error)
            throw error
        }
    }

    async createFullProject(projectData, imageFile = null) { return this.createProject(projectData, imageFile) }

    async updateProject(projectId, updateData, imageFile = null, removeImage = false) {
        try {
            const formData = new FormData()

            if (updateData.name?.trim()) formData.append('Name', updateData.name.trim())
            if (updateData.description?.trim()) formData.append('Description', updateData.description.trim())
            if (updateData.location?.trim()) formData.append('Location', updateData.location.trim())
            if (updateData.state && updateData.hasStateChanged) formData.append('State', updateData.state)
            if (updateData.start_date) formData.append('StartDate', updateData.start_date)
            if (updateData.coordinates) formData.append('Coordinates', JSON.stringify(updateData.coordinates))
            if (updateData.supervisorId !== null && updateData.supervisorId !== undefined && updateData.supervisorId !== '') formData.append('SupervisorId', updateData.supervisorId)
            if (removeImage) formData.append('RemoveImage', 'true')
            if (updateData.removeSupervisor) formData.append('RemoveSupervisor', 'true')
            if (imageFile) {
                if (!this.validateFileSize(imageFile, 10)) throw new Error('La imagen es demasiado grande. Máximo 10MB permitido.')
                formData.append('ImageFile', imageFile)
            }

            const response = await http.put(`/projects/${projectId}/update`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })

            return new Projects(response.data)
        } catch (error) {
            console.error('Error actualizando proyecto:', error)
            throw error
        }
    }

    async deleteProject(projectId, force = false, reason = '') {
        try {
            const project = await this.getProjectById(projectId)

            if (project.data.supervisorId) await this.removeSupervisorFromProject(project.data.supervisorId)
            if (project.data.managerId) await this.removeProjectFromManager(project.data.managerId, project.data.id)

            const params = new URLSearchParams()
            if (force) params.append('force', 'true')
            if (reason) params.append('reason', reason)

            const url = `/projects/${projectId}${params.toString() ? `?${params}` : ''}`
            return await http.delete(url)
        } catch (error) {
            console.error('Error eliminando proyecto:', error)
            throw error
        }
    }

    async removeSupervisorFromProject(supervisorId) {
        try {
            const userService = new BaseService('/users')
            const response = await userService.getById(supervisorId)
            const supervisor = response.data

            if (supervisor && supervisor.role === 'supervisor') {
                supervisor.projectId = null
                await userService.update(supervisorId, supervisor)
            }
        } catch (error) {
            console.error('Error liberando supervisor:', error)
            throw error
        }
    }

    async removeProjectFromManager(managerId, projectId) {
        try {
            const userService = new BaseService('/users')
            const response = await userService.getById(managerId)
            const manager = response.data

            if (manager && manager.role === 'manager' && manager.projects) {
                manager.projects = manager.projects.filter(id => id !== projectId)
                await userService.update(managerId, manager)
            }
        } catch (error) {
            console.error('Error eliminando proyecto del manager:', error)
            throw error
        }
    }

    async getSupervisorById(supervisorId) {
        try {
            const userService = new BaseService('/users')
            const response = await userService.getById(supervisorId)
            const user = response.data

            if (!user || user.role !== 'supervisor') throw new Error('Supervisor no encontrado o rol incorrecto')

            return { success: true, data: user }
        } catch (error) {
            console.error('Error al obtener supervisor:', error)
            throw new Error(`Error al obtener supervisor: ${error.message}`)
        }
    }
}

export const projectService = new ProjectsService()
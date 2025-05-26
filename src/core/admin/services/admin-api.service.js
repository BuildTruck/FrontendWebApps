// src/context/admin/services/admin-api.service.js
import { BaseService} from "../../services/base.service.js";
import { userService} from "../../services/user-api.service.js";

class AdminService extends BaseService {
    constructor() {
        super('/admin')
    }

    async getDashboardStats() {
        try {
            // Obtener usuarios
            const usersResponse = await userService.getAll()
            const users = usersResponse.data || []

            // Obtener proyectos usando BaseService
            const projectsService = new BaseService('/projects')
            const projectsResponse = await projectsService.getAll()
            const projects = projectsResponse.data || []

            // Calcular estadísticas
            const stats = {
                totalUsers: users.length,
                managers: users.filter(u => u.role === 'manager').length,
                supervisors: users.filter(u => u.role === 'supervisor').length,
                admins: users.filter(u => u.role === 'admin').length,
                totalProjects: projects.length,
                activeProjects: projects.filter(p => p.state === 'En ejecución').length,
                completedProjects: projects.filter(p => p.state === 'Finalizado').length
            }

            // Usuarios recientes (últimos 5)
            const recentUsers = users
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 5)

            return {
                data: {
                    stats,
                    recentUsers,
                    projects
                }
            }
        } catch (error) {
            console.error('Error obteniendo estadísticas del dashboard:', error)
            throw error
        }
    }

    async getUsersSummaryByRole() {
        const response = await userService.getAll()
        const users = response.data || []

        const summary = {
            admin: users.filter(u => u.role === 'admin'),
            manager: users.filter(u => u.role === 'manager'),
            supervisor: users.filter(u => u.role === 'supervisor')
        }

        return { data: summary }
    }

    async getRecentActivity() {
        const usersResponse = await userService.getAll()
        const users = usersResponse.data || []

        // Filtrar usuarios con actividad reciente (último login en los últimos 7 días)
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

        const recentActivity = users
            .filter(user => user.lastLogin && new Date(user.lastLogin) > oneWeekAgo)
            .sort((a, b) => new Date(b.lastLogin) - new Date(a.lastLogin))
            .slice(0, 10)

        return { data: recentActivity }
    }

    async canDeleteUser(userId) {
        try {
            const user = await userService.getById(userId)

            // No se puede eliminar si es el único admin
            if (user.data.role === 'admin') {
                const admins = await userService.getAdmins()
                if (admins.data.length <= 1) {
                    return false
                }
            }

            // No se puede eliminar manager si tiene proyectos
            if (user.data.role === 'manager' && user.data.projects && user.data.projects.length > 0) {
                return false
            }

            // No se puede eliminar supervisor si tiene proyecto asignado
            if (user.data.role === 'supervisor' && user.data.projectId) {
                return false
            }

            return true
        } catch (error) {
            console.error('Error validando eliminación de usuario:', error)
            return false
        }
    }

    async getSystemMetrics() {
        const [usersResponse, projectsResponse] = await Promise.all([
            userService.getAll(),
            new BaseService('/projects').getAll()
        ])

        const users = usersResponse.data || []
        const projects = projectsResponse.data || []

        const metrics = {
            userGrowth: this.calculateUserGrowth(users),
            projectCompletion: this.calculateProjectCompletion(projects),
            activeManagers: users.filter(u => u.role === 'manager' && u.lastLogin).length,
            availableSupervisors: users.filter(u => u.role === 'supervisor' && !u.projectId).length
        }

        return { data: metrics }
    }

    // Métodos privados para cálculos
    calculateUserGrowth(users) {
        const thisMonth = new Date()
        thisMonth.setDate(1)

        const usersThisMonth = users.filter(u =>
            new Date(u.createdAt) >= thisMonth
        ).length

        return {
            thisMonth: usersThisMonth,
            total: users.length
        }
    }

    calculateProjectCompletion(projects) {
        const completed = projects.filter(p => p.state === 'Finalizado').length
        const total = projects.length
        const rate = total > 0 ? (completed / total * 100).toFixed(1) : 0

        return {
            completed,
            total,
            rate: parseFloat(rate)
        }
    }
}

export const adminService = new AdminService()
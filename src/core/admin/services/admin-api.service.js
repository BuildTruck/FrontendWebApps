// src/context/admin/services/admin-api.service.js
import http from '../../../core/services/http.service.js'
import { userService} from "../../services/user-api.service.js";

class AdminService {
    constructor() {
        // No necesitas basePath específico, usas users y projects directamente
    }

    /**
     * Dashboard Stats - Solo usuarios (sin proyectos)
     */
    async getDashboardStats() {
        try {
            // Obtener usuarios desde el endpoint real
            const usersResponse = await userService.getAll()
            const users = usersResponse.data || []

            // Calcular estadísticas interesantes solo con usuarios
            const now = new Date()
            const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            const lastWeek = new Date()
            lastWeek.setDate(lastWeek.getDate() - 7)

            const stats = {
                totalUsers: users.length,
                managers: users.filter(u => u.role === 'Manager').length,
                supervisors: users.filter(u => u.role === 'Supervisor').length,
                admins: users.filter(u => u.role === 'Admin').length,
                // Nuevas estadísticas en lugar de proyectos
                activeUsersThisWeek: users.filter(u =>
                    u.lastLogin && new Date(u.lastLogin) > lastWeek
                ).length,
                newUsersThisMonth: users.filter(u =>
                    new Date(u.createdAt) >= thisMonth
                ).length,
                usersWithoutLogin: users.filter(u => !u.lastLogin).length
            }

            // Usuarios recientes (últimos 5)
            const recentUsers = users
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 5)

            // Usuarios más activos (con login reciente)
            const activeUsers = users
                .filter(u => u.lastLogin)
                .sort((a, b) => new Date(b.lastLogin) - new Date(a.lastLogin))
                .slice(0, 5)

            return {
                data: {
                    stats,
                    recentUsers,
                    activeUsers
                }
            }
        } catch (error) {
            console.error('Error obteniendo estadísticas del dashboard:', error)
            throw error
        }
    }

    /**
     * Resumen de usuarios por rol
     */
    async getUsersSummaryByRole() {
        try {
            const response = await userService.getAll()
            const users = response.data || []

            const summary = {
                admin: users.filter(u => u.role === 'Admin'),
                manager: users.filter(u => u.role === 'Manager'),
                supervisor: users.filter(u => u.role === 'Supervisor')
            }

            return { data: summary }
        } catch (error) {
            console.error('Error obteniendo resumen de usuarios:', error)
            throw error
        }
    }

    /**
     * Actividad reciente de usuarios
     */
    async getRecentActivity() {
        try {
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
        } catch (error) {
            console.error('Error obteniendo actividad reciente:', error)
            throw error
        }
    }

    /**
     * Verificar si se puede eliminar un usuario
     */
    async canDeleteUser(userId) {
        try {
            const user = await userService.getById(userId)

            // No se puede eliminar si es el único admin
            if (user.data.role === 'Admin') {
                const allUsers = await userService.getAll()
                const admins = allUsers.data.filter(u => u.role === 'Admin')
                if (admins.length <= 1) {
                    return false
                }
            }

            // Si tienes lógica de proyectos, verificar aquí
            // Por ejemplo, si un Manager tiene proyectos asignados
            if (user.data.role === 'Manager') {
                try {
                    const projectsResponse = await http.get(`/projects/by-manager/${userId}`)
                    const projects = projectsResponse.data || []
                    if (projects.length > 0) {
                        return false // No puede eliminarse si tiene proyectos
                    }
                } catch (error) {
                    // Si falla la consulta, permitir eliminación
                    console.warn('No se pudo verificar proyectos del manager')
                }
            }

            return true
        } catch (error) {
            console.error('Error validando eliminación de usuario:', error)
            return false
        }
    }

    /**
     * Métricas del sistema (solo usuarios)
     */
    async getSystemMetrics() {
        try {
            const usersResponse = await userService.getAll()
            const users = usersResponse.data || []

            const metrics = {
                userGrowth: this.calculateUserGrowth(users),
                userActivity: this.calculateUserActivity(users),
                roleDistribution: this.calculateRoleDistribution(users),
                registrationTrend: this.calculateRegistrationTrend(users)
            }

            return { data: metrics }
        } catch (error) {
            console.error('Error obteniendo métricas del sistema:', error)
            throw error
        }
    }

    // ===== MÉTODOS PRIVADOS DE CÁLCULO =====

    calculateUserGrowth(users) {
        const thisMonth = new Date()
        thisMonth.setDate(1)

        const lastMonth = new Date()
        lastMonth.setMonth(lastMonth.getMonth() - 1)
        lastMonth.setDate(1)

        const usersThisMonth = users.filter(u =>
            new Date(u.createdAt) >= thisMonth
        ).length

        const usersLastMonth = users.filter(u => {
            const createdDate = new Date(u.createdAt)
            return createdDate >= lastMonth && createdDate < thisMonth
        }).length

        return {
            thisMonth: usersThisMonth,
            lastMonth: usersLastMonth,
            total: users.length,
            growth: usersLastMonth > 0 ? ((usersThisMonth - usersLastMonth) / usersLastMonth * 100).toFixed(1) : 0
        }
    }

    calculateUserActivity(users) {
        const lastWeek = new Date()
        lastWeek.setDate(lastWeek.getDate() - 7)

        const activeUsers = users.filter(u =>
            u.lastLogin && new Date(u.lastLogin) > lastWeek
        ).length

        const inactiveUsers = users.filter(u => !u.lastLogin).length

        return {
            active: activeUsers,
            inactive: inactiveUsers,
            total: users.length,
            activityRate: users.length > 0 ? (activeUsers / users.length * 100).toFixed(1) : 0
        }
    }

    calculateRoleDistribution(users) {
        const admins = users.filter(u => u.role === 'Admin').length
        const managers = users.filter(u => u.role === 'Manager').length
        const supervisors = users.filter(u => u.role === 'Supervisor').length

        return {
            admin: admins,
            manager: managers,
            supervisor: supervisors,
            total: users.length
        }
    }

    calculateRegistrationTrend(users) {
        const last30Days = []
        const now = new Date()

        for (let i = 6; i >= 0; i--) {
            const date = new Date()
            date.setDate(now.getDate() - (i * 5)) // Últimas 7 semanas (cada 5 días)

            const startDate = new Date(date)
            const endDate = new Date(date)
            endDate.setDate(endDate.getDate() + 5)

            const usersInPeriod = users.filter(u => {
                const createdDate = new Date(u.createdAt)
                return createdDate >= startDate && createdDate < endDate
            }).length

            last30Days.push({
                period: `${startDate.getDate()}/${startDate.getMonth() + 1}`,
                users: usersInPeriod
            })
        }

        return last30Days
    }

    calculateProjectCompletion(projects) {
        // Mantenemos este método por compatibilidad, pero no se usa
        return {
            completed: 0,
            total: 0,
            rate: 0
        }
    }
}

export const adminService = new AdminService()
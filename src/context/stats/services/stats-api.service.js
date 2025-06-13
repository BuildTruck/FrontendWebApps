import { BaseService } from "../../../core/services/base.service.js";
import { Stats } from "../model/stats.entity.js";
import { userService } from "../../../core/services/user-api.service.js";

export class StatsApiService extends BaseService {
    constructor() {
        super('/stats');
    }

    // Main stats methods
    async getManagerStats(managerId, params = {}) {
        if (!managerId) throw new Error('Manager ID is required');

        try {
            // Verificar que el usuario existe y es manager
            const managerResponse = await userService.getById(managerId);
            const manager = managerResponse.data;

            if (!manager || manager.role !== 'manager') {
                throw new Error(`User ${managerId} is not a valid manager`);
            }

            // 🔍 Buscar stats existentes para este manager (sin importar período)
            const response = await super.getAll({
                managerId,
                statsType: 'GENERAL'
            });

            // Si ya existe UN registro para este manager, actualizarlo
            if (response.data && response.data.length > 0) {
                const existingStats = response.data[0]; // Tomar el primero

                // 🔄 Actualizar el registro existente con el nuevo período
                const updatedStats = await this.updateExistingStats(existingStats.id, managerId, params);
                return updatedStats;
            }

            // Si no existe, crear uno nuevo SOLO la primera vez
            const newStats = await this.calculateManagerStats(managerId, params);

            try {
                const saveResponse = await this.create(newStats);
                return Stats.fromAPI(saveResponse.data);
            } catch (saveError) {
                console.warn('⚠️ No se pudieron guardar stats:', saveError.message);
                return newStats;
            }
        } catch (error) {
            console.error(`Error fetching manager stats ${managerId}:`, error);
            return await this.calculateManagerStats(managerId, params);
        }
    }

    async updateExistingStats(statsId, managerId, params) {
        try {
            // Obtener el registro existente primero
            const existingResponse = await super.getById(statsId);
            const existingStats = existingResponse.data;

            // Recalcular solo los datos que cambian
            const period = params.period || 'CURRENT_MONTH';
            const dateRange = this.getDateRangeForPeriod(period, params.startDate, params.endDate);

            // Crear objeto de actualización simple
            const updateData = {
                period: period,
                startDate: dateRange.startDate?.toISOString?.() || dateRange.startDate,
                endDate: dateRange.endDate?.toISOString?.() || dateRange.endDate,
                updatedAt: new Date().toISOString()
            };

            // Hacer el update con datos simples
            const updateResponse = await super.update(statsId, updateData);

            // Retornar el stats actualizado
            return Stats.fromAPI({
                ...existingStats,
                ...updateResponse.data
            });
        } catch (error) {
            console.error(`Error updating existing stats ${statsId}:`, error);

            // Si falla el update, retornar los datos calculados sin guardar
            return await this.calculateManagerStats(managerId, params);
        }
    }

    async calculateManagerStats(managerId, params = {}) {
        try {
            const period = params.period || 'CURRENT_MONTH';
            const dateRange = this.getDateRangeForPeriod(period, params.startDate, params.endDate);

            // 🔥 OBTENER DATOS REALES DE LAS APIs
            const projectsData = await this.getProjectsForManager(managerId, dateRange);
            const personnelData = await this.getPersonnelForProjects(projectsData.projectIds, dateRange);
            // TODO: Agregar incidentes, materiales, maquinaria cuando tengas los endpoints

            const basicStats = {
                managerId,
                statsType: 'GENERAL',
                period,
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,

                // Stats reales de proyectos
                totalProjects: projectsData.totalProjects,
                activeProjects: projectsData.activeProjects,
                completedProjects: projectsData.completedProjects,

                // Stats reales de personal
                totalPersonnel: personnelData.totalPersonnel,
                activePersonnel: personnelData.activePersonnel,

                // TODO: Conectar cuando tengas endpoints
                totalIncidents: 0,
                criticalIncidents: 0,
                openIncidents: 0,
                totalMaterialCost: 0,
                activeMachinery: 0,
                totalMachinery: 0,
                recentDocuments: 0,

                // Breakdown data
                projectsByStatus: projectsData.projectsByStatus,
                personnelByType: personnelData.personnelByType,
                incidentsBySeverity: {},
                incidentsByType: {},
                materialsByCategory: {},
                machineryByStatus: {},
                costsOverTime: [],
                incidentsOverTime: []
            };

            return new Stats(basicStats);
        } catch (error) {
            console.error(`Error calculating manager stats ${managerId}:`, error);
            return new Stats({ managerId, statsType: 'GENERAL' });
        }
    }

    async getProjectsForManager(managerId, dateRange) {
        try {
            // Obtener proyectos del manager desde tu API
            const response = await fetch(`/projects?managerId=${managerId}`);
            const projects = response.ok ? await response.json() : [];

            // Filtrar por fecha si es necesario
            const filteredProjects = projects.filter(project => {
                if (!dateRange.startDate || !dateRange.endDate) return true;
                const projectStart = new Date(project.startDate);
                return projectStart >= dateRange.startDate && projectStart <= dateRange.endDate;
            });

            const activeProjects = filteredProjects.filter(p => p.state === 'Activo').length;
            const completedProjects = filteredProjects.filter(p => p.state === 'Completado').length;
            const plannedProjects = filteredProjects.filter(p => p.state === 'Planificado').length;

            return {
                totalProjects: filteredProjects.length,
                activeProjects,
                completedProjects,
                projectIds: filteredProjects.map(p => p.id),
                projectsByStatus: {
                    'Activo': activeProjects,
                    'Completado': completedProjects,
                    'Planificado': plannedProjects
                }
            };
        } catch (error) {
            console.error('Error fetching projects:', error);
            return {
                totalProjects: 0,
                activeProjects: 0,
                completedProjects: 0,
                projectIds: [],
                projectsByStatus: {}
            };
        }
    }

    async getPersonnelForProjects(projectIds, dateRange) {
        try {
            let allPersonnel = [];

            // Obtener personal para cada proyecto
            for (const projectId of projectIds) {
                try {
                    const response = await fetch(`/personnel?projectId=${projectId}`);
                    const projectPersonnel = response.ok ? await response.json() : [];
                    allPersonnel = allPersonnel.concat(projectPersonnel);
                } catch (error) {
                    console.error(`Error fetching personnel for project ${projectId}:`, error);
                }
            }

            const activePersonnel = allPersonnel.filter(p => p.status === 'ACTIVE').length;

            // Agrupar por tipo
            const personnelByType = {};
            allPersonnel.forEach(person => {
                const type = person.personnelType || 'Sin Definir';
                personnelByType[type] = (personnelByType[type] || 0) + 1;
            });

            return {
                totalPersonnel: allPersonnel.length,
                activePersonnel,
                personnelByType
            };
        } catch (error) {
            console.error('Error fetching personnel:', error);
            return {
                totalPersonnel: 0,
                activePersonnel: 0,
                personnelByType: {}
            };
        }
    }

    // 🔥 SISTEMA DE ALERTAS AVANZADO
    async getAlerts(managerId) {
        try {
            const stats = await this.getManagerStats(managerId);
            const alerts = [];

            // Critical incidents alert
            if (stats.criticalIncidents > 0) {
                alerts.push({
                    type: 'CRITICAL',
                    title: 'Incidentes Críticos',
                    message: `Hay ${stats.criticalIncidents} incidente(s) crítico(s) que requieren atención inmediata`,
                    count: stats.criticalIncidents,
                    priority: 'HIGH',
                    icon: 'pi-exclamation-triangle',
                    color: '#ef4444'
                });
            }

            // Budget limit alert
            if (stats.budgetLimit && stats.totalMaterialCost > stats.budgetLimit * 0.9) {
                const percentage = Math.round((stats.totalMaterialCost / stats.budgetLimit) * 100);
                alerts.push({
                    type: 'BUDGET',
                    title: 'Límite de Presupuesto',
                    message: `Presupuesto al ${percentage}% del límite establecido`,
                    percentage,
                    priority: percentage > 100 ? 'HIGH' : 'MEDIUM',
                    icon: 'pi-dollar',
                    color: percentage > 100 ? '#ef4444' : '#f59e0b'
                });
            }

            // Success alerts (cuando todo va bien)
            if (stats.criticalIncidents === 0 && stats.totalIncidents < 3) {
                alerts.push({
                    type: 'SUCCESS',
                    title: 'Excelente Seguridad',
                    message: 'Muy pocos incidentes este período. ¡Buen trabajo!',
                    priority: 'LOW',
                    icon: 'pi-shield',
                    color: '#22c55e'
                });
            }

            return alerts.sort((a, b) => {
                const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            });

        } catch (error) {
            console.error('Error getting alerts:', error);
            return [];
        }
    }

    // 📈 COMPARACIONES ENTRE PERÍODOS
    async getPerformanceComparison(managerId, currentPeriod = 'CURRENT_MONTH', previousPeriod = 'LAST_30_DAYS') {
        try {
            const [currentStats, previousStats] = await Promise.all([
                this.getManagerStats(managerId, { period: currentPeriod }),
                this.getManagerStats(managerId, { period: previousPeriod })
            ]);

            const comparison = {
                projects: {
                    label: 'Proyectos',
                    current: currentStats.totalProjects,
                    previous: previousStats.totalProjects,
                    change: currentStats.totalProjects - previousStats.totalProjects,
                    percentChange: this.calculatePercentChange(previousStats.totalProjects, currentStats.totalProjects),
                    trend: this.getTrend(previousStats.totalProjects, currentStats.totalProjects),
                    icon: 'pi-briefcase',
                    color: this.getComparisonColor(previousStats.totalProjects, currentStats.totalProjects, 'positive')
                },
                personnel: {
                    label: 'Personal Activo',
                    current: currentStats.activePersonnel,
                    previous: previousStats.activePersonnel,
                    change: currentStats.activePersonnel - previousStats.activePersonnel,
                    percentChange: this.calculatePercentChange(previousStats.activePersonnel, currentStats.activePersonnel),
                    trend: this.getTrend(previousStats.activePersonnel, currentStats.activePersonnel),
                    icon: 'pi-users',
                    color: this.getComparisonColor(previousStats.activePersonnel, currentStats.activePersonnel, 'positive')
                }
            };

            return comparison;
        } catch (error) {
            console.error('Error getting performance comparison:', error);
            return null;
        }
    }

    calculatePercentChange(oldValue, newValue) {
        if (oldValue === 0) {
            return newValue > 0 ? 100 : 0;
        }
        return Math.round(((newValue - oldValue) / oldValue) * 100);
    }

    getTrend(oldValue, newValue) {
        if (newValue > oldValue) return 'up';
        if (newValue < oldValue) return 'down';
        return 'stable';
    }

    getComparisonColor(oldValue, newValue, direction) {
        const isIncrease = newValue > oldValue;

        if (direction === 'positive') {
            return isIncrease ? '#22c55e' : '#ef4444';
        } else {
            return isIncrease ? '#ef4444' : '#22c55e';
        }
    }

    // Basic CRUD
    async getAll(params = {}) {
        try {
            const response = await super.getAll(params);
            return Stats.fromJsonArray(response.data || []);
        } catch (error) {
            console.error('Error fetching stats:', error);
            return [];
        }
    }

    async getById(id) {
        try {
            const response = await super.getById(id);
            return Stats.fromAPI(response.data);
        } catch (error) {
            console.error(`Error fetching stats ${id}:`, error);
            throw error;
        }
    }

    async create(statsData) {
        try {
            let stats = statsData instanceof Stats ? statsData : new Stats(statsData);

            const validation = stats.validate();
            if (!validation.isValid) {
                throw new Error(`Invalid data: ${validation.errors.join(', ')}`);
            }

            const cleanData = stats.toCreateJson();
            const response = await super.create(cleanData);

            return Stats.fromAPI(response.data);
        } catch (error) {
            console.error('❌ ERROR creando stats:', error.message);
            throw error;
        }
    }

    async update(id, statsData) {
        try {
            // Si statsData es un objeto Stats, usar toJSON, sino usar directo
            const updateData = statsData instanceof Stats ? statsData.toJSON() : statsData;

            // Asegurar que tenga updatedAt
            updateData.updatedAt = new Date().toISOString();

            const response = await super.update(id, updateData);
            return response;
        } catch (error) {
            console.error(`Error updating stats ${id}:`, error.message);
            throw error;
        }
    }

    async delete(id) {
        try {
            await super.delete(id);
            return true;
        } catch (error) {
            console.error(`Error deleting stats ${id}:`, error);
            throw error;
        }
    }

    // Goals management
    async updateGoals(managerId, goals) {
        try {
            let stats = await this.getManagerStats(managerId).catch(() => null);

            if (!stats) {
                stats = new Stats({
                    managerId,
                    statsType: 'GENERAL',
                    period: 'CURRENT_MONTH'
                });
            }

            // Update goals
            stats.targetProjects = goals.targetProjects || stats.targetProjects;
            stats.targetPersonnel = goals.targetPersonnel || stats.targetPersonnel;
            stats.maxIncidents = goals.maxIncidents || stats.maxIncidents;
            stats.budgetLimit = goals.budgetLimit || stats.budgetLimit;
            stats.targetEfficiency = goals.targetEfficiency || stats.targetEfficiency;

            if (stats.id) {
                return await this.update(stats.id, stats);
            } else {
                return await this.create(stats);
            }
        } catch (error) {
            console.error('Error updating goals:', error);
            throw error;
        }
    }

    // Export methods
    async exportToExcel(statsData, fileName = 'estadisticas') {
        try {
            const exportData = Array.isArray(statsData)
                ? statsData.map(stats => stats.getExportData())
                : [statsData.getExportData()];

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportData);
            XLSX.utils.book_append_sheet(wb, ws, 'Estadísticas');

            const finalFileName = `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, finalFileName);

            return true;
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            throw error;
        }
    }

    // Utility methods
    getDateRangeForPeriod(period, customStartDate = null, customEndDate = null) {
        const today = new Date();
        let startDate, endDate;

        switch (period) {
            case 'CURRENT_MONTH':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            case 'CURRENT_QUARTER':
                const quarter = Math.floor(today.getMonth() / 3);
                startDate = new Date(today.getFullYear(), quarter * 3, 1);
                endDate = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
                break;
            case 'CURRENT_YEAR':
                startDate = new Date(today.getFullYear(), 0, 1);
                endDate = new Date(today.getFullYear(), 11, 31);
                break;
            case 'CUSTOM':
                startDate = customStartDate ? new Date(customStartDate) : new Date(today.getFullYear(), 0, 1);
                endDate = customEndDate ? new Date(customEndDate) : new Date(today);
                break;
            default:
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        }

        return { startDate, endDate };
    }

    async getCurrentManagerId() {
        try {
            const userData = JSON.parse(sessionStorage.getItem('user') || '{}');

            if (userData?.id && userData?.role === 'manager') {
                return userData.id;
            }

            throw new Error('No se encontró usuario manager autenticado');
        } catch (error) {
            console.error('Error getting managerId:', error);
            throw error;
        }
    }
}

export const statsService = new StatsApiService();
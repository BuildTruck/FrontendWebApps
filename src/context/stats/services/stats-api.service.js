import http from "../../../core/services/http.service.js";
import { ManagerStats} from "../model/stats.entity.js";

/**
 * Stats API Service - VERSIÓN CORREGIDA
 * Servicio para interactuar con el endpoint de estadísticas del backend
 */
export class StatsApiService {
    constructor() {
        this.baseEndpoint = '/stats';
    }

    /**
     * Obtiene las estadísticas actuales del manager
     * @param {number} managerId - ID del manager
     * @returns {Promise<ManagerStats>}
     */
    async getCurrentManagerStats(managerId) {
        try {
            console.log('📊 Obteniendo stats actuales para manager:', managerId);

            const response = await http.get(`${this.baseEndpoint}/manager/${managerId}/current`);

            if (response.data) {
                console.log('✅ Stats actuales obtenidas:', response.data);
                return ManagerStats.fromAPI(response.data);
            }

            throw new Error('No se encontraron estadísticas actuales');
        } catch (error) {
            console.error('❌ Error obteniendo stats actuales:', error);

            if (error.response?.status === 404) {
                // No hay stats - devolver stats vacías para el manager
                return this.createEmptyStats(managerId);
            }

            throw this.handleError(error, 'Error al obtener estadísticas actuales');
        }
    }

    /**
     * Obtiene estadísticas para un período específico
     * @param {number} managerId - ID del manager
     * @param {Object} params - Parámetros del período
     * @returns {Promise<ManagerStats>}
     */
    async getManagerStats(managerId, params = {}) {
        try {
            console.log('📊 Obteniendo stats para manager:', managerId, 'con parámetros:', params);

            const queryParams = new URLSearchParams();

            if (params.startDate) {
                queryParams.append('startDate', params.startDate);
            }
            if (params.endDate) {
                queryParams.append('endDate', params.endDate);
            }
            if (params.periodType) {
                queryParams.append('periodType', params.periodType);
            }

            const url = `${this.baseEndpoint}/manager/${managerId}?${queryParams.toString()}`;
            const response = await http.get(url);

            if (response.data) {
                console.log('✅ Stats obtenidas:', response.data);
                return ManagerStats.fromAPI(response.data);
            }

            throw new Error('No se encontraron estadísticas para el período especificado');
        } catch (error) {
            console.error('❌ Error obteniendo stats:', error);

            if (error.response?.status === 404) {
                return this.createEmptyStats(managerId);
            }

            throw this.handleError(error, 'Error al obtener estadísticas');
        }
    }

    /**
     * Calcula/recalcula las estadísticas de un manager
     * @param {number} managerId - ID del manager
     * @param {Object} request - Parámetros de cálculo
     * @returns {Promise<ManagerStats>}
     */
    async calculateManagerStats(managerId, request = {}) {
        try {
            console.log('🔄 Calculando stats para manager:', managerId, 'con request:', request);

            const payload = {
                startDate: request.startDate || null,
                endDate: request.endDate || null,
                forceRecalculation: request.forceRecalculation || false,
                saveHistory: request.saveHistory !== false, // default true
                notes: request.notes || null
            };

            const response = await http.post(`${this.baseEndpoint}/manager/${managerId}/calculate`, payload);

            if (response.data) {
                console.log('✅ Stats calculadas:', response.data);
                return ManagerStats.fromAPI(response.data);
            }

            throw new Error('Error en el cálculo de estadísticas');
        } catch (error) {
            console.error('❌ Error calculando stats:', error);
            throw this.handleError(error, 'Error al calcular estadísticas');
        }
    }

    /**
     * Obtiene el historial de estadísticas
     * @param {number} managerId - ID del manager
     * @param {Object} params - Parámetros de filtro
     * @returns {Promise<Array>}
     */
    async getManagerStatsHistory(managerId, params = {}) {
        try {
            console.log('📈 Obteniendo historial para manager:', managerId, 'con parámetros:', params);

            const queryParams = new URLSearchParams();

            if (params.startDate) queryParams.append('startDate', params.startDate);
            if (params.endDate) queryParams.append('endDate', params.endDate);
            if (params.periodType) queryParams.append('periodType', params.periodType);
            if (params.limit) queryParams.append('limit', params.limit.toString());
            if (params.includeManual !== undefined) queryParams.append('includeManual', params.includeManual.toString());

            const url = `${this.baseEndpoint}/manager/${managerId}/history?${queryParams.toString()}`;
            const response = await http.get(url);

            if (response.data) {
                console.log('✅ Historial obtenido:', response.data.length, 'entradas');
                return response.data; // Ya viene como array del backend
            }

            return [];
        } catch (error) {
            console.error('❌ Error obteniendo historial:', error);

            if (error.response?.status === 404) {
                return [];
            }

            throw this.handleError(error, 'Error al obtener historial de estadísticas');
        }
    }

    /**
     * Obtiene datos del dashboard del manager
     * @param {number} managerId - ID del manager
     * @returns {Promise<Object>}
     */
    async getManagerDashboard(managerId) {
        try {
            console.log('📊 Obteniendo dashboard para manager:', managerId);

            const response = await http.get(`${this.baseEndpoint}/manager/${managerId}/dashboard`);

            if (response.data) {
                console.log('✅ Dashboard obtenido:', response.data);
                return response.data;
            }

            throw new Error('No se pudo obtener el dashboard');
        } catch (error) {
            console.error('❌ Error obteniendo dashboard:', error);

            if (error.response?.status === 404) {
                return this.createEmptyDashboard(managerId);
            }

            throw this.handleError(error, 'Error al obtener dashboard');
        }
    }

    /**
     * MÉTODO CORREGIDO - Obtiene el ID del manager actual desde la sesión
     * @returns {number|null}
     */
    getCurrentManagerId() {
        try {
            // 🔧 MÉTODO 1: Obtener desde sessionStorage
            const userData = JSON.parse(sessionStorage.getItem('user') || '{}');

            console.log('👤 Datos de usuario en sessionStorage:', userData);

            // Verificar diferentes formatos posibles
            if (userData?.id && userData?.role === 'manager') {
                console.log('✅ Manager ID encontrado:', userData.id);
                return userData.id;
            }

            // 🔧 MÉTODO 2: Verificar si el role está en minúsculas o diferentes variantes
            if (userData?.id && (
                userData?.role?.toLowerCase() === 'manager' ||
                userData?.userRole?.toLowerCase() === 'manager' ||
                userData?.roleName?.toLowerCase() === 'manager'
            )) {
                console.log('✅ Manager ID encontrado (role variant):', userData.id);
                return userData.id;
            }

            // 🔧 MÉTODO 3: Verificar localStorage como fallback
            const localUserData = JSON.parse(localStorage.getItem('user') || '{}');
            if (localUserData?.id && localUserData?.role === 'manager') {
                console.log('✅ Manager ID encontrado en localStorage:', localUserData.id);
                return localUserData.id;
            }

            // 🔧 MÉTODO 4: Hardcoded para testing (REMOVER EN PRODUCCIÓN)
            console.warn('⚠️ MODO DEBUG: Usando manager ID hardcoded');
            return 1; // Cambiar por un ID real para testing

        } catch (error) {
            console.error('❌ Error obteniendo managerId:', error);

            // 🔧 FALLBACK: Manager ID hardcoded para desarrollo
            console.warn('⚠️ FALLBACK: Usando manager ID por defecto');
            return 1; // Cambiar por un ID real para testing
        }
    }

    /**
     * Crea estadísticas vacías para cuando no hay datos
     */
    createEmptyStats(managerId) {
        console.log('📊 Creando stats vacías para manager:', managerId);

        return new ManagerStats({
            id: null,
            managerId: managerId,
            period: {
                startDate: new Date(),
                endDate: new Date(),
                periodType: 'CURRENT_MONTH',
                displayName: 'Mes Actual',
                totalDays: 30,
                isCurrentPeriod: true
            },
            projectMetrics: {
                totalProjects: 0,
                activeProjects: 0,
                completedProjects: 0,
                plannedProjects: 0,
                overdueProjects: 0,
                projectsByStatus: {},
                completionRate: 0,
                activeRate: 0,
                hasOverdueProjects: false,
                statusSummary: 'Sin proyectos',
                dominantStatus: 'Sin datos'
            },
            personnelMetrics: {
                totalPersonnel: 0,
                activePersonnel: 0,
                inactivePersonnel: 0,
                personnelByType: {},
                totalSalaryAmount: 0,
                averageAttendanceRate: 0,
                activeRate: 0,
                inactiveRate: 0,
                averageSalary: 0,
                dominantPersonnelType: 'Sin datos',
                hasGoodAttendance: false,
                attendanceStatus: 'Sin datos',
                personnelSummary: 'Sin personal',
                efficiencyScore: 0
            },
            incidentMetrics: {
                totalIncidents: 0,
                criticalIncidents: 0,
                openIncidents: 0,
                resolvedIncidents: 0,
                incidentsBySeverity: {},
                incidentsByType: {},
                incidentsByStatus: {},
                averageResolutionTimeHours: 0,
                criticalRate: 0,
                resolutionRate: 0,
                openRate: 0,
                safetyStatus: 'Excelente',
                hasCriticalIncidents: false,
                needsAttention: false,
                mostCommonSeverity: 'Sin datos',
                mostCommonType: 'Sin datos',
                safetyScore: 100,
                incidentSummary: 'Sin incidentes'
            },
            materialMetrics: {
                totalMaterials: 0,
                materialsInStock: 0,
                materialsLowStock: 0,
                materialsOutOfStock: 0,
                totalMaterialCost: 0,
                totalUsageCost: 0,
                materialsByCategory: {},
                costsByCategory: {},
                averageUsageRate: 0,
                stockRate: 0,
                lowStockRate: 0,
                outOfStockRate: 0,
                costEfficiencyRate: 0,
                averageMaterialCost: 0,
                stockStatus: 'Sin datos',
                needsRestocking: false,
                mostUsedCategory: 'Sin datos',
                largestCategory: 'Sin datos',
                inventoryHealthScore: 100,
                materialSummary: 'Sin materiales',
                costSummary: 'Sin costos',
                stockAlerts: []
            },
            machineryMetrics: {
                totalMachinery: 0,
                activeMachinery: 0,
                inMaintenanceMachinery: 0,
                inactiveMachinery: 0,
                machineryByStatus: {},
                machineryByType: {},
                machineryByProject: {},
                overallAvailabilityRate: 0,
                averageMaintenanceTimeHours: 0,
                activeRate: 0,
                maintenanceRate: 0,
                inactiveRate: 0,
                operationalRate: 0,
                availabilityStatus: 'Sin datos',
                hasHighAvailability: false,
                needsMaintenance: false,
                mostCommonStatus: 'Sin datos',
                mostCommonType: 'Sin datos',
                projectWithMostMachinery: 'Sin datos',
                efficiencyScore: 0,
                machinerySummary: 'Sin maquinaria',
                maintenanceSummary: 'Sin datos',
                maintenanceAlerts: []
            },
            overallPerformanceScore: 0,
            performanceGrade: 'F',
            alerts: [],
            recommendations: ['Agregue proyectos para comenzar a ver estadísticas'],
            calculatedAt: new Date(),
            isCurrentPeriod: true,
            calculationSource: 'EMPTY_DATA',
            hasCriticalAlerts: false,
            overallStatus: 'Sin datos',
            scoreBreakdown: {
                'Proyectos': 0,
                'Personal': 0,
                'Seguridad': 100,
                'Materiales': 100,
                'Maquinaria': 0,
                'General': 0
            }
        });
    }

    /**
     * Crea dashboard vacío
     */
    createEmptyDashboard(managerId) {
        return {
            managerId: managerId,
            currentStats: this.createEmptyStats(managerId),
            recentHistory: [],
            performanceTrend: [],
            safetyTrend: [],
            lastUpdated: new Date(),
            hasCriticalAlerts: false,
            overallStatus: 'Sin datos'
        };
    }

    /**
     * Maneja errores de la API
     */
    handleError(error, defaultMessage = 'Error en la operación') {
        console.error('❌ Error en StatsApiService:', error);

        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;

            switch (status) {
                case 400:
                    throw new Error(data?.message || 'Parámetros inválidos');
                case 401:
                    throw new Error('No autorizado. Inicie sesión nuevamente');
                case 403:
                    throw new Error('Sin permisos para acceder a estas estadísticas');
                case 404:
                    throw new Error('Manager o estadísticas no encontradas');
                case 500:
                    throw new Error('Error interno del servidor');
                default:
                    throw new Error(data?.message || defaultMessage);
            }
        }

        if (error.request) {
            throw new Error('Error de conexión con el servidor');
        }

        throw new Error(error.message || defaultMessage);
    }

    /**
     * Obtiene los períodos disponibles
     */
    static getPeriodOptions() {
        return [
            { value: 'CURRENT_MONTH', label: 'Mes Actual' },
            { value: 'CURRENT_QUARTER', label: 'Trimestre Actual' },
            { value: 'CURRENT_YEAR', label: 'Año Actual' },
            { value: 'LAST_30_DAYS', label: 'Últimos 30 días' },
            { value: 'LAST_90_DAYS', label: 'Últimos 90 días' },
            { value: 'CUSTOM', label: 'Período Personalizado' }
        ];
    }

    /**
     * Formatea fecha para la API
     */
    static formatDateForAPI(date) {
        if (!date) return null;

        if (typeof date === 'string') {
            return date;
        }

        if (date instanceof Date) {
            return date.toISOString().split('T')[0];
        }

        return null;
    }

    /**
     * Valida parámetros de período
     */
    static validatePeriodParams(params) {
        const errors = [];

        if (params.periodType === 'CUSTOM') {
            if (!params.startDate) {
                errors.push('Fecha de inicio requerida para período personalizado');
            }
            if (!params.endDate) {
                errors.push('Fecha de fin requerida para período personalizado');
            }
            if (params.startDate && params.endDate && new Date(params.startDate) > new Date(params.endDate)) {
                errors.push('La fecha de inicio no puede ser posterior a la fecha de fin');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Genera parámetros de período automáticamente
     */
    static generatePeriodParams(periodType) {
        const now = new Date();

        switch (periodType) {
            case 'CURRENT_MONTH':
                return {
                    periodType: 'CURRENT_MONTH',
                    startDate: new Date(now.getFullYear(), now.getMonth(), 1),
                    endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0)
                };

            case 'CURRENT_QUARTER':
                const quarter = Math.floor(now.getMonth() / 3);
                return {
                    periodType: 'CURRENT_QUARTER',
                    startDate: new Date(now.getFullYear(), quarter * 3, 1),
                    endDate: new Date(now.getFullYear(), (quarter + 1) * 3, 0)
                };

            case 'CURRENT_YEAR':
                return {
                    periodType: 'CURRENT_YEAR',
                    startDate: new Date(now.getFullYear(), 0, 1),
                    endDate: new Date(now.getFullYear(), 11, 31)
                };

            case 'LAST_30_DAYS':
                return {
                    periodType: 'LAST_30_DAYS',
                    startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
                    endDate: now
                };

            case 'LAST_90_DAYS':
                return {
                    periodType: 'LAST_90_DAYS',
                    startDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
                    endDate: now
                };

            default:
                return {
                    periodType: 'CURRENT_MONTH',
                    startDate: new Date(now.getFullYear(), now.getMonth(), 1),
                    endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0)
                };
        }
    }
}

// Exportar instancia singleton
export const statsService = new StatsApiService();
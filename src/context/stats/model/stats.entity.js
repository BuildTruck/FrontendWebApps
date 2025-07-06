/**
 * ManagerStats Entity
 * Representa las estadísticas completas de un manager según el backend
 */
export class ManagerStats {
    constructor(data = {}) {
        // IDs principales
        this.id = data.id || null;
        this.managerId = data.managerId || null;

        // Período
        this.period = new StatsPeriod(data.period || {});

        // Métricas principales
        this.projectMetrics = new ProjectMetrics(data.projectMetrics || {});
        this.personnelMetrics = new PersonnelMetrics(data.personnelMetrics || {});
        this.incidentMetrics = new IncidentMetrics(data.incidentMetrics || {});
        this.materialMetrics = new MaterialMetrics(data.materialMetrics || {});
        this.machineryMetrics = new MachineryMetrics(data.machineryMetrics || {});

        // Performance y alertas
        this.overallPerformanceScore = data.overallPerformanceScore || 0;
        this.performanceGrade = data.performanceGrade || 'F';
        this.alerts = data.alerts || [];
        this.recommendations = data.recommendations || [];

        // Metadata
        this.calculatedAt = data.calculatedAt ? new Date(data.calculatedAt) : new Date();
        this.isCurrentPeriod = data.isCurrentPeriod || false;
        this.calculationSource = data.calculationSource || '';
        this.hasCriticalAlerts = data.hasCriticalAlerts || false;
        this.overallStatus = data.overallStatus || 'Sin datos';
        this.scoreBreakdown = data.scoreBreakdown || {};
    }

    /**
     * Crea una instancia desde la respuesta de la API
     */
    static fromAPI(apiData) {
        return new ManagerStats(apiData);
    }

    /**
     * Convierte array de API a array de entidades
     */
    static fromAPIArray(apiArray) {
        if (!Array.isArray(apiArray)) return [];
        return apiArray.map(item => ManagerStats.fromAPI(item));
    }

    /**
     * Obtiene el estado de rendimiento con color
     */
    getPerformanceStatus() {
        return {
            status: this.overallStatus,
            grade: this.performanceGrade,
            score: this.overallPerformanceScore,
            color: this.getPerformanceColor(),
            icon: this.getPerformanceIcon()
        };
    }

    /**
     * Color según el performance
     */
    getPerformanceColor() {
        if (this.overallPerformanceScore >= 90) return '#22c55e'; // Verde
        if (this.overallPerformanceScore >= 80) return '#3b82f6'; // Azul
        if (this.overallPerformanceScore >= 70) return '#f59e0b'; // Amarillo
        if (this.overallPerformanceScore >= 60) return '#f97316'; // Naranja
        return '#ef4444'; // Rojo
    }

    /**
     * Icono según el performance
     */
    getPerformanceIcon() {
        if (this.overallPerformanceScore >= 90) return 'pi-check-circle';
        if (this.overallPerformanceScore >= 70) return 'pi-exclamation-circle';
        return 'pi-times-circle';
    }

    /**
     * Verifica si tiene alertas críticas
     */
    hasCriticalAlertsCheck() {
        return this.alerts.some(alert =>
            alert.includes('🚨') ||
            alert.includes('crítico') ||
            alert.includes('Crítico')
        );
    }

    /**
     * Obtiene resumen para dashboard
     */
    getDashboardSummary() {
        return {
            performance: {
                score: this.overallPerformanceScore,
                grade: this.performanceGrade,
                status: this.overallStatus
            },
            projects: {
                total: this.projectMetrics.totalProjects,
                active: this.projectMetrics.activeProjects,
                completed: this.projectMetrics.completedProjects,
                completionRate: this.projectMetrics.completionRate
            },
            personnel: {
                total: this.personnelMetrics.totalPersonnel,
                active: this.personnelMetrics.activePersonnel,
                activeRate: this.personnelMetrics.activeRate,
                attendance: this.personnelMetrics.averageAttendanceRate
            },
            safety: {
                totalIncidents: this.incidentMetrics.totalIncidents,
                criticalIncidents: this.incidentMetrics.criticalIncidents,
                safetyScore: this.incidentMetrics.safetyScore,
                status: this.incidentMetrics.safetyStatus
            },
            materials: {
                totalCost: this.materialMetrics.totalMaterialCost,
                outOfStock: this.materialMetrics.materialsOutOfStock,
                healthScore: this.materialMetrics.inventoryHealthScore,
                needsRestocking: this.materialMetrics.needsRestocking
            },
            machinery: {
                total: this.machineryMetrics.totalMachinery,
                active: this.machineryMetrics.activeMachinery,
                availability: this.machineryMetrics.activeRate,
                efficiency: this.machineryMetrics.efficiencyScore
            }
        };
    }

    /**
     * Formatea fecha para mostrar
     */
    getFormattedCalculatedAt() {
        return this.calculatedAt.toLocaleDateString('es-PE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Valida la entidad
     */
    isValid() {
        return this.managerId > 0 && this.period && this.projectMetrics;
    }
}

/**
 * StatsPeriod Value Object
 */
export class StatsPeriod {
    constructor(data = {}) {
        this.startDate = data.startDate ? new Date(data.startDate) : null;
        this.endDate = data.endDate ? new Date(data.endDate) : null;
        this.periodType = data.periodType || 'CURRENT_MONTH';
        this.displayName = data.displayName || '';
        this.totalDays = data.totalDays || 0;
        this.isCurrentPeriod = data.isCurrentPeriod || false;
    }

    getFormattedPeriod() {
        if (this.displayName) return this.displayName;
        if (this.startDate && this.endDate) {
            return `${this.startDate.toLocaleDateString('es-PE')} - ${this.endDate.toLocaleDateString('es-PE')}`;
        }
        return this.periodType;
    }
}

/**
 * ProjectMetrics Value Object
 */
export class ProjectMetrics {
    constructor(data = {}) {
        this.totalProjects = data.totalProjects || 0;
        this.activeProjects = data.activeProjects || 0;
        this.completedProjects = data.completedProjects || 0;
        this.plannedProjects = data.plannedProjects || 0;
        this.overdueProjects = data.overdueProjects || 0;
        this.projectsByStatus = data.projectsByStatus || {};
        this.completionRate = data.completionRate || 0;
        this.activeRate = data.activeRate || 0;
        this.hasOverdueProjects = data.hasOverdueProjects || false;
        this.statusSummary = data.statusSummary || '';
        this.dominantStatus = data.dominantStatus || '';
    }

    getChartData() {
        return {
            labels: Object.keys(this.projectsByStatus),
            datasets: [{
                data: Object.values(this.projectsByStatus),
                backgroundColor: ['#FF5F01', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444']
            }]
        };
    }
}

/**
 * PersonnelMetrics Value Object
 */
export class PersonnelMetrics {
    constructor(data = {}) {
        this.totalPersonnel = data.totalPersonnel || 0;
        this.activePersonnel = data.activePersonnel || 0;
        this.inactivePersonnel = data.inactivePersonnel || 0;
        this.personnelByType = data.personnelByType || {};
        this.totalSalaryAmount = data.totalSalaryAmount || 0;
        this.averageAttendanceRate = data.averageAttendanceRate || 0;
        this.activeRate = data.activeRate || 0;
        this.inactiveRate = data.inactiveRate || 0;
        this.averageSalary = data.averageSalary || 0;
        this.dominantPersonnelType = data.dominantPersonnelType || '';
        this.hasGoodAttendance = data.hasGoodAttendance || false;
        this.attendanceStatus = data.attendanceStatus || '';
        this.personnelSummary = data.personnelSummary || '';
        this.efficiencyScore = data.efficiencyScore || 0;
    }

    getChartData() {
        return {
            labels: Object.keys(this.personnelByType),
            datasets: [{
                data: Object.values(this.personnelByType),
                backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']
            }]
        };
    }

    formatSalary() {
        return new Intl.NumberFormat('es-PE', {
            style: 'currency',
            currency: 'PEN'
        }).format(this.totalSalaryAmount);
    }
}

/**
 * IncidentMetrics Value Object
 */
export class IncidentMetrics {
    constructor(data = {}) {
        this.totalIncidents = data.totalIncidents || 0;
        this.criticalIncidents = data.criticalIncidents || 0;
        this.openIncidents = data.openIncidents || 0;
        this.resolvedIncidents = data.resolvedIncidents || 0;
        this.incidentsBySeverity = data.incidentsBySeverity || {};
        this.incidentsByType = data.incidentsByType || {};
        this.incidentsByStatus = data.incidentsByStatus || {};
        this.averageResolutionTimeHours = data.averageResolutionTimeHours || 0;
        this.criticalRate = data.criticalRate || 0;
        this.resolutionRate = data.resolutionRate || 0;
        this.openRate = data.openRate || 0;
        this.safetyStatus = data.safetyStatus || 'Sin datos';
        this.hasCriticalIncidents = data.hasCriticalIncidents || false;
        this.needsAttention = data.needsAttention || false;
        this.mostCommonSeverity = data.mostCommonSeverity || '';
        this.mostCommonType = data.mostCommonType || '';
        this.safetyScore = data.safetyScore || 0;
        this.incidentSummary = data.incidentSummary || '';
    }

    getChartData() {
        return {
            labels: Object.keys(this.incidentsBySeverity),
            datasets: [{
                data: Object.values(this.incidentsBySeverity),
                backgroundColor: ['#ef4444', '#f59e0b', '#22c55e']
            }]
        };
    }

    getSafetyIndicator() {
        return {
            score: this.safetyScore,
            status: this.safetyStatus,
            color: this.safetyScore >= 80 ? '#22c55e' : this.safetyScore >= 60 ? '#f59e0b' : '#ef4444',
            icon: this.safetyScore >= 80 ? 'pi-shield' : 'pi-exclamation-triangle'
        };
    }
}

/**
 * MaterialMetrics Value Object
 */
export class MaterialMetrics {
    constructor(data = {}) {
        this.totalMaterials = data.totalMaterials || 0;
        this.materialsInStock = data.materialsInStock || 0;
        this.materialsLowStock = data.materialsLowStock || 0;
        this.materialsOutOfStock = data.materialsOutOfStock || 0;
        this.totalMaterialCost = data.totalMaterialCost || 0;
        this.totalUsageCost = data.totalUsageCost || 0;
        this.materialsByCategory = data.materialsByCategory || {};
        this.costsByCategory = data.costsByCategory || {};
        this.averageUsageRate = data.averageUsageRate || 0;
        this.stockRate = data.stockRate || 0;
        this.lowStockRate = data.lowStockRate || 0;
        this.outOfStockRate = data.outOfStockRate || 0;
        this.costEfficiencyRate = data.costEfficiencyRate || 0;
        this.averageMaterialCost = data.averageMaterialCost || 0;
        this.stockStatus = data.stockStatus || 'Sin datos';
        this.needsRestocking = data.needsRestocking || false;
        this.mostUsedCategory = data.mostUsedCategory || '';
        this.largestCategory = data.largestCategory || '';
        this.inventoryHealthScore = data.inventoryHealthScore || 0;
        this.materialSummary = data.materialSummary || '';
        this.costSummary = data.costSummary || '';
        this.stockAlerts = data.stockAlerts || [];
    }

    getChartData() {
        return {
            labels: Object.keys(this.materialsByCategory),
            datasets: [{
                data: Object.values(this.materialsByCategory),
                backgroundColor: ['#FF5F01', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444']
            }]
        };
    }

    formatCost() {
        return new Intl.NumberFormat('es-PE', {
            style: 'currency',
            currency: 'PEN'
        }).format(this.totalMaterialCost);
    }
}

/**
 * MachineryMetrics Value Object
 */
export class MachineryMetrics {
    constructor(data = {}) {
        this.totalMachinery = data.totalMachinery || 0;
        this.activeMachinery = data.activeMachinery || 0;
        this.inMaintenanceMachinery = data.inMaintenanceMachinery || 0;
        this.inactiveMachinery = data.inactiveMachinery || 0;
        this.machineryByStatus = data.machineryByStatus || {};
        this.machineryByType = data.machineryByType || {};
        this.machineryByProject = data.machineryByProject || {};
        this.overallAvailabilityRate = data.overallAvailabilityRate || 0;
        this.averageMaintenanceTimeHours = data.averageMaintenanceTimeHours || 0;
        this.activeRate = data.activeRate || 0;
        this.maintenanceRate = data.maintenanceRate || 0;
        this.inactiveRate = data.inactiveRate || 0;
        this.operationalRate = data.operationalRate || 0;
        this.availabilityStatus = data.availabilityStatus || 'Sin datos';
        this.hasHighAvailability = data.hasHighAvailability || false;
        this.needsMaintenance = data.needsMaintenance || false;
        this.mostCommonStatus = data.mostCommonStatus || '';
        this.mostCommonType = data.mostCommonType || '';
        this.projectWithMostMachinery = data.projectWithMostMachinery || '';
        this.efficiencyScore = data.efficiencyScore || 0;
        this.machinerySummary = data.machinerySummary || '';
        this.maintenanceSummary = data.maintenanceSummary || '';
        this.maintenanceAlerts = data.maintenanceAlerts || [];
    }

    getChartData() {
        return {
            labels: Object.keys(this.machineryByStatus),
            datasets: [{
                data: Object.values(this.machineryByStatus),
                backgroundColor: ['#22c55e', '#f59e0b', '#ef4444']
            }]
        };
    }

    getAvailabilityIndicator() {
        return {
            rate: this.activeRate,
            status: this.availabilityStatus,
            color: this.activeRate >= 80 ? '#22c55e' : this.activeRate >= 60 ? '#f59e0b' : '#ef4444',
            icon: this.activeRate >= 80 ? 'pi-check-circle' : 'pi-exclamation-circle'
        };
    }
}
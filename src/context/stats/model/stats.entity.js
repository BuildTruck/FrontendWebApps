export class Stats {
    constructor(data = {}) {
        this.id = data.id || null;
        this.managerId = data.managerId || null;
        this.projectId = data.projectId || null;
        this.statsType = data.statsType || 'GENERAL'; // GENERAL, PROJECT, CUSTOM
        this.period = data.period || 'CURRENT_MONTH'; // CURRENT_MONTH, CURRENT_QUARTER, CURRENT_YEAR, CUSTOM
        this.startDate = data.startDate || null;
        this.endDate = data.endDate || null;

        // Calculated stats (read-only from API)
        this.totalProjects = data.totalProjects || 0;
        this.activeProjects = data.activeProjects || 0;
        this.completedProjects = data.completedProjects || 0;
        this.totalPersonnel = data.totalPersonnel || 0;
        this.activePersonnel = data.activePersonnel || 0;
        this.totalIncidents = data.totalIncidents || 0;
        this.criticalIncidents = data.criticalIncidents || 0;
        this.openIncidents = data.openIncidents || 0;
        this.totalMaterialCost = data.totalMaterialCost || 0;
        this.activeMachinery = data.activeMachinery || 0;
        this.totalMachinery = data.totalMachinery || 0;
        this.recentDocuments = data.recentDocuments || 0;

        // Editable KPIs/Goals
        this.targetProjects = data.targetProjects || null;
        this.targetPersonnel = data.targetPersonnel || null;
        this.maxIncidents = data.maxIncidents || null;
        this.budgetLimit = data.budgetLimit || null;
        this.targetEfficiency = data.targetEfficiency || null;

        // Breakdown data for charts
        this.projectsByStatus = data.projectsByStatus || {};
        this.incidentsBySeverity = data.incidentsBySeverity || {};
        this.incidentsByType = data.incidentsByType || {};
        this.personnelByType = data.personnelByType || {};
        this.materialsByCategory = data.materialsByCategory || {};
        this.machineryByStatus = data.machineryByStatus || {};
        this.costsOverTime = data.costsOverTime || [];
        this.incidentsOverTime = data.incidentsOverTime || [];

        // Audit fields
        this.createdAt = data.createdAt ? new Date(data.createdAt) : this.getCurrentPeruDate();
        this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : this.getCurrentPeruDate();
    }

    validate() {
        const errors = [];

        if (!this.managerId) {
            errors.push('Manager ID is required');
        }

        if (this.statsType === 'PROJECT' && !this.projectId) {
            errors.push('Project ID is required for project stats');
        }

        if (this.period === 'CUSTOM') {
            if (!this.startDate) {
                errors.push('Start date is required for custom period');
            }
            if (!this.endDate) {
                errors.push('End date is required for custom period');
            }
            if (this.startDate && this.endDate && new Date(this.startDate) > new Date(this.endDate)) {
                errors.push('Start date must be before end date');
            }
        }

        // Validate editable goals
        if (this.targetProjects && this.targetProjects < 0) {
            errors.push('Target projects must be positive');
        }

        if (this.budgetLimit && this.budgetLimit < 0) {
            errors.push('Budget limit must be positive');
        }

        if (this.targetEfficiency && (this.targetEfficiency < 0 || this.targetEfficiency > 100)) {
            errors.push('Target efficiency must be between 0 and 100');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    toJSON() {
        return {
            id: this.id,
            managerId: this.managerId,
            projectId: this.projectId,
            statsType: this.statsType,
            period: this.period,
            startDate: this.formatDateForAPI(this.startDate),
            endDate: this.formatDateForAPI(this.endDate),

            // Calculated stats
            totalProjects: this.totalProjects,
            activeProjects: this.activeProjects,
            completedProjects: this.completedProjects,
            totalPersonnel: this.totalPersonnel,
            activePersonnel: this.activePersonnel,
            totalIncidents: this.totalIncidents,
            criticalIncidents: this.criticalIncidents,
            openIncidents: this.openIncidents,
            totalMaterialCost: this.totalMaterialCost,
            activeMachinery: this.activeMachinery,
            totalMachinery: this.totalMachinery,
            recentDocuments: this.recentDocuments,

            // Editable goals
            targetProjects: this.targetProjects,
            targetPersonnel: this.targetPersonnel,
            maxIncidents: this.maxIncidents,
            budgetLimit: this.budgetLimit,
            targetEfficiency: this.targetEfficiency,

            // Breakdown data
            projectsByStatus: this.projectsByStatus,
            incidentsBySeverity: this.incidentsBySeverity,
            incidentsByType: this.incidentsByType,
            personnelByType: this.personnelByType,
            materialsByCategory: this.materialsByCategory,
            machineryByStatus: this.machineryByStatus,
            costsOverTime: this.costsOverTime,
            incidentsOverTime: this.incidentsOverTime,

            createdAt: this.createdAt,
            updatedAt: this.getCurrentPeruDate()
        };
    }

    toCreateJson() {
        const data = this.toJSON();
        const now = this.getCurrentPeruDate();
        data.createdAt = now;
        data.updatedAt = now;
        return data;
    }

    toUpdateJson() {
        const data = this.toJSON();
        data.updatedAt = this.getCurrentPeruDate();
        // Only send editable fields for updates
        return {
            id: data.id,
            targetProjects: data.targetProjects,
            targetPersonnel: data.targetPersonnel,
            maxIncidents: data.maxIncidents,
            budgetLimit: data.budgetLimit,
            targetEfficiency: data.targetEfficiency,
            updatedAt: data.updatedAt
        };
    }

    static fromAPI(apiData) {
        return new Stats({
            id: apiData.id,
            managerId: apiData.managerId || apiData.manager_id,
            projectId: apiData.projectId || apiData.project_id,
            statsType: apiData.statsType || apiData.stats_type || 'GENERAL',
            period: apiData.period || 'CURRENT_MONTH',
            startDate: Stats.parseAPIDate(apiData.startDate || apiData.start_date),
            endDate: Stats.parseAPIDate(apiData.endDate || apiData.end_date),

            // Calculated stats
            totalProjects: apiData.totalProjects || apiData.total_projects || 0,
            activeProjects: apiData.activeProjects || apiData.active_projects || 0,
            completedProjects: apiData.completedProjects || apiData.completed_projects || 0,
            totalPersonnel: apiData.totalPersonnel || apiData.total_personnel || 0,
            activePersonnel: apiData.activePersonnel || apiData.active_personnel || 0,
            totalIncidents: apiData.totalIncidents || apiData.total_incidents || 0,
            criticalIncidents: apiData.criticalIncidents || apiData.critical_incidents || 0,
            openIncidents: apiData.openIncidents || apiData.open_incidents || 0,
            totalMaterialCost: apiData.totalMaterialCost || apiData.total_material_cost || 0,
            activeMachinery: apiData.activeMachinery || apiData.active_machinery || 0,
            totalMachinery: apiData.totalMachinery || apiData.total_machinery || 0,
            recentDocuments: apiData.recentDocuments || apiData.recent_documents || 0,

            // Editable goals
            targetProjects: apiData.targetProjects || apiData.target_projects || null,
            targetPersonnel: apiData.targetPersonnel || apiData.target_personnel || null,
            maxIncidents: apiData.maxIncidents || apiData.max_incidents || null,
            budgetLimit: apiData.budgetLimit || apiData.budget_limit || null,
            targetEfficiency: apiData.targetEfficiency || apiData.target_efficiency || null,

            // Breakdown data
            projectsByStatus: apiData.projectsByStatus || apiData.projects_by_status || {},
            incidentsBySeverity: apiData.incidentsBySeverity || apiData.incidents_by_severity || {},
            incidentsByType: apiData.incidentsByType || apiData.incidents_by_type || {},
            personnelByType: apiData.personnelByType || apiData.personnel_by_type || {},
            materialsByCategory: apiData.materialsByCategory || apiData.materials_by_category || {},
            machineryByStatus: apiData.machineryByStatus || apiData.machinery_by_status || {},
            costsOverTime: apiData.costsOverTime || apiData.costs_over_time || [],
            incidentsOverTime: apiData.incidentsOverTime || apiData.incidents_over_time || [],

            createdAt: Stats.parseAPIDate(apiData.createdAt || apiData.created_at),
            updatedAt: Stats.parseAPIDate(apiData.updatedAt || apiData.updated_at)
        });
    }

    static fromJsonArray(jsonArray) {
        if (!Array.isArray(jsonArray)) {
            return [];
        }
        return jsonArray.map(item => Stats.fromAPI(item));
    }

    clone() {
        return new Stats({
            id: this.id,
            managerId: this.managerId,
            projectId: this.projectId,
            statsType: this.statsType,
            period: this.period,
            startDate: this.startDate,
            endDate: this.endDate,
            totalProjects: this.totalProjects,
            activeProjects: this.activeProjects,
            completedProjects: this.completedProjects,
            totalPersonnel: this.totalPersonnel,
            activePersonnel: this.activePersonnel,
            totalIncidents: this.totalIncidents,
            criticalIncidents: this.criticalIncidents,
            openIncidents: this.openIncidents,
            totalMaterialCost: this.totalMaterialCost,
            activeMachinery: this.activeMachinery,
            totalMachinery: this.totalMachinery,
            recentDocuments: this.recentDocuments,
            targetProjects: this.targetProjects,
            targetPersonnel: this.targetPersonnel,
            maxIncidents: this.maxIncidents,
            budgetLimit: this.budgetLimit,
            targetEfficiency: this.targetEfficiency,
            projectsByStatus: { ...this.projectsByStatus },
            incidentsBySeverity: { ...this.incidentsBySeverity },
            incidentsByType: { ...this.incidentsByType },
            personnelByType: { ...this.personnelByType },
            materialsByCategory: { ...this.materialsByCategory },
            machineryByStatus: { ...this.machineryByStatus },
            costsOverTime: [...this.costsOverTime],
            incidentsOverTime: [...this.incidentsOverTime],
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        });
    }

    // Date methods (same pattern as other entities)
    getCurrentPeruDate() {
        return new Date(new Date().toLocaleString("en-US", {timeZone: "America/Lima"}));
    }

    static getCurrentPeruDate() {
        return new Date(new Date().toLocaleString("en-US", {timeZone: "America/Lima"}));
    }

    static parseAPIDate(dateValue) {
        if (!dateValue) return null;

        try {
            const date = new Date(dateValue);
            return !isNaN(date.getTime()) ? date : null;
        } catch (error) {
            return null;
        }
    }

    formatDateForAPI(date) {
        if (!date) return null;

        try {
            if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                return date;
            }

            if (date instanceof Date) {
                return date.toISOString().split('T')[0];
            }

            const parsedDate = new Date(date);
            if (!isNaN(parsedDate.getTime())) {
                return parsedDate.toISOString().split('T')[0];
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    static formatPeruDate(date) {
        if (!date) return '';
        return new Date(date).toLocaleDateString('es-PE', {
            timeZone: 'America/Lima',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    static formatCurrency(amount) {
        if (!amount && amount !== 0) return '';
        return new Intl.NumberFormat('es-PE', {
            style: 'currency',
            currency: 'PEN'
        }).format(amount);
    }

    // Static constants
    static get STATS_TYPES() {
        return [
            { value: 'GENERAL', label: 'General Manager Stats' },
            { value: 'PROJECT', label: 'Single Project Stats' },
            { value: 'CUSTOM', label: 'Custom Stats' }
        ];
    }

    static get PERIODS() {
        return [
            { value: 'CURRENT_MONTH', label: 'Mes Actual' },
            { value: 'CURRENT_QUARTER', label: 'Trimestre Actual' },
            { value: 'CURRENT_YEAR', label: 'Año Actual' },
            { value: 'LAST_30_DAYS', label: 'Últimos 30 días' },
            { value: 'LAST_90_DAYS', label: 'Últimos 90 días' },
            { value: 'CUSTOM', label: 'Período Personalizado' }
        ];
    }

    // Utility methods
    getStatsTypeLabel() {
        const type = this.STATS_TYPES.find(t => t.value === this.statsType);
        return type ? type.label : this.statsType;
    }

    getPeriodLabel() {
        const period = this.PERIODS.find(p => p.value === this.period);
        return period ? period.label : this.period;
    }

    isGeneralStats() {
        return this.statsType === 'GENERAL';
    }

    isProjectStats() {
        return this.statsType === 'PROJECT';
    }

    isCustomPeriod() {
        return this.period === 'CUSTOM';
    }

    // Calculated getters
    getProjectsCompletionRate() {
        if (this.totalProjects === 0) return 0;
        return Math.round((this.completedProjects / this.totalProjects) * 100);
    }

    getPersonnelActiveRate() {
        if (this.totalPersonnel === 0) return 0;
        return Math.round((this.activePersonnel / this.totalPersonnel) * 100);
    }

    getMachineryAvailabilityRate() {
        if (this.totalMachinery === 0) return 0;
        return Math.round((this.activeMachinery / this.totalMachinery) * 100);
    }

    getIncidentRate() {
        if (this.totalPersonnel === 0) return 0;
        return Math.round((this.totalIncidents / this.totalPersonnel) * 100) / 100;
    }

    // Goal achievement methods
    isProjectTargetMet() {
        if (!this.targetProjects) return null;
        return this.activeProjects >= this.targetProjects;
    }

    isPersonnelTargetMet() {
        if (!this.targetPersonnel) return null;
        return this.activePersonnel >= this.targetPersonnel;
    }

    isBudgetWithinLimit() {
        if (!this.budgetLimit) return null;
        return this.totalMaterialCost <= this.budgetLimit;
    }

    isIncidentsBelowMax() {
        if (!this.maxIncidents) return null;
        return this.criticalIncidents <= this.maxIncidents;
    }

    getOverallPerformance() {
        const metrics = [
            this.isProjectTargetMet(),
            this.isPersonnelTargetMet(),
            this.isBudgetWithinLimit(),
            this.isIncidentsBelowMax()
        ].filter(metric => metric !== null);

        if (metrics.length === 0) return null;

        const successCount = metrics.filter(metric => metric === true).length;
        return Math.round((successCount / metrics.length) * 100);
    }

    // Export data helpers
    getExportData() {
        return {
            'Período': this.getPeriodLabel(),
            'Tipo de Estadística': this.getStatsTypeLabel(),
            'Total Proyectos': this.totalProjects,
            'Proyectos Activos': this.activeProjects,
            'Proyectos Completados': this.completedProjects,
            'Total Personal': this.totalPersonnel,
            'Personal Activo': this.activePersonnel,
            'Total Incidentes': this.totalIncidents,
            'Incidentes Críticos': this.criticalIncidents,
            'Incidentes Abiertos': this.openIncidents,
            'Costo Total Materiales': this.totalMaterialCost,
            'Maquinaria Activa': this.activeMachinery,
            'Total Maquinaria': this.totalMachinery,
            'Documentos Recientes': this.recentDocuments,
            'Meta Proyectos': this.targetProjects || 'No definido',
            'Meta Personal': this.targetPersonnel || 'No definido',
            'Límite Presupuesto': this.budgetLimit || 'No definido',
            'Máx. Incidentes': this.maxIncidents || 'No definido',
            'Meta Eficiencia (%)': this.targetEfficiency || 'No definido',
            'Tasa Completación (%)': this.getProjectsCompletionRate(),
            'Tasa Personal Activo (%)': this.getPersonnelActiveRate(),
            'Tasa Disponibilidad Maquinaria (%)': this.getMachineryAvailabilityRate(),
            'Rendimiento General (%)': this.getOverallPerformance() || 'No calculado',
            'Fecha Actualización': Stats.formatPeruDate(this.updatedAt)
        };
    }

    // Instance property getters
    get STATS_TYPES() {
        return Stats.STATS_TYPES;
    }

    get PERIODS() {
        return Stats.PERIODS;
    }
}
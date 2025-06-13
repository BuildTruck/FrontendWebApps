export class Incident {
    constructor(data = {}) {
        this.id = data.id ?? undefined;

        // Project assignment
        this.projectId = data.projectId !== undefined ? data.projectId : null;

        // Basic incident information
        this.title = data.title || '';
        this.description = data.description || '';
        this.incidentType = data.incidentType || '';
        this.severity = data.severity || 'MEDIO';
        this.status = data.status || 'REPORTADO';
        this.location = data.location || '';

        // Assignment information
        this.reportedBy = data.reportedBy || null;
        this.assignedTo = data.assignedTo || null;

        // Tracking information
        this.occurredAt = data.occurredAt ? new Date(data.occurredAt) : this.getCurrentPeruDate();
        this.resolvedAt = data.resolvedAt ? new Date(data.resolvedAt) : null;
        this.image = data.image || null;
        this.notes = data.notes || '';

        // Audit fields - Peru timezone
        this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : this.getCurrentPeruDate();
        this.registerDate = data.registerDate || this.formatDateForAPI(this.occurredAt);
    }

    validate() {
        const errors = [];

        if (!this.projectId) {
            errors.push('Project is required');
        }

        if (!this.title || this.title.trim().length < 3) {
            errors.push('Title must have at least 3 characters');
        }

        if (!this.description || this.description.trim().length < 10) {
            errors.push('Description must have at least 10 characters');
        }

        if (!this.incidentType || this.incidentType.trim() === '') {
            errors.push('Incident type is required');
        }

        if (!this.severity) {
            errors.push('Severity is required');
        }

        if (!this.status) {
            errors.push('Status is required');
        }

        if (!this.location || this.location.trim() === '') {
            errors.push('Location is required');
        }

        if (!this.occurredAt) {
            errors.push('Occurrence date is required');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    toJSON() {
        return {
            id: this.id,
            projectId: this.projectId,
            title: this.title ? this.title.trim() : '',
            description: this.description ? this.description.trim() : '',
            incidentType: this.incidentType ? this.incidentType.trim() : '',
            severity: this.severity,
            status: this.status,
            location: this.location ? this.location.trim() : '',
            reportedBy: this.reportedBy,
            assignedTo: this.assignedTo,
            occurredAt: this.occurredAt,
            resolvedAt: this.resolvedAt,
            image: this.image,
            notes: this.notes ? this.notes.trim() : '',
            registerDate: this.registerDate,
            updatedAt: this.getCurrentPeruDate()
        };
    }

    toCreateJson() {
        const data = this.toJSON();
        const now = this.getCurrentPeruDate();
        data.updatedAt = now;
        data.registerDate = this.formatDateForAPI(data.occurredAt);
        return data;
    }

    toUpdateJson() {
        const data = this.toJSON();
        data.updatedAt = this.getCurrentPeruDate();
        return data;
    }

    static fromAPI(apiData) {
        return new Incident({
            id: apiData.id,
            projectId: apiData.projectId || apiData.project_id,
            title: apiData.title || apiData.titulo || '',
            description: apiData.description || apiData.descripcion || '',
            incidentType: apiData.incidentType || apiData.incident_type || apiData.tipo_incidente || '',
            severity: apiData.severity || apiData.severidad || 'MEDIO',
            status: apiData.status || apiData.estado || 'REPORTADO',
            location: apiData.location || apiData.ubicacion || '',
            reportedBy: apiData.reportedBy || apiData.reported_by || apiData.reportado_por || null,
            assignedTo: apiData.assignedTo || apiData.assigned_to || apiData.asignado_a || null,
            occurredAt: Incident.parseAPIDate(apiData.occurredAt || apiData.occurred_at || apiData.fecha_ocurrencia),
            resolvedAt: Incident.parseAPIDate(apiData.resolvedAt || apiData.resolved_at || apiData.fecha_resolucion),
            image: apiData.image || apiData.imagen || null,
            notes: apiData.notes || apiData.notas || '',
            registerDate: Incident.parseAPIDate(apiData.registerDate || apiData.register_date || apiData.fechaRegistro),
            updatedAt: Incident.parseAPIDate(apiData.updatedAt || apiData.updated_at)
        });
    }

    static fromJsonArray(jsonArray) {
        if (!Array.isArray(jsonArray)) {
            return [];
        }
        return jsonArray.map(item => Incident.fromAPI(item));
    }

    static filterByProject(incidentsArray, projectId) {
        if (!projectId || !Array.isArray(incidentsArray)) {
            return [];
        }

        return incidentsArray.filter(incident => {
            const incidentProjectId = incident.projectId || incident.project_id;
            return incidentProjectId && incidentProjectId.toString() === projectId.toString();
        });
    }

    clone() {
        return new Incident({
            id: this.id,
            projectId: this.projectId,
            title: this.title,
            description: this.description,
            incidentType: this.incidentType,
            severity: this.severity,
            status: this.status,
            location: this.location,
            reportedBy: this.reportedBy,
            assignedTo: this.assignedTo,
            occurredAt: this.occurredAt,
            resolvedAt: this.resolvedAt,
            image: this.image,
            notes: this.notes,
            registerDate: this.registerDate,
            updatedAt: this.updatedAt
        });
    }

    // Date methods
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

    static formatPeruDateTime(date) {
        if (!date) return '';
        return new Date(date).toLocaleString('es-PE', {
            timeZone: 'America/Lima',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    belongsToProject(projectId) {
        if (!projectId || !this.projectId) return false;
        return this.projectId.toString() === projectId.toString();
    }

    // Static constants
    static get INCIDENT_TYPES() {
        return [
            { value: 'ACCIDENTE_LABORAL', label: 'Accidente Laboral' },
            { value: 'FALLA_EQUIPO', label: 'Falla de Equipo' },
            { value: 'SEGURIDAD', label: 'Problema de Seguridad' },
            { value: 'CALIDAD', label: 'Problema de Calidad' },
            { value: 'AMBIENTAL', label: 'Incidente Ambiental' },
            { value: 'ROBO_VANDALISMO', label: 'Robo/Vandalismo' },
            { value: 'CLIMA', label: 'Problema Climático' },
            { value: 'ESTRUCTURAL', label: 'Problema Estructural' },
            { value: 'MATERIALES', label: 'Problema de Materiales' },
            { value: 'OTROS', label: 'Otros' }
        ];
    }

    static get SEVERITIES() {
        return [
            { value: 'BAJO', label: 'Bajo', color: '#22c55e' },
            { value: 'MEDIO', label: 'Medio', color: '#f59e0b' },
            { value: 'ALTO', label: 'Alto', color: '#f97316' },
            { value: 'CRITICO', label: 'Crítico', color: '#ef4444' }
        ];
    }

    static get STATUSES() {
        return [
            { value: 'REPORTADO', label: 'Reportado', color: '#3b82f6' },
            { value: 'EN_PROGRESO', label: 'En Progreso', color: '#f59e0b' },
            { value: 'RESUELTO', label: 'Resuelto', color: '#22c55e' },
            { value: 'CERRADO', label: 'Cerrado', color: '#6b7280' }
        ];
    }

    // Utility methods
    getSeverityColor() {
        if (!this.severity) return '#6b7280';

        const severityInfo = Incident.SEVERITIES.find(s => s.value === this.severity);
        return severityInfo ? severityInfo.color : '#6b7280';
    }

    getSeverityLabel() {
        const severityInfo = Incident.SEVERITIES.find(s => s.value === this.severity);
        return severityInfo ? severityInfo.label : this.severity;
    }

    getStatusColor() {
        if (!this.status) return '#6b7280';

        const statusInfo = Incident.STATUSES.find(s => s.value === this.status);
        return statusInfo ? statusInfo.color : '#6b7280';
    }

    getStatusLabel() {
        const statusInfo = Incident.STATUSES.find(s => s.value === this.status);
        return statusInfo ? statusInfo.label : this.status;
    }

    getIncidentTypeLabel() {
        const typeInfo = Incident.INCIDENT_TYPES.find(t => t.value === this.incidentType);
        return typeInfo ? typeInfo.label : this.incidentType;
    }

    isOpen() {
        return this.status === 'REPORTADO' || this.status === 'EN_PROGRESO';
    }

    isClosed() {
        return this.status === 'RESUELTO' || this.status === 'CERRADO';
    }

    isResolved() {
        return this.status === 'RESUELTO';
    }

    isCritical() {
        return this.severity === 'CRITICO';
    }

    isHighPriority() {
        return this.severity === 'CRITICO' || this.severity === 'ALTO';
    }

    isAssigned() {
        return this.assignedTo !== null;
    }

    getDisplayTitle() {
        return this.title || 'Sin título';
    }

    getDisplayLocation() {
        return this.location || 'Sin ubicación';
    }

    getDaysOpen() {
        const startDate = this.occurredAt;
        const endDate = this.resolvedAt || new Date();
        const diffTime = Math.abs(endDate - startDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    markAsResolved() {
        this.status = 'RESUELTO';
        this.resolvedAt = this.getCurrentPeruDate();
    }

    markAsClosed() {
        this.status = 'CERRADO';
        if (!this.resolvedAt) {
            this.resolvedAt = this.getCurrentPeruDate();
        }
    }

    // Instance property getters
    get INCIDENT_TYPES() {
        return Incident.INCIDENT_TYPES;
    }

    get SEVERITIES() {
        return Incident.SEVERITIES;
    }

    get STATUSES() {
        return Incident.STATUSES;
    }
}
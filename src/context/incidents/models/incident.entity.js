export class Incident {
    constructor(data = {}) {
        this.id = data.id ?? undefined;
        this.projectId = data.projectId !== undefined ? data.projectId : null;

        // Basic info
        this.title = data.title || '';
        this.description = data.description || '';
        this.incidentType = data.incidentType || '';
        this.severity = data.severity || 'MEDIO';
        this.status = data.status || 'REPORTADO';
        this.location = data.location || '';
        this.notes = data.notes || '';

        // Assignment
        this.reportedBy = data.reportedBy || null;
        this.assignedTo = data.assignedTo || null;

        // Dates
        this.occurredAt = data.occurredAt ? new Date(data.occurredAt) : new Date();
        this.resolvedAt = data.resolvedAt ? new Date(data.resolvedAt) : null;

        // Image
        this.image = data.image || null; // URL de Cloudinary
        this.imageFile = data.imageFile || null; // File para subir
    }

    validate() {
        const errors = [];
        if (!this.projectId) errors.push('Project is required');
        if (!this.title || this.title.trim().length < 3) errors.push('Title must have at least 3 characters');
        if (!this.description || this.description.trim().length < 10) errors.push('Description must have at least 10 characters');
        if (!this.incidentType || this.incidentType.trim() === '') errors.push('Incident type is required');
        if (!this.location || this.location.trim() === '') errors.push('Location is required');
        if (!this.occurredAt) errors.push('Occurrence date is required');

        return { isValid: errors.length === 0, errors };
    }

    static fromAPI(apiData) {
        return new Incident({
            id: apiData.id,
            projectId: apiData.projectId,
            title: apiData.title || '',
            description: apiData.description || '',
            incidentType: apiData.incidentType || '',
            severity: Incident.mapSeverityFromAPI(apiData.severity),
            status: Incident.mapStatusFromAPI(apiData.status),
            location: apiData.location || '',
            reportedBy: apiData.reportedBy || null,
            assignedTo: apiData.assignedTo || null,
            occurredAt: apiData.occurredAt ? new Date(apiData.occurredAt) : null,
            resolvedAt: apiData.resolvedAt ? new Date(apiData.resolvedAt) : null,
            image: apiData.image || null,
            notes: apiData.notes || ''
        });
    }

    static fromJsonArray(jsonArray) {
        if (!Array.isArray(jsonArray)) return [];
        return jsonArray.map(item => Incident.fromAPI(item));
    }

    // Mapeo API -> Frontend
    static mapSeverityFromAPI(value) {
        const mapping = { 0: 'BAJO', 1: 'MEDIO', 2: 'ALTO' };
        return mapping[value] || 'MEDIO';
    }

    static mapStatusFromAPI(value) {
        const mapping = { 0: 'REPORTADO', 1: 'EN_PROGRESO', 2: 'RESUELTO' };
        return mapping[value] || 'REPORTADO';
    }

    // Constantes
    static get INCIDENT_TYPES() {
        return [
            { value: 'ACCIDENTE_LABORAL', label: 'Accidente Laboral' },
            { value: 'FALLA_EQUIPO', label: 'Falla de Equipo' },
            { value: 'SEGURIDAD', label: 'Problema de Seguridad' },
            { value: 'CALIDAD', label: 'Problema de Calidad' },
            { value: 'AMBIENTAL', label: 'Incidente Ambiental' },
            { value: 'OTROS', label: 'Otros' }
        ];
    }

    static get SEVERITIES() {
        return [
            { value: 'BAJO', label: 'Bajo' },
            { value: 'MEDIO', label: 'Medio' },
            { value: 'ALTO', label: 'Alto' }
        ];
    }

    static get STATUSES() {
        return [
            { value: 'REPORTADO', label: 'Reportado' },
            { value: 'EN_PROGRESO', label: 'En Progreso' },
            { value: 'RESUELTO', label: 'Resuelto' }
        ];
    }

    // Helpers
    getSeverityLabel() {
        const info = Incident.SEVERITIES.find(s => s.value === this.severity);
        return info ? info.label : this.severity;
    }

    getStatusLabel() {
        const info = Incident.STATUSES.find(s => s.value === this.status);
        return info ? info.label : this.status;
    }

    getIncidentTypeLabel() {
        const info = Incident.INCIDENT_TYPES.find(t => t.value === this.incidentType);
        return info ? info.label : this.incidentType;
    }

    isOpen() {
        return this.status === 'REPORTADO' || this.status === 'EN_PROGRESO';
    }

    isResolved() {
        return this.status === 'RESUELTO';
    }

    isAssigned() {
        return this.assignedTo !== null;
    }

    getDaysOpen() {
        const startDate = this.occurredAt;
        const endDate = this.resolvedAt || new Date();
        const diffTime = Math.abs(endDate - startDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Image helpers
    getImageUrl() {
        if (this.image && this.image.startsWith('http')) return this.image;
        if (this.imageFile instanceof File) return URL.createObjectURL(this.imageFile);
        return null;
    }

    setImageFile(file) {
        if (file instanceof File) this.imageFile = file;
    }
}
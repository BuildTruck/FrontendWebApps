export class MachineryEntity {
    constructor(data = {}) {
        this.id = data.id ?? undefined;

        // Project assignment
        this.projectId = data.projectId !== undefined ? data.projectId : null;

        // Basic machinery information
        this.name = data.name || '';
        this.licensePlate = data.licensePlate || '';
        this.machineryType = data.machineryType || '';
        this.status = data.status || 'ACTIVE';
        this.provider = data.provider || '';
        this.description = data.description || '';

        // Personnel assignment (RENTED_OPERATOR only)
        this.personnelId = data.personnelId || null;

        // Image (base64)
        this.image = data.image || null;

        // Audit fields - Peru timezone
        this.createdAt = data.createdAt ? new Date(data.createdAt) : this.getCurrentPeruDate();
        this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : this.getCurrentPeruDate();
        this.registerDate = data.registerDate || this.formatDateForAPI(this.createdAt);
    }

    validate() {
        const errors = [];

        if (!this.projectId) {
            errors.push('Project is required');
        }

        if (!this.name || this.name.trim().length < 2) {
            errors.push('Name must have at least 2 characters');
        }

        if (!this.licensePlate || this.licensePlate.trim().length === 0) {
            errors.push('License plate is required');
        }

        if (!this.machineryType || this.machineryType.trim() === '') {
            errors.push('Machinery type is required');
        }

        if (!this.status) {
            errors.push('Status is required');
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
            name: this.name ? this.name.trim() : '',
            licensePlate: this.licensePlate ? this.licensePlate.trim() : '',
            machineryType: this.machineryType ? this.machineryType.trim() : '',
            status: this.status,
            provider: this.provider ? this.provider.trim() : '',
            description: this.description ? this.description.trim() : '',
            personnelId: this.personnelId,
            image: this.image,
            registerDate: this.registerDate,
            createdAt: this.createdAt,
            updatedAt: this.getCurrentPeruDate()
        };
    }

    toCreateJson() {
        const data = this.toJSON();
        const now = this.getCurrentPeruDate();
        data.createdAt = now;
        data.updatedAt = now;
        data.registerDate = this.formatDateForAPI(now);
        return data;
    }

    toUpdateJson() {
        const data = this.toJSON();
        data.updatedAt = this.getCurrentPeruDate();
        return data;
    }

    static fromAPI(apiData) {
        return new MachineryEntity({
            id: apiData.id,
            projectId: apiData.projectId || apiData.project_id,
            name: apiData.name || '',
            licensePlate: apiData.licensePlate || apiData.license_plate || apiData.placa || '',
            machineryType: apiData.machineryType || apiData.machinery_type || apiData.tipo || '',
            status: apiData.status || apiData.estado || 'ACTIVE',
            provider: apiData.provider || apiData.proveedor || '',
            description: apiData.description || apiData.descripcion || '',
            personnelId: apiData.personnelId || apiData.personnel_id || apiData.operatorId || null,
            image: apiData.image || apiData.imagen || null,
            registerDate: MachineryEntity.parseAPIDate(apiData.registerDate || apiData.register_date || apiData.fechaRegistro),
            createdAt: MachineryEntity.parseAPIDate(apiData.createdAt || apiData.created_at),
            updatedAt: MachineryEntity.parseAPIDate(apiData.updatedAt || apiData.updated_at)
        });
    }

    static fromJsonArray(jsonArray) {
        if (!Array.isArray(jsonArray)) {
            return [];
        }
        return jsonArray.map(item => MachineryEntity.fromAPI(item));
    }

    static filterByProject(machineryArray, projectId) {
        if (!projectId || !Array.isArray(machineryArray)) {
            return [];
        }

        return machineryArray.filter(machinery => {
            const machineryProjectId = machinery.projectId || machinery.project_id;
            return machineryProjectId && machineryProjectId.toString() === projectId.toString();
        });
    }

    clone() {
        return new MachineryEntity({
            id: this.id,
            projectId: this.projectId,
            name: this.name,
            licensePlate: this.licensePlate,
            machineryType: this.machineryType,
            status: this.status,
            provider: this.provider,
            description: this.description,
            personnelId: this.personnelId,
            image: this.image,
            registerDate: this.registerDate,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        });
    }

    // Date methods (same as Personnel)
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

    belongsToProject(projectId) {
        if (!projectId || !this.projectId) return false;
        return this.projectId.toString() === projectId.toString();
    }

    // Static constants
    static get MACHINERY_TYPES() {
        return [
            { value: 'EXCAVATOR', label: 'Excavator' },
            { value: 'TRACTOR', label: 'Tractor' },
            { value: 'CRANE', label: 'Crane' },
            { value: 'BULLDOZER', label: 'Bulldozer' },
            { value: 'LOADER', label: 'Loader' },
            { value: 'DUMP_TRUCK', label: 'Dump Truck' },
            { value: 'COMPACTOR', label: 'Compactor' },
            { value: 'MIXER', label: 'Concrete Mixer' },
            { value: 'GENERATOR', label: 'Generator' },
            { value: 'PUMP', label: 'Water Pump' }
        ];
    }

    static get STATUSES() {
        return [
            { value: 'ACTIVE', label: 'Active', color: '#22c55e' },
            { value: 'INACTIVE', label: 'Inactive', color: '#6b7280' },
            { value: 'DAMAGED', label: 'Damaged', color: '#ef4444' },
            { value: 'MAINTENANCE', label: 'Maintenance', color: '#f97316' }
        ];
    }

    // Provider is a free text field, no predefined options

    // Utility methods
    getStatusColor() {
        if (!this.status) return '#6b7280';

        const statusInfo = this.STATUSES.find(s => s.value === this.status);
        return statusInfo ? statusInfo.color : '#6b7280';
    }

    getStatusLabel() {
        const statusInfo = this.STATUSES.find(s => s.value === this.status);
        return statusInfo ? statusInfo.label : this.status;
    }

    getMachineryTypeLabel() {
        const typeInfo = this.MACHINERY_TYPES.find(t => t.value === this.machineryType);
        return typeInfo ? typeInfo.label : this.machineryType;
    }

    // Provider is free text - no predefined options needed
    getProviderDisplay() {
        return this.provider || '';
    }

    isActive() {
        return this.status && this.status === 'ACTIVE';
    }

    isAvailable() {
        return this.status === 'ACTIVE' && !this.personnelId;
    }

    isAssigned() {
        return this.personnelId !== null;
    }

    getDisplayName() {
        return `${this.name} (${this.licensePlate})`.trim();
    }

    // Instance property getters
    get MACHINERY_TYPES() {
        return MachineryEntity.MACHINERY_TYPES;
    }

    get STATUSES() {
        return MachineryEntity.STATUSES;
    }


}
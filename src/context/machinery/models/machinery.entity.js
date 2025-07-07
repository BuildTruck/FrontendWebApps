export class MachineryEntity {
    constructor(data = {}) {
        this.id = data.id ?? undefined;
        this.projectId = data.projectId !== undefined ? data.projectId : null;
        this.name = data.name || '';
        this.licensePlate = data.licensePlate || '';
        this.machineryType = data.machineryType || '';
        this.status = data.status || 'ACTIVE';
        this.provider = data.provider || '';
        this.description = data.description || '';
        this.personnelId = data.personnelId || null;

        // ✅ MANEJAR tanto image como imageUrl
        this.image = data.image || data.imageUrl || null;

        // ✅ AGREGAR campos para manejo de imágenes en formularios
        this.imageFile = data.imageFile || null;
        this.removeImage = data.removeImage || false;

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

    static convertStatusFromBackend(statusNumber) {
        const statusMap = {
            0: 'ACTIVE',
            1: 'MAINTENANCE'
        };
        return statusMap[statusNumber] || 'ACTIVE';
    }

    static fromAPI(apiData) {
        return new MachineryEntity({
            id: apiData.id,
            projectId: apiData.projectId,
            name: apiData.name || '',
            licensePlate: apiData.licensePlate || '',
            machineryType: apiData.machineryType || '',
            status: this.convertStatusFromBackend(apiData.status), // Convertir número a string
            provider: apiData.provider || '',
            description: apiData.description || '',
            personnelId: apiData.personnelId || null,
            image: apiData.imageUrl || null, // Backend usa imageUrl
            registerDate: this.parseAPIDate(apiData.registerDate),
            createdAt: this.parseAPIDate(apiData.createdAt),
            updatedAt: this.parseAPIDate(apiData.updatedAt)
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
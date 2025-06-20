export class MaterialUsageEntity {
    constructor(data = {}) {
        this.id = data.id ?? null;
        this.projectId = data.projectId ?? null;
        this.materialId = data.materialId ?? null;

        this.date = this.validateDate(data.date) || '';
        this.quantity = this.validateQuantity(data.quantity) || 0;
        this.area = data.area || '';
        this.worker = data.worker || '';
        this.usageType = data.usageType || 'Normal'; // Ej: 'Normal', 'Urgente', 'Desperdicio'
        this.status = data.status || 'Pendiente';
        this.observations = data.observations || '';
    }

    // Valida que la fecha sea válida
    validateDate(date) {
        if (!date) return null;
        const d = new Date(date);
        if (isNaN(d.getTime())) return null;
        return d.toISOString().split('T')[0]; // Formatear a YYYY-MM-DD
    }

    // Valida que la cantidad sea un número no negativo
    validateQuantity(quantity) {
        if (typeof quantity !== 'number' || quantity < 0) return 0;
        return quantity;
    }

    toJSON() {
        return {
            id: this.id,
            projectId: this.projectId,
            materialId: this.materialId,
            date: this.date,
            quantity: this.quantity,
            area: this.area,
            worker: this.worker,
            usageType: this.usageType,
            status: this.status,
            observations: this.observations
        };
    }

    static get USAGE_TYPES() {
        return [
            { value: 'CONSTRUCCION', label: 'construccion' },
            { value: 'MANTENIMIENTO', label: 'mantenimiento' },
            { value: 'REPARACION', label: 'reparacion' },
            { value: 'INSTALACION', label: 'instalacion' },
            { value: 'ACABADOS', label: 'acabados' },
            { value: 'ESTRUCTURAL', label: 'estructural' },
            { value: 'SANITARIO', label: 'sanitario' },
            { value: 'ELECTRICO', label: 'electrico' },
            { value: 'HERRAMIENTAS', label: 'herramientas' },
            { value: 'LIMPIEZA', label: 'limpieza' }
        ];
    }

    static get STATUSES() {
        return [
            { value: 'PENDING', label: 'pending' },
            { value: 'APPROVED', label: 'approved' },
            { value: 'REJECTED', label: 'rejected' }
        ];
    }
}
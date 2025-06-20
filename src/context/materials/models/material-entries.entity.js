export class MaterialEntryEntity {
    constructor(data = {}) {
        this.id = data.id ?? null;
        this.projectId = data.projectId ?? null;
        this.materialId = data.materialId ?? null;

        this.date = this.validateDate(data.date) || '';
        this.quantity = this.validateQuantity(data.quantity) || 0;
        this.unit = data.unit || '';
        this.provider = data.provider || '';
        this.ruc = data.ruc || '';
        this.payment = data.payment || data.paymentType || '';
        this.comprobante = data.comprobante || '';
        this.comprobanteNumber = data.comprobanteNumber || '';
        this.unitCost = Number(data.unitCost || data.price) || 0;
        this.totalCost = Number(data.totalCost) || +(this.quantity * this.unitCost).toFixed(2);
        this.status = data.status || 'Pendiente';
        this.observations = data.observations || '';
    }

    validateDate(date) {
        if (!date) return null;
        const d = new Date(date);
        if (isNaN(d.getTime())) return null;
        return d.toISOString().split('T')[0];
    }

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
            unit: this.unit,
            provider: this.provider,
            ruc: this.ruc,
            comprobante: this.comprobante,
            comprobanteNumber: this.comprobanteNumber,
            payment: this.payment,
            unitCost: this.unitCost,
            totalCost: this.totalCost,
            status: this.status,
            observations: this.observations
        };
    }

    static get PAYMENT_METHODS() {
        return [
            { value: 'CASH', label: 'cash' },
            { value: 'CREDIT', label: 'credit' },
            { value: 'TRANSFER', label: 'transfer' },
            { value: 'CHECK', label: 'check' }
        ];
    }

    static get COMPROBANTE_TYPES() {
        return [
            { value: 'INVOICE', label: 'invoice' },
            { value: 'RECEIPT', label: 'receipt' },
            { value: 'GUIDE', label: 'guide' },
            { value: 'ORDER_NOTE', label: 'orderNote' }
        ];
    }

    static get STATUSES() {
        return [
            { value: 'PENDING', label: 'pending' },
            { value: 'RECEIVED', label: 'received' },
            { value: 'REJECTED', label: 'rejected' }
        ];
    }
}
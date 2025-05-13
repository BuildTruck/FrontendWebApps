// src/context/materials/models/materials.entity.js

export class MaterialEntity {
    constructor(data = {}) {
        this.id = data.id ?? undefined
        // Mejorar cómo se asigna projectId para evitar valores null no deseados
        this.projectId = data.projectId !== undefined ? data.projectId : null

        this.name = data.name || ''
        this.type = data.type || ''
        this.unit = data.unit || ''
        this.quantity = data.quantity || 0
        this.stock = data.stock || 0
        this.price = data.price || 0
        this.total = this.calculateTotal()
        this.provider = data.provider || ''
        this.ruc = data.ruc || ''
        this.date = data.date || ''
        this.status = data.status || 'Pendiente'
        this.payment = data.payment || ''
        this.comprobante = data.comprobante || ''
        this.comprobanteNumber = data.comprobanteNumber || ''
        this.description = data.description || ''
    }

    calculateTotal() {
        const quantity = parseFloat(this.quantity) || 0
        const price = parseFloat(this.price) || 0
        return +(quantity * price).toFixed(2)
    }
}

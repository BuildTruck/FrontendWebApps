export class MaterialEntryEntity {
    constructor(data = {}) {
        this.id = data.id || null
        this.projectId = data.projectId || null
        this.materialId = data.materialId || null
        this.date = data.date || ''
        this.quantity = Number(data.quantity) || 0
        this.unit = data.unit || ''
        this.provider = data.provider || ''

        // Alineamos nombres con lo que viene del formulario
        this.comprobante = data.comprobante || ''             // Factura / Boleta / Guía
        this.comprobanteNumber = data.comprobanteNumber || '' // Ej: F001-00123
        this.ruc = data.ruc || ''
        this.payment = data.payment || ''
        this.status = data.status || 'Normal'

        this.unitCost = Number(data.price) || Number(data.unitCost) || 0
        this.totalCost = Number(data.totalCost) || this.quantity * this.unitCost

        this.observations = data.description || data.observations || ''
    }
}

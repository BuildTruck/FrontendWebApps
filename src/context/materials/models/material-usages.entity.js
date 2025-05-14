export class MaterialUsageEntity {
    constructor(data = {}) {
        this.id = data.id || null
        this.projectId = data.projectId || null
        this.materialId = data.materialId || null
        this.date = data.date || ''
        this.quantity = Number(data.quantity) || 0
        this.area = data.area || ''
        this.worker = data.worker || '' // obrero responsable
        this.usageType = data.usageType || 'Normal' // Normal / Urgente / Desperdicio
        this.status = data.status || 'Normal'
        this.observations = data.description || data.observations || ''
    }
}

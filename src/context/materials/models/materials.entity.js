// src/context/materials/models/materials.entity.js

export class MaterialEntity {
    constructor(data = {}) {
        this.id = data.id ?? undefined

        // Asignación segura de projectId
        this.projectId = data.projectId !== undefined ? data.projectId : null

        // Información base del material
        this.name = data.name || ''
        this.type = data.type || ''
        this.unit = data.unit || ''
        this.stock = Number(data.stock) || 0               // Stock inicial
        this.minimumStock = Number(data.minimumStock) || 0 // Stock mínimo
        this.provider = data.provider || ''                // Proveedor referencial

        // Datos que NO deben llenarse desde inventario, pero se conservan por compatibilidad
        this.price = Number(data.price) || 0               // Se recalcula desde ingresos
        this.total = Number(data.total) || 0               // Igual

        // Otros campos usados en ingresos (se pueden omitir si no se usan aquí)
        this.ruc = data.ruc || ''
        this.date = data.date || ''
        this.status = data.status || 'Pendiente'
        this.payment = data.payment || ''
        this.comprobante = data.comprobante || ''
        this.comprobanteNumber = data.comprobanteNumber || ''
        this.description = data.description || ''
    }

    // Se deja por compatibilidad, aunque ya no se usa directamente
    calculateTotal() {
        const price = parseFloat(this.price) || 0
        const quantity = parseFloat(this.stock) || 0
        return +(quantity * price).toFixed(2)
    }
}

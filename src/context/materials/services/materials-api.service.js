// src/context/materials/services/materials-api.service.js
import { BaseService } from '../../../core/services/base.service.js'
import { MaterialEntity } from '../models/materials.entity'
import { MaterialEntryEntity } from '../models/material-entries.entity'
import { MaterialUsageEntity } from '../models/material-usages.entity'
import http from '../../../core/services/http.service'
export class MaterialsApiService extends BaseService {
    constructor() {
        super('/materials')
        this.http = http
    }

    async getByProject(projectId) {
        const res = await this.getAll({projectId})
        return res?.data.map(m => new MaterialEntity(m)) || []
    }

    async createMaterial(data) {
        const entity = new MaterialEntity(data)
        entity.total = entity.calculateTotal()

        // Verificación adicional para asegurar que projectId se mantenga
        if (entity.projectId === null && data.projectId) {
            entity.projectId = data.projectId
        }

        console.log('Creando material con projectId:', entity.projectId)
        return this.create(entity)
    }

    async updateMaterial(id, data) {
        const entity = new MaterialEntity(data)
        entity.total = entity.calculateTotal()

        // Verificación adicional para asegurar que projectId se mantenga
        if (entity.projectId === null && data.projectId) {
            entity.projectId = data.projectId
        }

        console.log('Actualizando material con projectId:', entity.projectId)
        return this.update(id, entity)
    }

    // 📥 ENTRIES (Ingresos)
    async getEntriesByProject(projectId) {
        const res = await http.get('/material-entries', {params: {projectId}})
        return res.data.map(entry => new MaterialEntryEntity(entry))
    }

    async createEntry(data) {
        const entity = new MaterialEntryEntity(data)
        return http.post('/material-entries', entity)
    }
    async updateEntry(id, data) {
        return http.put(`/material-entries/${id}`, data)
    }

    // 📤 USAGES (Usos)
    async getUsagesByProject(projectId) {
        const res = await http.get('/material-usages', {params: {projectId}})
        return res.data.map(u => new MaterialUsageEntity(u))
    }

    async createUsage(data) {
        const entity = new MaterialUsageEntity(data)
        return http.post('/material-usages', entity)
    }
    async updateUsage(id, data) {
        const entity = new MaterialUsageEntity(data)
        return http.put(`/material-usages/${id}`, entity)
    }

    async getInventorySummary(projectId) {
        const [materials, entries, usages] = await Promise.all([
            this.getByProject(projectId),
            this.getEntriesByProject(projectId),
            this.getUsagesByProject(projectId)
        ])

        return materials.map(material => {
            const materialId = material.id

            // Filtrar ingresos y salidas por material
            const entriesForMaterial = entries.filter(e => e.materialId === materialId)
            const usagesForMaterial = usages.filter(u => u.materialId === materialId)

            const totalEntries = entriesForMaterial.reduce((sum, e) => sum + e.quantity, 0)
            const totalUsages = usagesForMaterial.reduce((sum, u) => sum + u.quantity, 0)
            const entriesTotalCost = entriesForMaterial.reduce((sum, e) => sum + (e.quantity * e.unitCost), 0)

            const stockInitial = 0 // Ya no se usa en el cálculo
            const stockActual = totalEntries - totalUsages

            const unitPrice = totalEntries > 0 ? entriesTotalCost / totalEntries : 0
            const total = +(unitPrice * stockActual).toFixed(2)

            return {
                ...material,
                stockInitial,
                totalEntries,
                totalUsages,
                stockActual,
                price: +unitPrice.toFixed(2),
                total: +(unitPrice * stockActual).toFixed(2)
            }
        })

    }

}

    export const materialsApiService = new MaterialsApiService()

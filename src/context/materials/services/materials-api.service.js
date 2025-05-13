// src/context/materials/services/materials-api.service.js
import { BaseService } from '../../../core/services/base.service.js'
import { MaterialEntity } from '../models/materials.entity'

export class MaterialsApiService extends BaseService {
    constructor() {
        super('/materials')
    }

    async getByProject(projectId) {
        const res = await this.getAll({ projectId })
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

}

export const materialsApiService = new MaterialsApiService()

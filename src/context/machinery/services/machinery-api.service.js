// src/context/materials/services/materials-api.service.js
import { BaseService } from '../../../core/services/base.service.js'
import {MachineryEntity} from "../models/machinery.entity.js";
import http from '../../../core/services/http.service'
export class MachineryApiService extends BaseService {
    constructor() {
        super('/machinery');
        this.http = http
    }

    async getByProject(projectId) {
        const res = await this.getAll({projectId})
        return res?.data.map(m => new MachineryEntity(m)) || []
    }

    async createMachinery(data) {
        const entity = new MachineryEntity(data)


        // Verificación adicional para asegurar que projectId se mantenga
        if (entity.projectId === null && data.projectId) {
            entity.projectId = data.projectId
        }

        console.log('Creando maquina con projectId:', entity.projectId)
        return this.create(entity)
    }

    async updateMachinery(id, data) {
        const entity = new MachineryEntity(data)


        // Verificación adicional para asegurar que projectId se mantenga
        if (entity.projectId === null && data.projectId) {
            entity.projectId = data.projectId
        }

        console.log('Actualizando maquinaria con projectId:', entity.projectId)
        return this.update(id, entity)
    }

    async getInventorySummary(projectId) {
        try {
            const machines = await this.getByProject(projectId);
            return machines || [];
        } catch (error) {
            console.error('Error fetching inventory summary:', error);
            return [];
        }
    }

}

export const machineryApiService = new MachineryApiService()

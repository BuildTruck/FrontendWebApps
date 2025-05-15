import { BaseService } from '../../../core/services/base.service.js'
import {PersonnelEntity} from "../models/personnel.entity.js";
import http from '../../../core/services/http.service'

export class PersonnelApiService extends BaseService {
    constructor() {
        super('/personnel')
        this.http = http
    }

    async getByProject(projectId) {
        const res = await this.getAll({projectId})
        return res?.data.map(m => new MaterialEntity(m)) || []
    }

    async createPersonnel(data) {
        const entity = new PersonnelEntity(data)

        // Verificación adicional para asegurar que projectId se mantenga
        if (entity.projectId === null && data.projectId) {
            entity.projectId = data.projectId
        }

        console.log('Registrando personal con projectId:', entity.projectId)
        return this.create(entity)
    }

    async updatePersonnel(id, data) {
        const entity = new PersonnelEntity(data)

        // Verificación adicional para asegurar que projectId se mantenga
        if (entity.projectId === null && data.projectId) {
            entity.projectId = data.projectId
        }

        console.log('Actualizando personal con projectId:', entity.projectId)
        return this.update(id, entity)
    }
}

export const personnelApiService = new PersonnelApiService()
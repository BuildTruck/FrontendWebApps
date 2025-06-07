// src/context/materials/services/material-usages-api.service.js
import { BaseService } from '../../../core/services/base.service.js';
import { MaterialUsageEntity } from '../models/material-usages.entity';

export class MaterialUsagesApiService extends BaseService {
    constructor() {
        super('/material-usages');
    }

    async getByProject(projectId) {
        const res = await this.getAll({ projectId });
        return res?.data.map(u => new MaterialUsageEntity(u)) || [];
    }

    async createUsage(data) {
        const entity = new MaterialUsageEntity(data);
        return this.create(entity);
    }

    async updateUsage(id, data) {
        const entity = new MaterialUsageEntity(data);
        return this.update(id, entity);
    }
}

export const materialUsagesApiService = new MaterialUsagesApiService();

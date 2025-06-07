import { BaseService } from '../../../core/services/base.service.js';
import { MaterialEntity } from '../models/materials.entity';
import { MaterialEntryEntity } from '../models/material-entries.entity';
import { MaterialUsageEntity } from '../models/material-usages.entity';

// 📁 Subservicios para entradas y usos
class MaterialEntriesService extends BaseService {
    constructor() {
        super('/material-entries');
    }

    async getAllFiltered(projectId) {
        const res = await this.getAll();
        return (res.data || [])
            .filter(e => e.projectId === projectId)
            .map(e => new MaterialEntryEntity(e));
    }

    async createEntry(data) {
        const entity = new MaterialEntryEntity(data);
        const res = await this.create(entity);
        return new MaterialEntryEntity(res.data);
    }

    async updateEntry(id, data) {
        const entity = new MaterialEntryEntity(data);
        const res = await this.update(id, entity);
        return new MaterialEntryEntity(res.data);
    }
}

class MaterialUsagesService extends BaseService {
    constructor() {
        super('/material-usages');
    }

    async getAllFiltered(projectId) {
        const res = await this.getAll();
        return (res.data || [])
            .filter(u => u.projectId === projectId)
            .map(u => new MaterialUsageEntity(u));
    }

    async createUsage(data) {
        const entity = new MaterialUsageEntity(data);
        const res = await this.create(entity);
        return new MaterialUsageEntity(res.data);
    }

    async updateUsage(id, data) {
        const entity = new MaterialUsageEntity(data);
        const res = await this.update(id, entity);
        return new MaterialUsageEntity(res.data);
    }
}

// 📦 Servicio principal de materiales
class MaterialsApiService extends BaseService {
    constructor() {
        super('/materials');
        this.entriesService = new MaterialEntriesService();
        this.usagesService = new MaterialUsagesService();
    }

    getCurrentProjectIdSync() {
        const route = window?.$router?.currentRoute?.value;
        if (route?.params?.projectId) return route.params.projectId;

        const match = window.location.pathname.match(/\/proyecto\/(\d+)|\/supervisor\/(\d+)/);
        if (match) return match[1] || match[2];

        const stored = localStorage.getItem('currentProjectId');
        if (stored) return stored;

        console.warn('No projectId found');
        return null;
    }

    async getByProject(projectId = null) {
        if (!projectId) projectId = this.getCurrentProjectIdSync();
        const res = await this.getAll();
        return (res.data || [])
            .filter(m => m.projectId === projectId)
            .map(m => new MaterialEntity(m));
    }

    async createMaterial(data) {
        const material = new MaterialEntity(data);
        if (!material.projectId) {
            material.projectId = this.getCurrentProjectIdSync();
        }
        const res = await this.create(material);
        return new MaterialEntity(res.data);
    }

    async updateMaterial(id, data) {
        const material = new MaterialEntity(data);
        const res = await this.update(id, material);
        return new MaterialEntity(res.data);
    }

    // 📥 ENTRADAS delegadas
    getEntriesByProject(projectId) {
        return this.entriesService.getAllFiltered(projectId);
    }

    createEntry(data) {
        return this.entriesService.createEntry(data);
    }

    updateEntry(id, data) {
        return this.entriesService.updateEntry(id, data);
    }

    // 📤 USOS delegadas
    getUsagesByProject(projectId) {
        return this.usagesService.getAllFiltered(projectId);
    }

    createUsage(data) {
        return this.usagesService.createUsage(data);
    }

    updateUsage(id, data) {
        return this.usagesService.updateUsage(id, data);
    }


    // 📊 INVENTARIO corregido
    async getInventorySummary(projectId = null) {
        if (!projectId) projectId = this.getCurrentProjectIdSync();

        const [materialsRes, entriesRes, usagesRes] = await Promise.all([
            this.getAll(),
            this.entriesService.getAll(),
            this.usagesService.getAll()
        ]);

        const materials = (materialsRes.data || []).filter(m => m.projectId === projectId).map(m => new MaterialEntity(m));
        const entries = (entriesRes.data || []).filter(e => e.projectId === projectId).map(e => new MaterialEntryEntity(e));
        const usages = (usagesRes.data || []).filter(u => u.projectId === projectId).map(u => new MaterialUsageEntity(u));

        return materials.map(material => {
            const matId = material.id;
            const entriesForMaterial = entries.filter(e => e.materialId === matId);
            const usagesForMaterial = usages.filter(u => u.materialId === matId);

            const totalEntries = entriesForMaterial.reduce((sum, e) => sum + e.quantity, 0);
            const totalUsages = usagesForMaterial.reduce((sum, u) => sum + u.quantity, 0);
            const totalCost = entriesForMaterial.reduce((sum, e) => sum + (e.quantity * e.unitCost), 0);

            const stock = totalEntries - totalUsages;
            const unitPrice = totalEntries > 0 ? totalCost / totalEntries : 0;
            const total = +(unitPrice * stock).toFixed(2);

            return {
                ...material,
                totalEntries,
                totalUsages,
                stockActual: stock,
                price: +unitPrice.toFixed(2),
                total
            };
        });
    }
}

export const materialsApiService = new MaterialsApiService();

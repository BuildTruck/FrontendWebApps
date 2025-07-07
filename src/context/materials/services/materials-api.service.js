import { BaseService } from '../../../core/services/base.service.js';
import { MaterialEntity } from '../models/materials.entity';
import { materialEntriesApiService } from './material-entries-api.service.js';
import { materialUsagesApiService } from './material-usages-api.service.js';
import http from '../../../core/services/http.service.js';

// 📦 Servicio principal de materiales - Solo coordina y maneja materiales básicos
class MaterialsApiService extends BaseService {
    constructor() {
        super('/materials');
        this.entriesService = materialEntriesApiService;
        this.usagesService = materialUsagesApiService;
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

    // 📋 MATERIALES BÁSICOS
    async getByProject(projectId = null) {
        if (!projectId) projectId = this.getCurrentProjectIdSync();

        try {
            console.log(`🔍 Obteniendo materiales para proyecto: ${projectId}`);
            const response = await http.get(`${this.resourceEndpoint}/project/${projectId}`);
            console.log('✅ Respuesta del backend:', response.data);

            return (response.data || []).map(material => {
                return new MaterialEntity({
                    id: material.id,
                    projectId: material.projectId,
                    name: material.name,
                    type: this.mapTypeFromBackend(material.type),
                    unit: this.mapUnitFromBackend(material.unit),
                    minimumStock: material.minimumStock,
                    provider: material.provider,
                    price: material.price || 0,
                    stock: material.stock || 0,
                    total: material.total || 0
                });
            });
        } catch (error) {
            console.error(`❌ Error obteniendo materiales para proyecto ${projectId}:`, error);
            return [];
        }
    }

    async createMaterial(data) {
        try {
            const material = new MaterialEntity(data);
            if (!material.projectId) {
                material.projectId = this.getCurrentProjectIdSync();
            }

            const payload = {
                projectId: parseInt(material.projectId),
                name: material.name,
                type: this.mapTypeToBackend(material.type),
                unit: this.mapUnitToBackend(material.unit),
                minimumStock: parseFloat(material.minimumStock),
                provider: material.provider
            };

            const response = await http.post(this.resourceEndpoint, payload);

            return new MaterialEntity({
                id: response.data.id,
                projectId: response.data.projectId,
                name: response.data.name,
                type: this.mapTypeFromBackend(response.data.type),
                unit: this.mapUnitFromBackend(response.data.unit),
                minimumStock: response.data.minimumStock,
                provider: response.data.provider,
                price: response.data.price || 0,
                stock: response.data.stock || 0,
                total: response.data.total || 0
            });
        } catch (error) {
            console.error('❌ Error creando material:', error);
            throw error;
        }
    }

    async updateMaterial(id, data) {
        try {
            const material = new MaterialEntity(data);
            material.id = id;

            const payload = {
                id: parseInt(id),
                projectId: parseInt(material.projectId),
                name: material.name,
                type: material.type,
                unit: material.unit,
                minimumStock: parseFloat(material.minimumStock),
                provider: material.provider
            };

            console.log('📤 Payload de actualización:', payload);

            // ✅ CAMBIO: Usar POST en lugar de PUT
            const response = await http.post(this.resourceEndpoint, payload);

            return new MaterialEntity({
                id: response.data.id,
                projectId: response.data.projectId,
                name: response.data.name,
                type: response.data.type,
                unit: response.data.unit,
                minimumStock: response.data.minimumStock,
                provider: response.data.provider,
                price: response.data.price || 0,
                stock: response.data.stock || 0,
                total: response.data.total || 0
            });
        } catch (error) {
            console.error(`❌ Error actualizando material ${id}:`, error);
            throw error;
        }
    }

    // 📥 ENTRADAS - Delegadas al servicio específico
    async getEntriesByProject(projectId) {
        return this.entriesService.getByProject(projectId);
    }

    async createEntry(data) {
        return this.entriesService.createOrUpdate(data);
    }

    async updateEntry(id, data) {
        data.id = id;
        return this.entriesService.createOrUpdate(data);
    }

    // 📤 USOS - Delegadas al servicio específico
    async getUsagesByProject(projectId) {
        return this.usagesService.getByProject(projectId);
    }

    async createUsage(data) {
        return this.usagesService.createOrUpdate(data);
    }

    async updateUsage(id, data) {
        data.id = id;
        return this.usagesService.createOrUpdate(data);
    }

    // ✅ MÉTODO UNIFICADO para crear/actualizar usos
    async createOrUpdate(data) {
        return this.usagesService.createOrUpdate(data);
    }

    // 📊 INVENTARIO - Por implementar con endpoint del backend
    async getInventorySummary(projectId = null) {
        if (!projectId) projectId = this.getCurrentProjectIdSync();

        try {
            console.log(`📊 Obteniendo inventario para proyecto: ${projectId}`);

            // Llamar al endpoint del inventario
            const response = await http.get(`${this.resourceEndpoint}/inventory/${projectId}`);
            console.log('✅ Respuesta inventario del backend:', response.data);

            // Si el backend no devuelve totalEntries y totalUsages, los calculamos
            const inventory = response.data || [];

            // Obtener entradas y usos para calcular totales si no vienen del backend
            const [entries, usages] = await Promise.all([
                this.getEntriesByProject(projectId),
                this.getUsagesByProject(projectId)
            ]);

            return inventory.map(item => {
                // Calcular totales de entradas y usos por material
                const materialEntries = entries.filter(e => e.materialId === item.materialId);
                const materialUsages = usages.filter(u => u.materialId === item.materialId);

                const totalEntries = materialEntries.reduce((sum, e) => sum + (e.quantity || 0), 0);
                const totalUsages = materialUsages.reduce((sum, u) => sum + (u.quantity || 0), 0);

                console.log(`📊 Material ${item.name}: Entradas=${totalEntries}, Usos=${totalUsages}`);

                return {
                    // Campos del backend
                    id: item.materialId,
                    materialId: item.materialId,
                    name: item.name,
                    type: item.type,
                    unit: item.unit,
                    minimumStock: item.minimumStock,
                    provider: item.provider,
                    stockActual: item.stockActual,
                    unitPrice: item.unitPrice,
                    total: item.total,

                    // ✅ AGREGAR: Campos calculados de entradas y usos
                    totalEntries: totalEntries,
                    totalUsages: totalUsages,

                    // Campos adicionales
                    projectId: parseInt(projectId)
                };
            });

        } catch (error) {
            console.error(`❌ Error obteniendo inventario para proyecto ${projectId}:`, error);
            return [];
        }
    }

    // 📄 EXPORTACIÓN
    async exportInventoryToExcel(inventoryData, fileName = 'inventario') {
        try {
            const exportData = inventoryData.map(item => ({
                'Nombre': item.name,
                'Tipo': item.type,
                'Unidad': item.unit,
                'Stock Mínimo': item.minimumStock,
                'Stock Actual': item.stockActual,
                'Precio Unitario (S/)': item.price,
                'Total (S/)': item.total
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportData);
            XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
            XLSX.writeFile(wb, `${fileName}_${this.getToday()}.xlsx`);
        } catch (error) {
            console.error('❌ Error exportando inventario:', error);
        }
    }

    async exportEntriesToExcel(entriesData, fileName = 'entradas') {
        try {
            const exportData = entriesData.map(entry => ({
                'Fecha': entry.date,
                'Material': entry.materialName,
                'Cantidad': entry.quantity,
                'Proveedor': entry.provider,
                'Comprobante': entry.comprobante,
                'N° Comprobante': entry.comprobanteNumber,
                'RUC': entry.ruc,
                'Método de Pago': entry.payment,
                'Precio Unitario (S/)': entry.unitCost,
                'Costo Total (S/)': entry.totalCost,
                'Estado': entry.status
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportData);
            XLSX.utils.book_append_sheet(wb, ws, 'Entradas');
            XLSX.writeFile(wb, `${fileName}_${this.getToday()}.xlsx`);
        } catch (error) {
            console.error('❌ Error exportando entradas:', error);
        }
    }

    async exportUsagesToExcel(usagesData, fileName = 'usos') {
        try {
            const exportData = usagesData.map(usage => ({
                'Fecha': usage.date,
                'Material': usage.materialName,
                'Cantidad Usada': usage.quantity,
                'Área': usage.area,
                'Tipo de Uso': usage.usageType,
                'Trabajador': usage.worker,
                'Observaciones': usage.observations
                // ❌ ELIMINAR: 'Estado': usage.status (ya no existe)
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportData);
            XLSX.utils.book_append_sheet(wb, ws, 'Usos');
            XLSX.writeFile(wb, `${fileName}_${this.getToday()}.xlsx`);
        } catch (error) {
            console.error('❌ Error exportando usos:', error);
        }
    }

    getToday() {
        return new Date().toISOString().split('T')[0];
    }

    // 🔄 MAPEOS DE TIPOS
    mapTypeFromBackend(type) {
        const typeMap = {
            'CEMENTO': 'CEMENTO',
            'ACERO': 'ACERO',
            'PINTURA': 'PINTURA',
            'HERRAMIENTA': 'HERRAMIENTA',
            'LIMPIEZA': 'LIMPIEZA',
            'OTRO': 'OTRO'
        };
        // ✅ ARREGLO: Si no está en el map, devolver el valor original (para tipos personalizados)
        return typeMap[type] || type;
    }

    mapTypeToBackend(type) {
        const typeMap = {
            'CEMENTO': 'CEMENTO',
            'ACERO': 'ACERO',
            'PINTURA': 'PINTURA',
            'HERRAMIENTA': 'HERRAMIENTA',
            'LIMPIEZA': 'LIMPIEZA',
            'OTRO': 'OTRO'
        };
        // ✅ ARREGLO: Si no está en el map, devolver el valor original (para tipos personalizados)
        return typeMap[type] || type;
    }

    // 🔄 MAPEOS DE UNIDADES
    mapUnitFromBackend(unit) {
        const unitMap = {
            'KG': 'KG',
            'M': 'M',
            'L': 'L',
            'UND': 'UND',
            'SACO': 'SACO',
            'CAJA': 'CAJA',
            'ROLLO': 'ROLLO',
            'GAL': 'GAL',
            'TON': 'TON'
        };
        // ✅ ARREGLO: Mantener valores consistentes
        return unitMap[unit] || unit;
    }

    mapUnitToBackend(unit) {
        const unitMap = {
            'KG': 'KG',
            'M': 'M',
            'L': 'L',
            'UND': 'UND',
            'SACO': 'SACO',
            'CAJA': 'CAJA',
            'ROLLO': 'ROLLO',
            'GAL': 'GAL',
            'TON': 'TON'
        };
        // ✅ ARREGLO: Mantener valores consistentes
        return unitMap[unit] || unit;
    }
}

export const materialsApiService = new MaterialsApiService();

// Solo para testing - remover después
window.materialsApiService = materialsApiService;
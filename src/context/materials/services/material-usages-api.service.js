import { BaseService } from '../../../core/services/base.service.js';
import { MaterialUsageEntity } from '../models/material-usages.entity';
import http from '../../../core/services/http.service.js';

export class MaterialUsagesApiService extends BaseService {
    constructor() {
        super('/material-usages');
    }

    async getByProject(projectId) {
        try {
            console.log(`🔍 Obteniendo usos para proyecto: ${projectId}`);
            const response = await http.get(`${this.resourceEndpoint}/${projectId}`);
            console.log('✅ Respuesta usos del backend:', response.data);

            return (response.data || []).map(usage => {
                return new MaterialUsageEntity(this.mapFromBackend(usage));
            });
        } catch (error) {
            console.error(`❌ Error obteniendo usos para proyecto ${projectId}:`, error);
            return [];
        }
    }

    async createOrUpdate(data) {
        try {
            const entity = new MaterialUsageEntity(data);
            console.log('📝 Creando/actualizando uso:', entity);

            const payload = this.mapToBackend(entity);
            console.log('📤 Payload uso a enviar:', payload);

            const response = await http.post(this.resourceEndpoint, payload);
            console.log('✅ Uso creado/actualizado:', response.data);

            return new MaterialUsageEntity(this.mapFromBackend(response.data));
        } catch (error) {
            console.error('❌ Error creando/actualizando uso:', error);
            throw error;
        }
    }

    // 🔄 Mapear datos del backend al frontend
    mapFromBackend(backendData) {
        console.log('🔄 Datos del backend:', backendData);

        const mapped = {
            id: backendData.id,
            projectId: backendData.projectId,
            materialId: backendData.materialId,
            date: backendData.date ? backendData.date.split('T')[0] : '',
            quantity: backendData.quantity,
            area: backendData.area,
            worker: backendData.worker,
            usageType: backendData.usageType, // ✅ CAMBIO: Tomar directamente sin mapear
            observations: backendData.observations
        };

        console.log('🔄 Datos mapeados al frontend:', mapped);
        return mapped;
    }

    // 🔄 Mapear datos del frontend al backend
    mapToBackend(entity) {
        console.log('🔄 Mapeando al backend:', entity);
        console.log('🔄 UsageType antes del mapeo:', entity.usageType);

        const mapped = {
            id: entity.id || undefined,
            projectId: parseInt(entity.projectId),
            materialId: parseInt(entity.materialId),
            date: entity.date,
            quantity: parseFloat(entity.quantity),
            area: entity.area,
            usageType: entity.usageType, // ✅ CAMBIO: Enviar directamente sin mapear
            worker: entity.worker,
            observations: entity.observations
        };

        console.log('🔄 Payload final mapeado:', mapped);
        return mapped;
    }

    // 🔄 Mapeos de tipos de uso
    mapUsageTypeFromBackend(usageType) {
        const usageMap = {
            'CONSTRUCCION': 'construccion',
            'MANTENIMIENTO': 'mantenimiento',
            'REPARACION': 'reparacion',
            'INSTALACION': 'instalacion',
            'ACABADOS': 'acabados',
            'ESTRUCTURAL': 'estructural',
            'SANITARIO': 'sanitario',
            'ELECTRICO': 'electrico',
            'HERRAMIENTAS': 'herramientas',
            'LIMPIEZA': 'limpieza'
        };
        return usageMap[usageType] || usageType?.toLowerCase() || '';
    }

    mapUsageTypeToBackend(usageType) {
        const usageMap = {
            'construccion': 'CONSTRUCCION',
            'mantenimiento': 'MANTENIMIENTO',
            'reparacion': 'REPARACION',
            'instalacion': 'INSTALACION',
            'acabados': 'ACABADOS',
            'estructural': 'ESTRUCTURAL',
            'sanitario': 'SANITARIO',
            'electrico': 'ELECTRICO',
            'herramientas': 'HERRAMIENTAS',
            'limpieza': 'LIMPIEZA'
        };
        return usageMap[usageType] || 'CONSTRUCCION';
    }


    mapStatusFromBackend(status) {
        console.log('📊 === MAPEO DE STATUS USO ===');
        console.log('📊 Status recibido:', status);
        console.log('📊 Tipo:', typeof status);

        const statusMap = {
            'PENDING': 'PENDING',
            'CONFIRMED': 'CONFIRMED',
            'CANCELLED': 'CANCELLED',
            'IN_PROCESS': 'IN_PROCESS',
            'COMPLETED': 'COMPLETED'
        };

        const normalizedStatus = status?.toUpperCase();
        const result = statusMap[normalizedStatus] || 'PENDING';

        console.log('📊 Status normalizado:', normalizedStatus);
        console.log('📊 Status final mapeado:', result);
        return result;
    }

}

export const materialUsagesApiService = new MaterialUsagesApiService();
import { BaseService } from '../../../core/services/base.service.js';
import { MaterialEntryEntity } from '../models/material-entries.entity';
import http from '../../../core/services/http.service.js';

export class MaterialEntriesApiService extends BaseService {
    constructor() {
        super('/material-entries');
    }

    async getByProject(projectId) {
        try {
            console.log(`🔍 Obteniendo entradas para proyecto: ${projectId}`);
            const response = await http.get(`${this.resourceEndpoint}/${projectId}`);
            console.log('✅ Respuesta entradas del backend:', response.data);

            return (response.data || []).map(entry => {
                const mapped = this.mapFromBackend(entry);
                console.log('🔄 Entrada mapeada individual:', mapped);
                return new MaterialEntryEntity(mapped);
            });
        } catch (error) {
            console.error(`❌ Error obteniendo entradas para proyecto ${projectId}:`, error);
            return [];
        }
    }

    async createOrUpdate(data) {
        try {
            const entity = new MaterialEntryEntity(data);
            console.log('📝 Creando/actualizando entrada:', entity);

            const payload = this.mapToBackend(entity);
            console.log(' Payload entrada a enviar:', payload);

            const response = await http.post(this.resourceEndpoint, payload);
            console.log('✅ Entrada creada/actualizada:', response.data);

            return new MaterialEntryEntity(this.mapFromBackend(response.data));
        } catch (error) {
            console.error('❌ Error creando/actualizando entrada:', error);
            throw error;
        }
    }


    mapFromBackend(backendData) {
        console.log('🔄 Mapeando del backend:', backendData);

        const mapped = {
            id: backendData.id,
            projectId: backendData.projectId,
            materialId: backendData.materialId,
            date: backendData.date ? backendData.date.split('T')[0] : '',
            quantity: backendData.quantity,
            unit: backendData.unit || '',
            provider: backendData.provider,
            ruc: backendData.ruc,

            // ✅ ARREGLO: Mapear correctamente usando las funciones
            payment: this.mapPaymentFromBackend(backendData.payment),
            comprobante: this.mapDocumentTypeFromBackend(backendData.documentType),

            comprobanteNumber: backendData.documentNumber,
            unitCost: backendData.unitCost,
            totalCost: backendData.totalCost || (backendData.quantity * backendData.unitCost),


            status: this.mapStatusFromBackend(backendData.status),

            observations: backendData.observations
        };

        console.log('✅ Resultado del mapeo:', mapped);
        return mapped;
    }


    mapToBackend(entity) {
        console.log('🔄 Mapeando al backend:', entity);

        const payload = {
            projectId: parseInt(entity.projectId),
            materialId: parseInt(entity.materialId),
            date: entity.date,
            quantity: parseFloat(entity.quantity),
            provider: entity.provider,
            ruc: entity.ruc,
            payment: this.mapPaymentToBackend(entity.payment),
            documentType: this.mapDocumentTypeToBackend(entity.comprobante),
            documentNumber: entity.comprobanteNumber,
            unitCost: parseFloat(entity.unitCost),
            observations: entity.observations,
            // ✅ ARREGLO CRÍTICO: Agregar el status al payload
            status: entity.status || 'PENDING'
        };

        // ✅ Solo agregar ID si estamos actualizando
        if (entity.id && !entity.id.toString().startsWith('e')) {
            payload.id = parseInt(entity.id);
        }

        console.log('✅ Payload final:', payload);
        return payload;
    }

    // 🔄 Mapeos de métodos de pago
    mapPaymentFromBackend(payment) {
        console.log('💳 Mapeando payment del backend:', payment);

        const paymentMap = {
            'CASH': 'CASH',
            'CREDIT': 'CREDIT',
            'TRANSFER': 'TRANSFER',
            'CHECK': 'CHECK'
        };

        const result = paymentMap[payment?.toUpperCase()] || 'CASH';
        console.log('💳 Payment mapeado:', result);
        return result;
    }

    mapPaymentToBackend(payment) {
        console.log('💳 Mapeando payment al backend:', payment);

        const paymentMap = {
            'CASH': 'CASH',
            'CREDIT': 'CREDIT',
            'TRANSFER': 'TRANSFER',
            'CHECK': 'CHECK'
        };

        const result = paymentMap[payment] || 'CASH';
        console.log('💳 Payment para backend:', result);
        return result;
    }

    // 🔄 Mapeos de tipos de documento
    mapDocumentTypeFromBackend(documentType) {
        console.log('📄 Mapeando documentType del backend:', documentType);

        const docMap = {
            'INVOICE': 'INVOICE',
            'RECEIPT': 'RECEIPT',
            'GUIDE': 'GUIDE',
            'ORDER_NOTE': 'ORDER_NOTE'
        };

        const result = docMap[documentType?.toUpperCase()] || 'RECEIPT';
        console.log('📄 DocumentType mapeado:', result);
        return result;
    }

    mapDocumentTypeToBackend(comprobante) {
        console.log('📄 Mapeando comprobante al backend:', comprobante);

        const docMap = {
            'INVOICE': 'INVOICE',
            'RECEIPT': 'RECEIPT',
            'GUIDE': 'GUIDE',
            'ORDER_NOTE': 'ORDER_NOTE'
        };

        const result = docMap[comprobante] || 'RECEIPT';
        console.log('📄 Comprobante para backend:', result);
        return result;
    }

    // 🔄 Mapeos de estados
    mapStatusFromBackend(status) {
        console.log('📊 === MAPEO DE STATUS ===');
        console.log('📊 Status recibido:', status);
        console.log('📊 Tipo:', typeof status);

        // ✅ Usar valores exactos del backend
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
        console.log('📊 ¿Existe en el mapa?', statusMap.hasOwnProperty(normalizedStatus));

        return result;
    }
}

export const materialEntriesApiService = new MaterialEntriesApiService();
import { MachineryEntity } from '../models/machinery.entity.js';
import http from "../../../core/services/http.service.js";

export class MachineryApiService {
    constructor() {
        this.baseURL = '/machinery';
    }

    // ✅ MÉTODO PRINCIPAL: Obtener maquinaria por proyecto
    async getByProject(projectId) {
        if (!projectId) {
            console.warn('ProjectId not provided in getByProject');
            return [];
        }

        try {
            console.log(`🔍 Getting machinery for project ${projectId}`);

            // ✅ USAR EL ENDPOINT CORRECTO
            const response = await http.get(`${this.baseURL}/project/${projectId}`);
            console.log('🔍 RAW response from backend:', response);

            // ✅ Extraer datos de la respuesta
            const data = response.data || [];
            console.log('🔍 Extracted data:', data);

            // ✅ Convertir a entidades de maquinaria
            const machinery = MachineryEntity.fromJsonArray(data);
            console.log(`Found ${machinery.length} machinery for project ${projectId}`);

            return machinery;
        } catch (error) {
            console.error(`Error fetching project machinery ${projectId}:`, error);

            // Si es 404, simplemente devolver array vacío (no hay maquinaria aún)
            if (error.response?.status === 404) {
                console.log(`No machinery found for project ${projectId} (404)`);
                return [];
            }

            throw error;
        }
    }

    // ✅ Obtener maquinaria por ID
    async getById(id) {
        try {
            const response = await http.get(`${this.baseURL}/${id}`);
            console.log('🔍 getById response:', response);

            const data = response.data;
            return MachineryEntity.fromAPI(data);
        } catch (error) {
            console.error(`Error fetching machinery ${id}:`, error);
            throw error;
        }
    }

    // ✅ Crear nueva maquinaria
    async create(machineryData) {
        try {
            let machinery = machineryData instanceof MachineryEntity ? machineryData : new MachineryEntity(machineryData);

            console.log('🔍 CREATE - Input machinery data:', machineryData);
            console.log('🔍 CREATE - Machinery entity:', machinery);

            // ✅ Asegurar que tiene projectId
            if (!machinery.projectId) {
                const currentProjectId = await this.getCurrentProjectId();
                if (!currentProjectId) throw new Error('Could not determine current project');
                machinery.projectId = currentProjectId;
            }

            console.log('🔍 CREATE - Final projectId:', machinery.projectId);

            // ✅ Validar datos
            const validation = machinery.validate();
            if (!validation.isValid) {
                console.error('❌ CREATE - Validation failed:', validation.errors);
                throw new Error(`Invalid data: ${validation.errors.join(', ')}`);
            }

            console.log('✅ CREATE - Validation passed');

            // ✅ Crear FormData
            const formData = this.createFormData(machinery);

            console.log('📋 CREATE - FormData contents:');
            for (let [key, value] of formData.entries()) {
                console.log(`  ${key}: ${value}`);
            }

            console.log('🚀 CREATE - Sending POST request to:', this.baseURL);

            const response = await http.post(this.baseURL, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            console.log('✅ CREATE - Success response:', response);

            return MachineryEntity.fromAPI(response.data);
        } catch (error) {
            console.error('❌ CREATE - Error details:', {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                url: error.config?.url
            });
            throw error;
        }
    }

    // ✅ Actualizar maquinaria
    async update(id, machineryData) {
        try {
            console.log('🔄 UPDATE MACHINERY - ID:', id);
            console.log('🔄 UPDATE MACHINERY - Data:', machineryData);

            let machinery = machineryData instanceof MachineryEntity ? machineryData : new MachineryEntity(machineryData);

            const validation = machinery.validate();
            if (!validation.isValid) {
                console.error('❌ Validation failed:', validation.errors);
                throw new Error(`Invalid data: ${validation.errors.join(', ')}`);
            }

            const formData = this.createFormData(machinery, true);

            console.log('📋 UPDATE MACHINERY FormData contents:');
            for (let [key, value] of formData.entries()) {
                console.log(`  ${key}: ${value}`);
            }

            const response = await http.put(`${this.baseURL}/${id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            return MachineryEntity.fromAPI(response.data);
        } catch (error) {
            console.error('❌ UPDATE MACHINERY Error details:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });
            throw error;
        }
    }

    // ✅ Eliminar maquinaria
    async delete(id) {
        try {
            await http.delete(`${this.baseURL}/${id}`);
            return true;
        } catch (error) {
            console.error(`Error deleting machinery ${id}:`, error);
            throw error;
        }
    }

    // ✅ Eliminar múltiples maquinarias
    async deleteMultiple(ids) {
        try {
            const deletePromises = ids.map(id => this.delete(id));
            await Promise.all(deletePromises);
            return true;
        } catch (error) {
            console.error('Error deleting multiple machinery:', error);
            throw error;
        }
    }

    // ✅ Crear FormData para envío
    createFormData(machinery, isUpdate = false) {
        const formData = new FormData();

        // Required fields for creation only
        if (!isUpdate) {
            formData.append('ProjectId', machinery.projectId);
            formData.append('RegisterDate', this.formatDateForAPI(machinery.registerDate || new Date()));
        }

        // Always required fields
        formData.append('ProjectId', machinery.projectId); // También en update según el backend
        formData.append('Name', machinery.name);
        formData.append('LicensePlate', machinery.licensePlate);
        formData.append('MachineryType', machinery.machineryType);

        // Status como número (enum)
        const statusValue = this.getStatusEnumValue(machinery.status);
        formData.append('Status', statusValue);

        if (machinery.provider && machinery.provider.trim()) {
            formData.append('Provider', machinery.provider);
        }
        if (machinery.description && machinery.description.trim()) {
            formData.append('Description', machinery.description);
        }
        if (machinery.personnelId !== null && machinery.personnelId !== undefined) {
            formData.append('PersonnelId', machinery.personnelId);
        }

        // Handle image file
        if (machinery.imageFile && machinery.imageFile instanceof File) {
            formData.append('ImageFile', machinery.imageFile);
            console.log('📸 Adding image file:', machinery.imageFile.name);
        }

        // Handle image removal (mantenemos por si acaso)
        if (isUpdate) {
            if (machinery.removeImage === true) {
                formData.append('RemoveImage', 'true');
                console.log('🗑️ Marking image for removal');
            } else {
                formData.append('RemoveImage', 'false');
            }
        }

        return formData;
    }

    // ✅ Mapear status a enum
    getStatusEnumValue(status) {
        const statusMap = {
            'ACTIVE': 0,
            'MAINTENANCE': 1
        };
        return statusMap[status] || 0; // Default a ACTIVE
    }

    // ✅ Formatear fecha para API
    formatDateForAPI(date) {
        if (!date) return null;

        try {
            if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
                return date;
            }

            if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                return `${date}T00:00:00.000Z`;
            }

            if (date instanceof Date) {
                return date.toISOString();
            }

            const parsedDate = new Date(date);
            if (!isNaN(parsedDate.getTime())) {
                return parsedDate.toISOString();
            }

            return null;
        } catch (error) {
            console.error('Error formatting date:', error);
            return null;
        }
    }

    // ✅ Obtener proyecto actual
    async getCurrentProjectId() {
        try {
            const route = window.$router?.currentRoute?.value;
            if (route?.params?.projectId) return route.params.projectId;

            const pathMatch = window.location.pathname.match(/\/proyecto\/(\d+)|\/supervisor\/(\d+)/);
            if (pathMatch) return pathMatch[1] || pathMatch[2];

            return localStorage.getItem('currentProjectId');
        } catch (error) {
            console.error('Error getting projectId:', error);
            return null;
        }
    }

    // ✅ Validar placa única
    async validateLicensePlate(licensePlate, projectId, excludeId = null) {
        try {
            const machinery = await this.getByProject(projectId);
            return machinery.some(m => m.licensePlate === licensePlate && m.id !== excludeId);
        } catch (error) {
            console.error(`Error validating license plate:`, error);
            return false;
        }
    }

    // ✅ Verificar propiedad de maquinaria
    async verifyMachineryOwnership(machineryId, projectId) {
        if (!machineryId || !projectId) {
            return false;
        }

        try {
            const machinery = await this.getById(machineryId);
            return machinery && machinery.belongsToProject(projectId);
        } catch (error) {
            console.error('Error verifying machinery ownership:', error);
            return false;
        }
    }

    // ✅ Obtener operadores disponibles
    async getAvailableOperators(projectId) {
        try {
            const { PersonnelApiService } = await import('../../personnel/services/personnel-api.service.js');
            const personnelService = new PersonnelApiService();

            const personnel = await personnelService.getByProject(projectId);
            return personnel.filter(person =>
                person.personnelType === 'RENTED_OPERATOR' &&
                person.status === 'ACTIVE'
            );
        } catch (error) {
            console.error('Error getting available operators:', error);
            return [];
        }
    }

    // ✅ Asignar operador
    async assignOperator(machineryId, personnelId) {
        try {
            const machinery = await this.getById(machineryId);
            machinery.personnelId = personnelId;
            return await this.update(machineryId, machinery);
        } catch (error) {
            console.error('Error assigning operator:', error);
            throw error;
        }
    }

    // ✅ Desasignar operador
    async unassignOperator(machineryId) {
        try {
            const machinery = await this.getById(machineryId);
            machinery.personnelId = null;
            return await this.update(machineryId, machinery);
        } catch (error) {
            console.error('Error unassigning operator:', error);
            throw error;
        }
    }

    // ✅ Obtener tipos de maquinaria
    async getMachineryTypes(projectId = null) {
        try {
            const defaultTypes = MachineryEntity.MACHINERY_TYPES.map(type => type.value);

            if (!projectId) {
                return defaultTypes;
            }

            const storageKey = `machinery_types_project_${projectId}`;
            const storedTypes = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const allTypes = [...new Set([...defaultTypes, ...storedTypes])];
            return allTypes.sort();
        } catch (error) {
            console.error('Error getting machinery types:', error);
            return MachineryEntity.MACHINERY_TYPES.map(type => type.value);
        }
    }

    // ✅ Agregar tipo de maquinaria al proyecto
    async addMachineryTypeToProject(projectId, typeName) {
        try {
            if (!typeName || !typeName.trim()) {
                return false;
            }

            const cleanType = typeName.trim().toUpperCase();
            const storageKey = `machinery_types_project_${projectId}`;
            const storedTypes = JSON.parse(localStorage.getItem(storageKey) || '[]');

            if (!storedTypes.includes(cleanType)) {
                storedTypes.push(cleanType);
                localStorage.setItem(storageKey, JSON.stringify(storedTypes));
            }

            return true;
        } catch (error) {
            console.error('Error adding machinery type:', error);
            return false;
        }
    }

    // ✅ Obtener tipos con etiquetas
    async getMachineryTypesWithStored(projectId) {
        try {
            const defaultTypes = MachineryEntity.MACHINERY_TYPES;

            if (!projectId) {
                return defaultTypes;
            }

            const storageKey = `machinery_types_project_${projectId}`;
            const storedTypes = JSON.parse(localStorage.getItem(storageKey) || '[]');

            const customTypes = storedTypes.map(type => ({
                value: type,
                label: this.formatTypeLabel(type)
            }));

            const allTypes = [...defaultTypes, ...customTypes];
            return allTypes.sort((a, b) => a.label.localeCompare(b.label));
        } catch (error) {
            console.error('Error getting machinery types:', error);
            return MachineryEntity.MACHINERY_TYPES;
        }
    }

    // ✅ Formatear etiqueta de tipo
    formatTypeLabel(type) {
        return type.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
    }

    // ✅ Estadísticas del proyecto
    async getProjectStats(projectId) {
        if (!projectId) {
            throw new Error('Project ID is required');
        }

        try {
            const machinery = await this.getByProject(projectId);

            const stats = {
                totalMachinery: machinery.length,
                activeMachinery: machinery.filter(m => m.isActive()).length,
                assignedMachinery: machinery.filter(m => m.isAssigned()).length,
                availableMachinery: machinery.filter(m => m.isAvailable()).length,
                statusBreakdown: this.getStatusBreakdown(machinery),
                typeBreakdown: this.getTypeBreakdown(machinery),
                recentMachinery: machinery.filter(m => {
                    const createdDate = new Date(m.createdAt);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return createdDate >= weekAgo;
                }).length
            };

            return stats;
        } catch (error) {
            console.error(`Error getting project stats ${projectId}:`, error);
            throw error;
        }
    }

    // ✅ Desglose de status
    getStatusBreakdown(machinery) {
        const statuses = {};
        machinery.forEach(m => {
            if (m.status) {
                statuses[m.status] = (statuses[m.status] || 0) + 1;
            }
        });
        return statuses;
    }

    // ✅ Desglose de tipos
    getTypeBreakdown(machinery) {
        const types = {};
        machinery.forEach(m => {
            if (m.machineryType) {
                const label = m.getMachineryTypeLabel();
                types[label] = (types[label] || 0) + 1;
            }
        });
        return types;
    }

    // ✅ Resumen de inventario (compatibilidad)
    async getInventorySummary(projectId) {
        try {
            const machinery = await this.getByProject(projectId);
            return machinery || [];
        } catch (error) {
            console.error('Error fetching inventory summary:', error);
            return [];
        }
    }

    // ✅ Filtrar por rango de fechas
    filterMachineryByDateRange(machinery, startDate, endDate) {
        if (!startDate && !endDate) {
            return machinery;
        }

        return machinery.filter(machine => {
            const machineDate = new Date(machine.createdAt);
            const start = startDate ? new Date(startDate) : new Date('1900-01-01');
            const end = endDate ? new Date(endDate) : new Date('2100-12-31');

            return machineDate >= start && machineDate <= end;
        });
    }

    // ✅ Eliminar por proyecto
    async deleteByProjectId(projectId) {
        if (!projectId) {
            throw new Error('Project ID is required');
        }

        try {
            const machinery = await this.getByProject(projectId);
            let deletedCount = 0;

            for (const machine of machinery) {
                try {
                    await this.delete(machine.id);
                    deletedCount++;
                } catch (error) {
                    console.error(`Error deleting machinery ${machine.id}:`, error);
                }
            }

            return deletedCount;
        } catch (error) {
            console.error(`Error deleting project machinery ${projectId}:`, error);
            throw error;
        }
    }

    // ✅ Obtener maquinaria sin operadores
    async getUnassignedMachinery(projectId) {
        try {
            const machinery = await this.getByProject(projectId);
            return machinery.filter(machine => !machine.personnelId && machine.isActive());
        } catch (error) {
            console.error('Error getting unassigned machinery:', error);
            return [];
        }
    }

    // ✅ Obtener maquinaria por operador
    async getMachineryByOperator(personnelId, projectId) {
        try {
            const machinery = await this.getByProject(projectId);
            return machinery.filter(machine => machine.personnelId === personnelId);
        } catch (error) {
            console.error('Error getting machinery by operator:', error);
            return [];
        }
    }
}

export const machineryApiService = new MachineryApiService();
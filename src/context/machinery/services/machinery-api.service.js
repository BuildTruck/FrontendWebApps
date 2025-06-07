import { BaseService } from "../../../core/services/base.service.js";
import { MachineryEntity } from '../models/machinery.entity.js';

export class MachineryApiService extends BaseService {
    constructor() {
        super('/machinery');
    }

    // Basic CRUD methods
    async getAll(params = {}) {
        try {
            const response = await super.getAll(params);
            return MachineryEntity.fromJsonArray(response.data || []);
        } catch (error) {
            console.error('Error fetching machinery:', error);
            return [];
        }
    }

    async getById(id) {
        try {
            const response = await super.getById(id);
            return MachineryEntity.fromAPI(response.data);
        } catch (error) {
            console.error(`Error fetching machinery ${id}:`, error);
            throw error;
        }
    }

    async getByProject(projectId) {
        if (!projectId) {
            console.warn('ProjectId not provided in getByProject');
            return [];
        }

        try {
            let machinery = [];
            try {
                const response = await super.getAll({ projectId });
                machinery = MachineryEntity.fromJsonArray(response.data || []);
                machinery = MachineryEntity.filterByProject(machinery, projectId);
            } catch (filterError) {
                const allMachinery = await this.getAll();
                machinery = MachineryEntity.filterByProject(allMachinery, projectId);
            }

            console.log(`Found ${machinery.length} machinery for project ${projectId}`);
            return machinery;

        } catch (error) {
            console.error(`Error fetching project machinery ${projectId}:`, error);
            return [];
        }
    }

    async getCurrentProjectId() {
        try {
            const route = this.$route || window.$router?.currentRoute?.value;
            if (route && route.params && route.params.projectId) {
                return route.params.projectId;
            }

            const pathMatch = window.location.pathname.match(/\/proyecto\/(\d+)|\/supervisor\/(\d+)/);
            if (pathMatch) {
                const projectId = pathMatch[1] || pathMatch[2];
                return projectId;
            }

            const storedProjectId = localStorage.getItem('currentProjectId');
            if (storedProjectId) {
                return storedProjectId;
            }

            // Try session storage as fallback
            const user = JSON.parse(sessionStorage.getItem('user') || '{}');
            if (user.projectId) {
                return user.projectId;
            }

            console.warn('No projectId found in context');
            return null;
        } catch (error) {
            console.error('Error getting projectId:', error);
            return null;
        }
    }

    async create(machineryData) {
        try {
            let machinery = machineryData instanceof MachineryEntity
                ? machineryData
                : new MachineryEntity(machineryData);

            if (!machinery.projectId) {
                const currentProjectId = await this.getCurrentProjectId();
                if (currentProjectId) {
                    machinery.projectId = currentProjectId;
                } else {
                    throw new Error('Could not determine current project');
                }
            }

            const validation = machinery.validate();
            if (!validation.isValid) {
                throw new Error(`Invalid data: ${validation.errors.join(', ')}`);
            }

            const cleanData = machinery.toCreateJson();
            const response = await super.create(cleanData);
            return MachineryEntity.fromAPI(response.data);
        } catch (error) {
            console.error('Error creating machinery:', error);
            throw error;
        }
    }

    async update(id, machineryData) {
        try {
            let machinery = machineryData instanceof MachineryEntity
                ? machineryData
                : new MachineryEntity(machineryData);

            if (!machinery.projectId) {
                const currentProjectId = await this.getCurrentProjectId();
                if (currentProjectId) {
                    machinery.projectId = currentProjectId;
                }
            }

            const validation = machinery.validate();
            if (!validation.isValid) {
                throw new Error(`Invalid data: ${validation.errors.join(', ')}`);
            }

            const updateData = machinery.toUpdateJson();
            const response = await super.update(id, updateData);
            return MachineryEntity.fromAPI(response.data);
        } catch (error) {
            console.error(`Error updating machinery ${id}:`, error);
            throw error;
        }
    }

    async delete(id) {
        try {
            await super.delete(id);
            return true;
        } catch (error) {
            console.error(`Error deleting machinery ${id}:`, error);
            throw error;
        }
    }

    async deleteMultiple(ids) {
        try {
            const deletePromises = ids.map(id => this.delete(id));
            await Promise.all(deletePromises);
            return true;
        } catch (error) {
            console.error('Error deleting machinery:', error);
            throw error;
        }
    }

    // Validations
    async validateLicensePlate(licensePlate, projectId, excludeId = null) {
        try {
            const machinery = await this.getByProject(projectId);
            const exists = machinery.some(m =>
                m.licensePlate === licensePlate && m.id !== excludeId
            );
            return exists;
        } catch (error) {
            console.error(`Error validating license plate ${licensePlate}:`, error);
            return false;
        }
    }

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

    // Personnel assignment methods
    async getAvailableOperators(projectId) {
        try {
            // Import personnel service dynamically to avoid circular dependencies
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

    // Machinery types management
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

    async getMachineryTypesWithStored(projectId) {
        try {
            const defaultTypes = MachineryEntity.MACHINERY_TYPES;

            if (!projectId) {
                return defaultTypes;
            }

            const storageKey = `machinery_types_project_${projectId}`;
            const storedTypes = JSON.parse(localStorage.getItem(storageKey) || '[]');

            // Combine default types with stored custom types
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

    formatTypeLabel(type) {
        return type.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
    }

    async compressImage(file, config = {}) {
        const defaultConfig = {
            maxWidth: 300,
            maxHeight: 300,
            quality: 0.7,
            maxSizeKB: 100,  // Más comprimido que antes (era 150)
            format: 'image/webp'
        };

        const finalConfig = { ...defaultConfig, ...config };

        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                try {
                    let { width, height } = img;

                    if (width > height) {
                        if (width > finalConfig.maxWidth) {
                            height = (height * finalConfig.maxWidth) / width;
                            width = finalConfig.maxWidth;
                        }
                    } else {
                        if (height > finalConfig.maxHeight) {
                            width = (width * finalConfig.maxHeight) / height;
                            height = finalConfig.maxHeight;
                        }
                    }

                    const size = Math.min(width, height, 200);  // Tamaño cuadrado como Personnel
                    canvas.width = size;
                    canvas.height = size;

                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';

                    const offsetX = (width - size) / 2;
                    const offsetY = (height - size) / 2;

                    ctx.drawImage(img, -offsetX, -offsetY, width, height);

                    const qualities = [0.8, 0.6, 0.4, 0.3, 0.2, 0.1];
                    let bestResult = null;

                    for (const quality of qualities) {
                        const compressed = canvas.toDataURL('image/webp', quality);
                        const sizeKB = Math.round(compressed.length * 0.75 / 1024);

                        if (sizeKB <= finalConfig.maxSizeKB) {
                            bestResult = compressed;
                            break;
                        }
                    }

                    if (!bestResult) {
                        bestResult = canvas.toDataURL('image/webp', 0.1);
                    }

                    resolve(bestResult);
                } catch (error) {
                    reject(new Error('Error processing image'));
                }
            };

            img.onerror = () => {
                reject(new Error('Error loading image'));
            };

            img.src = URL.createObjectURL(file);
        });
    }

    async uploadMachineryImage(file, projectId = null) {
        if (!file) {
            throw new Error('Image file is required');
        }

        try {
            if (!file.type.startsWith('image/')) {
                throw new Error('File must be an image (JPG, PNG, WEBP, etc.)');
            }

            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
                throw new Error('Image is too large. Maximum 5MB allowed.');
            }

            const compressedImage = await this.compressImage(file, {
                maxWidth: 200,     // Más pequeño
                maxHeight: 200,    // Más pequeño
                maxSizeKB: 50      // Muy comprimido como Personnel
            });

            return compressedImage;
        } catch (error) {
            console.error('Error processing machinery image:', error);
            throw error;
        }
    }

    // Statistics
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

    getStatusBreakdown(machinery) {
        const statuses = {};
        machinery.forEach(m => {
            if (m.status) {
                statuses[m.status] = (statuses[m.status] || 0) + 1;
            }
        });
        return statuses;
    }

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

    // Inventory summary (for compatibility with existing component)
    async getInventorySummary(projectId) {
        try {
            const machinery = await this.getByProject(projectId);
            return machinery || [];
        } catch (error) {
            console.error('Error fetching inventory summary:', error);
            return [];
        }
    }

    // Utility methods
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

    // Get machinery without operators
    async getUnassignedMachinery(projectId) {
        try {
            const machinery = await this.getByProject(projectId);
            return machinery.filter(machine => !machine.personnelId && machine.isActive());
        } catch (error) {
            console.error('Error getting unassigned machinery:', error);
            return [];
        }
    }

    // Get machinery by operator
    async getMachineryByOperator(personnelId, projectId) {
        try {
            const machinery = await this.getByProject(projectId);
            return machinery.filter(machine => machine.personnelId === personnelId);
        } catch (error) {
            console.error('Error getting machinery by operator:', error);
            return [];
        }
    }

    async uploadImage(file, projectId = null) {
        return await this.uploadMachineryImage(file, projectId);
    }

    // Export functionality usando XLSX como PersonnelApiService
    async exportToExcel(machineryData, fileName = 'maquinaria') {
        try {
            const exportData = machineryData.map(machine => ({
                'Nombre': machine.name || '',
                'Placa/Código': machine.licensePlate || '',
                'Tipo': machine.getMachineryTypeLabel() || machine.machineryType || '',
                'Estado': machine.getStatusLabel() || machine.status || '',
                'Proveedor': machine.provider || '',
                'Descripción': machine.description || '',
                'Operador Asignado': machine.personnelId ? 'Operador Asignado' : 'Sin asignar', // Cambiar aquí
                'Disponible': machine.isAvailable() ? 'Sí' : 'No',
                'Fecha Registro': MachineryEntity.formatPeruDate(machine.registerDate),
                'Fecha Creación': MachineryEntity.formatPeruDate(machine.createdAt),
                'Última Actualización': MachineryEntity.formatPeruDate(machine.updatedAt)
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportData);
            XLSX.utils.book_append_sheet(wb, ws, 'Maquinaria');

            const finalFileName = `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, finalFileName);

            return true;
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            throw error;
        }
    }
}

export const machineryApiService = new MachineryApiService();
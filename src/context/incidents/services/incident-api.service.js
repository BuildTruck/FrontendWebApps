import { BaseService } from "../../../core/services/base.service.js";
import { Incident } from '../models/incident.entity.js';

export class IncidentApiService extends BaseService {
    constructor() {
        super('/incidents');
    }

    // Basic CRUD methods
    async getAll(params = {}) {
        try {
            const response = await super.getAll(params);
            return Incident.fromJsonArray(response.data || []);
        } catch (error) {
            console.error('Error fetching incidents:', error);
            return [];
        }
    }

    async getById(id) {
        try {
            const response = await super.getById(id);
            return Incident.fromAPI(response.data);
        } catch (error) {
            console.error(`Error fetching incident ${id}:`, error);
            throw error;
        }
    }

    async getByProject(projectId) {
        if (!projectId) {
            console.warn('ProjectId not provided in getByProject');
            return [];
        }

        try {
            let incidents = [];
            try {
                const response = await super.getAll({ projectId });
                incidents = Incident.fromJsonArray(response.data || []);
                incidents = Incident.filterByProject(incidents, projectId);
            } catch (filterError) {
                const allIncidents = await this.getAll();
                incidents = Incident.filterByProject(allIncidents, projectId);
            }

            console.log(`Found ${incidents.length} incidents for project ${projectId}`);
            return incidents;

        } catch (error) {
            console.error(`Error fetching project incidents ${projectId}:`, error);
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

    async create(incidentData) {
        try {
            let incident = incidentData instanceof Incident
                ? incidentData
                : new Incident(incidentData);

            if (!incident.projectId) {
                const currentProjectId = await this.getCurrentProjectId();
                if (currentProjectId) {
                    incident.projectId = currentProjectId;
                } else {
                    throw new Error('Could not determine current project');
                }
            }

            const validation = incident.validate();
            if (!validation.isValid) {
                throw new Error(`Invalid data: ${validation.errors.join(', ')}`);
            }

            const cleanData = incident.toCreateJson();
            const response = await super.create(cleanData);
            return Incident.fromAPI(response.data);
        } catch (error) {
            console.error('Error creating incident:', error);
            throw error;
        }
    }

    async update(id, incidentData) {
        try {
            let incident = incidentData instanceof Incident
                ? incidentData
                : new Incident(incidentData);

            if (!incident.projectId) {
                const currentProjectId = await this.getCurrentProjectId();
                if (currentProjectId) {
                    incident.projectId = currentProjectId;
                }
            }

            const validation = incident.validate();
            if (!validation.isValid) {
                throw new Error(`Invalid data: ${validation.errors.join(', ')}`);
            }

            const updateData = incident.toUpdateJson();
            const response = await super.update(id, updateData);
            return Incident.fromAPI(response.data);
        } catch (error) {
            console.error(`Error updating incident ${id}:`, error);
            throw error;
        }
    }

    async delete(id) {
        try {
            await super.delete(id);
            return true;
        } catch (error) {
            console.error(`Error deleting incident ${id}:`, error);
            throw error;
        }
    }

    async deleteMultiple(ids) {
        try {
            const deletePromises = ids.map(id => this.delete(id));
            await Promise.all(deletePromises);
            return true;
        } catch (error) {
            console.error('Error deleting incidents:', error);
            throw error;
        }
    }

    // Validations
    async validateIncidentTitle(title, projectId, excludeId = null) {
        try {
            const incidents = await this.getByProject(projectId);
            const exists = incidents.some(i =>
                i.title.toLowerCase() === title.toLowerCase() && i.id !== excludeId
            );
            return exists;
        } catch (error) {
            console.error(`Error validating incident title ${title}:`, error);
            return false;
        }
    }

    async verifyIncidentOwnership(incidentId, projectId) {
        if (!incidentId || !projectId) {
            return false;
        }

        try {
            const incident = await this.getById(incidentId);
            return incident && incident.belongsToProject(projectId);
        } catch (error) {
            console.error('Error verifying incident ownership:', error);
            return false;
        }
    }

    // Personnel assignment methods
    async getAvailablePersonnel(projectId) {
        try {
            // Import personnel service dynamically to avoid circular dependencies
            const { PersonnelApiService } = await import('../../personnel/services/personnel-api.service.js');
            const personnelService = new PersonnelApiService();

            const personnel = await personnelService.getByProject(projectId);
            return personnel.filter(person => person.status === 'ACTIVE');
        } catch (error) {
            console.error('Error getting available personnel:', error);
            return [];
        }
    }

    async assignPersonnel(incidentId, reportedById = null, assignedToId = null) {
        try {
            const incident = await this.getById(incidentId);
            if (reportedById !== null) incident.reportedBy = reportedById;
            if (assignedToId !== null) incident.assignedTo = assignedToId;
            return await this.update(incidentId, incident);
        } catch (error) {
            console.error('Error assigning personnel:', error);
            throw error;
        }
    }

    async unassignPersonnel(incidentId, clearReporter = false, clearAssigned = false) {
        try {
            const incident = await this.getById(incidentId);
            if (clearReporter) incident.reportedBy = null;
            if (clearAssigned) incident.assignedTo = null;
            return await this.update(incidentId, incident);
        } catch (error) {
            console.error('Error unassigning personnel:', error);
            throw error;
        }
    }

    // Incident types management
    async getIncidentTypes(projectId = null) {
        try {
            const defaultTypes = Incident.INCIDENT_TYPES.map(type => type.value);

            if (!projectId) {
                return defaultTypes;
            }

            const storageKey = `incident_types_project_${projectId}`;
            const storedTypes = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const allTypes = [...new Set([...defaultTypes, ...storedTypes])];
            return allTypes.sort();
        } catch (error) {
            console.error('Error getting incident types:', error);
            return Incident.INCIDENT_TYPES.map(type => type.value);
        }
    }

    async addIncidentTypeToProject(projectId, typeName) {
        try {
            if (!typeName || !typeName.trim()) {
                return false;
            }

            const cleanType = typeName.trim().toUpperCase().replace(/\s+/g, '_');
            const storageKey = `incident_types_project_${projectId}`;
            const storedTypes = JSON.parse(localStorage.getItem(storageKey) || '[]');

            if (!storedTypes.includes(cleanType)) {
                storedTypes.push(cleanType);
                localStorage.setItem(storageKey, JSON.stringify(storedTypes));
            }

            return true;
        } catch (error) {
            console.error('Error adding incident type:', error);
            return false;
        }
    }

    async getIncidentTypesWithStored(projectId) {
        try {
            const defaultTypes = Incident.INCIDENT_TYPES;

            if (!projectId) {
                return defaultTypes;
            }

            const storageKey = `incident_types_project_${projectId}`;
            const storedTypes = JSON.parse(localStorage.getItem(storageKey) || '[]');

            // Combine default types with stored custom types
            const customTypes = storedTypes.map(type => ({
                value: type,
                label: this.formatTypeLabel(type)
            }));

            const allTypes = [...defaultTypes, ...customTypes];
            return allTypes.sort((a, b) => a.label.localeCompare(b.label));
        } catch (error) {
            console.error('Error getting incident types:', error);
            return Incident.INCIDENT_TYPES;
        }
    }

    formatTypeLabel(type) {
        return type.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
    }

    // Status management methods
    async markAsInProgress(incidentId) {
        try {
            const incident = await this.getById(incidentId);
            incident.status = 'EN_PROGRESO';
            return await this.update(incidentId, incident);
        } catch (error) {
            console.error('Error marking incident as in progress:', error);
            throw error;
        }
    }

    async markAsResolved(incidentId) {
        try {
            const incident = await this.getById(incidentId);
            incident.markAsResolved();
            return await this.update(incidentId, incident);
        } catch (error) {
            console.error('Error marking incident as resolved:', error);
            throw error;
        }
    }

    async markAsClosed(incidentId) {
        try {
            const incident = await this.getById(incidentId);
            incident.markAsClosed();
            return await this.update(incidentId, incident);
        } catch (error) {
            console.error('Error marking incident as closed:', error);
            throw error;
        }
    }

    // Filtering methods
    async getIncidentsBySeverity(projectId, severity) {
        try {
            const incidents = await this.getByProject(projectId);
            return incidents.filter(incident => incident.severity === severity);
        } catch (error) {
            console.error('Error getting incidents by severity:', error);
            return [];
        }
    }

    async getIncidentsByStatus(projectId, status) {
        try {
            const incidents = await this.getByProject(projectId);
            return incidents.filter(incident => incident.status === status);
        } catch (error) {
            console.error('Error getting incidents by status:', error);
            return [];
        }
    }

    async getOpenIncidents(projectId) {
        try {
            const incidents = await this.getByProject(projectId);
            return incidents.filter(incident => incident.isOpen());
        } catch (error) {
            console.error('Error getting open incidents:', error);
            return [];
        }
    }

    async getCriticalIncidents(projectId) {
        try {
            const incidents = await this.getByProject(projectId);
            return incidents.filter(incident => incident.isCritical());
        } catch (error) {
            console.error('Error getting critical incidents:', error);
            return [];
        }
    }

    async getIncidentsByDateRange(projectId, startDate, endDate) {
        try {
            const incidents = await this.getByProject(projectId);
            return this.filterIncidentsByDateRange(incidents, startDate, endDate);
        } catch (error) {
            console.error('Error getting incidents by date range:', error);
            return [];
        }
    }

    // Image handling
    async compressImage(file, config = {}) {
        const defaultConfig = {
            maxWidth: 300,
            maxHeight: 300,
            quality: 0.7,
            maxSizeKB: 100,
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

                    const size = Math.min(width, height, 200);
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

    async uploadIncidentImage(file, projectId = null) {
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
                maxWidth: 200,
                maxHeight: 200,
                maxSizeKB: 50
            });

            return compressedImage;
        } catch (error) {
            console.error('Error processing incident image:', error);
            throw error;
        }
    }

    async uploadImage(file, projectId = null) {
        return await this.uploadIncidentImage(file, projectId);
    }

    // Statistics
    async getProjectStats(projectId) {
        if (!projectId) {
            throw new Error('Project ID is required');
        }

        try {
            const incidents = await this.getByProject(projectId);

            const stats = {
                totalIncidents: incidents.length,
                openIncidents: incidents.filter(i => i.isOpen()).length,
                criticalIncidents: incidents.filter(i => i.isCritical()).length,
                resolvedIncidents: incidents.filter(i => i.isResolved()).length,
                assignedIncidents: incidents.filter(i => i.isAssigned()).length,
                severityBreakdown: this.getSeverityBreakdown(incidents),
                statusBreakdown: this.getStatusBreakdown(incidents),
                typeBreakdown: this.getTypeBreakdown(incidents),
                recentIncidents: incidents.filter(i => {
                    const occurredDate = new Date(i.occurredAt);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return occurredDate >= weekAgo;
                }).length,
                averageResolutionDays: this.getAverageResolutionDays(incidents)
            };

            return stats;
        } catch (error) {
            console.error(`Error getting project stats ${projectId}:`, error);
            throw error;
        }
    }

    getSeverityBreakdown(incidents) {
        const severities = {};
        incidents.forEach(i => {
            if (i.severity) {
                severities[i.severity] = (severities[i.severity] || 0) + 1;
            }
        });
        return severities;
    }

    getStatusBreakdown(incidents) {
        const statuses = {};
        incidents.forEach(i => {
            if (i.status) {
                statuses[i.status] = (statuses[i.status] || 0) + 1;
            }
        });
        return statuses;
    }

    getTypeBreakdown(incidents) {
        const types = {};
        incidents.forEach(i => {
            if (i.incidentType) {
                const label = i.getIncidentTypeLabel();
                types[label] = (types[label] || 0) + 1;
            }
        });
        return types;
    }

    getAverageResolutionDays(incidents) {
        const resolvedIncidents = incidents.filter(i => i.resolvedAt);
        if (resolvedIncidents.length === 0) return 0;

        const totalDays = resolvedIncidents.reduce((sum, incident) => {
            return sum + incident.getDaysOpen();
        }, 0);

        return Math.round(totalDays / resolvedIncidents.length);
    }

    // Utility methods
    filterIncidentsByDateRange(incidents, startDate, endDate) {
        if (!startDate && !endDate) {
            return incidents;
        }

        return incidents.filter(incident => {
            const incidentDate = new Date(incident.occurredAt);
            const start = startDate ? new Date(startDate) : new Date('1900-01-01');
            const end = endDate ? new Date(endDate) : new Date('2100-12-31');

            return incidentDate >= start && incidentDate <= end;
        });
    }

    async deleteByProjectId(projectId) {
        if (!projectId) {
            throw new Error('Project ID is required');
        }

        try {
            const incidents = await this.getByProject(projectId);
            let deletedCount = 0;

            for (const incident of incidents) {
                try {
                    await this.delete(incident.id);
                    deletedCount++;
                } catch (error) {
                    console.error(`Error deleting incident ${incident.id}:`, error);
                }
            }

            return deletedCount;
        } catch (error) {
            console.error(`Error deleting project incidents ${projectId}:`, error);
            throw error;
        }
    }

    // Get incidents by assignment
    async getUnassignedIncidents(projectId) {
        try {
            const incidents = await this.getByProject(projectId);
            return incidents.filter(incident => !incident.assignedTo && incident.isOpen());
        } catch (error) {
            console.error('Error getting unassigned incidents:', error);
            return [];
        }
    }

    async getIncidentsByReporter(reporterId, projectId) {
        try {
            const incidents = await this.getByProject(projectId);
            return incidents.filter(incident => incident.reportedBy === reporterId);
        } catch (error) {
            console.error('Error getting incidents by reporter:', error);
            return [];
        }
    }

    async getIncidentsByAssignee(assigneeId, projectId) {
        try {
            const incidents = await this.getByProject(projectId);
            return incidents.filter(incident => incident.assignedTo === assigneeId);
        } catch (error) {
            console.error('Error getting incidents by assignee:', error);
            return [];
        }
    }

    // Export functionality usando XLSX
    async exportToExcel(incidentsData, fileName = 'incidentes') {
        try {
            const exportData = incidentsData.map(incident => ({
                'Título': incident.title || '',
                'Descripción': incident.description || '',
                'Tipo': incident.getIncidentTypeLabel() || incident.incidentType || '',
                'Severidad': incident.getSeverityLabel() || incident.severity || '',
                'Estado': incident.getStatusLabel() || incident.status || '',
                'Ubicación': incident.location || '',
                'Fecha Ocurrencia': Incident.formatPeruDateTime(incident.occurredAt),
                'Fecha Resolución': incident.resolvedAt ? Incident.formatPeruDateTime(incident.resolvedAt) : 'Sin resolver',
                'Días Abierto': incident.getDaysOpen(),
                'Reportado Por': incident.reportedBy || 'Sin asignar',
                'Asignado A': incident.assignedTo || 'Sin asignar',
                'Notas': incident.notes || '',
                'Fecha Registro': Incident.formatPeruDate(incident.registerDate),
                'Última Actualización': Incident.formatPeruDateTime(incident.updatedAt)
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportData);
            XLSX.utils.book_append_sheet(wb, ws, 'Incidentes');

            const finalFileName = `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, finalFileName);

            return true;
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            throw error;
        }
    }
}

export const incidentApiService = new IncidentApiService();
import { BaseService } from "../../../core/services/base.service.js";
import { Incident } from '../models/incident.entity.js';
import http from "../../../core/services/http.service.js";

export class IncidentApiService extends BaseService {
    constructor() {
        super('/incident');
    }

    // GET /api/v1/incident/project/{projectId}
    async getByProject(projectId) {
        try {
            const response = await http.get(`/incident/project/${projectId}`);

            // AGREGAR ESTAS LÍNEAS PARA DEBUG:
            console.log('🔍 Backend response:', response.data);
            console.log('🔍 First incident from backend:', response.data[0]);

            return response.data || [];
        } catch (error) {
            console.error(`Error fetching project incidents ${projectId}:`, error);
            return [];
        }
    }

    // GET /api/v1/incident/{id}
    async getById(id) {
        try {
            const response = await http.get(`/incident/${id}`);
            return Incident.fromAPI(response.data);
        } catch (error) {
            console.error(`Error fetching incident ${id}:`, error);
            throw error;
        }
    }

    // POST /api/v1/incident (multipart/form-data)
    async create(incident) {
        try {
            const formData = this.createFormData(incident);
            const response = await http.post('/incident', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return Incident.fromAPI(response.data);
        } catch (error) {
            console.error('Error creating incident:', error);
            throw error;
        }
    }

    // PUT /api/v1/incident/{id} (multipart/form-data)
    async update(id, incident) {
        try {
            const formData = this.createFormData(incident, true);
            const response = await http.put(`/incident/${id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return Incident.fromAPI(response.data);
        } catch (error) {
            console.error(`Error updating incident ${id}:`, error);
            throw error;
        }
    }


// Agregar estos métodos a tu incident.service.js:

    async delete(id) {
        try {
            await http.delete(`/incident/${id}`);
            return true;
        } catch (error) {
            console.error(`Error deleting incident ${id}:`, error);
            throw error;
        }
    }

// ✅ Método para eliminar múltiples incidents (para selección masiva)
    async deleteMultiple(ids) {
        try {
            // Ejecutar eliminaciones en paralelo
            const deletePromises = ids.map(id => this.delete(id));
            await Promise.all(deletePromises);
            return true;
        } catch (error) {
            console.error('Error deleting multiple incidents:', error);
            throw error;
        }
    }

    // Crear FormData para tu backend
    createFormData(incident, isUpdate = false) {
        const formData = new FormData();

        // Campos básicos
        if (incident.projectId) formData.append('ProjectId', incident.projectId.toString());
        formData.append('Title', incident.title || '');
        formData.append('Description', incident.description || '');
        formData.append('IncidentType', incident.incidentType || '');

        // Mapear severity/status al formato del backend
        formData.append('Severity', this.mapSeverityToBackend(incident.severity));
        formData.append('Status', this.mapStatusToBackend(incident.status));

        formData.append('Location', incident.location || '');
        formData.append('Notes', incident.notes || '');

        // Personal (opcional)
        if (incident.reportedBy) formData.append('ReportedBy', incident.reportedBy);
        if (incident.assignedTo) formData.append('AssignedTo', incident.assignedTo);

        // Fechas
        if (incident.occurredAt) {
            const date = incident.occurredAt instanceof Date
                ? incident.occurredAt
                : new Date(incident.occurredAt);
            formData.append('OccurredAt', date.toISOString());
        }

        if (isUpdate && incident.resolvedAt) {
            const date = incident.resolvedAt instanceof Date
                ? incident.resolvedAt
                : new Date(incident.resolvedAt);
            formData.append('ResolvedAt', date.toISOString());
        }

        // Imagen como archivo
        if (incident.imageFile && incident.imageFile instanceof File) {
            formData.append('Image', incident.imageFile);
        }

        return formData;
    }

    // Mapear frontend -> backend
    mapSeverityToBackend(severity) {
        const mapping = {
            'BAJO': 'Low',
            'MEDIO': 'Medio',
            'ALTO': 'High'
        };
        return mapping[severity] || 'Medio';
    }

    mapStatusToBackend(status) {
        const mapping = {
            'REPORTADO': 'Reportado',
            'EN_PROGRESO': 'InProgress',
            'RESUELTO': 'Resolved'
        };
        return mapping[status] || 'Reportado';
    }

    // Procesamiento básico de imagen
    async processImage(file) {
        if (!file || !(file instanceof File)) return null;

        if (!file.type.startsWith('image/')) {
            throw new Error('El archivo debe ser una imagen');
        }

        if (file.size > 5 * 1024 * 1024) {
            throw new Error('La imagen es muy grande. Máximo 5MB');
        }

        return file;
    }
}

export const incidentApiService = new IncidentApiService();
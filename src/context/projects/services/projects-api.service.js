import { BaseService } from '../../../core/services/base.service'

class ProjectsService extends BaseService {
    constructor() {
        super('/projects') // Esta ruta debe coincidir con la usada en tu fake API (json-server)
    }

    /**
     * Obtiene proyectos por manager
     * @param {string|number} managerId - ID del manager
     * @returns {Promise} - Proyectos del manager
     */
    getProjectsByManager(managerId) {
        return this.getAll({ managerId }) // /projects?managerId=123
    }

    /**
     * Crea un nuevo proyecto con manejo mejorado de imágenes
     * @param {Object} projectData - Datos del proyecto
     * @returns {Promise} - Proyecto creado
     */
    async createProject(projectData) {
        // Asegurarse de que el ID esté presente
        if (!projectData.id) {
            projectData.id = `p${Date.now()}`;
        }

        // Usamos el método mejorado de create de BaseService
        return this.create(projectData);
    }

    /**
     * Sube una imagen para un proyecto
     * @param {File} file - Archivo de imagen
     * @returns {Promise<string>} - URL de la imagen
     */
    async uploadProjectImage(file) {
        // En un entorno real, aquí se implementaría la lógica para subir la imagen a un servidor
        // Para esta simulación, devolvemos una URL ficticia

        // Simular un retraso de red
        await new Promise(resolve => setTimeout(resolve, 500));

        if (!file) {
            return '/images/proyecto-default.jpg';
        }

        try {
            // En un entorno real, aquí se usaría FormData para subir la imagen
            // const formData = new FormData();
            // formData.append('image', file);
            // const response = await http.post('/upload', formData, {
            //   headers: {
            //     'Content-Type': 'multipart/form-data'
            //   }
            // });
            // return response.data.imageUrl;

            // Simular una URL para la imagen
            const imageUrl = URL.createObjectURL(file);
            return imageUrl;
        } catch (error) {
            console.error('Error al procesar la imagen:', error);
            return '/images/proyecto-default.jpg';
        }
    }

    /**
     * Obtiene un proyecto con información detallada
     * @param {string|number} projectId - ID del proyecto
     * @returns {Promise} - Proyecto con detalles
     */
    async getProjectWithDetails(projectId) {
        const project = await this.getById(projectId);

        // Aquí podrías hacer peticiones adicionales para obtener información relacionada
        // Por ejemplo, personal del proyecto, documentos, etc.

        return project.data;
    }

    /**
     * Actualiza un proyecto existente
     * @param {string|number} projectId - ID del proyecto
     * @param {Object} updateData - Datos a actualizar
     * @returns {Promise} - Proyecto actualizado
     */
    async updateProject(projectId, updateData) {
        // Usamos el método mejorado de update de BaseService
        return this.update(projectId, updateData);
    }

    /**
     * Asigna un supervisor a un proyecto
     * @param {string|number} projectId - ID del proyecto
     * @param {string|number} supervisorId - ID del supervisor
     * @returns {Promise} - Proyecto actualizado
     */
    async assignSupervisor(projectId, supervisorId) {
        return this.update(projectId, { supervisorId });
    }

    /**
     * Cambia el estado de un proyecto
     * @param {string|number} projectId - ID del proyecto
     * @param {string} state - Nuevo estado
     * @returns {Promise} - Proyecto actualizado
     */
    async changeProjectState(projectId, state) {
        return this.update(projectId, { state });
    }
}

export const projectService = new ProjectsService()
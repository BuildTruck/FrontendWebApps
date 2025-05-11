import { BaseService } from '../../../core/services/base.service'
import http from '../../../core/services/http.service'
import { Projects } from '../models/projects.entity'

class ProjectsService extends BaseService {
    constructor() {
        super('/projects')
    }

    /**
     * Obtiene proyectos por manager
     * @param {string|number} managerId - ID del manager
     * @returns {Promise} - Proyectos del manager
     */
    async getProjectsByManager(managerId) {
        try {
            const response = await this.getAll({ managerId });
            // Convertir los datos a instancias de Projects
            if (response.data && Array.isArray(response.data)) {
                response.data = response.data.map(project => new Projects(project));
            }
            return response;
        } catch (error) {
            console.error('Error obteniendo proyectos del manager:', error);
            throw error;
        }
    }

    /**
     * Crea un nuevo proyecto con manejo mejorado de imágenes
     * @param {Projects} project - Instancia de la entidad Projects
     * @returns {Promise} - Proyecto creado
     */
    async createProject(project) {
        try {
            // Validar que sea una instancia de Projects
            if (!(project instanceof Projects)) {
                project = new Projects(project);
            }

            // Verificar si el supervisor está disponible
            if (project.supervisorId) {
                const supervisorAvailable = await this.validateSupervisorAvailability(project.supervisorId);
                if (!supervisorAvailable) {
                    throw new Error('El supervisor seleccionado ya tiene un proyecto asignado o no existe');
                }
            }

            // Crear el proyecto
            const response = await this.create(project.toJSON());
            const newProject = new Projects(response.data);

            // Actualizar el manager
            if (project.managerId) {
                await this.updateManagerProjects(project.managerId, newProject.id);
            }

            // MODIFICACIÓN: Actualizar directamente el usuario supervisor
            if (project.supervisorId) {
                // Solo actualizar el usuario supervisor, no el proyecto
                const supervisorResponse = await http.get(`/users/${project.supervisorId}`);
                const supervisor = supervisorResponse.data;
                supervisor.projectId = newProject.id;
                await http.put(`/users/${project.supervisorId}`, supervisor);
            }

            return response;
        } catch (error) {
            console.error('Error creando proyecto:', error);
            throw error;
        }
    }

    /**
     * Valida si un supervisor está disponible para asignación
     * @param {string|number} supervisorId - ID del supervisor
     * @returns {Promise<boolean>} - True si está disponible, false si no
     */
    async validateSupervisorAvailability(supervisorId) {
        try {
            const response = await http.get(`/users/${supervisorId}`);
            const supervisor = response.data;

            return supervisor &&
                supervisor.role === 'supervisor' &&
                !supervisor.projectId;
        } catch (error) {
            console.error('Error validando disponibilidad del supervisor:', error);
            return false;
        }
    }

    /**
     * Sube una imagen para un proyecto
     * @param {File} file - Archivo de imagen
     * @returns {Promise<string>} - URL de la imagen
     */
    async uploadProjectImage(file) {
        if (!file) {
            return '/images/proyecto-default.jpg';
        }

        try {
            // Simular URL de imagen para demo
            const imageUrl = URL.createObjectURL(file);
            return imageUrl;
        } catch (error) {
            console.error('Error procesando imagen:', error);
            return '/images/proyecto-default.jpg';
        }
    }

    /**
     * Actualiza la lista de proyectos de un manager
     * @param {string|number} managerId - ID del manager
     * @param {string} projectId - ID del proyecto a añadir
     */
    async updateManagerProjects(managerId, projectId) {
        try {
            const response = await http.get(`/users/${managerId}`);
            const manager = response.data;

            if (!manager || manager.role !== 'manager') {
                throw new Error('Manager no encontrado o rol incorrecto');
            }

            if (!manager.projects) {
                manager.projects = [];
            }

            if (!manager.projects.includes(projectId)) {
                manager.projects.push(projectId);
                await http.put(`/users/${managerId}`, manager);
            }
        } catch (error) {
            console.error('Error actualizando proyectos del manager:', error);
            throw error;
        }
    }

    /**
     * Asigna un proyecto a un supervisor
     * @param {string|number} supervisorId - ID del supervisor
     * @param {string} projectId - ID del proyecto
     */
    async assignSupervisorToProject(supervisorId, projectId) {
        try {
            const response = await http.get(`/users/${supervisorId}`);
            const supervisor = response.data;

            if (!supervisor || supervisor.role !== 'supervisor') {
                throw new Error('Supervisor no encontrado o rol incorrecto');
            }

            if (supervisor.projectId && supervisor.projectId !== projectId) {
                throw new Error('Este supervisor ya tiene un proyecto asignado');
            }

            // Actualizar el supervisor
            supervisor.projectId = projectId;
            await http.put(`/users/${supervisorId}`, supervisor);

            // MODIFICACIÓN: No actualizar el proyecto aquí, ya que sobreescribe todos los datos
            // return this.update(projectId, { supervisorId });

            // En su lugar, podemos verificar que el proyecto tenga este supervisor
            const projectResponse = await http.get(`/projects/${projectId}`);
            const project = projectResponse.data;

            // Solo actualizar si es necesario
            if (project.supervisorId !== supervisorId) {
                // Asegurarse de no perder ningún dato del proyecto original
                const updatedProject = {
                    ...project,
                    supervisorId: supervisorId,
                    updatedAt: new Date().toISOString()
                };

                return this.update(projectId, updatedProject);
            }

            return { data: project };
        } catch (error) {
            console.error('Error asignando supervisor:', error);
            throw error;
        }
    }

    /**
     * Obtiene un proyecto por ID y lo convierte a la entidad Projects
     * @param {string|number} projectId - ID del proyecto
     * @returns {Promise<Projects>} - Instancia de Projects
     */
    async getProjectById(projectId) {
        try {
            const response = await this.getById(projectId);
            return new Projects(response.data);
        } catch (error) {
            console.error('Error obteniendo proyecto:', error);
            throw error;
        }
    }

    /**
     * Actualiza un proyecto usando la entidad Projects
     * @param {string|number} projectId - ID del proyecto
     * @param {Object} updateData - Datos para actualizar
     * @returns {Promise<Projects>} - Proyecto actualizado
     */
    async updateProject(projectId, updateData) {
        try {
            // Obtener el proyecto actual
            const currentProject = await this.getProjectById(projectId);

            // Si hay cambio de supervisor, manejar la relación
            if (updateData.supervisorId !== undefined &&
                updateData.supervisorId !== currentProject.supervisorId) {

                // Liberar supervisor actual si existe
                if (currentProject.supervisorId) {
                    await this.removeSupervisorFromProject(currentProject.supervisorId);
                }

                // Asignar nuevo supervisor si se proporciona
                if (updateData.supervisorId) {
                    const available = await this.validateSupervisorAvailability(updateData.supervisorId);
                    if (!available) {
                        throw new Error('El supervisor no está disponible');
                    }
                    await this.assignSupervisorToProject(updateData.supervisorId, projectId);
                }
            }

            // Actualizar el proyecto
            updateData.updatedAt = new Date().toISOString();
            const response = await this.update(projectId, updateData);

            return new Projects(response.data);
        } catch (error) {
            console.error('Error actualizando proyecto:', error);
            throw error;
        }
    }

    /**
     * Cambia el estado de un proyecto usando el método de la entidad
     * @param {string|number} projectId - ID del proyecto
     * @param {string} newState - Nuevo estado
     * @returns {Promise<Projects>} - Proyecto actualizado
     */
    async changeProjectState(projectId, newState) {
        try {
            // Obtener proyecto actual
            const project = await this.getProjectById(projectId);

            // Usar el método de la entidad
            project.updateState(newState);

            // Guardar los cambios
            const response = await this.update(projectId, project.toJSON());
            return new Projects(response.data);
        } catch (error) {
            console.error('Error cambiando estado del proyecto:', error);
            throw error;
        }
    }

    /**
     * Actualiza el progreso de un proyecto usando el método de la entidad
     * @param {string|number} projectId - ID del proyecto
     * @param {number} progress - Nuevo porcentaje de progreso
     * @returns {Promise<Projects>} - Proyecto actualizado
     */
    async updateProjectProgress(projectId, progress) {
        try {
            // Obtener proyecto actual
            const project = await this.getProjectById(projectId);

            // Usar el método de la entidad
            project.updateProgress(progress);

            // Guardar los cambios
            const response = await this.update(projectId, project.toJSON());
            return new Projects(response.data);
        } catch (error) {
            console.error('Error actualizando progreso del proyecto:', error);
            throw error;
        }
    }

    /**
     * Libera a un supervisor de un proyecto
     * @param {string|number} supervisorId - ID del supervisor
     */
    async removeSupervisorFromProject(supervisorId) {
        try {
            const response = await http.get(`/users/${supervisorId}`);
            const supervisor = response.data;

            if (supervisor && supervisor.role === 'supervisor') {
                supervisor.projectId = null;
                await http.put(`/users/${supervisorId}`, supervisor);
            }
        } catch (error) {
            console.error('Error liberando supervisor:', error);
            throw error;
        }
    }

    /**
     * Elimina un proyecto y todas sus relaciones
     * @param {string|number} projectId - ID del proyecto
     * @returns {Promise} - Resultado de la eliminación
     */
    async deleteProject(projectId) {
        try {
            // Obtener proyecto para conocer relaciones
            const project = await this.getProjectById(projectId);

            // Liberar supervisor si existe
            if (project.supervisorId) {
                await this.removeSupervisorFromProject(project.supervisorId);
            }

            // Remover de la lista del manager
            if (project.managerId) {
                await this.removeProjectFromManager(project.managerId, project.id);
            }

            // Eliminar el proyecto
            return this.delete(projectId);
        } catch (error) {
            console.error('Error eliminando proyecto:', error);
            throw error;
        }
    }

    /**
     * Elimina un proyecto de la lista de un manager
     * @param {string|number} managerId - ID del manager
     * @param {string} projectId - ID del proyecto
     */
    async removeProjectFromManager(managerId, projectId) {
        try {
            const response = await http.get(`/users/${managerId}`);
            const manager = response.data;

            if (manager && manager.role === 'manager' && manager.projects) {
                manager.projects = manager.projects.filter(id => id !== projectId);
                await http.put(`/users/${managerId}`, manager);
            }
        } catch (error) {
            console.error('Error eliminando proyecto del manager:', error);
            throw error;
        }
    }

    /**
     * Crea un proyecto con todos los campos completos
     * @param {Projects} project - Instancia de la entidad Projects
     * @returns {Promise} - Proyecto creado completo
     */
    async createFullProject(project) {
        try {
            // Validar que sea una instancia de Projects
            if (!(project instanceof Projects)) {
                project = new Projects(project);
            }

            // Verificar si el supervisor está disponible
            if (project.supervisorId) {
                const supervisorAvailable = await this.validateSupervisorAvailability(project.supervisorId);
                if (!supervisorAvailable) {
                    throw new Error('El supervisor seleccionado ya tiene un proyecto asignado o no existe');
                }
            }

            // Asegurar que todos los campos estén completos (importante para json-server)
            const fullProjectData = {
                id: project.id,
                name: project.name || '',
                description: project.description || '',
                image: project.image || '/images/proyecto-default.jpg',
                managerId: project.managerId || '',
                location: project.location || '',
                startDate: project.startDate || '',
                endDate: project.state === 'Finalizado' ? new Date().toISOString() : '',
                supervisorId: project.supervisorId || '',
                state: project.state || 'En estudio',
                progress: project.progress || 0,
                createdAt: project.createdAt || new Date().toISOString(),
                updatedAt: project.updatedAt || new Date().toISOString()
            };

            // Crear el proyecto con datos completos
            const response = await this.create(fullProjectData);
            const newProject = new Projects(response.data);

            // Actualizar el manager
            if (project.managerId) {
                await this.updateManagerProjects(project.managerId, newProject.id);
            }

            // Actualizar el supervisor
            if (project.supervisorId) {
                await this.assignSupervisorToProject(project.supervisorId, newProject.id);
            }

            return response;
        } catch (error) {
            console.error('Error creando proyecto completo:', error);
            throw error;
        }
    }

}

export const projectService = new ProjectsService()
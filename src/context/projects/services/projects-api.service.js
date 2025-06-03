import { BaseService } from '../../../core/services/base.service'
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
            // Primero intentar con filtro
            let response;
            try {
                response = await this.getAll({ managerId });
            } catch (filterError) {
                console.log('Filtro no funciona en MockAPI, obteniendo todos los proyectos...');

                response = await this.getAll();

                if (response.data && Array.isArray(response.data)) {
                    response.data = response.data.filter(project =>
                        project.managerId == managerId || project.managerId === managerId
                    );
                }
            }

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
     * Obtiene supervisores disponibles usando BaseService
     * @returns {Promise} - Lista de supervisores disponibles
     */
    async getAvailableSupervisors() {
        try {
            // Usar BaseService para obtener usuarios supervisores
            const userService = new BaseService('/users');
            const response = await userService.getAll({ role: 'supervisor' });

            // Filtrar solo los que no tienen proyecto asignado
            const availableSupervisors = response.data
                .filter(supervisor => !supervisor.projectId)
                .map(supervisor => ({
                    value: supervisor.id.toString(),
                    label: supervisor.name,
                    email: supervisor.email
                }));

            return { data: availableSupervisors };
        } catch (error) {
            console.error('Error obteniendo supervisores disponibles:', error);
            throw error;
        }
    }

    /**
     * Busca supervisor por email usando BaseService
     * @param {string} email - Email del supervisor
     * @returns {Promise} - Supervisor encontrado
     */
    async getSupervisorByEmail(email) {
        try {
            const userService = new BaseService('/users');
            const response = await userService.getAll({ email, role: 'supervisor' });

            if (response.data && response.data.length > 0) {
                return { data: response.data[0] };
            }

            return { data: null };
        } catch (error) {
            console.error('Error buscando supervisor por email:', error);
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
            const userService = new BaseService('/users');
            const response = await userService.getById(supervisorId);
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
     * Redimensiona y comprime una imagen
     * @param {File} file - Archivo de imagen original
     * @param {number} maxWidth - Ancho máximo en píxeles
     * @param {number} maxHeight - Alto máximo en píxeles
     * @param {number} quality - Calidad de compresión (0-1)
     * @returns {Promise<string>} - Imagen comprimida en base64
     */
    async compressImage(file, maxWidth = 800, maxHeight = 600, quality = 0.7) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                // Calcular nuevas dimensiones manteniendo proporción
                let { width, height } = img;

                if (width > height) {
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }
                }


                // Configurar canvas
                canvas.width = Math.min(width, 300);  // Máximo 300px ancho
                canvas.height = Math.min(height, 200);

                // Dibujar imagen redimensionada
                ctx.drawImage(img, 0, 0, width, height);

                // Convertir a base64 con compresión
                const compressedBase64 = canvas.toDataURL('image/webp', 0.2);

                console.log(`Imagen comprimida: ${Math.round(compressedBase64.length / 1024)}KB`);
                resolve(compressedBase64);
            };

            img.onerror = () => {
                console.error('Error cargando imagen para comprimir');
                resolve('/images/proyecto-default.jpg');
            };

            // Crear URL para la imagen
            img.src = URL.createObjectURL(file);
        });
    }

    /**
     * Valida el tamaño del archivo
     * @param {File} file - Archivo a validar
     * @param {number} maxSizeMB - Tamaño máximo en MB
     * @returns {boolean} - True si es válido
     */
    validateFileSize(file, maxSizeMB = 5) {
        if (!file) return true;

        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        return file.size <= maxSizeBytes;
    }

    /**
     * Sube una imagen para un proyecto con compresión automática
     * @param {File} file - Archivo de imagen
     * @returns {Promise<string>} - URL de la imagen
     */
    async uploadProjectImage(file) {
        console.log("uploadProjectImage recibió:", file);

        if (!file || !(file instanceof File)) {
            console.log("No hay archivo válido, usando imagen predeterminada");
            return '/images/proyecto-default.jpg';
        }

        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            console.error("El archivo no es una imagen válida");
            throw new Error('El archivo debe ser una imagen (JPG, PNG, etc.)');
        }

        // Validar tamaño original
        if (!this.validateFileSize(file, 10)) { // Máximo 10MB original
            throw new Error('La imagen es demasiado grande. Máximo 10MB permitido.');
        }

        try {
            console.log(`Procesando imagen: ${file.name} (${Math.round(file.size / 1024)}KB)`);

            // Comprimir imagen
            const compressedImage = await this.compressImage(file, 300, 200, 0.2);

            // Validar tamaño final (base64)
            const finalSizeKB = Math.round(compressedImage.length / 1024);
            console.log(`Imagen final: ${finalSizeKB}KB`);

            // Si aún es muy grande, comprimir más
            if (finalSizeKB > 500) { // Si es mayor a 500KB
                console.log("Imagen aún muy grande, comprimiendo más...");
                const moreCompressed = await this.compressImage(file, 600, 400, 0.5);
                return moreCompressed;
            }

            return compressedImage;
        } catch (error) {
            console.error('Error procesando imagen:', error);
            throw error;
        }
    }

    /**
     * Actualiza la lista de proyectos de un manager
     * @param {string|number} managerId - ID del manager
     * @param {string} projectId - ID del proyecto a añadir
     */
    async updateManagerProjects(managerId, projectId) {
        try {
            const userService = new BaseService('/users');
            const response = await userService.getById(managerId);
            const manager = response.data;

            if (!manager || manager.role !== 'manager') {
                throw new Error('Manager no encontrado o rol incorrecto');
            }

            if (!manager.projects) {
                manager.projects = [];
            }

            if (!manager.projects.includes(projectId)) {
                manager.projects.push(projectId);
                await userService.update(managerId, manager);
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
            const userService = new BaseService('/users');
            const response = await userService.getById(supervisorId);
            const supervisor = response.data;

            if (!supervisor || supervisor.role !== 'supervisor') {
                throw new Error('Supervisor no encontrado o rol incorrecto');
            }

            if (supervisor.projectId && supervisor.projectId !== projectId) {
                throw new Error('Este supervisor ya tiene un proyecto asignado');
            }

            // Actualizar el supervisor
            supervisor.projectId = projectId;
            await userService.update(supervisorId, supervisor);

            return { data: supervisor };
        } catch (error) {
            console.error('Error asignando supervisor:', error);
            throw error;
        }
    }

    /**
     * Crea un proyecto completo con todas las relaciones
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

            // Crear fecha con zona horaria de Perú
            const peruTime = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Lima" })).toISOString();

            // Asegurar que todos los campos estén completos
            const fullProjectData = {
                id: project.id,
                name: project.name || '',
                description: project.description || '',
                image: project.image || '/images/proyecto-default.jpg',
                managerId: project.managerId || '',
                location: project.location || '',
                coordinates: project.coordinates || null,
                start_date: project.start_date || '',
                supervisorId: project.supervisorId || '',
                state: project.state || 'En estudio',
                createdAt: peruTime,
                updatedAt: peruTime
            };

            console.log('Creando proyecto con datos:', {
                ...fullProjectData,
                image: fullProjectData.image.length > 100 ?
                    `[Base64 image: ${Math.round(fullProjectData.image.length / 1024)}KB]` :
                    fullProjectData.image
            });

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
            // Actualizar fecha con zona horaria de Perú
            updateData.updatedAt = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Lima" })).toISOString();

            const response = await this.update(projectId, updateData);
            return new Projects(response.data);
        } catch (error) {
            console.error('Error actualizando proyecto:', error);
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
     * Libera a un supervisor de un proyecto
     * @param {string|number} supervisorId - ID del supervisor
     */
    async removeSupervisorFromProject(supervisorId) {
        try {
            const userService = new BaseService('/users');
            const response = await userService.getById(supervisorId);
            const supervisor = response.data;

            if (supervisor && supervisor.role === 'supervisor') {
                supervisor.projectId = null;
                await userService.update(supervisorId, supervisor);
            }
        } catch (error) {
            console.error('Error liberando supervisor:', error);
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
            const userService = new BaseService('/users');
            const response = await userService.getById(managerId);
            const manager = response.data;

            if (manager && manager.role === 'manager' && manager.projects) {
                manager.projects = manager.projects.filter(id => id !== projectId);
                await userService.update(managerId, manager);
            }
        } catch (error) {
            console.error('Error eliminando proyecto del manager:', error);
            throw error;
        }
    }

    /**
     * Obtiene un supervisor específico por su ID
     * @param {string} supervisorId - ID del supervisor
     * @returns {Promise<Object>} - Supervisor encontrado
     */
    async getSupervisorById(supervisorId) {
        try {
            // ✅ Usar BaseService como los otros métodos
            const userService = new BaseService('/users');
            const response = await userService.getById(supervisorId);
            const user = response.data;

            // Verificar que sea un supervisor
            if (!user || user.role !== 'supervisor') {
                throw new Error('Supervisor no encontrado o rol incorrecto');
            }

            return {
                success: true,
                data: user
            };
        } catch (error) {
            console.error('Error al obtener supervisor:', error);
            throw new Error(`Error al obtener supervisor: ${error.message}`);
        }
    }
}

export const projectService = new ProjectsService()
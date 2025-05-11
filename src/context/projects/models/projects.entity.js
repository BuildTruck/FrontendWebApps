/**
 * Clase entidad para representar un proyecto
 */
export class Projects {
    /**
     * Constructor para crear una nueva instancia de Proyecto
     * @param {Object} params - Parámetros del proyecto
     * @param {string} [params.id] - ID único del proyecto
     * @param {string} params.name - Nombre del proyecto
     * @param {string} params.description - Descripción del proyecto
     * @param {string} [params.image] - URL de la imagen del proyecto
     * @param {number|string} params.managerId - ID del gerente responsable
     * @param {string} [params.location] - Ubicación del proyecto
     * @param {string} [params.startDate] - Fecha de inicio estimada
     * @param {string} [params.endDate] - Fecha de finalización estimada
     * @param {string} [params.supervisorId] - ID del supervisor asignado
     * @param {string} [params.state] - Estado actual del proyecto
     * @param {number} [params.progress] - Porcentaje de avance (0-100)
     * @param {string} [params.createdAt] - Fecha de creación del registro
     * @param {string} [params.updatedAt] - Fecha de última actualización
     */
    constructor({
                    id,
                    name,
                    description,
                    image,
                    managerId,
                    location = '',
                    startDate = null,
                    endDate = null,
                    supervisorId = null,
                    state = 'En estudio',
                    progress = 0,
                    createdAt = new Date().toISOString(),
                    updatedAt = new Date().toISOString()
                }) {
        this.id = id || `p${Date.now()}`
        this.name = name
        this.description = description
        this.image = image || '/images/proyecto-default.jpg'
        this.managerId = managerId
        this.location = location
        this.startDate = startDate
        this.endDate = endDate
        this.supervisorId = supervisorId
        this.state = state
        this.progress = progress
        this.createdAt = createdAt
        this.updatedAt = updatedAt
    }

    /**
     * Convierte la instancia a un objeto JSON para enviar a la API
     * @returns {Object} - Representación JSON del proyecto
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            image: this.image,
            managerId: this.managerId,
            location: this.location,
            startDate: this.startDate,
            endDate: this.endDate,
            supervisorId: this.supervisorId,
            state: this.state,
            progress: this.progress,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        }
    }

    /**
     * Estado del avance del proyecto en formato legible
     * @returns {string} - Descripción del estado de avance
     */
    getProgressStatus() {
        if (this.progress < 25) return 'Fase inicial'
        if (this.progress < 50) return 'En desarrollo'
        if (this.progress < 75) return 'Avanzado'
        if (this.progress < 100) return 'Etapa final'
        return 'Completado'
    }

    /**
     * Actualiza el estado del proyecto y su fecha de actualización
     * @param {string} newState - Nuevo estado
     */
    updateState(newState) {
        this.state = newState
        this.updatedAt = new Date().toISOString()
    }

    /**
     * Actualiza el progreso del proyecto
     * @param {number} progress - Nuevo porcentaje de progreso (0-100)
     */
    updateProgress(progress) {
        this.progress = Math.min(Math.max(0, progress), 100) // Asegurar que esté entre 0 y 100
        this.updatedAt = new Date().toISOString()
    }
}
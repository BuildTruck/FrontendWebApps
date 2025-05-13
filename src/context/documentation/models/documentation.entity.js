/**
 * Documentation entity
 * Representa una imagen con descripción asociada a un proyecto
 */
export class Documentation {
    constructor(data = {}) {
        this.id = data.id || null
        this.projectId = data.projectId || null
        this.title = data.title || ''
        this.description = data.description || ''
        this.imagePath = data.imagePath || ''
        this.date = data.date || new Date().toISOString().split('T')[0]
        this.createdAt = data.createdAt || new Date().toISOString()
        this.updatedAt = data.updatedAt || new Date().toISOString()
        this.createdBy = data.createdBy || null
    }

    /**
     * Convierte un objeto de datos plano a una instancia de Documentation
     * @param {Object} data - Datos del documento
     * @returns {Documentation} - Instancia de Documentation
     */
    static fromJson(data) {
        return new Documentation(data)
    }

    /**
     * Convierte un array de objetos a instancias de Documentation
     * @param {Array} data - Array de datos
     * @returns {Array<Documentation>} - Array de instancias de Documentation
     */
    static fromJsonArray(data) {
        if (!data || !Array.isArray(data)) return []
        return data.map(item => Documentation.fromJson(item))
    }

    /**
     * Convierte la instancia a un objeto plano para enviar al API
     * @returns {Object} - Objeto plano
     */
    toJson() {
        return {
            id: this.id,
            projectId: this.projectId,
            title: this.title,
            description: this.description,
            imagePath: this.imagePath,
            date: this.date,
            createdAt: this.createdAt,
            updatedAt: new Date().toISOString()
        }
    }
}
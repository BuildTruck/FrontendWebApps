export class Documentation {
    constructor(data = {}) {
        this.id = data.id || null
        this.projectId = data.projectId || null
        this.title = data.title || ''
        this.description = data.description || ''
        this.imagePath = data.imagePath || ''
        this.date = data.date || this.getCurrentDatePeru()
        this.createdAt = data.createdAt || this.getCurrentDateTimePeru()
        this.updatedAt = data.updatedAt || this.getCurrentDateTimePeru()
        this.createdBy = data.createdBy || null
    }

    getCurrentDatePeru() {
        return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Lima" })
    }

    getCurrentDateTimePeru() {
        return new Date().toLocaleString("sv-SE", {
            timeZone: "America/Lima",
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).replace(' ', 'T') + '-05:00'
    }

    validate() {
        const errors = {}
        if (!this.projectId) errors.projectId = 'El ID del proyecto es obligatorio'
        if (!this.title?.trim()) errors.title = 'El título es obligatorio'
        if (!this.description?.trim()) errors.description = 'La descripción es obligatoria'
        if (!this.imagePath) errors.imagePath = 'La imagen es obligatoria'
        if (!this.date) errors.date = 'La fecha es obligatoria'

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        }
    }

    belongsToProject(projectId) {
        return this.projectId && this.projectId.toString() === projectId.toString()
    }

    static fromJson(data) {
        if (!data) return null
        return new Documentation(data)
    }

    static fromJsonArray(data) {
        if (!data || !Array.isArray(data)) return []
        return data.map(item => Documentation.fromJson(item)).filter(Boolean)
    }

    static filterByProject(documents, projectId) {
        if (!documents || !Array.isArray(documents)) return []
        return documents.filter(doc => doc && doc.belongsToProject && doc.belongsToProject(projectId))
    }

    toJson() {
        return {
            id: this.id,
            projectId: this.projectId,
            title: this.title,
            description: this.description,
            imagePath: this.imagePath,
            date: this.date,
            createdAt: this.createdAt,
            updatedAt: this.getCurrentDateTimePeru(),
            createdBy: this.createdBy
        }
    }

    toCreateJson() {
        return {
            id: this.id,
            projectId: this.projectId,
            title: this.title,
            description: this.description,
            imagePath: this.imagePath,
            date: this.date,
            createdAt: this.getCurrentDateTimePeru(),
            createdBy: this.createdBy
        }
    }

    toUpdateJson() {
        return {
            title: this.title,
            description: this.description,
            imagePath: this.imagePath,
            date: this.date,
            updatedAt: this.getCurrentDateTimePeru()
        }
    }

    getSummary() {
        return {
            id: this.id,
            projectId: this.projectId,
            title: this.title,
            date: this.date,
            hasImage: !!this.imagePath,
            createdAt: this.createdAt
        }
    }
}
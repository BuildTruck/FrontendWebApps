export class Projects {
    constructor({
                    id,
                    name,
                    description,
                    image,
                    imageUrl,
                    thumbnailUrl,  // ← AGREGADO: faltaba este parámetro
                    managerId,
                    location = '',
                    coordinates = null,
                    start_date = null,
                    startDate = null,    // ← El backend puede usar startDate
                    supervisorId = null,
                    state = 'En estudio',
                    createdAt = new Date().toISOString(),
                    updatedAt = new Date().toISOString()
                }) {
        this.id = id || `p${Date.now()}`
        this.name = name
        this.description = description

        this.image = imageUrl || thumbnailUrl || image || '/images/proyecto-default.jpg'

        this.managerId = managerId
        this.location = location
        this.coordinates = coordinates
        this.start_date = start_date || startDate

        this.supervisorId = supervisorId
        this.state = state
        this.createdAt = createdAt
        this.updatedAt = updatedAt
    }

    static getStateOptions(t) {
        return [
            { value: 'En estudio', label: t('projects.status.inStudy') },
            { value: 'Planificado', label: t('projects.status.planned') },
            { value: 'Activo', label: t('projects.status.inProgress') },
            { value: 'Completado', label: t('projects.status.completed') }
        ];
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            image: this.image,
            managerId: this.managerId,
            location: this.location,
            coordinates: this.coordinates,
            start_date: this.start_date,
            supervisorId: this.supervisorId,
            state: this.state,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}
export class Projects {
    constructor({
                    id,
                    name,
                    description,
                    image,
                    managerId,
                    location = '',
                    coordinates = null,
                    start_date = null,
                    supervisorId = null,
                    state = 'En estudio',
                    createdAt = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Lima" })).toISOString(),
                    updatedAt = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Lima" })).toISOString()
                }) {
        this.id = id || `p${Date.now()}`
        this.name = name
        this.description = description
        this.image = image || '/images/proyecto-default.jpg'
        this.managerId = managerId
        this.location = location
        this.coordinates = coordinates
        this.start_date = start_date
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
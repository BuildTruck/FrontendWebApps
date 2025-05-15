export class MachineryEntity {
    constructor(data = {}) {
        this.id = data.id ?? undefined

        // Asignación segura de projectId
        this.projectId = data.projectId !== undefined ? data.projectId : null

        // Información base del material.
        this.name = data.name || ''
        this.licensePlate = data.licensePlate || ''
        this.status = data.status || ''
        this.registerDate=data.registerDate||''
        this.provider=data.provider||''
        this.description = data.description || ''
    }


}

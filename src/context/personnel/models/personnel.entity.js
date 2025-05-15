export class PersonnelEntity {
    constructor(data = {}) {
        this.id = data.id ?? undefined

        // Asignación segura de projectId
        this.projectId = data.projectId !== undefined ? data.projectId : null

        //Información del obrero
        this.name = data.name || ''
        this.dni = Number(data.dni) || 0
        this.rol = data.rol || ''
        this.status = data.status || ''
        this.startDate = data.startDate || ''
        this.phoneNumber = Number(data.phoneNumber) || 0
        this.email = data.email || ''

    }
}
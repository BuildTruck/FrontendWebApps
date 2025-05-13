// src/context/supervisor/models/supervisor.model.js

export class Supervisor {
    constructor({ id, name, email, password, role = 'supervisor', projectId = null }) {
        this.id = id
        this.name = name
        this.email = email
        this.password = password
        this.role = role
        this.projectId = projectId
    }

    get initials() {
        return this.name
            ? this.name.split(' ').map(word => word[0]).join('').toUpperCase()
            : ''
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            email: this.email,
            password: this.password,
            role: this.role,
            projectId: this.projectId
        }
    }
}

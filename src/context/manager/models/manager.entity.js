// src/context/manager/models/manager.model.js

export class Manager {
    constructor({ id, name, email, password, role = 'manager', projects = [] }) {
        this.id = id
        this.name = name
        this.email = email
        this.password = password
        this.role = role
        this.projects = projects // array de IDs o de objetos según el caso
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
            projects: this.projects
        }
    }
}

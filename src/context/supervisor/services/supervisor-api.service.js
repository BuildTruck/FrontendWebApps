// src/context/supervisor/services/supervisor-api.service.js
import { BaseService } from '../../../core/services/base.service'

export class SupervisorService extends BaseService {
    constructor() {
        super('/users')
    }

    login(email, password) {
        return this.getAll({ email, password, role: 'supervisor' })
    }

    getAssignedProject(supervisorId) {
        return http.get(`/projects?supervisorId=${supervisorId}`)
    }
}

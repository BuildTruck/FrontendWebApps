// src/context/manager/services/manager-api.service.js
import { BaseService } from '../../../core/services/base.service'

export class ManagerService extends BaseService {
    constructor() {
        super('/users')
    }

    login(email, password) {
        return this.getAll({ email, password, role: 'manager' })
    }

    getProjects(managerId) {
        return http.get(`/projects?managerId=${managerId}`)
    }
    updateSettings(managerId, settings) {
        return this.update(managerId, settings)
    }

}

// src/core/services/base.service.js
import http from './http.service'

export class BaseService {
    constructor(resourceEndpoint) {
        this.resourceEndpoint = resourceEndpoint
    }

    getAll(params = {}) {
        return http.get(this.resourceEndpoint, { params })
    }

    getById(id) {
        return http.get(`${this.resourceEndpoint}/${id}`)
    }

    create(data) {
        return http.post(this.resourceEndpoint, data)
    }

    update(id, data) {
        return http.put(`${this.resourceEndpoint}/${id}`, data)
    }

    delete(id) {
        return http.delete(`${this.resourceEndpoint}/${id}`)
    }
}

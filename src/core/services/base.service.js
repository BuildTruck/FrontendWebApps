import http from './http.service'

export class BaseService {
    constructor(resourceEndpoint) {
        this.resourceEndpoint = resourceEndpoint
    }

    /**
     * Obtiene todos los recursos con filtros opcionales
     * @param {Object} params - Parámetros de filtrado
     * @returns {Promise} - Promesa con los resultados
     */
    async getAll(params = {}) {
        try {
            return await http.get(this.resourceEndpoint, { params })
        } catch (error) {
            console.error(`Error en getAll para ${this.resourceEndpoint}:`, error)

            // Segundo intento usando fetch nativo
            try {
                const queryString = new URLSearchParams(params).toString()
                const url = `${import.meta.env.VITE_API_BASE_URL}${this.resourceEndpoint}${queryString ? `?${queryString}` : ''}`

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                })

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }

                const data = await response.json()
                return { data }
            } catch (fetchError) {
                console.error(`Error en fetch getAll para ${this.resourceEndpoint}:`, fetchError)
                throw error // Lanzar el error original para mantener consistencia
            }
        }
    }

    /**
     * Obtiene un recurso por su ID
     * @param {string|number} id - ID del recurso
     * @returns {Promise} - Promesa con el resultado
     */
    async getById(id) {
        try {
            return await http.get(`${this.resourceEndpoint}/${id}`)
        } catch (error) {
            console.error(`Error en getById para ${this.resourceEndpoint}/${id}:`, error)

            // Segundo intento usando fetch nativo
            try {
                const url = `${import.meta.env.VITE_API_BASE_URL}${this.resourceEndpoint}/${id}`

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                })

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }

                const data = await response.json()
                return { data }
            } catch (fetchError) {
                console.error(`Error en fetch getById para ${this.resourceEndpoint}/${id}:`, fetchError)
                throw error
            }
        }
    }

    /**
     * Crea un nuevo recurso
     * @param {Object} data - Datos del nuevo recurso
     * @returns {Promise} - Promesa con el resultado
     */
    async create(data) {
        try {
            return await http.post(this.resourceEndpoint, data)
        } catch (error) {
            console.error(`Error en create para ${this.resourceEndpoint}:`, error)

            // Segundo intento usando http con opciones adicionales
            try {
                console.log('Reintentando con http y timeout extendido...')
                return await http.post(this.resourceEndpoint, data, {
                    timeout: 10000, // Timeout extendido
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                })
            } catch (secondError) {
                console.error(`Error en segundo intento create para ${this.resourceEndpoint}:`, secondError)

                // Tercer intento usando fetch nativo
                try {
                    console.log('Reintentando con fetch nativo...')
                    const url = `${import.meta.env.VITE_API_BASE_URL}${this.resourceEndpoint}`

                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        body: JSON.stringify(data)
                    })

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`)
                    }

                    const responseData = await response.json()
                    return { data: responseData }
                } catch (fetchError) {
                    console.error(`Error en fetch create para ${this.resourceEndpoint}:`, fetchError)
                    throw error
                }
            }
        }
    }

    /**
     * Actualiza un recurso existente
     * @param {string|number} id - ID del recurso a actualizar
     * @param {Object} data - Datos actualizados
     * @returns {Promise} - Promesa con el resultado
     */
    async update(id, data) {
        try {
            return await http.put(`${this.resourceEndpoint}/${id}`, data)
        } catch (error) {
            console.error(`Error en update para ${this.resourceEndpoint}/${id}:`, error)

            // Segundo intento usando patch en lugar de put
            try {
                console.log('Reintentando con PATCH...')
                return await http.patch(`${this.resourceEndpoint}/${id}`, data)
            } catch (patchError) {
                console.error(`Error en PATCH para ${this.resourceEndpoint}/${id}:`, patchError)

                // Tercer intento usando fetch nativo
                try {
                    console.log('Reintentando con fetch nativo...')
                    const url = `${import.meta.env.VITE_API_BASE_URL}${this.resourceEndpoint}/${id}`

                    const response = await fetch(url, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        body: JSON.stringify(data)
                    })

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`)
                    }

                    const responseData = await response.json()
                    return { data: responseData }
                } catch (fetchError) {
                    console.error(`Error en fetch update para ${this.resourceEndpoint}/${id}:`, fetchError)
                    throw error
                }
            }
        }
    }

    /**
     * Elimina un recurso
     * @param {string|number} id - ID del recurso a eliminar
     * @returns {Promise} - Promesa con el resultado
     */
    async delete(id) {
        try {
            return await http.delete(`${this.resourceEndpoint}/${id}`)
        } catch (error) {
            console.error(`Error en delete para ${this.resourceEndpoint}/${id}:`, error)

            // Segundo intento usando fetch nativo
            try {
                console.log('Reintentando con fetch nativo...')
                const url = `${import.meta.env.VITE_API_BASE_URL}${this.resourceEndpoint}/${id}`

                const response = await fetch(url, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                })

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }

                // La mayoría de las operaciones DELETE devuelven 204 No Content
                if (response.status === 204) {
                    return { status: 204 }
                }

                const data = await response.json()
                return { data }
            } catch (fetchError) {
                console.error(`Error en fetch delete para ${this.resourceEndpoint}/${id}:`, fetchError)
                throw error
            }
        }
    }

    /**
     * Método utilitario para crear URL con parámetros de consulta
     * @param {string} endpoint - Endpoint base
     * @param {Object} params - Parámetros de consulta
     * @returns {string} - URL completa con parámetros
     */
    buildUrl(endpoint, params = {}) {
        const url = new URL(`${import.meta.env.VITE_API_BASE_URL}${endpoint}`)

        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key])
            }
        })

        return url.toString()
    }
}
import { BaseService } from '../../../core/services/base.service'
import { Documentation } from '../models/documentation.entity'

/**
 * Servicio para manejar las operaciones de API relacionadas con la documentación
 */
export class DocumentationApiService extends BaseService {
    constructor() {
        // Endpoint para documentos - usando la colección "documents" del DB
        super('/documents')
    }

    /**
     * Obtiene todos los documentos con filtros opcionales
     * @param {Object} params - Parámetros de filtrado
     * @returns {Promise<Array<Documentation>>} - Promesa con los resultados
     */
    async getAll(params = {}) {
        try {
            const response = await super.getAll(params)
            return response.data || []
        } catch (error) {
            console.error('Error al obtener documentos:', error)
            return []
        }
    }

    /**
     * Obtiene todos los documentos de un proyecto específico
     * @param {string|number} projectId - ID del proyecto
     * @returns {Promise<Array<Object>>} - Promesa con los resultados
     */
    async getByProjectId(projectId) {
        try {
            const response = await super.getAll({ projectId })
            return response.data || []
        } catch (error) {
            console.error(`Error al obtener documentos del proyecto ${projectId}:`, error)
            return []
        }
    }

    /**
     * Obtiene un documento por su ID
     * @param {string|number} id - ID del documento
     * @returns {Promise<Object>} - Promesa con el resultado
     */
    async getById(id) {
        try {
            const response = await super.getById(id)
            return response.data
        } catch (error) {
            console.error(`Error al obtener documento ${id}:`, error)
            throw error
        }
    }

    /**
     * Crea un nuevo documento
     * @param {Object} documentData - Datos del nuevo documento
     * @returns {Promise<Object>} - Promesa con el resultado
     */
    async create(documentData) {
        try {
            // Asegurarse de que updatedAt tiene el valor actual
            const data = {
                ...documentData,
                updatedAt: new Date().toISOString()
            }

            const response = await super.create(data)
            return response.data
        } catch (error) {
            console.error('Error al crear documento:', error)
            throw error
        }
    }

    /**
     * Actualiza un documento existente
     * @param {string|number} id - ID del documento a actualizar
     * @param {Object} documentData - Datos actualizados
     * @returns {Promise<Object>} - Promesa con el resultado
     */
    async update(id, documentData) {
        try {
            // Asegurarse de que updatedAt tiene el valor actual
            const data = {
                ...documentData,
                updatedAt: new Date().toISOString()
            }

            const response = await super.update(id, data)
            return response.data
        } catch (error) {
            console.error(`Error al actualizar documento ${id}:`, error)
            throw error
        }
    }

    /**
     * Elimina un documento
     * @param {string|number} id - ID del documento a eliminar
     * @returns {Promise} - Promesa con el resultado
     */
    async delete(id) {
        try {
            return await super.delete(id)
        } catch (error) {
            console.error(`Error al eliminar documento ${id}:`, error)
            throw error
        }
    }

    /**
     * Sube una imagen para documentación
     * @param {File} file - Imagen a subir
     * @param {string|number} projectId - ID del proyecto
     * @returns {Promise<Object>} - Promesa con la URL de la imagen
     */
    async uploadImage(file, projectId) {
        try {
            // Validar que sea una imagen
            if (!file.type.startsWith('image/')) {
                throw new Error('El archivo debe ser una imagen (jpg, png, etc.)');
            }

            // Simular la subida de imagen con formData
            // En una implementación real, esto enviaría la imagen al servidor
            const formData = new FormData()
            formData.append('image', file)
            formData.append('projectId', projectId)

            // Para simular, vamos a retornar una URL falsa después de un delay
            await new Promise(resolve => setTimeout(resolve, 500))

            // Generar URL de imagen simulada
            const timestamp = new Date().getTime()
            const fileName = `${timestamp}_${file.name}`

            // Usar imágenes de placeholder para pruebas
            const imagePath = `https://via.placeholder.com/800x600.png?text=${encodeURIComponent(file.name)}`

            return {
                success: true,
                imagePath
            }
        } catch (error) {
            console.error('Error al subir imagen:', error)
            throw error
        }
    }
}
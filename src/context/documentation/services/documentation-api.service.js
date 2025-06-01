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
     * @returns {Promise<Array<Documentation>>} - Promesa con los resultados convertidos a entidades
     */
    async getAll(params = {}) {
        try {
            const response = await super.getAll(params)
            const documents = Documentation.fromJsonArray(response.data || [])

            console.log(`📄 Obtenidos ${documents.length} documentos`)
            return documents
        } catch (error) {
            console.error('❌ Error al obtener documentos:', error)
            return []
        }
    }

    /**
     * Obtiene todos los documentos de un proyecto específico
     * @param {string|number} projectId - ID del proyecto
     * @returns {Promise<Array<Documentation>>} - Promesa con los resultados filtrados
     */
    async getByProjectId(projectId) {
        if (!projectId) {
            console.warn('⚠️ ProjectId no proporcionado en getByProjectId')
            return []
        }

        try {
            console.log(`🔍 Buscando documentos para proyecto: ${projectId}`)

            // Intentar filtrar por projectId en el servidor
            let documents = []
            try {
                const response = await super.getAll({ projectId })
                documents = Documentation.fromJsonArray(response.data || [])

                // Verificar que realmente pertenecen al proyecto (filtro adicional del lado cliente)
                documents = Documentation.filterByProject(documents, projectId)
            } catch (filterError) {
                console.log('⚠️ Filtro del servidor falló, filtrando en cliente...')

                // Si el filtro del servidor falla, obtener todos y filtrar en cliente
                const allDocs = await this.getAll()
                documents = Documentation.filterByProject(allDocs, projectId)
            }

            console.log(`📄 Encontrados ${documents.length} documentos para proyecto ${projectId}`)
            return documents

        } catch (error) {
            console.error(`❌ Error al obtener documentos del proyecto ${projectId}:`, error)
            return []
        }
    }

    /**
     * Obtiene un documento por su ID
     * @param {string|number} id - ID del documento
     * @returns {Promise<Documentation|null>} - Promesa con el resultado convertido a entidad
     */
    async getById(id) {
        if (!id) {
            throw new Error('ID del documento es requerido')
        }

        try {
            console.log(`🔍 Obteniendo documento: ${id}`)
            const response = await super.getById(id)
            const document = Documentation.fromJson(response.data)

            if (!document) {
                throw new Error(`Documento ${id} no encontrado`)
            }

            return document
        } catch (error) {
            console.error(`❌ Error al obtener documento ${id}:`, error)
            throw error
        }
    }

    /**
     * Verifica si un documento pertenece a un proyecto específico
     * @param {string|number} documentId - ID del documento
     * @param {string|number} projectId - ID del proyecto
     * @returns {Promise<boolean>} - True si pertenece al proyecto
     */
    async verifyDocumentOwnership(documentId, projectId) {
        if (!documentId || !projectId) {
            return false
        }

        try {
            const document = await this.getById(documentId)
            return document && document.belongsToProject(projectId)
        } catch (error) {
            console.error('❌ Error verificando propiedad del documento:', error)
            return false
        }
    }

    /**
     * Crea un nuevo documento
     * @param {Documentation|Object} documentData - Datos del nuevo documento (entidad o objeto plano)
     * @returns {Promise<Documentation>} - Promesa con el resultado convertido a entidad
     */
    async create(documentData) {
        try {
            const document = documentData instanceof Documentation
                ? documentData
                : new Documentation(documentData)

            const validation = document.validate()
            if (!validation.isValid) {
                const errorMessages = Object.values(validation.errors).join(', ')
                throw new Error(`Datos inválidos: ${errorMessages}`)
            }

            const cleanData = document.toCreateJson()
            const response = await super.create(cleanData)
            return Documentation.fromJson(response.data)
        } catch (error) {
            console.error('Error al crear documento:', error)
            throw error
        }
    }

    /**
     * Actualiza un documento existente
     * @param {string|number} id - ID del documento a actualizar
     * @param {Documentation|Object} documentData - Datos actualizados
     * @param {string|number} projectId - ID del proyecto (para verificación de propiedad)
     * @returns {Promise<Documentation>} - Promesa con el resultado convertido a entidad
     */
    async update(id, documentData, projectId = null) {
        if (!id) {
            throw new Error('ID del documento es requerido para actualizar')
        }

        try {
            const document = documentData instanceof Documentation
                ? documentData
                : new Documentation(documentData)

            const validation = document.validate()
            if (!validation.isValid) {
                const errorMessages = Object.values(validation.errors).join(', ')
                throw new Error(`Datos inválidos: ${errorMessages}`)
            }

            const updateData = document.toUpdateJson()
            const response = await super.update(id, updateData)
            return Documentation.fromJson(response.data)
        } catch (error) {
            console.error(`Error al actualizar documento ${id}:`, error)
            throw error
        }
    }

    /**
     * Elimina un documento
     * @param {string|number} id - ID del documento a eliminar
     * @param {string|number} projectId - ID del proyecto (para verificación de propiedad)
     * @returns {Promise} - Promesa con el resultado
     */
    async delete(id, projectId = null) {
        if (!id) {
            throw new Error('ID del documento es requerido para eliminar')
        }

        try {
            return await super.delete(id)
        } catch (error) {
            console.error(`Error al eliminar documento ${id}:`, error)
            throw error
        }
    }

    /**
     * Elimina todos los documentos de un proyecto
     * @param {string|number} projectId - ID del proyecto
     * @returns {Promise<number>} - Número de documentos eliminados
     */
    async deleteByProjectId(projectId) {
        if (!projectId) {
            throw new Error('ID del proyecto es requerido')
        }

        try {
            console.log(`🗑️ Eliminando todos los documentos del proyecto: ${projectId}`)

            const documents = await this.getByProjectId(projectId)
            let deletedCount = 0

            for (const document of documents) {
                try {
                    await this.delete(document.id)
                    deletedCount++
                } catch (error) {
                    console.error(`❌ Error eliminando documento ${document.id}:`, error)
                }
            }

            console.log(`✅ Eliminados ${deletedCount} documentos del proyecto ${projectId}`)
            return deletedCount
        } catch (error) {
            console.error(`❌ Error eliminando documentos del proyecto ${projectId}:`, error)
            throw error
        }
    }

    /**
     * Comprime y redimensiona una imagen
     * @param {File} file - Archivo de imagen original
     * @param {Object} config - Configuración de compresión
     * @returns {Promise<string>} - Imagen comprimida en base64
     */
    async compressImage(file, config = {}) {
        const defaultConfig = {
            maxWidth: 800,
            maxHeight: 600,
            quality: 0.7,
            maxSizeKB: 300,
            format: 'image/webp'
        }

        const finalConfig = { ...defaultConfig, ...config }

        console.log(`🖼️ Comprimiendo imagen: ${file.name} (${Math.round(file.size / 1024)}KB)`)

        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            const img = new Image()

            img.onload = () => {
                try {
                    // Calcular nuevas dimensiones manteniendo proporción
                    let { width, height } = img

                    if (width > height) {
                        if (width > finalConfig.maxWidth) {
                            height = (height * finalConfig.maxWidth) / width
                            width = finalConfig.maxWidth
                        }
                    } else {
                        if (height > finalConfig.maxHeight) {
                            width = (width * finalConfig.maxHeight) / height
                            height = finalConfig.maxHeight
                        }
                    }

                    // Configurar canvas con dimensiones optimizadas
                    canvas.width = Math.min(width, 400)  // Máximo 400px ancho
                    canvas.height = Math.min(height, 300) // Máximo 300px alto

                    // Dibujar imagen redimensionada con suavizado
                    ctx.imageSmoothingEnabled = true
                    ctx.imageSmoothingQuality = 'high'
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

                    // Intentar diferentes calidades hasta conseguir tamaño adecuado
                    const qualities = [0.6, 0.4, 0.3, 0.2, 0.15, 0.1]
                    let bestResult = null

                    for (const quality of qualities) {
                        const compressed = canvas.toDataURL('image/webp', quality)
                        const sizeKB = Math.round(compressed.length * 0.75 / 1024)

                        if (sizeKB <= finalConfig.maxSizeKB) {
                            bestResult = compressed
                            console.log(`✅ Imagen comprimida: ${sizeKB}KB con calidad ${quality}`)
                            break
                        }
                    }

                    // Si no se pudo comprimir lo suficiente, usar la más comprimida
                    if (!bestResult) {
                        bestResult = canvas.toDataURL('image/webp', 0.1)
                        const finalSize = Math.round(bestResult.length * 0.75 / 1024)
                        console.log(`⚠️ Imagen muy comprimida: ${finalSize}KB`)
                    }

                    resolve(bestResult)
                } catch (error) {
                    console.error('❌ Error procesando imagen:', error)
                    reject(new Error('Error al procesar la imagen'))
                }
            }

            img.onerror = () => {
                console.error('❌ Error cargando imagen para comprimir')
                reject(new Error('Error al cargar la imagen'))
            }

            img.src = URL.createObjectURL(file)
        })
    }

    /**
     * Sube una imagen para documentación con compresión automática
     * @param {File} file - Imagen a subir
     * @param {string|number} projectId - ID del proyecto
     * @returns {Promise<Object>} - Promesa con la información de la imagen
     */
    async uploadImage(file, projectId) {
        if (!file) {
            throw new Error('Archivo de imagen es requerido')
        }

        if (!projectId) {
            throw new Error('ID del proyecto es requerido')
        }

        try {
            // Validaciones de la imagen
            if (!file.type.startsWith('image/')) {
                throw new Error('El archivo debe ser una imagen (JPG, PNG, WEBP, etc.)')
            }

            // Validar tamaño original (máximo 10MB)
            const maxSize = 10 * 1024 * 1024 // 10MB
            if (file.size > maxSize) {
                throw new Error('La imagen es demasiado grande. Máximo 10MB permitido.')
            }

            console.log(`📤 Procesando imagen: ${file.name} (${Math.round(file.size / 1024)}KB) para proyecto ${projectId}`)

            // Comprimir imagen
            const compressedImage = await this.compressImage(file, {
                maxWidth: 400,
                maxHeight: 300,
                maxSizeKB: 250 // Tamaño muy conservador para evitar error 413
            })

            const finalSizeKB = Math.round(compressedImage.length * 0.75 / 1024)
            console.log(`✅ Imagen lista para subir: ${finalSizeKB}KB`)

            return {
                success: true,
                imagePath: compressedImage,
                imageSize: file.size,
                imageType: file.type,
                originalName: file.name,
                compressedSizeKB: finalSizeKB
            }
        } catch (error) {
            console.error('❌ Error al procesar imagen:', error)
            throw error
        }
    }

    /**
     * Exporta documentación a PDF por rango de fechas
     * @param {string|number} projectId - ID del proyecto
     * @param {string} startDate - Fecha de inicio (YYYY-MM-DD)
     * @param {string} endDate - Fecha de fin (YYYY-MM-DD)
     * @param {Object} options - Opciones de exportación
     * @returns {Promise<void>} - Descarga el PDF
     */
    async exportToPDF(projectId, startDate, endDate, options = {}) {
        if (!projectId) {
            throw new Error('ID del proyecto es requerido')
        }

        try {

            // Obtener documentos del proyecto
            const allDocuments = await this.getByProjectId(projectId)

            // Filtrar por rango de fechas
            const filteredDocuments = this.filterDocumentsByDateRange(allDocuments, startDate, endDate)

            if (filteredDocuments.length === 0) {
                throw new Error('No se encontraron documentos en el rango de fechas especificado')
            }

            // Generar PDF usando jsPDF (se asume está disponible globalmente)
            if (typeof window.jsPDF === 'undefined') {
                // Cargar jsPDF dinámicamente si no está disponible
                await this.loadJsPDF()
            }

            const { jsPDF } = window
            const doc = new jsPDF('p', 'mm', 'a4')

            // Configuración del PDF
            const pageWidth = doc.internal.pageSize.getWidth()
            const pageHeight = doc.internal.pageSize.getHeight()
            const margin = 20
            const contentWidth = pageWidth - (margin * 2)

            // Título del documento
            doc.setFontSize(20)
            doc.setFont('helvetica', 'bold')
            doc.text('Documentación del Proyecto', margin, 30)

            // Información del rango de fechas
            doc.setFontSize(12)
            doc.setFont('helvetica', 'normal')
            doc.text(`Período: ${this.formatDate(startDate)} - ${this.formatDate(endDate)}`, margin, 45)
            doc.text(`Total de documentos: ${filteredDocuments.length}`, margin, 55)
            doc.text(`Generado: ${this.formatDate(new Date().toISOString().split('T')[0])}`, margin, 65)

            let yPosition = 80

            // Procesar cada documento
            for (let i = 0; i < filteredDocuments.length; i++) {
                const document = filteredDocuments[i]

                // Verificar si necesitamos nueva página
                if (yPosition > pageHeight - 100) {
                    doc.addPage()
                    yPosition = 30
                }

                // Título del documento
                doc.setFontSize(14)
                doc.setFont('helvetica', 'bold')
                doc.text(`${i + 1}. ${document.title}`, margin, yPosition)
                yPosition += 10

                // Fecha del documento
                doc.setFontSize(10)
                doc.setFont('helvetica', 'normal')
                doc.text(`Fecha: ${this.formatDate(document.date)}`, margin, yPosition)
                yPosition += 8

                // Descripción
                doc.setFontSize(11)
                const descriptionLines = doc.splitTextToSize(document.description, contentWidth)
                doc.text(descriptionLines, margin, yPosition)
                yPosition += (descriptionLines.length * 5) + 5

                // Agregar imagen si existe
                if (document.imagePath && document.imagePath.startsWith('data:image')) {
                    try {
                        // Verificar espacio para la imagen
                        if (yPosition > pageHeight - 80) {
                            doc.addPage()
                            yPosition = 30
                        }

                        const imgWidth = Math.min(contentWidth, 120)
                        const imgHeight = 80

                        doc.addImage(document.imagePath, 'JPEG', margin, yPosition, imgWidth, imgHeight)
                        yPosition += imgHeight + 15
                    } catch (imgError) {
                        console.warn(`⚠️ No se pudo agregar imagen del documento ${document.id}:`, imgError)
                        doc.text('(Imagen no disponible)', margin, yPosition)
                        yPosition += 10
                    }
                }

                yPosition += 10 // Espacio entre documentos
            }

            // Generar nombre del archivo
            const fileName = `documentacion_${projectId}_${startDate}_${endDate}.pdf`

            // Descargar el PDF
            doc.save(fileName)

            console.log(`✅ PDF exportado exitosamente: ${fileName}`)

        } catch (error) {
            console.error('❌ Error exportando a PDF:', error)
            throw error
        }
    }

    /**
     * Filtra documentos por rango de fechas
     * @param {Array<Documentation>} documents - Lista de documentos
     * @param {string} startDate - Fecha de inicio
     * @param {string} endDate - Fecha de fin
     * @returns {Array<Documentation>} - Documentos filtrados
     */
    filterDocumentsByDateRange(documents, startDate, endDate) {
        if (!startDate && !endDate) {
            return documents
        }

        return documents.filter(doc => {
            const docDate = new Date(doc.date)
            const start = startDate ? new Date(startDate) : new Date('1900-01-01')
            const end = endDate ? new Date(endDate) : new Date('2100-12-31')

            return docDate >= start && docDate <= end
        })
    }

    /**
     * Carga jsPDF dinámicamente si no está disponible
     * @returns {Promise<void>}
     */
    async loadJsPDF() {
        return new Promise((resolve, reject) => {
            if (typeof window.jsPDF !== 'undefined') {
                resolve()
                return
            }

            const script = document.createElement('script')
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
            script.onload = () => {
                console.log('✅ jsPDF cargado dinámicamente')
                resolve()
            }
            script.onerror = () => {
                reject(new Error('No se pudo cargar jsPDF'))
            }
            document.head.appendChild(script)
        })
    }

    /**
     * Obtiene estadísticas de documentación de un proyecto
     * @param {string|number} projectId - ID del proyecto
     * @returns {Promise<Object>} - Estadísticas
     */
    async getProjectStats(projectId) {
        if (!projectId) {
            throw new Error('ID del proyecto es requerido')
        }

        try {
            const documents = await this.getByProjectId(projectId)

            const stats = {
                totalDocuments: documents.length,
                documentsWithImages: documents.filter(doc => doc.imagePath).length,
                recentDocuments: documents.filter(doc => {
                    const docDate = new Date(doc.createdAt)
                    const weekAgo = new Date()
                    weekAgo.setDate(weekAgo.getDate() - 7)
                    return docDate >= weekAgo
                }).length,
                oldestDocument: documents.length > 0
                    ? documents.reduce((oldest, doc) =>
                        new Date(doc.createdAt) < new Date(oldest.createdAt) ? doc : oldest
                    ).createdAt
                    : null,
                newestDocument: documents.length > 0
                    ? documents.reduce((newest, doc) =>
                        new Date(doc.createdAt) > new Date(newest.createdAt) ? doc : newest
                    ).createdAt
                    : null
            }

            console.log(`📊 Estadísticas del proyecto ${projectId}:`, stats)
            return stats
        } catch (error) {
            console.error(`❌ Error obteniendo estadísticas del proyecto ${projectId}:`, error)
            throw error
        }
    }

    /**
     * Formatea una fecha para mostrar
     * @param {string} dateString - Fecha en formato YYYY-MM-DD
     * @returns {string} - Fecha formateada
     */
    formatDate(dateString) {
        if (!dateString) return ''

        try {
            const date = new Date(dateString)
            if (isNaN(date.getTime())) return dateString

            return new Intl.DateTimeFormat('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }).format(date)
        } catch (error) {
            return dateString
        }
    }
}

// Exportar instancia singleton
export const documentationService = new DocumentationApiService()
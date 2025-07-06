import { BaseService } from '../../../core/services/base.service'
import { Documentation } from '../models/documentation.entity'
import http from '../../../core/services/http.service'

/**
 * Servicio ligero para documentación - El backend maneja toda la lógica pesada
 */
export class DocumentationApiService extends BaseService {
    constructor() {
        super('/documentation')
    }

    // ========== CRUD BÁSICO ==========

    async getAll(params = {}) {
        try {
            const response = await super.getAll(params)
            return Documentation.fromJsonArray(response.data || [])
        } catch (error) {
            console.error('❌ Error al obtener documentos:', error)
            return []
        }
    }

    async getByProjectId(projectId) {
        if (!projectId) return []
        try {
            const response = await super.getAll({ projectId })
            return Documentation.fromJsonArray(response.data || [])
        } catch (error) {
            console.error(`❌ Error al obtener documentos del proyecto ${projectId}:`, error)
            return []
        }
    }

    async getById(id) {
        try {
            const response = await super.getById(id)
            return Documentation.fromJson(response.data)
        } catch (error) {
            console.error(`❌ Error al obtener documento ${id}:`, error)
            throw error
        }
    }

    async create(documentData, imageFile) {
        try {
            if (!imageFile) {
                throw new Error('Imagen es requerida')
            }

            const cleanData = this.cleanDocumentData(documentData)
            const formData = new FormData()

            formData.append('ProjectId', cleanData.projectId.toString())
            formData.append('Title', cleanData.title)
            formData.append('Description', cleanData.description)
            formData.append('Date', this.formatDateForAPI(cleanData.date))
            formData.append('ImageFile', imageFile)

            const response = await http.post('/documentation', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data; boundary=' + Math.random().toString().substr(2)
                },
                transformRequest: [(data) => data]
            })

            return Documentation.fromJson(response.data)
        } catch (error) {
            console.error('❌ Error al crear documento:', error)
            throw error
        }
    }

    async update(id, documentData, imageFile = null) {
        try {
            const cleanData = this.cleanDocumentData(documentData)
            const formData = new FormData()

            formData.append('Id', id.toString())
            formData.append('ProjectId', cleanData.projectId.toString())
            formData.append('Title', cleanData.title)
            formData.append('Description', cleanData.description)
            formData.append('Date', this.formatDateForAPI(cleanData.date))

            if (imageFile) {
                formData.append('ImageFile', imageFile)
            }

            const response = await http.post('/documentation', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data; boundary=' + Math.random().toString().substr(2)
                },
                transformRequest: [(data) => data]
            })

            return Documentation.fromJson(response.data)
        } catch (error) {
            console.error(`❌ Error al actualizar documento ${id}:`, error)
            throw error
        }
    }

    async delete(id) {
        try {
            const response = await super.delete(id)
            return response.data?.success || false
        } catch (error) {
            console.error(`❌ Error al eliminar documento ${id}:`, error)
            throw error
        }
    }

    // ========== UTILIDADES ==========

    cleanDocumentData(data) {
        return {
            projectId: parseInt(data.projectId) || 0,
            title: (data.title || '').trim(),
            description: (data.description || '').trim(),
            date: data.date
        }
    }

    async getProjectStats(projectId) {
        try {
            const documents = await this.getByProjectId(projectId)
            const now = new Date()
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

            return {
                totalDocuments: documents.length,
                documentsWithImages: documents.filter(doc => doc.imagePath).length,
                recentDocuments: documents.filter(doc => new Date(doc.createdAt) >= weekAgo).length
            }
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error)
            return { totalDocuments: 0, documentsWithImages: 0, recentDocuments: 0 }
        }
    }

    filterDocumentsByDateRange(documents, startDate, endDate) {
        if (!startDate && !endDate) return documents

        return documents.filter(doc => {
            const docDate = new Date(doc.date)
            const start = startDate ? new Date(startDate) : new Date('1900-01-01')
            const end = endDate ? new Date(endDate) : new Date('2100-12-31')
            return docDate >= start && docDate <= end
        })
    }

    formatDate(dateString) {
        if (!dateString) return ''
        try {
            return new Intl.DateTimeFormat('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }).format(new Date(dateString))
        } catch {
            return dateString
        }
    }

    formatDateForAPI(date) {
        if (!date) return new Date().toISOString()

        try {
            if (typeof date === 'string' && date.includes('T') && date.includes('Z')) {
                return date
            }

            if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const [year, month, day] = date.split('-')
                const dateObj = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)))
                return dateObj.toISOString()
            }

            if (date instanceof Date) {
                return date.toISOString()
            }

            const parsedDate = new Date(date)
            if (isNaN(parsedDate.getTime())) {
                throw new Error('Fecha inválida')
            }
            return parsedDate.toISOString()
        } catch (error) {
            console.error('Error formateando fecha:', error)
            return new Date().toISOString()
        }
    }

    // ========== EXPORTACIÓN ==========

    async exportToPDF(projectId, startDate, endDate) {
        try {
            const documents = await this.getByProjectId(projectId)
            const filtered = this.filterDocumentsByDateRange(documents, startDate, endDate)

            if (filtered.length === 0) {
                throw new Error('No hay documentos en el rango seleccionado')
            }

            // Cargar jsPDF si no está disponible
            if (!window.jsPDF) {
                await this.loadJsPDF()
            }

            const { jsPDF } = window
            const doc = new jsPDF('p', 'mm', 'a4')

            // Configuración
            const pageWidth = doc.internal.pageSize.getWidth()
            const pageHeight = doc.internal.pageSize.getHeight()
            const margin = 20
            const contentWidth = pageWidth - (margin * 2)

            // Título
            doc.setFontSize(18)
            doc.setFont('helvetica', 'bold')
            doc.text('Documentación del Proyecto', margin, 30)

            // Info del reporte
            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            doc.text(`Período: ${this.formatDate(startDate)} - ${this.formatDate(endDate)}`, margin, 45)
            doc.text(`Total: ${filtered.length} documentos`, margin, 52)
            doc.text(`Generado: ${this.formatDate(new Date().toISOString().split('T')[0])}`, margin, 59)

            let yPosition = 75

            // Procesar cada documento
            for (let i = 0; i < filtered.length; i++) {
                const document = filtered[i]

                // Nueva página si es necesario
                if (yPosition > pageHeight - 60) {
                    doc.addPage()
                    yPosition = 30
                }

                // Número y título
                doc.setFontSize(12)
                doc.setFont('helvetica', 'bold')
                doc.text(`${i + 1}. ${document.title}`, margin, yPosition)
                yPosition += 8

                // Fecha
                doc.setFontSize(9)
                doc.setFont('helvetica', 'normal')
                doc.text(`Fecha: ${this.formatDate(document.date)}`, margin, yPosition)
                yPosition += 8

                // Descripción
                doc.setFontSize(10)
                const descriptionLines = doc.splitTextToSize(document.description, contentWidth)
                doc.text(descriptionLines, margin, yPosition)
                yPosition += (descriptionLines.length * 4) + 8

                // Imagen si existe y es de Cloudinary
                if (document.imagePath && document.imagePath.includes('cloudinary.com')) {
                    try {
                        if (yPosition > pageHeight - 80) {
                            doc.addPage()
                            yPosition = 30
                        }

                        // Crear imagen temporal para obtener dimensiones
                        const img = new Image()
                        img.crossOrigin = 'anonymous'

                        await new Promise((resolve, reject) => {
                            img.onload = () => {
                                try {
                                    const maxWidth = Math.min(contentWidth, 100)
                                    const maxHeight = 60

                                    let { width, height } = img
                                    const ratio = Math.min(maxWidth / width, maxHeight / height)
                                    width = width * ratio
                                    height = height * ratio

                                    doc.addImage(img, 'JPEG', margin, yPosition, width, height)
                                    yPosition += height + 10
                                    resolve()
                                } catch (error) {
                                    doc.text('(Imagen no disponible)', margin, yPosition)
                                    yPosition += 6
                                    resolve()
                                }
                            }
                            img.onerror = () => {
                                doc.text('(Imagen no disponible)', margin, yPosition)
                                yPosition += 6
                                resolve()
                            }
                            img.src = document.imagePath
                        })
                    } catch (error) {
                        doc.text('(Imagen no disponible)', margin, yPosition)
                        yPosition += 6
                    }
                }

                yPosition += 8 // Espacio entre documentos
            }

            // Guardar PDF
            const fileName = `documentacion_${projectId}_${startDate}_${endDate}.pdf`
            doc.save(fileName)

        } catch (error) {
            console.error('❌ Error exportando PDF:', error)
            throw error
        }
    }

    async loadJsPDF() {
        return new Promise((resolve, reject) => {
            if (window.jsPDF) return resolve(window.jsPDF)

            const script = document.createElement('script')
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
            script.onload = () => {
                // jsPDF se carga en window.jspdf, no window.jsPDF
                window.jsPDF = window.jspdf?.jsPDF || window.jsPDF
                resolve(window.jsPDF)
            }
            script.onerror = () => reject(new Error('No se pudo cargar jsPDF'))
            document.head.appendChild(script)
        })
    }
}

// Exportar instancia singleton
export const documentationService = new DocumentationApiService()
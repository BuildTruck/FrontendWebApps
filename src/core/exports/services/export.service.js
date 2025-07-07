import { EXPORT_CONFIGS, VALUE_MAPPERS, GLOBAL_CONFIG } from '../configs/export-configs.js'

/**
 * Servicio universal de exportación
 * Maneja PDF, Excel, CSV y JSON para cualquier tipo de contenido
 */
export class ExportService {

    // ==================== MÉTODOS PÚBLICOS ====================

    /**
     * Exportar a PDF
     */
    async exportToPDF(data, type, options = {}) {
        const config = this.getConfig(type)
        const pdfConfig = { ...config.formats.pdf, ...options }

        if (!config.formats.pdf?.enabled) {
            throw new Error(`PDF export not enabled for ${type}`)
        }

        await this.loadJsPDF()
        const { jsPDF } = window

        // Configurar documento
        const doc = new jsPDF({
            orientation: pdfConfig.orientation || 'portrait',
            unit: 'mm',
            format: pdfConfig.pageSize || 'a4'
        })

        // Aplicar layout según tipo
        switch (pdfConfig.layout) {
            case 'gallery':
                await this.generateGalleryPDF(doc, data, config, pdfConfig)
                break
            case 'table':
                this.generateTablePDF(doc, data, config, pdfConfig)
                break
            case 'report':
                this.generateReportPDF(doc, data, config, pdfConfig)
                break
            default:
                this.generateBasicPDF(doc, data, config, pdfConfig)
        }

        // Descargar
        const fileName = this.generateFileName(type, 'pdf', options)
        doc.save(fileName)
    }

    /**
     * Exportar a Excel
     */
    async exportToExcel(data, type, options = {}) {
        const config = this.getConfig(type)
        const excelConfig = { ...config.formats.excel, ...options }

        if (!config.formats.excel?.enabled) {
            throw new Error(`Excel export not enabled for ${type}`)
        }

        await this.loadSheetJS()
        const XLSX = window.XLSX

        let workbook

        if (excelConfig.multiSheet && excelConfig.sheets) {
            workbook = this.generateMultiSheetExcel(data, config, excelConfig)
        } else {
            workbook = this.generateSingleSheetExcel(data, config, excelConfig)
        }

        // Descargar
        const fileName = this.generateFileName(type, 'xlsx', options)
        XLSX.writeFile(workbook, fileName)
    }

    /**
     * Exportar a CSV
     */
    exportToCSV(data, type, options = {}) {
        const config = this.getConfig(type)
        const csvConfig = { ...config.formats.csv, ...options }

        if (!config.formats.csv?.enabled) {
            throw new Error(`CSV export not enabled for ${type}`)
        }

        const processedData = this.processData(data, config, options)
        const csv = this.generateCSV(processedData, csvConfig)

        const fileName = this.generateFileName(type, 'csv', options)
        this.downloadFile(csv, fileName, 'text/csv')
    }

    /**
     * Exportar a JSON
     */
    exportToJSON(data, type, options = {}) {
        const config = this.getConfig(type)
        const jsonConfig = { ...config.formats.json, ...options }

        if (!config.formats.json?.enabled) {
            throw new Error(`JSON export not enabled for ${type}`)
        }

        const processedData = this.processData(data, config, options)
        const jsonString = JSON.stringify(processedData, null, jsonConfig.pretty ? 2 : 0)

        const fileName = this.generateFileName(type, 'json', options)
        this.downloadFile(jsonString, fileName, 'application/json')
    }

    // ==================== GENERADORES PDF ====================

    async generateGalleryPDF(doc, data, config, pdfConfig) {
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()
        const margin = 20

        // Título
        this.addPDFHeader(doc, pdfConfig.title || config.name, data.length)

        let yPosition = 75

        for (let i = 0; i < data.length; i++) {
            const item = data[i]

            if (yPosition > pageHeight - 100) {
                doc.addPage()
                yPosition = 30
            }

            // Título del item
            doc.setFontSize(12)
            doc.setFont('helvetica', 'bold')
            doc.text(`${i + 1}. ${item.title || item.name || 'Sin título'}`, margin, yPosition)
            yPosition += 8

            // Fecha si existe
            if (item.date) {
                doc.setFontSize(9)
                doc.setFont('helvetica', 'normal')
                doc.text(`Fecha: ${this.formatDate(item.date)}`, margin, yPosition)
                yPosition += 8
            }

            // Descripción
            if (item.description) {
                doc.setFontSize(10)
                const lines = doc.splitTextToSize(item.description, pageWidth - 2 * margin)
                doc.text(lines, margin, yPosition)
                yPosition += lines.length * 4 + 8
            }

            // Imagen si existe y está habilitada
            if (pdfConfig.includeImages && item.imagePath) {
                await this.addImageToPDF(doc, item.imagePath, margin, yPosition, 100, 60)
                yPosition += 70
            }

            yPosition += 10
        }
    }

    generateTablePDF(doc, data, config, pdfConfig) {
        const pageWidth = doc.internal.pageSize.getWidth()
        const margin = 20

        this.addPDFHeader(doc, pdfConfig.title || config.name, data.length)

        // Preparar datos para tabla
        const tableData = this.prepareTableData(data, config, pdfConfig)

        // Usar autoTable si está disponible
        if (window.jspdf && window.jspdf.AutoTable) {
            doc.autoTable({
                head: [tableData.headers],
                body: tableData.rows,
                startY: 75,
                margin: { left: margin, right: margin },
                styles: { fontSize: 8 },
                headStyles: { fillColor: [255, 95, 1] },
                alternateRowStyles: { fillColor: [245, 245, 245] }
            })
        } else {
            // Tabla básica sin autoTable
            this.drawBasicTable(doc, tableData, 75, margin)
        }
    }

    generateReportPDF(doc, data, config, pdfConfig) {
        this.addPDFHeader(doc, pdfConfig.title || config.name, data.length)

        let yPosition = 75

        // Resumen estadístico
        if (config.calculations) {
            yPosition = this.addStatisticsSection(doc, data, config, yPosition)
        }

        // Gráficos si están habilitados
        if (pdfConfig.includeCharts) {
            yPosition = this.addChartsSection(doc, data, config, yPosition)
        }

        // Tabla de datos
        yPosition += 20
        this.generateTablePDF(doc, data, config, { ...pdfConfig, startY: yPosition })
    }


    drawBasicTable(doc, tableData, startY, margin) {
        const pageWidth = doc.internal.pageSize.getWidth()
        const colWidth = (pageWidth - 2 * margin) / tableData.headers.length
        let yPosition = startY

        // Dibujar headers
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setFillColor(255, 95, 1) // Color naranja
        doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F')

        doc.setTextColor(255, 255, 255) // Texto blanco
        tableData.headers.forEach((header, index) => {
            doc.text(header, margin + (index * colWidth) + 2, yPosition + 6)
        })

        yPosition += 8
        doc.setTextColor(0, 0, 0) // Volver a texto negro
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)

        // Dibujar filas
        tableData.rows.forEach((row, rowIndex) => {
            if (yPosition > doc.internal.pageSize.getHeight() - 20) {
                doc.addPage()
                yPosition = 30
            }

            // Alternar color de fondo
            if (rowIndex % 2 === 0) {
                doc.setFillColor(245, 245, 245)
                doc.rect(margin, yPosition, pageWidth - 2 * margin, 6, 'F')
            }

            row.forEach((cell, cellIndex) => {
                const text = cell.toString().substring(0, 20) // Truncar texto largo
                doc.text(text, margin + (cellIndex * colWidth) + 2, yPosition + 4)
            })

            yPosition += 6
        })
    }

    // ==================== GENERADORES EXCEL ====================

    generateSingleSheetExcel(data, config, excelConfig) {
        const XLSX = window.XLSX
        const workbook = XLSX.utils.book_new()

        const processedData = this.processData(data, config)
        const worksheet = XLSX.utils.json_to_sheet(processedData)

        // Aplicar estilos y configuraciones
        this.styleExcelSheet(worksheet, config, excelConfig)

        XLSX.utils.book_append_sheet(workbook, worksheet, excelConfig.sheetName || config.name)

        return workbook
    }

    generateMultiSheetExcel(data, config, excelConfig) {
        const XLSX = window.XLSX
        const workbook = XLSX.utils.book_new()

        Object.entries(excelConfig.sheets).forEach(([sheetName, sheetConfig]) => {
            let sheetData

            if (sheetConfig.summary) {
                sheetData = this.generateSummaryData(data, config)
            } else {
                const fields = sheetConfig.fields || Object.keys(config.fields)
                sheetData = this.processData(data, config, { fields })
            }

            const worksheet = XLSX.utils.json_to_sheet(sheetData)
            this.styleExcelSheet(worksheet, config, sheetConfig)

            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
        })

        return workbook
    }

    // ==================== MÉTODOS AUXILIARES ====================

    getConfig(type) {
        const config = EXPORT_CONFIGS[type]
        if (!config) {
            throw new Error(`Export configuration not found for type: ${type}`)
        }
        return config
    }

    processData(data, config, options = {}) {
        const fields = options.fields || Object.keys(config.fields)
        const mappers = VALUE_MAPPERS[config.name.toLowerCase()] || {}

        return data.map(item => {
            const processedItem = {}

            fields.forEach(field => {
                const label = config.fields[field] || field
                let value = item[field]

                // Aplicar mappers
                if (mappers[field] && mappers[field][value]) {
                    value = mappers[field][value]
                }

                // Formatear fechas
                if (field.includes('Date') || field.includes('date')) {
                    value = this.formatDate(value)
                }

                // Formatear monedas
                if (field.includes('Amount') || field.includes('amount') || field === 'discount') {
                    value = this.formatCurrency(value)
                }

                processedItem[label] = value || ''
            })

            return processedItem
        })
    }

    generateSummaryData(data, config) {
        const summary = []

        if (config.calculations?.totals) {
            config.calculations.totals.forEach(field => {
                const total = data.reduce((sum, item) => sum + (parseFloat(item[field]) || 0), 0)
                summary.push({
                    'Concepto': config.fields[field] || field,
                    'Total': this.formatCurrency(total),
                    'Promedio': this.formatCurrency(total / data.length),
                    'Registros': data.length
                })
            })
        }

        if (config.calculations?.counts) {
            config.calculations.counts.forEach(field => {
                const counts = this.countByField(data, field)
                Object.entries(counts).forEach(([value, count]) => {
                    summary.push({
                        'Concepto': `${config.fields[field]} - ${value}`,
                        'Cantidad': count,
                        'Porcentaje': `${((count / data.length) * 100).toFixed(1)}%`
                    })
                })
            })
        }

        return summary
    }

    prepareTableData(data, config, options = {}) {
        const fields = options.fields || Object.keys(config.fields)
        const headers = fields.map(field => config.fields[field] || field)

        const rows = data.map(item =>
            fields.map(field => {
                let value = item[field] || ''

                if (field.includes('Date')) {
                    value = this.formatDate(value)
                } else if (field.includes('Amount') || field === 'discount') {
                    value = this.formatCurrency(value)
                }

                return value.toString()
            })
        )

        return { headers, rows }
    }

    addPDFHeader(doc, title, recordCount) {
        const pageWidth = doc.internal.pageSize.getWidth()
        const margin = 20

        // Título principal
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text(title, margin, 30)

        // Información del reporte
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Total de registros: ${recordCount}`, margin, 45)
        doc.text(`Generado: ${this.formatDate(new Date())}`, margin, 52)
        doc.text(`Empresa: ${GLOBAL_CONFIG.company.name}`, pageWidth - margin - 50, 45)

        // Línea separadora
        doc.setDrawColor(200)
        doc.line(margin, 60, pageWidth - margin, 60)
    }

    async addImageToPDF(doc, imagePath, x, y, maxWidth, maxHeight) {
        try {
            if (!imagePath || !imagePath.includes('http')) return

            const img = new Image()
            img.crossOrigin = 'anonymous'

            await new Promise((resolve) => {
                img.onload = () => {
                    const ratio = Math.min(maxWidth / img.width, maxHeight / img.height)
                    const width = img.width * ratio
                    const height = img.height * ratio

                    doc.addImage(img, 'JPEG', x, y, width, height)
                    resolve()
                }
                img.onerror = resolve
                img.src = imagePath
            })
        } catch (error) {
            console.warn('Error adding image to PDF:', error)
        }
    }

    styleExcelSheet(worksheet, config, sheetConfig) {
        const range = window.XLSX.utils.decode_range(worksheet['!ref'])

        // Auto-width si está habilitado
        if (sheetConfig.autoWidth) {
            const colWidths = []
            for (let C = range.s.c; C <= range.e.c; ++C) {
                let maxWidth = 10
                for (let R = range.s.r; R <= range.e.r; ++R) {
                    const cellAddress = window.XLSX.utils.encode_cell({ r: R, c: C })
                    const cell = worksheet[cellAddress]
                    if (cell && cell.v) {
                        maxWidth = Math.max(maxWidth, cell.v.toString().length)
                    }
                }
                colWidths.push({ width: Math.min(maxWidth + 2, 50) })
            }
            worksheet['!cols'] = colWidths
        }
    }

    generateCSV(data, csvConfig) {
        const separator = csvConfig.separator || ','
        const headers = Object.keys(data[0] || {})

        let csv = headers.join(separator) + '\n'

        data.forEach(row => {
            const values = headers.map(header => {
                let value = row[header] || ''
                // Escapar valores que contengan el separador
                if (value.toString().includes(separator)) {
                    value = `"${value}"`
                }
                return value
            })
            csv += values.join(separator) + '\n'
        })

        return csv
    }

    // ==================== UTILIDADES ====================

    formatDate(date) {
        if (!date) return ''
        try {
            return new Intl.DateTimeFormat(GLOBAL_CONFIG.dateFormats.locale, {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }).format(new Date(date))
        } catch {
            return date.toString()
        }
    }

    formatCurrency(amount) {
        if (!amount && amount !== 0) return ''
        try {
            return new Intl.NumberFormat(GLOBAL_CONFIG.currency.locale, {
                style: 'currency',
                currency: GLOBAL_CONFIG.currency.currency
            }).format(amount)
        } catch {
            return `${GLOBAL_CONFIG.currency.symbol}${amount}`
        }
    }

    countByField(data, field) {
        return data.reduce((counts, item) => {
            const value = item[field] || 'Sin especificar'
            counts[value] = (counts[value] || 0) + 1
            return counts
        }, {})
    }

    generateFileName(type, format, options = {}) {
        const config = this.getConfig(type)
        const timestamp = new Date().toISOString().split('T')[0]
        const prefix = options.fileName || config.name.toLowerCase().replace(/\s+/g, '_')

        return `${prefix}_${timestamp}.${format}`
    }

    downloadFile(content, fileName, mimeType) {
        const blob = new Blob([content], { type: mimeType })
        const url = URL.createObjectURL(blob)

        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        document.body.appendChild(link)
        link.click()

        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    async loadJsPDF() {
        if (window.jsPDF) return

        return new Promise((resolve, reject) => {
            const script = document.createElement('script')
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
            script.onload = () => {
                window.jsPDF = window.jspdf?.jsPDF || window.jsPDF

                // Cargar autoTable para tablas
                const autoTableScript = document.createElement('script')
                autoTableScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js'
                autoTableScript.onload = resolve
                autoTableScript.onerror = resolve // No es crítico
                document.head.appendChild(autoTableScript)
            }
            script.onerror = reject
            document.head.appendChild(script)
        })
    }

    async loadSheetJS() {
        if (window.XLSX) return

        return new Promise((resolve, reject) => {
            const script = document.createElement('script')
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
            script.onload = () => resolve()
            script.onerror = reject
            document.head.appendChild(script)
        })
    }
}

// Exportar instancia singleton
export const exportService = new ExportService()
/**
 * Configuraciones universales para exportación
 * Cada tipo de contenido define sus campos, formatos y opciones
 */

export const EXPORT_CONFIGS = {
    // ==================== DOCUMENTATION ====================
    documentation: {
        name: 'Documentación',
        fields: {
            title: 'Título',
            description: 'Descripción',
            date: 'Fecha',
            imagePath: 'Imagen',
            createdAt: 'Fecha de Creación',
            updatedAt: 'Última Actualización'
        },
        formats: {
            pdf: {
                enabled: true,
                layout: 'gallery',
                includeImages: true,
                pageSize: 'a4',
                orientation: 'portrait',
                title: 'Documentación del Proyecto'
            },
            excel: {
                enabled: true,
                sheetName: 'Documentos',
                includeImages: false,
                autoWidth: true
            },
            json: {
                enabled: true,
                pretty: true
            }
        },
        filters: {
            dateRange: true,
            dateField: 'date'
        }
    },

    // ==================== PERSONNEL ====================
    personnel: {
        name: 'Personal',
        fields: {
            // Información Personal
            name: 'Nombre',
            lastname: 'Apellido',
            documentNumber: 'DNI',
            phone: 'Teléfono',
            email: 'Email',

            // Información Laboral
            position: 'Cargo',
            department: 'Departamento',
            personnelType: 'Tipo de Personal',
            status: 'Estado',
            startDate: 'Fecha de Ingreso',
            endDate: 'Fecha de Fin',

            // Información Financiera
            monthlyAmount: 'Sueldo Mensual',
            totalAmount: 'Monto Total',
            discount: 'Descuento',
            bank: 'Banco',
            accountNumber: 'Número de Cuenta',

            // Asistencia Mensual
            workedDays: 'Días Trabajados',
            compensatoryDays: 'Días Compensatorios',
            unpaidLeave: 'Permisos con Descuento',
            absences: 'Faltas',
            sundays: 'Domingos',
            totalDays: 'Total Días',

            // Auditoría
            createdAt: 'Fecha de Creación',
            updatedAt: 'Última Actualización'
        },
        formats: {
            pdf: {
                enabled: true,
                layout: 'table',
                includePhotos: true,
                pageSize: 'a4',
                orientation: 'landscape',
                title: 'Reporte de Personal',
                groupBy: 'department'
            },
            excel: {
                enabled: true,
                multiSheet: true,
                sheets: {
                    'Personal': {
                        fields: ['name', 'lastname', 'documentNumber', 'position', 'department', 'status', 'monthlyAmount'],
                        groupBy: 'department'
                    },
                    'Asistencia': {
                        fields: ['name', 'lastname', 'workedDays', 'compensatoryDays', 'absences', 'sundays', 'totalAmount'],
                        title: 'Reporte de Asistencia'
                    },
                    'Contacto': {
                        fields: ['name', 'lastname', 'phone', 'email', 'bank', 'accountNumber'],
                        title: 'Información de Contacto'
                    }
                },
                autoWidth: true,
                includeCharts: true
            },
            csv: {
                enabled: true,
                separator: ',',
                encoding: 'utf-8'
            },
            json: {
                enabled: true,
                pretty: true
            }
        },
        filters: {
            dateRange: true,
            dateField: 'startDate',
            groupBy: ['department', 'personnelType', 'status'],
            statusFilter: true,
            departmentFilter: true
        },
        calculations: {
            totals: ['monthlyAmount', 'totalAmount', 'discount'],
            averages: ['monthlyAmount', 'workedDays'],
            counts: ['department', 'status', 'personnelType']
        }
    },

    // ==================== PROYECTOS (EJEMPLO FUTURO) ====================
    projects: {
        name: 'Proyectos',
        fields: {
            name: 'Nombre del Proyecto',
            description: 'Descripción',
            startDate: 'Fecha de Inicio',
            endDate: 'Fecha de Fin',
            budget: 'Presupuesto',
            status: 'Estado',
            location: 'Ubicación',
            supervisor: 'Supervisor',
            personnelCount: 'Cantidad de Personal',
            progress: 'Progreso (%)'
        },
        formats: {
            pdf: {
                enabled: true,
                layout: 'report',
                includeCharts: true,
                pageSize: 'a4',
                orientation: 'portrait',
                title: 'Reporte de Proyectos'
            },
            excel: {
                enabled: true,
                multiSheet: true,
                sheets: {
                    'Proyectos': {
                        fields: ['name', 'startDate', 'endDate', 'budget', 'status', 'progress']
                    },
                    'Resumen': {
                        summary: true,
                        charts: ['status', 'progress']
                    }
                }
            }
        },
        filters: {
            dateRange: true,
            dateField: 'startDate',
            statusFilter: true
        }
    },

    // ==================== MACHINERY ====================
    machinery: {
        name: 'Maquinaria',
        fields: {
            name: 'Nombre',
            licensePlate: 'Placa',
            machineryType: 'Tipo de Maquinaria',
            status: 'Estado',
            provider: 'Proveedor',
            description: 'Descripción',
            assignedOperator: 'Operador Asignado',
            registerDate: 'Fecha de Registro',
            createdAt: 'Fecha de Creación'
        },
        formats: {
            excel: {
                enabled: true,
                sheetName: 'Maquinaria',
                autoWidth: true,
                includeCharts: false
            },
            pdf: {
                enabled: true,
                layout: 'table',
                includeImages: false,
                pageSize: 'a4',
                orientation: 'landscape',
                title: 'Reporte de Maquinaria'
            }
        },
        filters: {
            dateRange: true,
            dateField: 'registerDate',
            statusFilter: true,
            groupBy: ['machineryType', 'status']
        }
    },
    // ==================== INCIDENTS ====================
    incidents: {
        name: 'Incidentes',
        fields: {
            // Información Básica
            title: 'Título',
            description: 'Descripción',
            incidentType: 'Tipo de Incidente',
            severity: 'Severidad',
            status: 'Estado',
            location: 'Ubicación',
            notes: 'Notas',

            // Asignación
            reportedBy: 'Reportado Por',
            assignedTo: 'Asignado A',

            // Fechas
            occurredAt: 'Fecha de Ocurrencia',
            resolvedAt: 'Fecha de Resolución',
            registerDate: 'Fecha de Registro',
            createdAt: 'Fecha de Creación',

            // Imagen
            image: 'Imagen',

            // Campos Calculados
            daysOpen: 'Días Abierto',
            isResolved: 'Resuelto',
            isAssigned: 'Asignado'
        },
        formats: {
            pdf: {
                enabled: true,
                layout: 'report',
                includeImages: true,
                pageSize: 'a4',
                orientation: 'portrait',
                title: 'Reporte de Incidentes',
                groupBy: 'severity',
                sections: {
                    summary: true,
                    detailed: true,
                    charts: true
                }
            },
            excel: {
                enabled: true,
                multiSheet: true,
                sheets: {
                    'Incidentes': {
                        fields: ['title', 'incidentType', 'severity', 'status', 'location', 'occurredAt', 'resolvedAt', 'daysOpen'],
                        groupBy: 'severity',
                        conditionalFormatting: {
                            severity: {
                                'ALTO': { background: '#ffebee', color: '#c62828' },
                                'MEDIO': { background: '#fff3e0', color: '#f57c00' },
                                'BAJO': { background: '#e8f5e8', color: '#2e7d32' }
                            },
                            status: {
                                'REPORTADO': { background: '#e3f2fd', color: '#1976d2' },
                                'EN_PROGRESO': { background: '#fff3e0', color: '#f57c00' },
                                'RESUELTO': { background: '#e8f5e8', color: '#2e7d32' }
                            }
                        }
                    },
                    'Por Severidad': {
                        fields: ['title', 'incidentType', 'location', 'occurredAt', 'status', 'daysOpen'],
                        groupBy: 'severity',
                        title: 'Incidentes por Severidad',
                        includeCharts: true
                    },
                    'Por Tipo': {
                        fields: ['title', 'severity', 'location', 'occurredAt', 'status', 'assignedTo'],
                        groupBy: 'incidentType',
                        title: 'Incidentes por Tipo'
                    },
                    'Pendientes': {
                        fields: ['title', 'incidentType', 'severity', 'location', 'occurredAt', 'daysOpen', 'assignedTo'],
                        filter: { status: ['REPORTADO', 'EN_PROGRESO'] },
                        title: 'Incidentes Pendientes',
                        sortBy: 'daysOpen',
                        sortOrder: 'desc'
                    },
                    'Resumen': {
                        summary: true,
                        charts: ['severity', 'status', 'incidentType'],
                        kpis: {
                            total: 'Total de Incidentes',
                            pending: 'Incidentes Pendientes',
                            resolved: 'Incidentes Resueltos',
                            avgDaysOpen: 'Promedio Días Abierto',
                            highSeverity: 'Severidad Alta'
                        }
                    }
                },
                autoWidth: true,
                includeCharts: true,
                freezeHeader: true
            },
            csv: {
                enabled: true,
                separator: ',',
                encoding: 'utf-8',
                fields: ['title', 'incidentType', 'severity', 'status', 'location', 'occurredAt', 'resolvedAt', 'reportedBy', 'assignedTo']
            },
            json: {
                enabled: true,
                pretty: true,
                includeMetadata: true
            }
        },
        filters: {
            dateRange: true,
            dateField: 'occurredAt',
            groupBy: ['severity', 'status', 'incidentType'],
            statusFilter: true,
            severityFilter: true,
            typeFilter: true,
            assignedFilter: true,
            locationFilter: true,
            customFilters: {
                openOnly: {
                    label: 'Solo Incidentes Abiertos',
                    filter: { status: ['REPORTADO', 'EN_PROGRESO'] }
                },
                highPriority: {
                    label: 'Alta Prioridad',
                    filter: { severity: 'ALTO' }
                },
                unassigned: {
                    label: 'Sin Asignar',
                    filter: { assignedTo: null }
                }
            }
        },
        calculations: {
            totals: ['daysOpen'],
            averages: ['daysOpen'],
            counts: ['severity', 'status', 'incidentType', 'assignedTo'],
            percentages: ['status', 'severity'],
            kpis: {
                resolutionRate: {
                    formula: 'resolved / total * 100',
                    label: 'Tasa de Resolución (%)'
                },
                avgResolutionTime: {
                    formula: 'sum(daysOpen where status = RESUELTO) / count(status = RESUELTO)',
                    label: 'Tiempo Promedio de Resolución (días)'
                },
                highSeverityRate: {
                    formula: 'count(severity = ALTO) / total * 100',
                    label: 'Tasa de Incidentes de Alta Severidad (%)'
                }
            }
        },
        sorting: {
            default: { field: 'occurredAt', order: 'desc' },
            options: [
                { field: 'occurredAt', label: 'Fecha de Ocurrencia' },
                { field: 'severity', label: 'Severidad' },
                { field: 'status', label: 'Estado' },
                { field: 'daysOpen', label: 'Días Abierto' },
                { field: 'title', label: 'Título' }
            ]
        }
    }
}

// ==================== MAPEOS DE VALORES ====================
export const VALUE_MAPPERS = {
    personnel: {
        status: {
            'ACTIVE': 'Activo',
            'INACTIVE': 'Inactivo',
            'PENDING': 'Pendiente',
            'SUSPENDED': 'Suspendido',
            'FINISHED': 'Finalizado'
        },
        personnelType: {
            'TECHNICAL': 'Técnico',
            'SPECIALIST': 'Especialista',
            'ADMINISTRATIVE': 'Administrativo',
            'RENTED_OPERATOR': 'Operador de Máquina Alquilada',
            'LABORER': 'Obrero'
        },
        bank: {
            'BCP': 'Banco de Crédito del Perú',
            'BBVA': 'BBVA Continental',
            'SCOTIABANK': 'Scotiabank Perú',
            'INTERBANK': 'Interbank',
            'BIF': 'Banco Interamericano de Finanzas',
            'PICHINCHA': 'Banco Pichincha',
            'NACION': 'Banco de la Nación',
            'FALABELLA': 'Banco Falabella',
            'RIPLEY': 'Banco Ripley',
            'SANTANDER': 'Banco Santander',
            'CITIBANK': 'Citibank',
            'OTHER': 'Otro'
        }
    },
    machinery: {
        status: {
            'ACTIVE': 'Activo',
            'MAINTENANCE': 'Mantenimiento'
        },
        machineryType: {
            'EXCAVATOR': 'Excavadora',
            'TRACTOR': 'Tractor',
            'CRANE': 'Grúa',
            'BULLDOZER': 'Bulldozer',
            'LOADER': 'Cargadora',
            'DUMP_TRUCK': 'Volquete',
            'COMPACTOR': 'Compactadora',
            'MIXER': 'Mezcladora',
            'GENERATOR': 'Generador',
            'PUMP': 'Bomba'
        }
    },
    incidents: {
        severity: {
            'BAJO': 'Bajo',
            'MEDIO': 'Medio',
            'ALTO': 'Alto'
        },
        status: {
            'REPORTADO': 'Reportado',
            'EN_PROGRESO': 'En Progreso',
            'RESUELTO': 'Resuelto'
        },
        incidentType: {
            'ACCIDENTE_LABORAL': 'Accidente Laboral',
            'FALLA_EQUIPO': 'Falla de Equipo',
            'SEGURIDAD': 'Problema de Seguridad',
            'CALIDAD': 'Problema de Calidad',
            'AMBIENTAL': 'Incidente Ambiental',
            'OTROS': 'Otros'
        },
        // Mapeos booleanos para campos calculados
        isResolved: {
            true: 'Sí',
            false: 'No'
        },
        isAssigned: {
            true: 'Sí',
            false: 'No'
        }
    }
}

// ==================== CONFIGURACIONES GLOBALES ====================
export const GLOBAL_CONFIG = {
    dateFormats: {
        display: 'DD/MM/YYYY',
        export: 'YYYY-MM-DD',
        locale: 'es-PE'
    },
    currency: {
        symbol: 'S/',
        locale: 'es-PE',
        currency: 'PEN'
    },
    company: {
        name: 'BuildTruck',
        logo: '/assets/logo.png',
        address: 'Lima, Perú',
        phone: '+51 xxx xxx xxx'
    },
    export: {
        maxRows: 10000,
        chunkSize: 1000,
        timeout: 30000
    }
}
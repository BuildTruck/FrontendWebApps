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
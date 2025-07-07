// src/core/tutorial/config/supervisor-layout.js

export const supervisorLayoutSteps = [
    {
        id: 'supervisor-welcome',
        target: '.welcome-header, .page-title',
        title: 'Panel de Supervisión',
        description: 'Bienvenido a tu área de supervisión. Desde aquí gestionas las operaciones diarias del proyecto asignado.',
        position: 'bottom',
        order: 1,
        optional: false
    },
    {
        id: 'notifications',
        target: '[data-tutorial="notifications"]',
        title: 'Notificaciones de Campo',
        description: 'Recibe alertas importantes sobre el proyecto: cambios de personal, incidentes, y actualizaciones urgentes.',
        position: 'bottom',
        order: 2,
        optional: false
    },
    {
        id: 'language',
        target: '[data-tutorial="language"]',
        title: 'Idioma',
        description: 'Cambia el idioma de la interfaz según tu preferencia.',
        position: 'bottom',
        order: 3,
        optional: true
    },
    {
        id: 'personal-nav',
        target: '[data-tutorial="personal"]',
        title: 'Gestión de Personal',
        description: 'Tu herramienta principal: gestiona la asistencia, información y asignaciones del equipo de trabajo.',
        position: 'right',
        order: 4,
        optional: false
    },
    {
        id: 'inventario-nav',
        target: '[data-tutorial="inventario"]',
        title: 'Control de Inventario',
        description: 'Registra el uso de materiales, herramientas y equipos. Mantén un control preciso del inventario.',
        position: 'right',
        order: 5,
        optional: false
    },
    {
        id: 'maquinaria-nav',
        target: '[data-tutorial="maquinaria"]',
        title: 'Maquinaria y Equipos',
        description: 'Supervisa el estado y uso de maquinaria pesada. Reporta mantenimientos y problemas.',
        position: 'right',
        order: 6,
        optional: true
    },
    {
        id: 'incidentes-nav',
        target: '[data-tutorial="incidentes"]',
        title: 'Reporte de Incidentes',
        description: 'Documenta incidentes de seguridad, accidentes y situaciones que requieren atención inmediata.',
        position: 'right',
        order: 7,
        optional: false
    },
    {
        id: 'documentacion-nav',
        target: '[data-tutorial="documentacion"]',
        title: 'Documentación de Campo',
        description: 'Accede a planos, especificaciones y documentos técnicos necesarios para las operaciones.',
        position: 'right',
        order: 8,
        optional: true
    },
    {
        id: 'configuraciones-nav',
        target: '[data-tutorial="configuraciones"]',
        title: 'Configuraciones',
        description: 'Ajusta configuraciones específicas de tu área de trabajo y preferencias operativas.',
        position: 'right',
        order: 9,
        optional: true
    },
    {
        id: 'perfil-nav',
        target: '[data-tutorial="perfil"]',
        title: 'Tu Perfil',
        description: 'Actualiza tu información personal y configuraciones de cuenta.',
        position: 'right',
        order: 10,
        optional: true
    }
]

export const supervisorLayoutConfig = {
    id: 'supervisor-layout',
    name: 'Panel de Supervisión',
    description: 'Tutorial de introducción para supervisores de campo',
    steps: supervisorLayoutSteps,

    settings: {
        canSkipSteps: true,
        canSkipTutorial: true,
        autoStart: true,
        delay: 1200,

        requiredElements: [
            '.sidebar',
            '.header-bar',
            '.content-area'
        ],

        highlightClass: 'tutorial-highlight-supervisor',

        tooltip: {
            maxWidth: 360,
            showProgress: true,
            showNavigation: true
        }
    },

    messages: {
        welcome: '¡Bienvenido Supervisor! Te mostraremos las herramientas para gestionar tu proyecto eficientemente.',
        completion: '¡Excelente! Ya conoces todas las herramientas de supervisión. ¡A trabajar!',
        skip: '¿Quieres saltar el tutorial de supervisión? Puedes reactivarlo desde configuraciones.',

        buttons: {
            next: 'Siguiente',
            previous: 'Anterior',
            skip: 'Saltar',
            finish: 'Comenzar Supervisión',
            skipTutorial: 'Saltar Tutorial'
        }
    },

    validators: {
        elementExists: (selector) => {
            return document.querySelector(selector) !== null
        },

        sidebarVisible: () => {
            const sidebar = document.querySelector('.sidebar')
            return sidebar && getComputedStyle(sidebar).display !== 'none'
        },

        correctSupervisorRoute: () => {
            return window.location.pathname.includes('/supervisor/')
        },

        projectAssigned: () => {
            // Verificar que el supervisor tiene proyecto asignado
            const projectInfo = document.querySelector('.page-title')
            return projectInfo && !projectInfo.textContent.includes('Sin proyecto')
        }
    },

    postStepActions: {
        'personal-nav': () => {
            console.log('💡 Supervisor conoce gestión de personal')
        },

        'incidentes-nav': () => {
            console.log('💡 Supervisor conoce reporte de incidentes')
        },

        'inventario-nav': () => {
            console.log('💡 Supervisor conoce control de inventario')
        }
    },

    // Configuración específica para supervisores
    supervisor: {
        // Elementos críticos que siempre deben mostrarse
        criticalSteps: ['personal-nav', 'incidentes-nav', 'inventario-nav'],

        // Elementos que dependen de permisos
        conditionalSteps: {
            'maquinaria-nav': 'hasHeavyMachinery',
            'documentacion-nav': 'canAccessDocuments'
        }
    },

    analytics: {
        trackStepCompletion: true,
        trackSkips: true,
        trackTimeSpent: true,
        trackSupervisorActions: true
    }
}

export function getSupervisorLayoutSteps(userPreferences = {}, permissions = {}) {
    let steps = [...supervisorLayoutSteps]

    // Tutorial rápido (solo pasos críticos)
    if (userPreferences.quickTutorial) {
        const criticalIds = supervisorLayoutConfig.supervisor.criticalSteps
        steps = steps.filter(step =>
            !step.optional ||
            criticalIds.includes(step.id)
        )
    }

    // Filtrar según permisos
    if (!permissions.canAccessMachinery) {
        steps = steps.filter(step => step.id !== 'maquinaria-nav')
    }

    if (!permissions.canAccessDocuments) {
        steps = steps.filter(step => step.id !== 'documentacion-nav')
    }

    return steps.sort((a, b) => a.order - b.order)
}

export const supervisorLayoutTargets = {
    // Header y bienvenida
    'supervisor-welcome': {
        selectors: [
            '.welcome-header',
            '.page-title',
            '.header-bar h1'
        ],
        fallback: '.header-bar'
    },

    // Notificaciones y controles
    'notifications': {
        selectors: [
            '[data-tutorial="notifications"]',
            '.notification-bell',
            '.header-actions .notification-bell'
        ],
        fallback: '.header-actions'
    },

    'language': {
        selectors: [
            '[data-tutorial="language"]',
            '.language-switcher',
            '.header-actions .language-switcher'
        ],
        fallback: '.header-actions'
    },

    // Navegación principal (sidebar)
    'personal': {
        selectors: [
            '[data-tutorial="personal"]',
            '.menu-item[data-tab="personal"]',
            '.sidebar-menu .menu-item:first-child'
        ],
        fallback: '.sidebar-menu'
    },

    'inventario': {
        selectors: [
            '[data-tutorial="inventario"]',
            '.menu-item[data-tab="inventario"]',
            '.sidebar-menu .menu-item:nth-child(2)'
        ],
        fallback: '.sidebar-menu'
    },

    'maquinaria': {
        selectors: [
            '[data-tutorial="maquinaria"]',
            '.menu-item[data-tab="maquinaria"]',
            '.sidebar-menu .menu-item:nth-child(3)'
        ],
        fallback: '.sidebar-menu'
    },

    'incidentes': {
        selectors: [
            '[data-tutorial="incidentes"]',
            '.menu-item[data-tab="incidentes"]',
            '.sidebar-menu .menu-item:nth-child(4)'
        ],
        fallback: '.sidebar-menu'
    },

    'documentacion': {
        selectors: [
            '[data-tutorial="documentacion"]',
            '.menu-item[data-tab="documentacion"]',
            '.sidebar-menu .menu-item:nth-child(5)'
        ],
        fallback: '.sidebar-menu'
    },

    // Perfil y configuraciones (sidebar inferior)
    'configuraciones': {
        selectors: [
            '[data-tutorial="configuraciones"]',
            '.sidebar-profile .menu-item:first-child'
        ],
        fallback: '.sidebar-profile'
    },

    'perfil': {
        selectors: [
            '[data-tutorial="perfil"]',
            '.sidebar-profile .menu-item:nth-child(2)'
        ],
        fallback: '.sidebar-profile'
    },

    'salir': {
        selectors: [
            '[data-tutorial="salir"]',
            '.sidebar-profile .menu-item:last-child'
        ],
        fallback: '.sidebar-profile'
    }
}

export function setupSupervisorLayoutTargets() {
    Object.entries(supervisorLayoutTargets).forEach(([key, config]) => {
        let element = null

        for (const selector of config.selectors) {
            element = document.querySelector(selector)
            if (element) break
        }

        if (!element && config.fallback) {
            element = document.querySelector(config.fallback)
        }

        if (element && !element.hasAttribute('data-tutorial')) {
            element.setAttribute('data-tutorial', key)
            console.log(`🎯 Supervisor tutorial target configurado: ${key}`)
        }
    })
}

export function canStartSupervisorLayoutTutorial() {
    const requiredElements = supervisorLayoutConfig.settings.requiredElements

    const canStart = requiredElements.every(selector => {
        const exists = document.querySelector(selector) !== null
        if (!exists) {
            console.warn(`⚠️ Elemento requerido no encontrado para supervisor: ${selector}`)
        }
        return exists
    })

    // Verificación adicional: el supervisor debe tener un proyecto asignado
    const hasProject = supervisorLayoutConfig.validators.projectAssigned()
    if (!hasProject) {
        console.warn('⚠️ Supervisor sin proyecto asignado, tutorial no disponible')
        return false
    }

    return canStart
}

// Helper para obtener información del proyecto asignado
export function getSupervisorProjectInfo() {
    // Extraer ID del proyecto de la URL
    const pathParts = window.location.pathname.split('/')
    const projectIdIndex = pathParts.findIndex(part => part === 'supervisor') + 1
    const projectId = pathParts[projectIdIndex]

    return {
        projectId,
        projectPath: `/supervisor/${projectId}`
    }
}

// Configuración específica para diferentes tipos de supervisores
export const supervisorTypes = {
    // Supervisor de construcción general
    construction: {
        prioritySteps: ['personal-nav', 'incidentes-nav', 'inventario-nav'],
        optionalSteps: ['maquinaria-nav', 'documentacion-nav']
    },

    // Supervisor de seguridad
    safety: {
        prioritySteps: ['incidentes-nav', 'personal-nav'],
        optionalSteps: ['inventario-nav', 'maquinaria-nav']
    },

    // Supervisor de maquinaria
    machinery: {
        prioritySteps: ['maquinaria-nav', 'incidentes-nav', 'inventario-nav'],
        optionalSteps: ['personal-nav', 'documentacion-nav']
    }
}

export function getStepsForSupervisorType(type = 'construction') {
    const config = supervisorTypes[type] || supervisorTypes.construction
    const allSteps = [...supervisorLayoutSteps]

    // Marcar pasos prioritarios como no opcionales
    return allSteps.map(step => ({
        ...step,
        optional: !config.prioritySteps.includes(step.id)
    })).sort((a, b) => a.order - b.order)
}
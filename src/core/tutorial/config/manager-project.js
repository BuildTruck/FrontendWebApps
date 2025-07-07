// src/core/tutorial/config/manager-project.js

export const managerProjectSteps = [
    {
        id: 'project-welcome',
        target: '.project-header',
        title: 'Gestión de Proyecto',
        description: 'Bienvenido al área de gestión de tu proyecto. Aquí puedes administrar todos los aspectos de la construcción.',
        position: 'bottom',
        order: 1,
        optional: false
    },
    {
        id: 'back-button',
        target: '[data-tutorial="back-button"]',
        title: 'Volver a Proyectos',
        description: 'Usa este botón para regresar a la lista principal de todos tus proyectos.',
        position: 'right',
        order: 2,
        optional: false
    },
    {
        id: 'project-notifications',
        target: '[data-tutorial="notifications"]',
        title: 'Notificaciones del Proyecto',
        description: 'Recibe alertas específicas sobre este proyecto: actualizaciones de personal, incidentes, y más.',
        position: 'bottom',
        order: 3,
        optional: true
    },
    {
        id: 'project-tabs',
        target: '.tabs-nav',
        title: 'Secciones del Proyecto',
        description: 'Navega entre las diferentes secciones para gestionar cada aspecto de tu proyecto.',
        position: 'bottom',
        order: 4,
        optional: false
    },
    {
        id: 'documentacion-tab',
        target: '[data-tutorial="documentacion"]',
        title: 'Documentación',
        description: 'Gestiona planos, contratos, permisos y toda la documentación importante del proyecto.',
        position: 'bottom',
        order: 5,
        optional: false
    },
    {
        id: 'personal-tab',
        target: '[data-tutorial="personal"]',
        title: 'Personal',
        description: 'Administra el equipo de trabajo: asignaciones, asistencia y información del personal.',
        position: 'bottom',
        order: 6,
        optional: false
    },
    {
        id: 'inventario-tab',
        target: '[data-tutorial="inventario"]',
        title: 'Inventario',
        description: 'Controla materiales, herramientas y equipos disponibles en el proyecto.',
        position: 'bottom',
        order: 7,
        optional: true
    },
    {
        id: 'incidentes-tab',
        target: '[data-tutorial="incidentes"]',
        title: 'Incidentes',
        description: 'Registra y da seguimiento a incidentes de seguridad, problemas y observaciones.',
        position: 'bottom',
        order: 8,
        optional: true
    },
    {
        id: 'maquinaria-tab',
        target: '[data-tutorial="maquinaria"]',
        title: 'Maquinaria',
        description: 'Gestiona el mantenimiento y uso de maquinaria pesada y equipos especializados.',
        position: 'bottom',
        order: 9,
        optional: true
    },
    {
        id: 'configuracion-tab',
        target: '[data-tutorial="configuracion"]',
        title: 'Configuración de la Obra',
        description: 'Ajusta parámetros específicos del proyecto, horarios de trabajo y configuraciones generales.',
        position: 'bottom',
        order: 10,
        optional: true
    },
    {
        id: 'tab-counters',
        target: '.tab-count:first',
        title: 'Contadores Dinámicos',
        description: 'Estos números te muestran la cantidad de elementos en cada sección (personal activo, documentos, etc.).',
        position: 'top',
        order: 11,
        optional: true
    }
]

export const managerProjectConfig = {
    id: 'manager-project',
    name: 'Gestión de Proyecto Individual',
    description: 'Tutorial para la gestión detallada de un proyecto específico',
    steps: managerProjectSteps,

    settings: {
        canSkipSteps: true,
        canSkipTutorial: true,
        autoStart: true,
        delay: 1000,

        requiredElements: [
            '.project-header',
            '.tabs-nav',
            '.main-content'
        ],

        highlightClass: 'tutorial-highlight-project',

        tooltip: {
            maxWidth: 380,
            showProgress: true,
            showNavigation: true
        }
    },

    messages: {
        welcome: '¡Perfecto! Ahora te mostramos cómo gestionar tu proyecto en detalle.',
        completion: '¡Excelente! Ya conoces todas las herramientas para gestionar tu proyecto eficientemente.',
        skip: '¿Quieres saltar el tutorial del proyecto? Puedes reactivarlo desde configuración.',

        buttons: {
            next: 'Siguiente',
            previous: 'Anterior',
            skip: 'Saltar',
            finish: 'Comenzar a Trabajar',
            skipTutorial: 'Saltar Tutorial'
        }
    },

    validators: {
        elementExists: (selector) => {
            return document.querySelector(selector) !== null
        },

        tabsVisible: () => {
            const tabs = document.querySelector('.tabs-nav')
            return tabs && getComputedStyle(tabs).display !== 'none'
        },

        correctProjectRoute: () => {
            return window.location.pathname.includes('/proyecto/')
        },

        projectDataLoaded: () => {
            // Verificar que el nombre del proyecto esté cargado
            const projectTitle = document.querySelector('.project-title')
            return projectTitle && !projectTitle.textContent.includes('Proyecto')
        }
    },

    postStepActions: {
        'documentacion-tab': () => {
            console.log('💡 Usuario conoce la gestión de documentación')
        },

        'personal-tab': () => {
            console.log('💡 Usuario conoce la gestión de personal')
        },

        'tab-counters': () => {
            console.log('💡 Usuario entiende los contadores dinámicos')
        }
    },

    analytics: {
        trackStepCompletion: true,
        trackSkips: true,
        trackTimeSpent: true,
        trackTabInteraction: true
    }
}

export function getManagerProjectSteps(userPreferences = {}) {
    let steps = [...managerProjectSteps]

    // Tutorial rápido (solo pasos esenciales)
    if (userPreferences.quickTutorial) {
        steps = steps.filter(step => !step.optional)
    }

    // Filtrar según permisos del usuario
    if (userPreferences.hideAdvancedFeatures) {
        steps = steps.filter(step => !['maquinaria-tab', 'configuracion-tab'].includes(step.id))
    }

    return steps.sort((a, b) => a.order - b.order)
}

export const managerProjectTargets = {
    // Header del proyecto
    'project-header': {
        selectors: [
            '.project-header',
            '.project-title'
        ],
        fallback: '.main-content'
    },

    // Botón de regreso
    'back-button': {
        selectors: [
            '[data-tutorial="back-button"]',
            '.back-button',
            '.large-back-button'
        ],
        fallback: '.sidebar'
    },

    // Notificaciones
    'notifications': {
        selectors: [
            '[data-tutorial="notifications"]',
            '.notification-bell',
            '.header-actions .notification-bell'
        ],
        fallback: '.header-actions'
    },

    // Navegación de tabs
    'project-tabs': {
        selectors: [
            '.tabs-nav',
            '.tabs-navigation'
        ],
        fallback: '.main-content'
    },

    // Tabs individuales
    'documentacion': {
        selectors: [
            '[data-tutorial="documentacion"]',
            '.tab:nth-child(1)',
            '.tab[data-tab="documentacion"]'
        ],
        fallback: '.tabs-nav'
    },

    'personal': {
        selectors: [
            '[data-tutorial="personal"]',
            '.tab:nth-child(2)',
            '.tab[data-tab="personal"]'
        ],
        fallback: '.tabs-nav'
    },

    'inventario': {
        selectors: [
            '[data-tutorial="inventario"]',
            '.tab:nth-child(3)',
            '.tab[data-tab="inventario"]'
        ],
        fallback: '.tabs-nav'
    },

    'incidentes': {
        selectors: [
            '[data-tutorial="incidentes"]',
            '.tab:nth-child(4)',
            '.tab[data-tab="incidentes"]'
        ],
        fallback: '.tabs-nav'
    },

    'maquinaria': {
        selectors: [
            '[data-tutorial="maquinaria"]',
            '.tab:nth-child(5)',
            '.tab[data-tab="maquinaria"]'
        ],
        fallback: '.tabs-nav'
    },

    'configuracion': {
        selectors: [
            '[data-tutorial="configuracion"]',
            '.tab:nth-child(6)',
            '.tab[data-tab="configuracion"]'
        ],
        fallback: '.tabs-nav'
    },

    // Contadores
    'tab-count': {
        selectors: [
            '.tab-count',
            '.tab .highlight',
            '.tab .neutral'
        ],
        fallback: '.tabs-nav'
    }
}

export function setupManagerProjectTargets() {
    Object.entries(managerProjectTargets).forEach(([key, config]) => {
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
            console.log(`🎯 Project tutorial target configurado: ${key}`)
        }
    })
}

export function canStartManagerProjectTutorial() {
    const requiredElements = managerProjectConfig.settings.requiredElements

    return requiredElements.every(selector => {
        const exists = document.querySelector(selector) !== null
        if (!exists) {
            console.warn(`⚠️ Elemento requerido no encontrado para proyecto: ${selector}`)
        }
        return exists
    })
}

// Helper específico para detectar qué tab está activo
export function getCurrentActiveTab() {
    const activeTab = document.querySelector('.tab.active')
    if (activeTab) {
        const tabText = activeTab.textContent.toLowerCase()
        if (tabText.includes('documentación')) return 'documentacion'
        if (tabText.includes('personal')) return 'personal'
        if (tabText.includes('inventario')) return 'inventario'
        if (tabText.includes('incidentes')) return 'incidentes'
        if (tabText.includes('maquinaria')) return 'maquinaria'
        if (tabText.includes('configuración')) return 'configuracion'
    }
    return 'documentacion' // Default
}

// Configuración específica para el primer acceso a documentación
export const documentacionFirstVisitSteps = [
    {
        id: 'documentacion-welcome',
        target: '.project-content',
        title: 'Gestión de Documentación',
        description: 'Aquí puedes subir y organizar todos los documentos importantes: planos, contratos, permisos y más.',
        position: 'top',
        order: 1,
        optional: false
    }
]
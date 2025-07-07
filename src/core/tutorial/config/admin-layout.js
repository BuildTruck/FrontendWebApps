// src/core/tutorial/config/admin-layout.js

export const adminLayoutSteps = [
    {
        id: 'admin-welcome',
        target: '.dashboard-header',
        title: 'Panel de Administración',
        description: 'Bienvenido al panel de administración de BuildTruck. Desde aquí gestionas todo el sistema y usuarios.',
        position: 'bottom',
        order: 1,
        optional: false
    },
    {
        id: 'notifications',
        target: '[data-tutorial="notifications"]',
        title: 'Notificaciones del Sistema',
        description: 'Recibe alertas importantes sobre el sistema: nuevos usuarios, errores, y actualizaciones críticas.',
        position: 'bottom',
        order: 2,
        optional: true
    },
    {
        id: 'language',
        target: '[data-tutorial="language"]',
        title: 'Configuración de Idioma',
        description: 'Cambia el idioma de la interfaz administrativa.',
        position: 'bottom',
        order: 3,
        optional: true
    },
    {
        id: 'dashboard-nav',
        target: '[data-tutorial="dashboard"]',
        title: 'Dashboard Principal',
        description: 'Tu vista principal con estadísticas clave: usuarios activos, nuevos registros y métricas del sistema.',
        position: 'right',
        order: 4,
        optional: false
    },
    {
        id: 'stats-cards',
        target: '.stats-grid',
        title: 'Estadísticas del Sistema',
        description: 'Monitorea en tiempo real: total de usuarios, managers, supervisores y actividad reciente.',
        position: 'bottom',
        order: 5,
        optional: false
    },
    {
        id: 'usuarios-nav',
        target: '[data-tutorial="usuarios"]',
        title: 'Gestión de Usuarios',
        description: 'Crea, edita y administra todos los usuarios del sistema: managers, supervisores y administradores.',
        position: 'right',
        order: 6,
        optional: false
    },
    {
        id: 'charts-section',
        target: '.charts-section',
        title: 'Gráficos y Analytics',
        description: 'Visualiza tendencias y distribución de usuarios con gráficos interactivos y reportes.',
        position: 'top',
        order: 7,
        optional: true
    },
    {
        id: 'quick-actions',
        target: '.quick-actions',
        title: 'Acciones Rápidas',
        description: 'Accesos directos a las funciones más utilizadas para agilizar tu trabajo administrativo.',
        position: 'top',
        order: 8,
        optional: true
    },
    {
        id: 'recent-users',
        target: '.recent-users',
        title: 'Usuarios Recientes',
        description: 'Revisa los usuarios más recientes del sistema y sus estados de activación.',
        position: 'top',
        order: 9,
        optional: true
    },
    {
        id: 'active-users',
        target: '.active-users',
        title: 'Usuarios Activos',
        description: 'Monitorea qué usuarios han estado activos recientemente en el sistema.',
        position: 'top',
        order: 10,
        optional: true
    },
    {
        id: 'configuraciones-nav',
        target: '[data-tutorial="configuraciones"]',
        title: 'Configuraciones del Sistema',
        description: 'Accede a configuraciones avanzadas del sistema, parámetros globales y ajustes técnicos.',
        position: 'right',
        order: 11,
        optional: true
    }
]

export const adminLayoutConfig = {
    id: 'admin-layout',
    name: 'Panel de Administración',
    description: 'Tutorial completo para administradores del sistema BuildTruck',
    steps: adminLayoutSteps,

    settings: {
        canSkipSteps: true,
        canSkipTutorial: true,
        autoStart: true,
        delay: 1000,

        requiredElements: [
            '.sidebar',
            '.header-bar',
            '.dashboard-content'
        ],

        highlightClass: 'tutorial-highlight-admin',

        tooltip: {
            maxWidth: 400,
            showProgress: true,
            showNavigation: true
        }
    },

    messages: {
        welcome: '¡Bienvenido Administrador! Te guiaremos por todas las herramientas de gestión del sistema.',
        completion: '¡Perfecto! Ya dominas el panel de administración. ¡Administra BuildTruck con confianza!',
        skip: '¿Quieres saltar el tutorial de administración? Puedes reactivarlo desde configuraciones.',

        buttons: {
            next: 'Siguiente',
            previous: 'Anterior',
            skip: 'Saltar',
            finish: 'Comenzar Administración',
            skipTutorial: 'Saltar Tutorial'
        }
    },

    validators: {
        elementExists: (selector) => {
            return document.querySelector(selector) !== null
        },

        dashboardLoaded: () => {
            const statsCards = document.querySelectorAll('.stat-card')
            return statsCards.length > 0
        },

        correctAdminRoute: () => {
            return window.location.pathname.includes('/admin')
        },

        hasAdminPermissions: () => {
            // Verificar que el usuario es realmente admin
            const user = JSON.parse(sessionStorage.getItem('user') || '{}')
            return user.role === 'Admin'
        },

        chartsRendered: () => {
            // Verificar que los gráficos estén renderizados
            const charts = document.querySelectorAll('.chart-card canvas, .chart-card svg')
            return charts.length > 0
        }
    },

    postStepActions: {
        'usuarios-nav': () => {
            console.log('💡 Admin conoce gestión de usuarios')
        },

        'stats-cards': () => {
            console.log('💡 Admin entiende las estadísticas del sistema')
        },

        'charts-section': () => {
            console.log('💡 Admin conoce los analytics y gráficos')
        }
    },

    // Configuración específica para administradores
    admin: {
        // Elementos críticos que todo admin debe conocer
        criticalSteps: ['dashboard-nav', 'usuarios-nav', 'stats-cards'],

        // Elementos avanzados para admins experimentados
        advancedSteps: ['charts-section', 'configuraciones-nav'],

        // Permisos requeridos para ciertos pasos
        permissionSteps: {
            'configuraciones-nav': 'canModifySystemSettings',
            'charts-section': 'canViewAnalytics'
        }
    },

    analytics: {
        trackStepCompletion: true,
        trackSkips: true,
        trackTimeSpent: true,
        trackAdminActions: true,
        trackSystemMetrics: true
    }
}

export function getAdminLayoutSteps(userPreferences = {}, permissions = {}) {
    let steps = [...adminLayoutSteps]

    // Tutorial rápido (solo pasos críticos)
    if (userPreferences.quickTutorial) {
        const criticalIds = adminLayoutConfig.admin.criticalSteps
        steps = steps.filter(step =>
            !step.optional ||
            criticalIds.includes(step.id)
        )
    }

    // Tutorial avanzado (incluir todo)
    if (userPreferences.advancedTutorial) {
        steps = steps.map(step => ({ ...step, optional: false }))
    }

    // Filtrar según permisos del admin
    if (!permissions.canModifySystemSettings) {
        steps = steps.filter(step => step.id !== 'configuraciones-nav')
    }

    if (!permissions.canViewAnalytics) {
        steps = steps.filter(step => step.id !== 'charts-section')
    }

    return steps.sort((a, b) => a.order - b.order)
}

export const adminLayoutTargets = {
    // Header y dashboard principal
    'admin-welcome': {
        selectors: [
            '.dashboard-header',
            '.dashboard-header h2',
            '.admin-dashboard h2'
        ],
        fallback: '.admin-dashboard'
    },

    // Controles del header
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

    // Navegación sidebar
    'dashboard': {
        selectors: [
            '[data-tutorial="dashboard"]',
            '.menu-item[data-tab="dashboard"]',
            '.sidebar-menu .menu-item:first-child'
        ],
        fallback: '.sidebar-menu'
    },

    'usuarios': {
        selectors: [
            '[data-tutorial="usuarios"]',
            '.menu-item[data-tab="usuarios"]',
            '.sidebar-menu .menu-item:nth-child(2)'
        ],
        fallback: '.sidebar-menu'
    },

    'configuraciones': {
        selectors: [
            '[data-tutorial="configuraciones"]',
            '.menu-item[data-tab="configuraciones"]',
            '.sidebar-menu .menu-item:nth-child(3)'
        ],
        fallback: '.sidebar-menu'
    },

    // Elementos del dashboard
    'stats-cards': {
        selectors: [
            '.stats-grid',
            '.stat-card:first-child'
        ],
        fallback: '.dashboard-content'
    },

    'charts-section': {
        selectors: [
            '.charts-section',
            '.chart-card:first-child'
        ],
        fallback: '.dashboard-content'
    },

    'quick-actions': {
        selectors: [
            '.quick-actions',
            '.actions-grid'
        ],
        fallback: '.dashboard-content'
    },

    'recent-users': {
        selectors: [
            '.recent-users',
            '.users-list'
        ],
        fallback: '.bottom-section'
    },

    'active-users': {
        selectors: [
            '.active-users',
            '.bottom-section .active-users'
        ],
        fallback: '.bottom-section'
    }
}

export function setupAdminLayoutTargets() {
    Object.entries(adminLayoutTargets).forEach(([key, config]) => {
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
            console.log(`🎯 Admin tutorial target configurado: ${key}`)
        }
    })
}

export function canStartAdminLayoutTutorial() {
    const requiredElements = adminLayoutConfig.settings.requiredElements

    const elementsExist = requiredElements.every(selector => {
        const exists = document.querySelector(selector) !== null
        if (!exists) {
            console.warn(`⚠️ Elemento requerido no encontrado para admin: ${selector}`)
        }
        return exists
    })

    // Verificaciones adicionales específicas para admin
    const hasAdminRole = adminLayoutConfig.validators.hasAdminPermissions()
    const dashboardLoaded = adminLayoutConfig.validators.dashboardLoaded()

    if (!hasAdminRole) {
        console.warn('⚠️ Usuario no tiene permisos de administrador')
        return false
    }

    if (!dashboardLoaded) {
        console.warn('⚠️ Dashboard no está completamente cargado')
        return false
    }

    return elementsExist
}

// Helper para obtener estadísticas del sistema en tiempo real
export function getSystemStats() {
    const statCards = document.querySelectorAll('.stat-card')
    const stats = {}

    statCards.forEach((card, index) => {
        const value = card.querySelector('h3')?.textContent || '0'
        const label = card.querySelector('p')?.textContent || `stat-${index}`

        stats[label.toLowerCase().replace(/\s+/g, '_')] = parseInt(value) || 0
    })

    return stats
}

// Configuración para diferentes tipos de administradores
export const adminTypes = {
    // Super administrador (acceso completo)
    super: {
        prioritySteps: ['dashboard-nav', 'usuarios-nav', 'stats-cards', 'configuraciones-nav'],
        includedSteps: 'all'
    },

    // Administrador de usuarios (enfocado en gestión de personas)
    user_admin: {
        prioritySteps: ['dashboard-nav', 'usuarios-nav', 'recent-users', 'active-users'],
        excludedSteps: ['configuraciones-nav']
    },

    // Administrador de sistema (enfocado en configuraciones)
    system_admin: {
        prioritySteps: ['dashboard-nav', 'stats-cards', 'charts-section', 'configuraciones-nav'],
        excludedSteps: []
    }
}

export function getStepsForAdminType(type = 'super') {
    const config = adminTypes[type] || adminTypes.super
    let steps = [...adminLayoutSteps]

    // Filtrar pasos excluidos
    if (config.excludedSteps) {
        steps = steps.filter(step => !config.excludedSteps.includes(step.id))
    }

    // Marcar pasos prioritarios como no opcionales
    if (config.prioritySteps) {
        steps = steps.map(step => ({
            ...step,
            optional: !config.prioritySteps.includes(step.id)
        }))
    }

    return steps.sort((a, b) => a.order - b.order)
}

// Helper para verificar el estado del sistema antes del tutorial
export function checkSystemHealth() {
    const health = {
        dashboard: adminLayoutConfig.validators.dashboardLoaded(),
        charts: adminLayoutConfig.validators.chartsRendered(),
        permissions: adminLayoutConfig.validators.hasAdminPermissions(),
        route: adminLayoutConfig.validators.correctAdminRoute()
    }

    const isHealthy = Object.values(health).every(status => status)

    console.log('🏥 Estado del sistema para tutorial admin:', health)

    return {
        healthy: isHealthy,
        issues: Object.entries(health)
            .filter(([key, status]) => !status)
            .map(([key, status]) => key),
        details: health
    }
}
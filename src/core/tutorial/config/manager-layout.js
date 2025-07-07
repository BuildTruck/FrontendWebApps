// src/core/tutorial/config/manager-layout.js

export const managerLayoutSteps = [
    {
        id: 'welcome',
        target: '[data-tutorial="header-bar"]',
        title: 'Bienvenido a BuildTruck',
        description: 'Este es tu panel principal donde podrás gestionar todos tus proyectos de construcción.',
        position: {
            desktop: { placement: 'bottom', offset: { x: 0, y: 10 } },
            tablet: { placement: 'bottom', offset: { x: 0, y: 15 } },
            mobile: { placement: 'top', offset: { x: 0, y: -10 } }
        },
        order: 1,
        optional: false
    },
    {
        id: 'notifications',
        target: '[data-tutorial="notifications"]',
        title: 'Centro de Notificaciones',
        description: 'Aquí recibirás alertas importantes sobre tus proyectos, actualizaciones del sistema y notificaciones urgentes.',
        position: {
            desktop: { placement: 'bottom-left', offset: { x: -20, y: 15 } },
            tablet: { placement: 'bottom', offset: { x: -10, y: 20 } },
            mobile: { placement: 'bottom', offset: { x: 0, y: 25 } }
        },
        order: 2,
        optional: false
    },
    {
        id: 'language',
        target: '[data-tutorial="language"]',
        title: 'Cambiar Idioma',
        description: 'Cambia el idioma de la interfaz entre español e inglés según tu preferencia.',
        position: {
            desktop: { placement: 'bottom-right', offset: { x: 20, y: 15 } },
            tablet: { placement: 'bottom', offset: { x: 10, y: 20 } },
            mobile: { placement: 'left', offset: { x: -30, y: 0 } }
        },
        order: 3,
        optional: true
    },
    {
        id: 'proyectos-nav',
        target: '[data-tutorial="proyectos"]',
        title: 'Gestión de Proyectos',
        description: 'Tu vista principal para ver, crear y gestionar todos tus proyectos de construcción.',
        position: {
            desktop: { placement: 'right', offset: { x: 25, y: 0 } },
            tablet: { placement: 'right', offset: { x: 20, y: -5 } },
            mobile: { placement: 'bottom', offset: { x: 0, y: 15 } }
        },
        order: 4,
        optional: false
    },
    {
        id: 'estadisticas-nav',
        target: '[data-tutorial="estadisticas"]',
        title: 'Estadísticas y Reportes',
        description: 'Consulta métricas, gráficos y reportes detallados del progreso de tus proyectos.',
        position: {
            desktop: { placement: 'right', offset: { x: 25, y: 5 } },
            tablet: { placement: 'right', offset: { x: 20, y: 0 } },
            mobile: { placement: 'bottom', offset: { x: 0, y: 15 } }
        },
        order: 5,
        optional: true
    },
    {
        id: 'configuracion-nav',
        target: '[data-tutorial="configuracion"]',
        title: 'Configuración',
        description: 'Personaliza tu cuenta, gestiona preferencias y configura opciones del sistema.',
        position: {
            desktop: { placement: 'right', offset: { x: 25, y: 10 } },
            tablet: { placement: 'right', offset: { x: 20, y: 5 } },
            mobile: { placement: 'bottom', offset: { x: 0, y: 15 } }
        },
        order: 6,
        optional: true
    },
    {
        id: 'perfil-menu',
        target: '[data-tutorial="perfil"]',
        title: 'Tu Perfil',
        description: 'Accede a tu información personal, cambia tu contraseña y actualiza tus datos.',
        position: {
            desktop: { placement: 'top', offset: { x: 130, y: -300 } },     // ← Cambiar a 'top'
            tablet: { placement: 'top', offset: { x: 130, y: -300 } },      // ← Cambiar a 'top'
            mobile: { placement: 'top', offset: { x: 130, y: -220 } }
        },
        order: 7,
        optional: true
    },
    {
        id: 'logout',
        target: '[data-tutorial="salir"]',
        title: 'Cerrar Sesión',
        description: 'Cierra tu sesión de forma segura cuando termines de trabajar.',
        position: {
            desktop: { placement: 'top', offset: { x: 130, y: -260 } },     // ← Cambiar a 'top'
            tablet: { placement: 'top', offset: { x: 130, y: -260 } },      // ← Cambiar a 'top'
            mobile: { placement: 'top', offset: { x: 130, y: -150 } }
        },
        order: 8,
        optional: true
    },
    {
        id: 'createProject-nav',
        target: '[data-tutorial="createNewProject"]',
        title: 'Comienza creando un proyecto!!',
        description: 'Realiza tus primeros pasos para disfrutar de BuildTruck',
        position: {
            desktop: { placement: 'right', offset: { x: -50, y: 45 } },
            tablet: { placement: 'right', offset: { x: 20, y: 0 } },
            mobile: { placement: 'bottom', offset: { x: 0, y: 15 } }
        },
        order: 9,
        optional: true
    }
]

export const managerLayoutConfig = {
    id: 'manager',
    name: 'Panel Principal de Manager',
    description: 'Tutorial de introducción al panel principal para gestores de proyecto',
    steps: managerLayoutSteps,

    // Configuración específica
    settings: {
        canSkipSteps: true,
        canSkipTutorial: true,
        autoStart: true,
        delay: 1500, // ms para esperar antes de iniciar

        // Elementos que deben estar presentes antes de iniciar
        requiredElements: [
            '.sidebar',
            '.header-bar',
            '.content-area'
        ],

        // Clases CSS para el highlight
        highlightClass: 'tutorial-highlight',

        // Configuración del tooltip
        tooltip: {
            maxWidth: 350,
            showProgress: true,
            showNavigation: true
        }
    },

    // Mensajes personalizados para este tutorial
    messages: {
        welcome: '¡Bienvenido a BuildTruck! Te guiaremos por las funciones principales.',
        completion: '¡Perfecto! Ya conoces las funciones principales del panel. ¡Comienza a gestionar tus proyectos!',
        skip: '¿Estás seguro de que quieres saltar este tutorial? Puedes reactivarlo desde configuración.',

        // Botones
        buttons: {
            next: 'Siguiente',
            previous: 'Anterior',
            skip: 'Saltar',
            finish: 'Finalizar',
            skipTutorial: 'Saltar Tutorial'
        }
    },

    // Validaciones antes de mostrar cada paso
    validators: {
        // Verificar que el elemento existe antes de mostrarlo
        elementExists: (selector) => {
            return document.querySelector(selector) !== null
        },

        // Verificar que la sidebar está visible
        sidebarVisible: () => {
            const sidebar = document.querySelector('.sidebar')
            return sidebar && getComputedStyle(sidebar).display !== 'none'
        },

        // Verificar que el usuario está en la ruta correcta
        correctRoute: (routePath) => {
            return window.location.pathname.includes(routePath)
        }
    },

    // Acciones después de completar pasos específicos
    postStepActions: {
        'proyectos-nav': () => {
            console.log('💡 Usuario conoce la navegación de proyectos')
        },

        'notifications': () => {
            console.log('💡 Usuario conoce las notificaciones')
        }
    },

    // Configuración de analytics/tracking (si lo necesitas después)
    analytics: {
        trackStepCompletion: true,
        trackSkips: true,
        trackTimeSpent: true
    }
}

// Helper para obtener pasos filtrados según condiciones
export function getManagerLayoutSteps(userPreferences = {}) {
    let steps = [...managerLayoutSteps]

    // Filtrar pasos opcionales si el usuario prefiere tutorial rápido
    if (userPreferences.quickTutorial) {
        steps = steps.filter(step => !step.optional)
    }

    // Reordenar según idioma (si hay diferencias)
    if (userPreferences.language === 'en') {
        // Podrías tener diferentes ordenes o pasos según el idioma
    }

    return steps.sort((a, b) => a.order - b.order)
}

// Configuración de targeting automático para elementos
export const managerLayoutTargets = {
    // Header elements
    notifications: {
        selectors: [
            '[data-tutorial="notifications"]',
            '.notification-bell',
            '.header-actions .notification-bell'
        ],
        fallback: '.header-actions'
    },

    language: {
        selectors: [
            '[data-tutorial="language"]',
            '.language-switcher',
            '.header-actions .language-switcher'
        ],
        fallback: '.header-actions'
    },

    // Sidebar navigation
    proyectos: {
        selectors: [
            '[data-tutorial="proyectos"]',
            '.menu-item[data-tutorial="proyectos"]',
            '.sidebar-menu .menu-item:first-child'
        ],
        fallback: '.sidebar-menu'
    },

    estadisticas: {
        selectors: [
            '[data-tutorial="estadisticas"]',
            '.menu-item[data-tutorial="estadisticas"]'
        ],
        fallback: '.sidebar-menu'
    },

    configuracion: {
        selectors: [
            '[data-tutorial="configuracion"]',
            '.menu-item[data-tutorial="configuracion"]'
        ],
        fallback: '.sidebar-menu'
    },

    // Profile menu
    perfil: {
        selectors: [
            '[data-tutorial="perfil"]',
            '.sidebar-profile .menu-item:first-child'
        ],
        fallback: '.sidebar-profile'
    },

    salir: {
        selectors: [
            '[data-tutorial="salir"]',
            '.sidebar-profile .menu-item:last-child'
        ],
        fallback: '.sidebar-profile'
    }
}

// Función para configurar automáticamente los data-tutorial attributes
export function setupManagerLayoutTargets() {
    Object.entries(managerLayoutTargets).forEach(([key, config]) => {
        // Buscar el elemento usando los selectores
        let element = null

        for (const selector of config.selectors) {
            element = document.querySelector(selector)
            if (element) break
        }

        // Si no encuentra, usar fallback
        if (!element && config.fallback) {
            element = document.querySelector(config.fallback)
        }

        // Asignar data-tutorial attribute
        if (element && !element.hasAttribute('data-tutorial')) {
            element.setAttribute('data-tutorial', key)
            console.log(`🎯 Tutorial target configurado: ${key}`)
        }
    })
}

// Verificar si el tutorial puede ejecutarse
export function canStartManagerLayoutTutorial() {
    const requiredElements = managerLayoutConfig.settings.requiredElements

    return requiredElements.every(selector => {
        const exists = document.querySelector(selector) !== null
        if (!exists) {
            console.warn(`⚠️ Elemento requerido no encontrado: ${selector}`)
        }
        return exists
    })
}
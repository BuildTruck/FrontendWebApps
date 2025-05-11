import { createRouter, createWebHistory } from 'vue-router'

// Layout general
import MainLayout from '../core/layouts/MainLayout.vue'

// Rutas por contexto
import SupervisorRoutes from '../context/supervisor/router/supervisor.routes.js'
import ManagerRoutes from '../context/manager/router/manager.routes.js'

const routes = [
    // Redirección raíz dinámica según sesión y rol
    {
        path: '/',
        redirect: () => {
            const user = JSON.parse(localStorage.getItem('user'))
            if (!user) return '/login'
            if (user.role === 'manager') return '/proyectos'
            if (user.role === 'supervisor') return `/supervisor/${user.projectId}`
            return '/login'
        }
    },

    // Ruta pública
    {
        path: '/login',
        name: 'Login',
        component: () => import('../auth/views/login.component.vue')
    },

    // Rutas privadas bajo MainLayout (solo para manager)
    {
        path: '/layout',
        component: MainLayout,
        children: [
            {
                path: 'estadisticas',
                name: 'Estadisticas',
                component: () => import('../context/manager/components/stats-manager.component.vue')
            },
            {
                path: 'reportes',
                name: 'Reportes',
                component: () => import('../context/manager/components/reports-manager.component.vue')
            },
            {
                path: 'configuraciones',
                name: 'Configuraciones',
                component: () => import('../context/configuration/components/manager-configuration.component.vue')
            },
            {
                path: 'perfil',
                name: 'Perfil',
                component: () => import('../context/configuration/components/manager-profile-configuration.component.vue')
            },
            {
                path: ':pathMatch(.*)*',
                name: 'NotFound',
                component: () => import('../views/PageNotFound.vue')
            }
        ]
    },

    // Rutas propias de manager (proyectos, etc.)
    ...ManagerRoutes,

    // Rutas propias de supervisor
    ...SupervisorRoutes
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// Protección global de rutas
router.beforeEach((to, from, next) => {
    const publicPaths = ['/login']
    const user = JSON.parse(localStorage.getItem('user'))

    const isPublic = publicPaths.includes(to.path)

    if (!isPublic && !user) {
        return next('/login')
    }

    if (to.path === '/login' && user) {
        return user.role === 'manager'
            ? next('/proyectos')
            : next(`/supervisor/${user.projectId}`)
    }

    next()
})

export default router

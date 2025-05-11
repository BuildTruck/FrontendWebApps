import { createRouter, createWebHistory } from 'vue-router'

import MainLayout from '../core/layouts/MainLayout.vue'

import SupervisorRoutes from '../context/supervisor/router/supervisor.routes.js'
import ManagerRoutes from '../context/manager/router/manager.routes.js'

const routes = [
    // Ruta pública: Login
    {
        path: '/login',
        name: 'Login',
        component: () => import('../auth/views/login.component.vue')
    },

    // Rutas bajo layout principal (privadas)
    {
        path: '/',
        component: MainLayout,
        children: [
            {
                path: '',
                component: () => import('../context/projects/components/projects-manager.component.vue')
            },
            {
                path: 'estadisticas',
                component: () => import('../context/manager/components/stats-manager.component.vue')
            },
            {
                path: 'reportes',
                component: () => import('../context/manager/components/reports-manager.component.vue')
            },
            {
                path: 'configuraciones',
                component: () => import('../context/configuration/components/manager-configuration.component.vue')
            },
            {
                path: 'perfil',
                component: () => import('../context/configuration/components/manager-profile-configuration.component.vue')
            },
            // Página 404 dentro del layout privado (solo luego del login)
            {
                path: ':pathMatch(.*)*',
                name: 'NotFound',
                component: () => import('../views/PageNotFound.vue')
            }
        ]
    },

    // Rutas de supervisor y manager (también privadas)
    ...SupervisorRoutes,
    ...ManagerRoutes
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// Protección de rutas: solo permite acceso a rutas privadas si hay sesión activa
router.beforeEach((to, from, next) => {
    const publicNames = ['Login']
    const user = JSON.parse(localStorage.getItem('user'))

    if (!publicNames.includes(to.name) && !user) {
        return next('/login')
    }

    next()
})

export default router

import { createRouter, createWebHistory } from 'vue-router'

// Layout general
import ProjectLayoutManager from '../context/manager/layouts/ProjectLayoutManager.vue'

// Rutas por contexto
import SupervisorRoutes from '../context/supervisor/router/supervisor.routes.js'
import ManagerRoutes from '../context/manager/router/manager.routes.js'
import AdminRoutes from "../core/admin/router/admin.routes.js";

const routes = [
    // Redirección raíz dinámica según sesión y rol
    {
        path: '/',
        redirect: () => {
            const user = JSON.parse(sessionStorage.getItem('user'))
            if (!user) return '/login'
            if (user.role === 'manager') return '/proyectos'
            if (user.role === 'supervisor') return `/supervisor/${user.projectId}`
            if (user.role === 'admin') return '/admin'
            return '/login'
        }
    },

    // Ruta pública
    {
        path: '/login',
        name: 'Login',
        component: () => import('../auth/views/login.component.vue')
    },
    {
        path: '/forgot-password',
        name: 'ForgotPassword',
        component: () => import('../auth/views/ForgotPasswordComponent.vue')
    },
    {
        path: '/reset-password',
        name: 'ResetPassword',
        component: () => import('../auth/views/ResetPasswordComponent.vue')
    },

    // Rutas propias de manager (proyectos, etc.)
    ...ManagerRoutes,

    // Rutas propias de supervisor
    ...SupervisorRoutes,

    // Rutas propias de admin
    ...AdminRoutes,

    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: () => import('../views/PageNotFound.vue')
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// Protección global de rutas
router.beforeEach((to, from, next) => {
    const publicPaths = ['/login', '/forgot-password', '/reset-password','/change-password']
    const user = JSON.parse(sessionStorage.getItem('user'))

    const isPublic = publicPaths.includes(to.path) || to.path === '/reset-password'

    if (!isPublic && !user) {
        // No hay usuario y la ruta requiere autenticación
        console.log('Ruta privada sin autenticación. Redirigiendo a login');
        return next('/login')
    }

    if (to.path === '/login' && user) {
        // Usuario autenticado intentando acceder a login, redirigir según rol
        console.log('Usuario ya autenticado en login, redirigiendo según rol');

        // Es importante verificar el rol correcto
        if (user.role === 'manager') {
            console.log('Redirigiendo manager a /proyectos');
            return next('/proyectos')
        } else if (user.role === 'supervisor') {
            console.log('Redirigiendo supervisor a /supervisor/' + user.projectId);
            return next(`/supervisor/${user.projectId}`)
        } else if (user.role === 'admin') {
            console.log('Redirigiendo admin a /admin');
            return next('/admin')
        } else {
            console.warn('Rol desconocido, redirigiendo a login');
            // Si hay un rol desconocido, mejor eliminar la sesión
            sessionStorage.clear();
            return next('/login');
        }
    }

    // Verificar protección de rutas por rol
    if (user) {
        // Supervisor solo puede acceder a sus rutas
        if (to.path.startsWith('/supervisor') && user.role !== 'supervisor') {
            console.warn('Usuario no supervisor intentando acceder a ruta de supervisor');
            if (user.role === 'manager') return next('/proyectos');
            if (user.role === 'admin') return next('/admin');
        }

        // Manager solo puede acceder a sus rutas
        if (to.path.startsWith('/proyectos') && user.role !== 'manager') {
            console.warn('Usuario no manager intentando acceder a ruta de manager');
            if (user.role === 'supervisor') return next(`/supervisor/${user.projectId}`);
            if (user.role === 'admin') return next('/admin');
        }

        // Admin solo puede acceder a sus rutas
        if (to.path.startsWith('/admin') && user.role !== 'admin') {
            console.warn('Usuario no admin intentando acceder a ruta de admin');
            if (user.role === 'manager') return next('/proyectos');
            if (user.role === 'supervisor') return next(`/supervisor/${user.projectId}`);
        }

        // Redirigir usuarios no autorizados según su rol
        if (user.role === 'supervisor' && !to.path.startsWith('/supervisor') && to.path !== '/login') {
            console.warn('Supervisor intentando acceder a ruta no autorizada');
            return next(`/supervisor/${user.projectId}`);
        }
    }

    next()
})

export default router
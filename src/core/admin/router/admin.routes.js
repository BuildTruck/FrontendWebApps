// src/context/admin/router/admin.routes.js
import AdminLayout from '../layouts/AdminLayout.vue'
import AdminDashboard from '../components/admin-dashboard.component.vue'
import AdminUser from '../components/admin-user.component.vue'
import PageNotFound from "../../../views/PageNotFound.vue"
import AdminConfigurationComponent from '../../../context/configuration/components/admin-configuration.component.vue'

export default [
    {
        path: '/admin',
        component: AdminLayout,
        children: [
            {
                // Ruta raíz redirige a dashboard
                path: '',
                redirect: '/admin/dashboard'
            },
            {
                path: 'dashboard',
                component: AdminDashboard
            },
            {
                path: 'usuarios',
                component: AdminUser
            },
            {
                path: 'configuraciones',
                component: AdminConfigurationComponent
            },
            {
                path: '/:pathMatch(.*)*',
                name: 'AdminNotFound',
                component: PageNotFound
            }
        ]
    }
]
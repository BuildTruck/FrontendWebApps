import ManagerLayout from '../layouts/ManagerLayout.vue'
import ProjectLayoutManager from '../layouts/ProjectLayoutManager.vue'

import ProjectsManagerComponent from '../../projects/components/projects-manager.component.vue'

import DocumentationManager from '../../documentation/components/documentation-manager.component.vue'
import PersonnelManager from '../../personnel/components/personnel-manager.component.vue'
import MaterialsManager from '../../materials/components/materials-manager.component.vue'
import IncidentManagerComponent from '../../incidents/components/incident-manager.component.vue'
import MachineryManager from '../../machinery/components/machinery-manager.component.vue'
import ConfigurationManagerProject from '../../projects/components/manager-project-configuration.vue'
import StatsManagerComponentManager from '../../stats/components/stats-manager.component.vue'
import ReportsManagerComponent from '../../reports/components/reports-manager.component.vue'
import ConfigurationManagerComponent from '../../configuration/components/manager-configuration.component.vue'
import ManagerProfileConfigurationComponent from '../../configuration/components/manager-profile-configuration.component.vue'
import PageNotFound from "../../../views/PageNotFound.vue";
import ChangePasswordComponent from "../../../auth/views/ChangePasswordComponent.vue";

export default [
    // Rutas que usan ManagerLayout
    {
        path: '/proyectos',
        component: ManagerLayout,
        children: [
            {
                path: '',
                component: ProjectsManagerComponent,
            }
        ]
    },
    {
        path: '/estadisticas',
        component: ManagerLayout,
        children: [
            {
                path: '',
                component: StatsManagerComponentManager,
            }
        ]
    },
    {
        path: '/configuracion',
        component: ManagerLayout,
        children: [
            {
                path: '',
                component: ConfigurationManagerComponent,
            },
            // 👇 CHANGE PASSWORD DENTRO DE CONFIGURACION
            {
                path: 'change-password',
                name: 'ManagerChangePassword',
                component: ChangePasswordComponent,
            }
        ]
    },
    {
        path: '/perfil',
        component: ManagerLayout,
        children: [
            {
                path: '',
                component: ManagerProfileConfigurationComponent,
            }
        ]
    },

    // RUTA PARA UN PROYECTO ESPECÍFICO (FUERA del ManagerLayout)
    {
        path: '/proyecto/:projectId',
        component: ProjectLayoutManager, // ProjectLayoutManager es ahora el componente raíz
        props: route => ({
            projectId: route.params.projectId,
            projectName: route.query.name || 'Proyecto'
        }),
        children: [
            {
                path: '', // Ruta por defecto
                redirect: 'documentacion' // Redirige automáticamente a documentación
            },
            {
                path: 'documentacion',
                component: DocumentationManager,
                props: true
            },
            {
                path: 'personal',
                component: PersonnelManager,
                props: true
            },
            {
                path: 'inventario',
                component: MaterialsManager,
                props: true
            },
            {
                path: 'incidentes',
                component: IncidentManagerComponent,
                props: true
            },
            {
                path: 'maquinaria',
                component: MachineryManager,
                props: true
            },
            {
                path: 'configuracion',
                component: ConfigurationManagerProject,
                props: true
            },
            {
                path: '/:pathMatch(.*)*',
                name: 'NotFound',
                component: PageNotFound
            }
        ]
    }
]
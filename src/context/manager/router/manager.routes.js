import ManagerAppView from '../components/ManagerAppView.vue'
import ManagerLayout from '../layouts/ManagerLayout.vue'

import ProjectsManagerComponent from '../../projects/components/projects-manager.component.vue'

import DocumentationManager from '../../documentation/components/documentation-manager.component.vue'
import PersonnelManager from '../../personnel/components/personnel-manager.component.vue'
import MaterialsManager from '../../materials/components/materials-manager.component.vue'
import IncidentsManager from '../../incidents/components/incidents-manager.component.vue'
import MachineryManager from '../../machinery/components/machinery-manager.component.vue'
import ConfigurationManagerProject from '../../configuration/components/manager-project-configuration.vue'
import StatsManagerComponentManager from '../../stats/components/stats-manager.component.vue'
import ReportsManagerComponent from '../../reports/components/reports-manager.component.vue'
import ConfigurationManagerComponent from '../../configuration/components/manager-configuration.component.vue'
import ManagerProfileConfigurationComponent from '../../configuration/components/manager-profile-configuration.component.vue'


export default [
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
        path: '/reportes',
        component: ManagerLayout,
        children: [
            {
                path: '',
                component: ReportsManagerComponent,
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

    // RUTA PARA UN PROYECTO ESPECÍFICO
    {
        path: '/proyecto/:projectId',
        component: ManagerLayout,
        props: true,
        children: [
            {
                path: '',
                component: ManagerAppView
            },
            {
                path: 'documentacion',
                component: DocumentationManager
            },
            {
                path: 'personal',
                component: PersonnelManager
            },
            {
                path: 'inventario',
                component: MaterialsManager
            },
            {
                path: 'incidentes',
                component: IncidentsManager
            },
            {
                path: 'maquinaria',
                component: MachineryManager
            },
            {
                path: 'configuracionProyecto',
                component: ConfigurationManagerProject
            }
        ]
    }
]
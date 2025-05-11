import ManagerAppView from '../components/ManagerAppView.vue'
import ManagerLayout from '../layouts/ManagerLayout.vue'

import ProjectsManagerComponent from '../../projects/components/projects-manager.component.vue'

import DocumentationManager from '../../documentation/components/documentation-manager.component.vue'
import PersonnelManager from '../../personnel/components/personnel-manager.component.vue'
import MaterialsManager from '../../materials/components/materials-manager.component.vue'
import IncidentsManager from '../../incidents/components/incidents-manager.component.vue'
import MachineryManager from '../../machinery/components/machinery-manager.component.vue'
import ConfigurationManager from '../../configuration/components/manager-configuration.component.vue'

export default [
    // NUEVA RUTA PARA VER TODOS LOS PROYECTOS DEL GERENTE
    {
        path: '/proyectos',
        component: ProjectsManagerComponent,
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
                path: 'configuracion',
                component: ConfigurationManager
            }
        ]
    }
]

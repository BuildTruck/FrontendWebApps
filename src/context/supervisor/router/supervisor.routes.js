// context/supervisor/router/supervisor.routes.js

import SupervisorLayout from '../layouts/SupervisorLayout.vue'

import PersonnelSupervisorComponent from '../../personnel/components/personnel-supervisor.component.vue'
import MachinerySupervisorComponent from '../../machinery/components/machinery-supervisor.component.vue'
import IncidentsSupervisorComponent from '../../incidents/components/incidents-supervisor.component.vue'
import DocumentationSupervisorComponent from '../../documentation/components/documentation-supervisor.component.vue'
import ConfigurationSupervisorComponent from '../../configuration/components/supervisor-configuration.component.vue'
import ProfileSupervisorComponent from '../../configuration/components/supervisor-profile-configuration.component.vue'
import MaterialsSupervisorComponent from "../../materials/components/materials-supervisor.component.vue";
import PageNotFound from "../../../views/PageNotFound.vue";
export default [
    // Ruta principal para supervisores con su proyecto asignado
    {
        path: '/supervisor/:projectId',
        component: SupervisorLayout,
        props: true,
        children: [
            {
                // Ruta raíz redirige a personal
                path: '',
                redirect: to => {
                    return { path: `/supervisor/${to.params.projectId}/personal` }
                }
            },
            {
                path: 'personal',
                component: PersonnelSupervisorComponent,
                props: true
            },
            {
                path: 'inventario',
                component: MaterialsSupervisorComponent,
                props: true
            },
            {
                path: 'maquinaria',
                component: MachinerySupervisorComponent,
                props: true
            },
            {
                path: 'incidentes',
                component: IncidentsSupervisorComponent,
                props: true
            },
            {
                path: 'documentacion',
                component: DocumentationSupervisorComponent,
                props: true
            },
            {
                path: 'configuraciones',
                component: ConfigurationSupervisorComponent,
                props: true
            },
            {
                path: 'perfil',
                component: ProfileSupervisorComponent,
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
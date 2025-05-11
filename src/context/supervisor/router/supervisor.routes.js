import AppSupervisorView from '../components/AppSupervisorView.vue'
import SupervisorLayout from '../layouts/SupervisorLayout.vue'

import IncidentsSupervisor from '../../incidents/components/incidents-supervisor.component.vue'
import DocumentationSupervisor from '../../documentation/components/documentation-supervisor.component.vue'

export default [
    {
        path: '/supervisor/:projectId',
        component: SupervisorLayout,
        props: true,
        children: [
            {
                path: '',
                component: AppSupervisorView
            },
            {
                path: 'incidencias',
                component: IncidentsSupervisor
            },
            {
                path: 'documentacion',
                component: DocumentationSupervisor
            }
        ]
    }
]

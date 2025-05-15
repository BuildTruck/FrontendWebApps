import { Incident } from '../models/incident.entity';

const incidentes = [
    new Incident({
        id: 1,
        tipo: 'Accidente',
        gravedad: 'Leve',
        fecha: '20/04/2025',
        estado: 'Resuelto',
        descripcion: 'Obrero se golpeó al manipular andamio sin guantes de seguridad.',
        medidas: 'Reporte registrado. Se reforzará protocolo de seguridad.'
    }),
    new Incident({
        id: 2,
        tipo: 'Falla eléctrica',
        gravedad: 'Moderado',
        fecha: '18/04/2025',
        estado: 'Pendiente',
        descripcion: 'Corto circuito en el área de generadores.',
        medidas: 'Se llamará a técnico certificado.'
    }),
    new Incident({
        id: 3,
        tipo: 'Daño de maquinaria',
        gravedad: 'Grave',
        fecha: '16/04/2025',
        estado: 'Resuelto',
        descripcion: 'Falla en el sistema hidráulico de la grúa.',
        medidas: 'Maquinaria retirada y en mantenimiento.'
    })
];

export const incidentsApi = {
    async fetchAll() {
        return new Promise(resolve => {
            setTimeout(() => resolve(incidentes), 300); // simula delay
        });
    },
    async fetchById(id) {
        return new Promise(resolve => {
            const incidente = incidentes.find(i => i.id === id);
            setTimeout(() => resolve(incidente), 200);
        });
    }
};

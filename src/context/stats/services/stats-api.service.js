
// Importacion de datos que cree
import {
    resumenAsistencia,
    obrasConMasPersonal,
    tasaAusenciaLaboral,
} from '../model/stats.entity';

export function getResumenAsistencia() {
    return resumenAsistencia;
}

export function getObrasConMasPersonal() {
    return obrasConMasPersonal;
}

export function getTasaAusenciaLaboral() {
    return tasaAusenciaLaboral;
}


//Datos para el gráfico de barras
export const resumenAsistencia = {
    labels: ['Residencial Las Palmeras', 'EcoTower', 'Edificio Monteverde'],
    datasets: [
        {
            label: 'Asistencia (%)',
            data: [48, 41, 36], //Porcentajes
            backgroundColor: '#c1a178', //Colorcito
        },
    ],
};

//Para el grafico de donita sus datos

export const obrasConMasPersonal = {
    labels: ['Residencial Las Palmeras', 'EcoTower', 'Edificio Monteverde'],
    datasets: [
        {
            label: 'Personal',
            data: [60, 45, 22], //Porcentajes
            backgroundColor: ['#a394f0', '#d8d8d8', '#f0f0f0'],
        },
    ],
};

export const tasaAusenciaLaboral = {
    labels: ['Residencial Las Palmeras', 'EcoTower', 'Edificio Monteverde', 'Lotes'],
    datasets: [
        {
            label: 'Ausencia (%)',
            data: [22, 20, 7, 34], //Porcentajes
            backgroundColor: ['#e57373', '#f06292', '#ba68c8', '#e0e0e0'],
        },
    ],
};

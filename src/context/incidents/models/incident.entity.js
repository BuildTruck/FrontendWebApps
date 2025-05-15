export class Incident {
    constructor({
                    id,
                    tipo,
                    gravedad,
                    fecha,
                    estado,
                    descripcion,
                    medidas
                }) {
        this.id = id;
        this.tipo = tipo;
        this.gravedad = gravedad;
        this.fecha = fecha;
        this.estado = estado;
        this.descripcion = descripcion;
        this.medidas = medidas;
    }
}


export class MaterialEntity {
    constructor(data = {}) {
        this.id = data.id;

        // Identificación de obra (requerido)
        this.projectId = data.projectId !== undefined ? data.projectId : null;

        // Información del material
        this.name = data.name || '';
        this.type = data.type || '';
        this.customType = data.customType || ''; // Campo para el tipo personalizado
        this.unit = data.unit || '';
        this.minimumStock = Number(data.minimumStock) || 0;
        this.provider = data.provider || ''; // Proveedor referencial

        // Campos compatibles pero no confiables directamente
        this.price = Number(data.price) || 0; // Calculado en runtime (desde entradas)
        this.total = Number(data.total) || 0; // Calculado

        // Información auxiliar de stock (puede ser sobrescrito por resumen dinámico)
        this.stock = Number(data.stock) || 0;
    }

    // Cálculo opcional si price y stock están precargados (caso inicial)
    calculateTotal() {
        const price = parseFloat(this.price) || 0;
        const quantity = parseFloat(this.stock) || 0;
        return (quantity * price).toFixed(2);
    }

    // Getter para el total
    get totalValue() {
        return this.calculateTotal();
    }

    // Setter para el stock, que recalcula el total automáticamente
    set stock(value) {
        this._stock = Number(value) || 0;
        this.total = this.calculateTotal();
    }

    get stock() {
        return this._stock;
    }

    static get UNITS() {
        return [
            { value: 'KG', label: 'kg' },
            { value: 'M', label: 'm' },
            { value: 'L', label: 'l' },
            { value: 'UND', label: 'und' },
            { value: 'SACO', label: 'saco' },
            { value: 'CAJA', label: 'caja' },
            { value: 'ROLLO', label: 'rollo' },
            { value: 'GAL', label: 'gal' },
            { value: 'TON', label: 'ton' }
        ];
    }

    static get TYPES() {
        return [
            { value: 'CEMENTO', label: 'cemento' },
            { value: 'ACERO', label: 'acero' },
            { value: 'PINTURA', label: 'pintura' },
            { value: 'HERRAMIENTA', label: 'herramienta' },
            { value: 'LIMPIEZA', label: 'limpieza' },
            { value: 'OTRO', label: 'otro' }
        ];
    }
}
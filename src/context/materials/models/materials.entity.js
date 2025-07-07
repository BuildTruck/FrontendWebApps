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

    // ✅ ACTUALIZAR MaterialEntity con labels bonitos
    static get UNITS() {
        return [
            { value: 'KG', label: 'Kilogramos' },
            { value: 'M', label: 'Metros' },
            { value: 'L', label: 'Litros' },
            { value: 'UND', label: 'Unidades' },
            { value: 'SACO', label: 'Sacos' },
            { value: 'CAJA', label: 'Cajas' },
            { value: 'ROLLO', label: 'Rollos' },
            { value: 'GAL', label: 'Galones' },
            { value: 'TON', label: 'Toneladas' }
        ];
    }

    static get TYPES() {
        return [
            { value: 'CEMENTO', label: 'Cemento' },
            { value: 'ACERO', label: 'Acero' },
            { value: 'PINTURA', label: 'Pintura' },
            { value: 'HERRAMIENTA', label: 'Herramienta' },
            { value: 'LIMPIEZA', label: 'Limpieza' },
            { value: 'OTRO', label: 'Otro' }
        ];
    }
}
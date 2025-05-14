<script>
import AppInput from '../../../core/components/AppInput.vue'
import AppButton from '../../../core/components/AppButton.vue'

export default {
  name: 'MaterialsForm',
  components: {
    AppInput,
    AppButton
  },
  props: {
    material: {
      type: Object,
      default: () => ({})
    },
    readonly: {
      type: Boolean,
      default: false
    },
    mode: {
      type: String,
      default: 'material' // 'material' | 'entry' | 'usage'
    },
    materialsList: {
      type: Array,
      default: () => []
    }
  },
  emits: ['confirm', 'cancel'],
  data() {
    return {
      localMaterial: {
        id: null,
        projectId: null,
        name: '',
        type: '',
        unit: '',
        quantity: 0,
        stock: 0,
        price: 0,
        total: 0,
        provider: '',
        ruc: '',
        date: '',
        status: 'Pendiente',
        payment: '',
        comprobante: '',
        comprobanteNumber: '',
        description: '',
        minimumStock: 0,
        area: '',
        usageType: '',
        worker: ''

      }
    }
  },
  created() {
    if (this.material && Object.keys(this.material).length > 0) {
      this.localMaterial = { ...this.material }
    }

    const user = JSON.parse(sessionStorage.getItem('user'))
    if (!this.readonly && user?.projectId) {
      this.localMaterial.projectId = user.projectId
    }
  },
  methods: {
    confirm() {
      this.localMaterial.total = this.localMaterial.quantity * this.localMaterial.price

      if (this.mode === 'entry') {
        this.$emit('confirm', {
          entryId: this.material.entryId,
          id: this.localMaterial.id,
          quantity: this.localMaterial.quantity,
          date: this.localMaterial.date,
          provider: this.localMaterial.provider,
          comprobante: this.localMaterial.comprobante,
          comprobanteNumber: this.localMaterial.comprobanteNumber,
          status: this.localMaterial.status,
          ruc: this.localMaterial.ruc,
          payment: this.localMaterial.payment,
          price: this.localMaterial.price,
          description: this.localMaterial.description
        })
      } else if (this.mode === 'usage') {
        this.$emit('confirm', {
          usageId: this.material.usageId,
          id: this.localMaterial.id,
          quantity: this.localMaterial.quantity,
          date: this.localMaterial.date,
          area: this.localMaterial.area,
          usageType: this.localMaterial.usageType,
          description: this.localMaterial.description,
          worker: this.localMaterial.worker,
          status: this.localMaterial.status
        })

      } else {
        this.$emit('confirm', { ...this.localMaterial })
      }
    },
    cancel() {
      this.$emit('cancel')
    }
  }
}
</script>

<template>
  <div class="card p-4">
    <div class="grid grid-cols-2 gap-4">
      <!-- Modo ENTRY o USAGE: seleccionar material -->
      <AppInput
          v-if="mode !== 'material'"
          v-model="localMaterial.id"
          :disabled="readonly"
          label="Selecciona Material"
          type="select"
          :options="materialsList.map(m => ({ label: m.name, value: m.id }))"
      />

      <!-- INVENTARIO: Datos básicos -->
      <AppInput
          v-if="mode === 'material'"
          v-model="localMaterial.name"
          :disabled="readonly"
          label="Nombre de Material"
          placeholder="Ej: Acero, Plástico"
      />

      <AppInput
          v-if="mode === 'material'"
          v-model="localMaterial.type"
          :disabled="readonly"
          label="Tipo de Material"
          type="select"
          :options="[
          { label: 'Material', value: 'MAT' },
          { label: 'Combustible', value: 'COMBUST.' }
        ]"
      />

      <AppInput
          v-if="mode === 'material'"
          v-model="localMaterial.unit"
          :disabled="readonly"
          label="Unidad de medida"
          placeholder="Ej: KG, MTR"
      />

      <AppInput
          v-if="mode === 'material'"
          v-model="localMaterial.minimumStock"
          :disabled="readonly"
          label="Stock Mínimo"
          type="number"
      />

      <!-- Eliminar este campo, el stock inicial será 0 -->
      <!--
      <AppInput
        v-if="mode === 'material'"
        v-model="localMaterial.stock"
        :disabled="readonly"
        label="Stock Inicial"
        type="number"
      />
      -->


      <AppInput
          v-if="mode === 'material'"
          v-model="localMaterial.provider"
          :disabled="readonly"
          label="Proveedor Principal"
      />

      <!-- INGRESOS -->
      <AppInput
          v-if="mode === 'entry'"
          v-model="localMaterial.provider"
          :disabled="readonly"
          label="Proveedor"
          placeholder="Ej: Maestro"
      />

      <AppInput
          v-if="mode === 'entry'"
          v-model="localMaterial.quantity"
          :disabled="readonly"
          label="Cantidad"
          type="number"
      />

      <AppInput
          v-if="mode === 'entry'"
          v-model="localMaterial.date"
          :disabled="readonly"
          label="Fecha de Ingreso"
          type="date"
      />

      <AppInput
          v-if="mode === 'entry'"
          v-model="localMaterial.price"
          :disabled="readonly"
          label="Precio Unitario"
          type="number"
      />

      <AppInput
          v-if="mode === 'entry'"
          v-model="localMaterial.comprobante"
          :disabled="readonly"
          label="Tipo de Comprobante"
          type="select"
          :options="[
          { label: 'Factura', value: 'Factura' },
          { label: 'Boleta', value: 'Boleta' },
          { label: 'Guía', value: 'Guía' }
        ]"
      />

      <AppInput
          v-if="mode === 'entry'"
          v-model="localMaterial.comprobanteNumber"
          :disabled="readonly"
          label="Número de Comprobante"
          placeholder="Ej: F001-00123"
      />

      <AppInput
          v-if="mode === 'entry'"
          v-model="localMaterial.status"
          :disabled="readonly"
          label="Estado"
          type="select"
          :options="[
          { label: 'Pendiente', value: 'Pendiente' },
          { label: 'Cancelado', value: 'Cancelado' }
        ]"
      />

      <AppInput
          v-if="mode === 'entry'"
          v-model="localMaterial.ruc"
          :disabled="readonly"
          label="RUC"
      />

      <AppInput
          v-if="mode === 'entry'"
          v-model="localMaterial.payment"
          :disabled="readonly"
          label="Forma de Pago"
          type="select"
          :options="[
          { label: 'Contado', value: 'Contado' },
          { label: 'Crédito', value: 'Crédito' }
        ]"
      />

      <AppInput
          v-if="mode === 'entry'"
          v-model="localMaterial.description"
          :disabled="readonly"
          label="Observaciones"
          type="textarea"
      />

      <!-- USOS (en preparación) -->
      <AppInput
          v-if="mode === 'usage'"
          v-model="localMaterial.quantity"
          :disabled="readonly"
          label="Cantidad Usada"
          type="number"
      />

      <AppInput
          v-if="mode === 'usage'"
          v-model="localMaterial.date"
          :disabled="readonly"
          label="Fecha de Uso"
          type="date"
      />

      <AppInput
          v-if="mode === 'usage'"
          v-model="localMaterial.area"
          :disabled="readonly"
          label="Zona / Área de uso"
      />

      <AppInput
          v-if="mode === 'usage'"
          v-model="localMaterial.usageType"
          :disabled="readonly"
          label="Tipo de Uso"
          type="select"
          :options="[
          { label: 'Normal', value: 'Normal' },
          { label: 'Urgente', value: 'Urgente' },
          { label: 'Desperdicio', value: 'Desperdicio' }
        ]"
      />

      <AppInput
          v-if="mode === 'usage'"
          v-model="localMaterial.description"
          :disabled="readonly"
          label="Observaciones"
          type="textarea"
      />
    </div>

    <div class="flex justify-end mt-4 gap-2" v-if="!readonly">
      <AppButton label="Confirmar" variant="primary" @click="confirm" />
      <AppButton label="Cancelar" variant="secondary" @click="cancel" />
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
}
.grid-cols-2 {
  grid-template-columns: repeat(2, 1fr);
}
.gap-4 {
  gap: 1rem;
}
.mt-4 {
  margin-top: 1rem;
}
</style>

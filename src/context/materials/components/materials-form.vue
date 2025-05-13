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
        description: ''
      }
    }
  },
  created() {
    // Clonamos los datos del material (para editar)
    if (this.material && Object.keys(this.material).length > 0) {
      this.localMaterial = { ...this.material }
    }

    // Si es supervisor, asignamos su projectId
    const user = JSON.parse(sessionStorage.getItem('user'))
    if (!this.readonly && user?.projectId) {
      this.localMaterial.projectId = user.projectId
    }
  },
  methods: {
    confirm() {
      // Calcular total antes de emitir
      this.localMaterial.total = this.localMaterial.quantity * this.localMaterial.price
      this.$emit('confirm', { ...this.localMaterial })
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
      <AppInput
          v-model="localMaterial.name"
          :disabled="readonly"
          label="Nombre de Material :"
          placeholder="Ej: Acero, Plástico"
      />
      <AppInput
          v-model="localMaterial.provider"
          :disabled="readonly"
          label="Proveedor Principal:"
          placeholder="Nombre proveedor"
      />
      <AppInput
          v-model="localMaterial.quantity"
          :disabled="readonly"
          label="Cantidad:"
          type="number"
      />
      <AppInput
          v-model="localMaterial.unit"
          :disabled="readonly"
          label="Unidad de medida:"
          placeholder="Ej: MTR, KG"
      />
      <AppInput
          v-model="localMaterial.type"
          :disabled="readonly"
          label="Tipo de Material:"
          type="select"
          :options="[
          { label: 'Material', value: 'MAT' },
          { label: 'Combustible', value: 'COMBUST.' }
        ]"
      />
      <AppInput
          v-model="localMaterial.date"
          :disabled="readonly"
          label="Fecha:"
          type="date"
      />
      <AppInput
          v-model="localMaterial.ruc"
          :disabled="readonly"
          label="RUC"
      />
      <AppInput
          v-model="localMaterial.payment"
          :disabled="readonly"
          label="Forma de Pago:"
          type="select"
          :options="[
          { label: 'Contado', value: 'Contado' },
          { label: 'Crédito', value: 'Crédito' }
        ]"
      />
      <AppInput
          v-model="localMaterial.stock"
          :disabled="readonly"
          label="Stock"
          type="number"
      />
      <AppInput
          v-model="localMaterial.price"
          :disabled="readonly"
          label="Precio Unitario"
          type="number"
      />
      <AppInput
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
          v-model="localMaterial.comprobanteNumber"
          :disabled="readonly"
          label="Número de Comprobante:"
          placeholder="Ej: F001-00123"
      />
      <AppInput
          v-model="localMaterial.status"
          :disabled="readonly"
          label="Estado:"
          type="select"
          :options="[
          { label: 'Pendiente', value: 'Pendiente' },
          { label: 'Cancelado', value: 'Cancelado' }
        ]"
      />
      <AppInput
          v-model="localMaterial.description"
          :disabled="readonly"
          label="Descripción breve:"
          type="textarea"
      />
    </div>

    <!-- Botones solo si no es modo lectura -->
    <div class="flex justify-end mt-4 gap-2" v-if="!readonly">
      <AppButton label="Confirmar" variant="primary" @click="confirm" />
      <AppButton label="Cancelar" variant="danger" @click="cancel" />
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

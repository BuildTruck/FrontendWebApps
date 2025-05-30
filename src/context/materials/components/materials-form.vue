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
          :label="$t('inventory.selectMaterial')"
          type="select"
          :options="materialsList.map(m => ({ label: m.name, value: m.id }))"
      />

      <!-- INVENTARIO: Datos básicos -->
      <AppInput
          v-if="mode === 'material'"
          v-model="localMaterial.name"
          :disabled="readonly"
          :label="$t('inventory.materialName')"
          :placeholder="$t('inventory.materialNamePlaceholder')"
      />

      <AppInput
          v-if="mode === 'material'"
          v-model="localMaterial.type"
          :disabled="readonly"
          :label="$t('inventory.materialType')"
          type="select"
          :options="[
          { label: $t('inventory.material'), value: 'MAT' },
          { label: $t('inventory.fuel'), value: 'COMBUST.' }
        ]"
      />

      <AppInput
          v-if="mode === 'material'"
          v-model="localMaterial.unit"
          :disabled="readonly"
          :label="$t('inventory.unit')"
          :placeholder="$t('inventory.unitPlaceholder')"
      />

      <AppInput
          v-if="mode === 'material'"
          v-model="localMaterial.minimumStock"
          :disabled="readonly"
          :label="$t('inventory.minimumStock')"
          type="number"
      />

      <AppInput
          v-if="mode === 'material'"
          v-model="localMaterial.provider"
          :disabled="readonly"
          :label="$t('inventory.mainProvider')"
      />

      <!-- INGRESOS -->
      <AppInput
          v-if="mode === 'entry'"
          v-model="localMaterial.provider"
          :disabled="readonly"
          :label="$t('inventory.provider')"
          :placeholder="$t('inventory.providerPlaceholder')"
      />

      <AppInput
          v-if="mode === 'entry'"
          v-model="localMaterial.quantity"
          :disabled="readonly"
          :label="$t('inventory.quantity')"
          type="number"
      />

      <AppInput
          v-if="mode === 'entry'"
          v-model="localMaterial.date"
          :disabled="readonly"
          :label="$t('inventory.entryDate')"
          type="date"
      />

      <AppInput
          v-if="mode === 'entry'"
          v-model="localMaterial.price"
          :disabled="readonly"
          :label="$t('inventory.unitPrice')"
          type="number"
      />

      <AppInput
          v-if="mode === 'entry'"
          v-model="localMaterial.comprobante"
          :disabled="readonly"
          :label="$t('inventory.documentType')"
          type="select"
          :options="[
          { label: $t('inventory.invoice'), value: 'Factura' },
          { label: $t('inventory.receipt'), value: 'Boleta' },
          { label: $t('inventory.guide'), value: 'Guía' }
        ]"
      />

      <AppInput
          v-if="mode === 'entry'"
          v-model="localMaterial.comprobanteNumber"
          :disabled="readonly"
          :label="$t('inventory.documentNumber')"
          :placeholder="$t('inventory.documentNumberPlaceholder')"
      />

      <AppInput
          v-if="mode === 'entry'"
          v-model="localMaterial.status"
          :disabled="readonly"
          :label="$t('inventory.status')"
          type="select"
          :options="[
          { label: $t('inventory.pending'), value: 'Pendiente' },
          { label: $t('inventory.canceled'), value: 'Cancelado' }
        ]"
      />

      <AppInput
          v-if="mode === 'entry'"
          v-model="localMaterial.ruc"
          :disabled="readonly"
          :label="$t('inventory.ruc')"
      />

      <AppInput
          v-if="mode === 'entry'"
          v-model="localMaterial.payment"
          :disabled="readonly"
          :label="$t('inventory.paymentMethod')"
          type="select"
          :options="[
          { label: $t('inventory.cash'), value: 'Contado' },
          { label: $t('inventory.credit'), value: 'Crédito' }
        ]"
      />

      <AppInput
          v-if="mode === 'entry'"
          v-model="localMaterial.description"
          :disabled="readonly"
          :label="$t('inventory.observations')"
          type="textarea"
      />

      <!-- USOS (en preparación) -->
      <AppInput
          v-if="mode === 'usage'"
          v-model="localMaterial.quantity"
          :disabled="readonly"
          :label="$t('inventory.usedQuantity')"
          type="number"
      />

      <AppInput
          v-if="mode === 'usage'"
          v-model="localMaterial.date"
          :disabled="readonly"
          :label="$t('inventory.usageDate')"
          type="date"
      />

      <AppInput
          v-if="mode === 'usage'"
          v-model="localMaterial.area"
          :disabled="readonly"
          :label="$t('inventory.usageArea')"
      />

      <AppInput
          v-if="mode === 'usage'"
          v-model="localMaterial.usageType"
          :disabled="readonly"
          :label="$t('inventory.usageType')"
          type="select"
          :options="[
          { label: $t('inventory.normal'), value: 'Normal' },
          { label: $t('inventory.urgent'), value: 'Urgente' },
          { label: $t('inventory.waste'), value: 'Desperdicio' }
        ]"
      />

      <AppInput
          v-if="mode === 'usage'"
          v-model="localMaterial.description"
          :disabled="readonly"
          :label="$t('inventory.observations')"
          type="textarea"
      />
    </div>

    <div class="flex justify-end mt-4 gap-2" v-if="!readonly">
      <AppButton :label="$t('general.confirm')" variant="primary" @click="confirm" />
      <AppButton :label="$t('general.cancel')" variant="secondary" @click="cancel" />
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

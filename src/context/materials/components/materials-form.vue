<script>
import AppInput from '../../../core/components/AppInput.vue';
import AppButton from '../../../core/components/AppButton.vue';

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
    },
    workersList: {
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
        customType: '',
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
      this.localMaterial = { ...this.material };
      if (this.material.type === 'Otro') {
        this.localMaterial.customType = this.material.customType;
      }
    }

    const user = JSON.parse(sessionStorage.getItem('user'));
    if (!this.readonly && user?.projectId) {
      this.localMaterial.projectId = user.projectId;
    }
  },
  methods: {
    confirm() {
      if (this.localMaterial.type === 'Otro' && this.localMaterial.customType) {
        this.localMaterial.type = this.localMaterial.customType;
      }

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
        });
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
        });
      } else {
        this.$emit('confirm', { ...this.localMaterial });
      }
    },
    cancel() {
      this.$emit('cancel');
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

      <!-- Datos generales de inventario -->
      <!-- ... todas las entradas previas se mantienen ... -->

      <!-- USOS -->
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

      <!-- 👇 NUEVO SELECT para trabajador -->
      <AppInput
          v-if="mode === 'usage'"
          v-model="localMaterial.worker"
          :disabled="readonly"
          :label="$t('inventory.worker')"
          type="select"
          :options="workersList.map(w => ({ label: w.name, value: w.id }))"
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

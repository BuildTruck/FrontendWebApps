<script>
import AppInput from '../../../core/components/AppInput.vue'
import AppButton from '../../../core/components/AppButton.vue'

export default {
  name: 'MachineryForm',
  components: {
    AppInput,
    AppButton
  },
  props: {
    machinery: {
      type: Object,
      default: () => ({})
    },
    readonly: {
      type: Boolean,
      default: false
    },
    machineryList: {
      type: Array,
      default: () => []
    }
  },
  emits: ['confirm', 'cancel'],
  data() {
    return {
      localMachinery: {
        id: null,
        projectId: null,
        name: '',
        licensePlate: '',
        registerDate: '',
        status: 'active',
        provider: '',
        description: ''
      }
    }
  },
  created() {
    if (this.machinery && Object.keys(this.machinery).length > 0) {
      this.localMachinery = { ...this.machinery }
    }

    const user = JSON.parse(sessionStorage.getItem('user'))
    if (!this.readonly && user?.projectId) {
      this.localMachinery.projectId = user.projectId
    }
  },
  methods: {
    confirm() {
      this.$emit('confirm', { ...this.localMachinery })
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
      <!-- Machinery Fields -->
      <AppInput
          v-model="localMachinery.name"
          :disabled="readonly"
          label="Nombre de Maquinaria"
          placeholder="Ej: Excavadora, Tractor"
      />

      <AppInput
          v-model="localMachinery.licensePlate"
          :disabled="readonly"
          label="Código/Placa"
          placeholder="Ej: ABC-123"
      />

      <AppInput
          v-model="localMachinery.registerDate"
          :disabled="readonly"
          label="Fecha de Registro"
          placeholder="dd/mm/yyyy"
      />

      <AppInput
          v-model="localMachinery.status"
          :disabled="readonly"
          label="Estado"
          type="select"
          :options="[
          { label: 'Activo', value: 'active' },
          { label: 'Inactivo', value: 'inactive' },
          { label: 'En Mantenimiento', value: 'maintenance' }
        ]"
      />

      <AppInput
          v-model="localMachinery.provider"
          :disabled="readonly"
          label="Proveedor"
          placeholder="Ej: SAC, Caterpillar"
      />

      <AppInput
          v-model="localMachinery.description"
          :disabled="readonly"
          label="Descripción"
          type="textarea"
          placeholder="Ej: Maquinaria para excavación pesada"
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
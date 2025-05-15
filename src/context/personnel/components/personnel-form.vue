<script>
import AppInput from '../../../core/components/AppInput.vue'
import AppButton from '../../../core/components/AppButton.vue'
export default {
  name: "PersonnelForm",
  components: {
    AppInput,
    AppButton
  },
  props: {
    personnel: {
      type: Object,
      default: () => ({})
    },
    readonly: {
      type: Boolean,
      default: false
    },
    mode: {
      type: String,
      default: 'personnel' // 'person' | 'entry' | 'usage'
    },
    personnelList: {
      type: Array,
      default: () => []
    }
  },
  emits: ['confirm', 'cancel'],
  data() {
    return {
      localPersonnel: {
        id: null,
        projectId: null,
        name: '',
        dni: 0,
        rol: '',
        status: '',
        startDate: '',
        phoneNumber: 0,
        email: '',
      }
    }
  },
  created() {
    if (this.personnel && Object.keys(this.personnel).length > 0) {
      this.localPersonnel = { ...this.personnel }
    }

    const user = JSON.parse(sessionStorage.getItem('user'))
    if (!this.readonly && user?.projectId) {
      this.localPersonnel.projectId = user.projectId
    }
  },
  methods: {
    confirm() {
        this.$emit('confirm', {
              id: this.localPersonnel.id,
              projectId: this.localPersonnel.projectId,
              name: this.localPersonnel.name,
              dni: this.localPersonnel.dni,
              rol: this.localPersonnel.rol,
              status: this.localPersonnel.status,
              startDate: this.localPersonnel.ruc,
              phoneNumber: this.localPersonnel.payment,
              email: this.localPersonnel.email
            })
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
          v-if="mode !== 'personnel'"
          v-model="localPersonnel.id"
          :disabled="readonly"
          label="Selecciona personal"
          type="select"
          :options="personnelList.map(m => ({ label: m.name, value: m.id }))"
      />

      <!-- INVENTARIO: Datos básicos -->
      <AppInput
          v-if="mode === 'personnel'"
          v-model="localPersonnel.name"
          :disabled="readonly"
          label="Nombre:"
          placeholder="Juan Pérez Quispe"
      />

      <AppInput
          v-if="mode === 'personnel'"
          v-model="localPersonnel.startDate"
          :disabled="readonly"
          label="Fecha de ingreso:"
          type="date"
      />

      <AppInput
          v-if="mode === 'personnel'"
          v-model="localPersonnel.dni"
          :disabled="readonly"
          label="DNI:"
          type="number"
      />

      <AppInput
          v-if="mode === 'personnel'"
          v-model="localPersonnel.phoneNumber"
          :disabled="readonly"
          label="Teléfono:"
          type="number"
      />

      <AppInput
          v-if="mode === 'personnel'"
          v-model="localPersonnel.rol"
          :disabled="readonly"
          label="Rol:"
          placeholder="Obrero"
      />

      <AppInput
          v-if="mode === 'personnel'"
          v-model="localPersonnel.email"
          :disabled="readonly"
          label="Correo:"
          placeholder="juan.perez@email.com"
      />

      <AppInput
          v-if="mode === 'personnel'"
          v-model="localPersonnel.status"
          :disabled="readonly"
          label="Estado:"
          type="select"
          :options="[
          { label: 'Activo', value: 'Activo' },
          { label: 'Inactivo', value: 'Inactivo' }
        ]"
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
<script>
import AppButton from "../../../core/components/AppButton.vue";
import AppInput from "../../../core/components/AppInput.vue";
import { AuthService } from "../../../auth/services/auth-api.service.js";
import { ManagerService } from '../../manager/services/manager-api.service';

export default {
  name: 'manager-profile-configuration',
  components: { AppInput, AppButton },
  data() {
    return {
      user: AuthService.getCurrentUser(),
      form: {
        name: '',
        email: '',
        photoFile: null
      },
      loading: false,
      editMode: false,
      photoPreviewUrl: ''
    }
  },
  mounted() {
    if (this.user) {
      this.form.name = this.user.name;
      this.form.email = this.user.email;
      this.photoPreviewUrl = this.user.photo || '';
    }
  },
  methods: {
    updatePreview(file) {
      if (file && file instanceof File) {
        this.photoPreviewUrl = URL.createObjectURL(file);
        this.form.photoFile = file;
      }
    },
    async saveProfile() {
      this.loading = true;
      try {
        const updatedUser = {
          ...this.user,
          name: this.form.name,
          email: this.form.email,
          photo: this.photoPreviewUrl || this.user.photo
        };

        const managerService = new ManagerService();
        await managerService.update(this.user.id, updatedUser);

        sessionStorage.setItem('user', JSON.stringify(updatedUser));
        this.user = updatedUser;
        this.editMode = false;
        alert('Perfil actualizado correctamente.');
      } catch (e) {
        console.error('Error al actualizar perfil', e);
        alert('Ocurrió un error.');
      } finally {
        this.loading = false;
      }
    },
    cancelEdit() {
      this.form.name = this.user.name;
      this.form.email = this.user.email;
      this.photoPreviewUrl = this.user.photo || '';
      this.form.photoFile = null;
      this.editMode = false;
    }
  }
}
</script>

<template>
  <div class="profile-wrapper">
    <div class="profile-header">
      <img :src="photoPreviewUrl || user.photo" alt="Foto de perfil" class="profile-image" />
      <h2>{{ user.name }}</h2>
      <p>{{ user.email }}</p>
      <AppButton
          v-if="!editMode"
          label="Editar perfil"
          variant="text"
          @click="editMode = true"
      />
    </div>

    <div v-if="editMode" class="profile-form">
      <AppInput
          v-model="form.name"
          label="Nombre"
          placeholder="Edita tu nombre"
          fullWidth
      />
      <AppInput
          v-model="form.email"
          label="Email"
          placeholder="Edita tu correo"
          type="email"
          fullWidth
      />
      <AppInput
          v-model="form.photoFile"
          label="Subir nueva foto"
          type="photo"
          fullWidth
          @change="updatePreview"
      />
      <div class="action-buttons">
        <AppButton
            label="Guardar"
            variant="primary"
            @click="saveProfile"
            :loading="loading"
        />
        <AppButton
            label="Cancelar"
            variant="secondary"
            @click="cancelEdit"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-wrapper {
  max-width: 500px;
  margin: 60px auto;
  background-color: white;
  border-radius: 8px;
  padding: 32px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  text-align: center;
}

.profile-header img.profile-image {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 16px;
}

.profile-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
}

.profile-header p {
  margin: 4px 0 12px;
  color: #777;
}

.profile-form {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  text-align: left;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}
</style>

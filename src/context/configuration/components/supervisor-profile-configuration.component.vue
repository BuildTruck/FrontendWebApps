<script>
import AppButton from "../../../core/components/AppButton.vue";
import AppInput from "../../../core/components/AppInput.vue";
import AppNotification from "../../../core/components/AppNotification.vue";
import { AuthService } from "../../../auth/services/auth-api.service.js";
import { userService } from "../../../core/services/user-api.service.js";

export default {
  name: 'supervisor-profile-configuration',
  components: {
    AppButton,
    AppInput,
    AppNotification
  },
  data() {
    // Cargar datos inmediatamente desde sessionStorage para evitar parpadeo
    const currentUser = AuthService.getCurrentUser() || {};

    return {
      user: currentUser, // ← Inicializar con datos existentes
      form: {
        name: currentUser.name || '',
        fullName: currentUser.fullName || '',
        email: currentUser.email || '',
        personalEmail: currentUser.personalEmail || '',
        phone: currentUser.phone || '',
        photoFile: null
      },
      loading: false,
      editMode: false,
      // Inicializar también photoPreviewUrl con datos existentes
      photoPreviewUrl: currentUser.profileImageUrl || currentUser.photo || '',
      photoError: null,
      notification: {
        show: false,
        message: '',
        type: 'success',
        autoClose: true
      }
    }
  },
  async mounted() {
    const currentUser = AuthService.getCurrentUser();

    if (currentUser?.id) {
      try {
        const response = await userService.getById(currentUser.id);
        const fullUserData = response.data;

        sessionStorage.setItem('user', JSON.stringify(fullUserData));

        // Actualizar datos pero sin parpadeo visible
        this.user = { ...fullUserData };
        this.form.name = fullUserData.name;
        this.form.fullName = fullUserData.fullName;
        this.form.email = fullUserData.email;
        this.form.personalEmail = fullUserData.personalEmail || '';
        this.form.phone = fullUserData.phone || '';

        // Solo actualizar la imagen si es diferente para evitar parpadeo
        const newImageUrl = fullUserData.profileImageUrl || '';
        if (newImageUrl !== this.photoPreviewUrl) {
          this.photoPreviewUrl = newImageUrl;
        }

      } catch (error) {
        console.error('Error cargando datos del usuario:', error);
        // this.user ya tiene datos del sessionStorage como fallback
      }
    }
  },
  activated() {
    // Simplificar: solo forzar actualización si no hay datos cargados
    if (!this.user || !this.user.id) {
      const currentUser = AuthService.getCurrentUser();
      if (currentUser) {
        this.user = currentUser;
        this.form.name = currentUser.name;
        this.form.fullName = currentUser.fullName || `${currentUser.name} ${currentUser.lastName}`;
        this.form.email = currentUser.email;
        this.form.personalEmail = currentUser.personalEmail || '';
        this.form.phone = currentUser.phone || '';
        this.photoPreviewUrl = currentUser.profileImageUrl || currentUser.photo || '';
      }
    }
  },
  computed: {
    hasChanges() {
      if (!this.user) return false;

      return (
          this.form.personalEmail !== (this.user.personalEmail || '') ||
          this.form.phone !== (this.user.phone || '') ||
          this.photoPreviewUrl !== (this.user.profileImageUrl || this.user.photo || '')
      );
    }
  },
  methods: {
    async updatePreview(file) {
      if (!file || !(file instanceof File)) {
        return;
      }

      try {
        this.photoError = null;
        const reader = new FileReader();
        reader.onload = (e) => {
          this.photoPreviewUrl = e.target.result;
        };
        reader.readAsDataURL(file);

        console.log('Archivo seleccionado para subir:', file.name);
      } catch (error) {
        console.error('Error procesando imagen:', error);
        this.photoError = error.message || this.$t('profile.photoProcessingError');
        this.photoPreviewUrl = this.user.photo || '';
      }
    },

    async saveProfile() {
      this.loading = true;
      try {
        let photoUrl = this.user.photo;

        // Si hay un archivo nuevo, subirlo a Cloudinary
        if (this.form.photoFile) {
          const uploadResponse = await userService.uploadProfileImage(this.user.id, this.form.photoFile);
          photoUrl = uploadResponse.data.profileImageUrl;
        }

        const updatedUser = {
          name: this.form.name,
          lastName: this.user.lastName,
          personalEmail: this.form.personalEmail,
          phone: this.form.phone,
          role: this.user.role
        };

        await userService.updateProfile(this.user.id, updatedUser);

        // Actualizar usuario en sesión
        const newUserData = {
          ...this.user,
          name: this.form.name,
          personalEmail: this.form.personalEmail,
          phone: this.form.phone,
          photo: photoUrl
        };

        sessionStorage.setItem('user', JSON.stringify(newUserData));
        this.user = newUserData;
        this.editMode = false;
        this.photoError = null;
        this.form.photoFile = null;

        this.showNotification(this.$t('profile.profileUpdated'), 'success', true);

      } catch (e) {
        console.error('Error al actualizar perfil:', e);
        this.showNotification(this.$t('profile.profileUpdateError'), 'error', false);
      } finally {
        this.loading = false;
      }
    },

    cancelEdit() {
      this.editMode = false;
      // Usar los datos originales cargados en mounted(), no recargar desde sessionStorage
      this.form.name = this.user.name;
      this.form.fullName = this.user.fullName;
      this.form.email = this.user.email;
      this.form.personalEmail = this.user.personalEmail || '';
      this.form.phone = this.user.phone || '';
      // Usar profileImageUrl que es el campo correcto de la API
      this.photoPreviewUrl = this.user.profileImageUrl || this.user.photo || '';
      this.form.photoFile = null;
      this.photoError = null;
    },

    getPhotoUrl() {
      // Unificar la lógica para evitar parpadeos
      return this.photoPreviewUrl || this.user?.profileImageUrl || this.user?.photo || '/src/assets/default-avatar.png';
    },

    async removePhoto() {
      try {
        if (this.user.photo) {
          // Eliminar del servidor usando el método que ya existe
          await userService.deleteProfileImage(this.user.id);

          // Actualizar sessionStorage
          const updatedUser = { ...this.user, photo: null };
          sessionStorage.setItem('user', JSON.stringify(updatedUser));
          this.user = updatedUser;
        }

        // Limpiar preview
        this.photoPreviewUrl = '';
        this.form.photoFile = null;
        this.photoError = null;
        if (this.$refs.fileInput) {
          this.$refs.fileInput.value = '';
        }

        this.showNotification(this.$t('profile.photoRemoved'), 'success');
      } catch (error) {
        console.error('Error eliminando foto:', error);
        this.showNotification(this.$t('profile.photoRemoveError'), 'error');
      }
    },

    showNotification(message, type = 'success', autoClose = true) {
      this.notification = {
        show: true,
        message,
        type,
        autoClose
      };
    },

    triggerFileInput() {
      this.$refs.fileInput.click();
    },

    handleFileChange(event) {
      const file = event.target.files[0];
      if (file) {
        this.form.photoFile = file;
        this.updatePreview(file);
      }
    },

    getRoleDisplayName(role) {
      const roleKey = `profile.roles.${role}`;
      return this.$t(roleKey) !== roleKey ? this.$t(roleKey) : role;
    }
  }
}
</script>

<template>
  <div class="profile-container">
    <div class="profile-wrapper">
      <!-- Header con foto y información básica -->
      <div class="profile-header">
        <div class="avatar-section">
          <div class="avatar-container" @click="editMode ? triggerFileInput() : null">
            <img
                :src="getPhotoUrl()"
                :alt="$t('profile.profilePhoto')"
                class="profile-image"
                @error="photoPreviewUrl = ''"
            />
            <div v-if="editMode" class="avatar-overlay">
              <i class="pi pi-camera"></i>
              <span>{{ $t('profile.changePhoto') }}</span>
            </div>
          </div>

          <!-- Input oculto para subir archivos -->
          <input
              v-if="editMode"
              ref="fileInput"
              type="file"
              accept="image/*"
              style="display: none"
              @change="handleFileChange"
          />
        </div>

        <div class="user-info">
          <h1 class="user-name">{{ user.name }} {{ user.lastName }}</h1>
          <div class="user-details">
            <div class="detail-item">
              <i class="pi pi-briefcase"></i>
              <span class="detail-label">{{ $t('profile.role') }}:</span>
              <span class="detail-value">{{ getRoleDisplayName(user.role) }}</span>
            </div>
            <div class="detail-item">
              <i class="pi pi-envelope"></i>
              <span class="detail-label">{{ $t('profile.corporateEmail') }}:</span>
              <span class="detail-value">{{ user.email }}</span>
            </div>
            <div v-if="user.personalEmail" class="detail-item">
              <i class="pi pi-at"></i>
              <span class="detail-label">{{ $t('profile.personalEmail') }}:</span>
              <span class="detail-value">{{ user.personalEmail }}</span>
            </div>
            <div v-if="user.phone" class="detail-item">
              <i class="pi pi-phone"></i>
              <span class="detail-label">{{ $t('profile.phone') }}:</span>
              <span class="detail-value">{{ user.phone }}</span>
            </div>
          </div>
        </div>

        <div class="header-actions">
          <AppButton
              v-if="!editMode"
              :label="$t('profile.editProfile')"
              variant="primary"
              icon="pi pi-pencil"
              @click="editMode = true"
          />
        </div>
      </div>

      <!-- Formulario de edición -->
      <div v-if="editMode" class="edit-form">
        <div class="form-section">
          <h3 class="section-title">
            <i class="pi pi-user"></i>
            {{ $t('profile.personalInformation') }}
          </h3>

          <div class="form-grid">
            <AppInput
                v-model="form.fullName"
                :label="$t('profile.name')"
                :placeholder="user.fullName"
                type="text"
                icon="pi pi-user"
                fullWidth
                disabled
                readonly
            />
            <AppInput
                v-model="form.email"
                :label="$t('profile.corporateEmail')"
                :placeholder="user.email"
                type="email"
                icon="pi pi-envelope"
                fullWidth
                disabled
            />

            <AppInput
                v-model="form.personalEmail"
                :label="$t('profile.personalEmail')"
                :placeholder="$t('profile.placeholders.personalEmail')"
                type="email"
                icon="pi pi-at"
                fullWidth
            />

            <AppInput
                v-model="form.phone"
                :label="$t('profile.phone')"
                :placeholder="$t('profile.placeholders.phone')"
                type="tel"
                icon="pi pi-phone"
                fullWidth
            />
          </div>

          <div class="email-info">
            <div class="info-card">
              <i class="pi pi-info-circle"></i>
              <div class="info-content">
                <strong>{{ $t('profile.corporateEmail') }}:</strong> {{ user.email }}
                <br>
                <small>{{ $t('profile.info.corporateEmailFixed') }}</small>
                <br>
              </div>
            </div>
          </div>

          <div v-if="photoPreviewUrl && user.photo" class="photo-actions-section">
            <AppButton
                :label="$t('profile.removePhoto')"
                variant="text"
                icon="pi pi-times"
                size="small"
                @click="removePhoto"
            />
          </div>
        </div>

        <!-- Errores -->
        <div v-if="photoError" class="errors-section">
          <div class="error-message">
            <i class="pi pi-exclamation-triangle"></i>
            {{ photoError }}
          </div>
        </div>

        <div class="form-actions">
          <AppButton
              :label="$t('general.cancel')"
              variant="secondary"
              icon="pi pi-times"
              @click="cancelEdit"
              :disabled="loading"
          />
          <AppButton
              :label="$t('general.save')"
              variant="primary"
              icon="pi pi-check"
              @click="saveProfile"
              :loading="loading"
              :disabled="!!photoError || !hasChanges"
          />
        </div>

        <div v-if="hasChanges && !photoError" class="changes-indicator">
          <i class="pi pi-info-circle"></i>
          {{ $t('profile.unsavedChanges') }}
        </div>
      </div>
    </div>

    <AppNotification
        v-model="notification.show"
        :message="notification.message"
        :type="notification.type"
        :auto-close="notification.autoClose"
        :button-text="$t('general.understood')"
    />
  </div>
</template>

<style scoped>
.profile-container {
  height: 100%;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  padding: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-wrapper {
  max-width: 900px;
  width: 100%;
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
  overflow: hidden;
  border: 1px solid #e9ecef;
  margin: 0 auto;
}

.profile-header {
  background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
  padding: 3rem 2rem;
  color: white;
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 2rem;
  align-items: center;
}

.avatar-section {
  position: relative;
}

.avatar-container {
  position: relative;
  width: 120px;
  height: 120px;
  cursor: pointer;
}

.avatar-container:hover .avatar-overlay {
  opacity: 1;
}

.profile-image {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid rgba(255,255,255,0.3);
  box-shadow: 0 8px 20px rgba(0,0,0,0.2);
  transition: transform 0.3s ease;
}

.profile-image:hover {
  transform: scale(1.05);
}

.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.7);
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  color: white;
  font-size: 0.8rem;
  text-align: center;
  gap: 0.3rem;
}

.avatar-overlay i {
  font-size: 1.5rem;
  color: white;
}

.avatar-overlay span {
  font-weight: 500;
  font-size: 0.75rem;
}

.user-info {
  min-width: 0;
}

.user-name {
  margin: 0 0 1rem 0;
  font-size: 2rem;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
}

.detail-item i {
  width: 16px;
  opacity: 0.8;
}

.detail-label {
  font-weight: 500;
  opacity: 0.9;
}

.detail-value {
  opacity: 0.95;
}

.header-actions {
  display: flex;
  justify-content: flex-end;
}

.edit-form {
  padding: 2rem;
}

.form-section {
  margin-bottom: 2rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #f0f0f0;
}

.section-title i {
  color: #ff6b35;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.email-info {
  margin-top: 1rem;
}

.info-card {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #ff6b35;
}

.info-card i {
  color: #ff6b35;
  font-size: 1.2rem;
  margin-top: 0.2rem;
}

.info-content {
  flex: 1;
  font-size: 0.9rem;
  line-height: 1.5;
}

.info-content strong {
  color: #333;
}

.info-content small {
  color: #666;
}

.photo-actions-section {
  margin-top: 1rem;
  display: flex;
  justify-content: center;
}

.errors-section {
  margin-bottom: 1.5rem;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: #fff5f5;
  border: 1px solid #fed7d7;
  border-radius: 8px;
  color: #e53e3e;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e9ecef;
}

.changes-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: #fffbeb;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  color: #ea580c;
  font-size: 0.875rem;
  margin-top: 1rem;
}

.changes-indicator i {
  color: #ea580c;
}

/* Responsive */
@media (max-width: 768px) {
  .profile-container {
    padding: 1rem;
  }

  .profile-header {
    grid-template-columns: 1fr;
    text-align: center;
    gap: 1.5rem;
  }

  .user-name {
    font-size: 1.5rem;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .form-actions {
    flex-direction: column;
  }

  .avatar-container,
  .profile-image {
    width: 100px;
    height: 100px;
  }

  .photo-actions-section {
    margin-top: 1rem;
  }
}

@media (max-width: 480px) {
  .edit-form {
    padding: 1rem;
  }

  .profile-header {
    padding: 2rem 1rem;
  }
}
</style>
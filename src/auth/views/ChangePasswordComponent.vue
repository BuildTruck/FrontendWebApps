<script>
import AppInput from '../../core/components/AppInput.vue'
import AppButton from '../../core/components/AppButton.vue'
import { userService } from '../services/user.service'

export default {
  name: 'ChangePasswordComponent',
  components: {
    AppInput,
    AppButton,
  },
  data() {
    return {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      currentPasswordError: '',
      newPasswordError: '',
      confirmPasswordError: '',
      submitError: '',
      isSubmitting: false,
      changeSuccess: false
    }
  },
  methods: {
    async handleChangePassword() {
      // Reiniciar errores
      this.currentPasswordError = '';
      this.newPasswordError = '';
      this.confirmPasswordError = '';
      this.submitError = '';
      this.isSubmitting = true;

      // Validaciones
      let isValid = true;

      if (!this.currentPassword || this.currentPassword.trim() === '') {
        this.currentPasswordError = this.$t('changePassword.currentPasswordRequired');
        isValid = false;
      }

      if (!this.newPassword || this.newPassword.trim() === '') {
        this.newPasswordError = this.$t('changePassword.newPasswordRequired');
        isValid = false;
      } else if (this.newPassword.length < 6) {
        this.newPasswordError = this.$t('changePassword.passwordMinLength');
        isValid = false;
      } else if (!this.isPasswordComplex(this.newPassword)) {
        this.newPasswordError = this.$t('changePassword.passwordComplexity');
        isValid = false;
      }

      if (!this.confirmPassword || this.confirmPassword.trim() === '') {
        this.confirmPasswordError = this.$t('changePassword.confirmPasswordRequired');
        isValid = false;
      } else if (this.newPassword !== this.confirmPassword) {
        this.confirmPasswordError = this.$t('changePassword.passwordsDoNotMatch');
        isValid = false;
      }

      // Verificar que no sea la misma contraseña
      if (this.currentPassword === this.newPassword) {
        this.newPasswordError = this.$t('changePassword.samePassword');
        isValid = false;
      }

      if (!isValid) {
        this.isSubmitting = false;
        return;
      }

      try {
        // Obtener usuario actual
        const user = JSON.parse(sessionStorage.getItem('user'));
        if (!user || !user.id) {
          this.submitError = this.$t('changePassword.notAuthenticated');
          this.isSubmitting = false;
          return;
        }

        // Llamar al servicio
        await userService.changePassword(user.id, this.currentPassword, this.newPassword);

        // Éxito
        this.changeSuccess = true;
        this.clearForm();

        // Auto-cerrar el mensaje de éxito después de 3 segundos
        setTimeout(() => {
          this.changeSuccess = false;
        }, 5000);

      } catch (error) {
        console.error('Error cambiando contraseña:', error);

        if (error.response?.status === 401) {
          this.submitError = this.$t('changePassword.incorrectCurrentPassword');
        } else if (error.response?.status === 400) {
          this.submitError = this.$t('changePassword.invalidData');
        } else {
          this.submitError = this.$t('changePassword.changeError');
        }
      } finally {
        this.isSubmitting = false;
      }
    },

    isPasswordComplex(password) {
      const hasUpper = /[A-Z]/.test(password);
      const hasLower = /[a-z]/.test(password);
      const hasDigit = /\d/.test(password);
      const hasSpecial = /[@$!%*?&]/.test(password);

      return hasUpper && hasLower && hasDigit && hasSpecial;
    },

    clearForm() {
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
    },

    goBack() {
      this.$router.go(-1);
    }
  }
}
</script>

<template>
  <div class="change-password-container">
    <div class="change-password-card">
      <div class="card-header">
        <button @click="goBack" class="back-button">
          <i class="pi pi-arrow-left"></i>
        </button>
        <h1>{{ $t('changePassword.title') }}</h1>
      </div>

      <!-- Mensaje de éxito -->
      <div v-if="changeSuccess" class="success-message">
        <i class="pi pi-check-circle" style="margin-right: 8px;"></i>
        {{ $t('changePassword.changeSuccess') }}
      </div>

      <!-- Formulario -->
      <div v-else class="change-password-form">
        <p class="form-description">{{ $t('changePassword.description') }}</p>

        <div class="form-group">
          <label>{{ $t('changePassword.currentPassword') }}</label>
          <AppInput
              v-model="currentPassword"
              type="password"
              :placeholder="$t('changePassword.currentPasswordPlaceholder')"
              fullWidth
              :disabled="isSubmitting"
          />
          <div v-if="currentPasswordError" class="error-message">{{ currentPasswordError }}</div>
        </div>

        <div class="form-group">
          <label>{{ $t('changePassword.newPassword') }}</label>
          <AppInput
              v-model="newPassword"
              type="password"
              :placeholder="$t('changePassword.newPasswordPlaceholder')"
              fullWidth
              :disabled="isSubmitting"
          />
          <div v-if="newPasswordError" class="error-message">{{ newPasswordError }}</div>
        </div>

        <div class="form-group">
          <label>{{ $t('changePassword.confirmPassword') }}</label>
          <AppInput
              v-model="confirmPassword"
              type="password"
              :placeholder="$t('changePassword.confirmPasswordPlaceholder')"
              fullWidth
              :disabled="isSubmitting"
          />
          <div v-if="confirmPasswordError" class="error-message">{{ confirmPasswordError }}</div>
        </div>

        <!-- Requisitos de contraseña -->
        <div class="password-requirements">
          <h4>{{ $t('changePassword.passwordRequirements') }}</h4>
          <ul>
            <li :class="{ 'requirement-met': newPassword.length >= 6 }">
              {{ $t('changePassword.requirementLength') }}
            </li>
            <li :class="{ 'requirement-met': /[A-Z]/.test(newPassword) }">
              {{ $t('changePassword.requirementUppercase') }}
            </li>
            <li :class="{ 'requirement-met': /[a-z]/.test(newPassword) }">
              {{ $t('changePassword.requirementLowercase') }}
            </li>
            <li :class="{ 'requirement-met': /\d/.test(newPassword) }">
              {{ $t('changePassword.requirementNumber') }}
            </li>
            <li :class="{ 'requirement-met': /[@$!%*?&]/.test(newPassword) }">
              {{ $t('changePassword.requirementSpecial') }}
            </li>
          </ul>
        </div>

        <!-- Mensaje de error general -->
        <div v-if="submitError" class="submit-error">
          <i class="pi pi-exclamation-triangle" style="margin-right: 8px;"></i>
          {{ submitError }}
        </div>

        <div class="form-actions">
          <AppButton
              :label="isSubmitting ? $t('changePassword.changing') : $t('changePassword.changePasswordButton')"
              variant="primary"
              fullWidth
              @click="handleChangePassword"
              :disabled="isSubmitting"
              class="submit-button"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.change-password-container {
  min-height: 100vh;
  padding: 20px;
  background-color: #f8fafc;
  display: flex;
  justify-content: center;
  align-items: center;
}

.change-password-card {
  width: 100%;
  max-width: 500px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.card-header {
  padding: 24px 24px 0 24px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-button {
  background: none;
  border: none;
  color: #6b7280;
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s;
}

.back-button:hover {
  background-color: #f3f4f6;
  color: #FF5F01;
}

h1 {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  color: #2A1905;
}

.change-password-form {
  padding: 24px;
}

.form-description {
  color: #6b7280;
  font-size: 14px;
  margin-bottom: 24px;
  line-height: 1.5;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

/* Estilos para los inputs */
:deep(.app-input) {
  border: 1px solid #ddd !important;
  border-radius: 8px !important;
  padding: 12px 16px !important;
  font-size: 16px !important;
  color: #333 !important;
  background-color: white !important;
  transition: all 0.2s ease !important;
}

:deep(.app-input:focus) {
  border-color: #FF5F01 !important;
  box-shadow: 0 0 0 3px rgba(255, 95, 1, 0.1) !important;
}

:deep(.app-input:disabled) {
  background-color: #f9fafb !important;
  opacity: 0.6 !important;
}

.password-requirements {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.password-requirements h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.password-requirements ul {
  margin: 0;
  padding-left: 16px;
  list-style: none;
}

.password-requirements li {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 4px;
  position: relative;
}

.password-requirements li::before {
  content: "✗";
  color: #ef4444;
  font-weight: bold;
  position: absolute;
  left: -16px;
}

.password-requirements li.requirement-met {
  color: #10b981;
}

.password-requirements li.requirement-met::before {
  content: "✓";
  color: #10b981;
}

.success-message {
  background-color: rgba(16, 185, 129, 0.1);
  color: #10b981;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  border-left: 4px solid #10b981;
  margin: 0 24px 24px 24px;
  border-radius: 0 8px 8px 0;
}

.submit-error {
  color: #f44336;
  font-size: 14px;
  margin-bottom: 16px;
  background-color: rgba(244, 67, 54, 0.1);
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  font-weight: 500;
  border-left: 4px solid #f44336;
}

.error-message {
  color: #f44336;
  font-size: 12px;
  margin-top: 4px;
  font-weight: 500;
}

.form-actions {
  margin-top: 24px;
}

.submit-button {
  font-size: 16px !important;
  border-radius: 8px !important;
  padding: 12px 24px !important;
  background-color: #FF5F01 !important;
  border: none !important;
  font-weight: 600 !important;
  transition: all 0.2s ease !important;
}

.submit-button:hover:not(:disabled) {
  background-color: #e5560c !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 95, 1, 0.3) !important;
}

.submit-button:disabled {
  background-color: #9ca3af !important;
  cursor: not-allowed !important;
  transform: none !important;
  box-shadow: none !important;
}

/* Responsive */
@media (max-width: 768px) {
  .change-password-container {
    padding: 12px;
    align-items: flex-start;
    padding-top: 40px;
  }

  .change-password-card {
    max-width: 100%;
  }

  .card-header {
    padding: 20px 20px 0 20px;
  }

  .change-password-form {
    padding: 20px;
  }

  h1 {
    font-size: 20px;
  }
}
</style>
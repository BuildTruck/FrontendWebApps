<script>
import AppInput from '../../core/components/AppInput.vue'
import AppButton from '../../core/components/AppButton.vue'
import { AuthService } from '../services/auth-api.service'
import LanguageSwitcher from "../../core/components/language-switcher.component.vue"
import { useThemeStore} from "../../core/stores/theme.js";
import { useLogo } from "../../core/composables/useLogo.js";

export default {
  name: 'ResetPasswordComponent',
  components: {
    AppInput,
    AppButton,
    LanguageSwitcher,
  },
  setup() {
    const themeStore = useThemeStore()
    const { logoSrc } = useLogo()
    return { themeStore, logoSrc }
  },
  data() {
    return {
      newPassword: '',
      confirmPassword: '',
      newPasswordError: '',
      confirmPasswordError: '',
      submitError: '',
      isSubmitting: false,
      resetSuccess: false,
      token: '',
      email: '',
      tokenError: false
    }
  },
  mounted() {
    // Limpiar almacenamiento por si acaso
    AuthService.clearAllStorages();

    // Inicializar tema para reset password
    this.themeStore.initializeForLogin();

    // Obtener token y email de la URL
    const urlParams = new URLSearchParams(window.location.search);
    this.token = urlParams.get('token') || '';
    this.email = urlParams.get('email') || '';

    // Validar que tenemos token y email
    if (!this.token || !this.email) {
      this.tokenError = true;
    }
  },
  methods: {
    async handleResetPassword() {
      // Reiniciar errores
      this.newPasswordError = '';
      this.confirmPasswordError = '';
      this.submitError = '';
      this.isSubmitting = true;

      // Validaciones
      let isValid = true;

      if (!this.newPassword || this.newPassword.trim() === '') {
        this.newPasswordError = this.$t('password.newPasswordRequired');
        isValid = false;
      } else if (this.newPassword.length < 6) {
        this.newPasswordError = this.$t('password.passwordMinLength');
        isValid = false;
      } else if (!this.isPasswordComplex(this.newPassword)) {
        this.newPasswordError = this.$t('password.passwordComplexity');
        isValid = false;
      }

      if (!this.confirmPassword || this.confirmPassword.trim() === '') {
        this.confirmPasswordError = this.$t('password.confirmPasswordRequired');
        isValid = false;
      } else if (this.newPassword !== this.confirmPassword) {
        this.confirmPasswordError = this.$t('password.passwordsDoNotMatch');
        isValid = false;
      }

      if (!isValid) {
        this.isSubmitting = false;
        return;
      }

      try {
        // Llamar al servicio
        const result = await AuthService.resetPassword(this.token, this.email, this.newPassword);

        if (result.success) {
          this.resetSuccess = true;
        } else {
          this.submitError = this.$t('password.resetTokenError');
        }
      } catch (error) {
        console.error('Error en reset password:', error);
        if (error.response?.status === 400) {
          this.submitError = this.$t('password.resetTokenError');
        } else {
          this.submitError = this.$t('password.resetError');
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

    goToLogin() {
      this.$router.push('/login');
    }
  }
}
</script>

<template>
  <div class="reset-password-wrapper">
    <div class="reset-password-container">
      <div class="form-section">
        <div class="logo-container">
          <img :src="logoSrc" alt="Logo" class="logo" />
          <div class="language-switcher-container">
            <language-switcher />
          </div>
        </div>

        <div class="form-content">
          <!-- Estado: Token inválido o faltante -->
          <div v-if="tokenError" class="error-state">
            <div class="error-icon">
              <i class="pi pi-times-circle" style="font-size: 48px; color: #f44336;"></i>
            </div>
            <h1>{{ $t('password.invalidToken') }}</h1>
            <p>{{ $t('password.invalidTokenDescription') }}</p>

            <AppButton
                :label="$t('password.requestNewReset')"
                variant="primary"
                fullWidth
                @click="$router.push('/forgot-password')"
                class="action-button"
            />

            <div class="back-to-login">
              <a href="#" @click.prevent="goToLogin" class="back-link">
                <i class="pi pi-arrow-left" style="margin-right: 4px;"></i>
                {{ $t('password.backToLogin') }}
              </a>
            </div>
          </div>

          <!-- Estado: Contraseña restablecida exitosamente -->
          <div v-else-if="resetSuccess" class="success-state">
            <div class="success-icon">
              <i class="pi pi-check-circle" style="font-size: 48px; color: #10b981;"></i>
            </div>
            <h1>{{ $t('password.resetSuccess') }}</h1>
            <p>{{ $t('password.resetSuccessDescription') }}</p>

            <AppButton
                :label="$t('password.goToLogin')"
                variant="primary"
                fullWidth
                @click="goToLogin"
                class="action-button"
            />
          </div>

          <!-- Estado: Formulario para nueva contraseña -->
          <div v-else class="form-state">
            <h1>{{ $t('password.resetPassword') }}</h1>
            <p>{{ $t('password.resetPasswordDescription') }}</p>

            <div class="reset-form">
              <div class="form-group">
                <label>{{ $t('password.newPassword') }}</label>
                <AppInput
                    v-model="newPassword"
                    type="password"
                    :placeholder="$t('password.newPasswordPlaceholder')"
                    fullWidth
                    :disabled="isSubmitting"
                />
                <div v-if="newPasswordError" class="error-message">{{ newPasswordError }}</div>
              </div>

              <div class="form-group">
                <label>{{ $t('password.confirmPassword') }}</label>
                <AppInput
                    v-model="confirmPassword"
                    type="password"
                    :placeholder="$t('password.confirmPasswordPlaceholder')"
                    fullWidth
                    :disabled="isSubmitting"
                />
                <div v-if="confirmPasswordError" class="error-message">{{ confirmPasswordError }}</div>
              </div>

              <!-- Información sobre requisitos de contraseña -->
              <div class="password-requirements">
                <h4>{{ $t('password.passwordRequirements') }}</h4>
                <ul>
                  <li :class="{ 'requirement-met': newPassword.length >= 6 }">
                    {{ $t('password.requirementLength') }}
                  </li>
                  <li :class="{ 'requirement-met': /[A-Z]/.test(newPassword) }">
                    {{ $t('password.requirementUppercase') }}
                  </li>
                  <li :class="{ 'requirement-met': /[a-z]/.test(newPassword) }">
                    {{ $t('password.requirementLowercase') }}
                  </li>
                  <li :class="{ 'requirement-met': /\d/.test(newPassword) }">
                    {{ $t('password.requirementNumber') }}
                  </li>
                  <li :class="{ 'requirement-met': /[@$!%*?&]/.test(newPassword) }">
                    {{ $t('password.requirementSpecial') }}
                  </li>
                </ul>
              </div>

              <!-- Mensaje de error general -->
              <div v-if="submitError" class="submit-error">
                <i class="pi pi-exclamation-triangle" style="margin-right: 8px;"></i>
                {{ submitError }}
              </div>

              <AppButton
                  :label="isSubmitting ? $t('password.resetting') : $t('password.resetPasswordButton')"
                  variant="primary"
                  fullWidth
                  @click="handleResetPassword"
                  :disabled="isSubmitting"
                  class="submit-button"
              />

              <div class="back-to-login">
                <a href="#" @click.prevent="goToLogin" class="back-link">
                  <i class="pi pi-arrow-left" style="margin-right: 4px;"></i>
                  {{ $t('password.backToLogin') }}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="image-section">
        <div class="image-container"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reset-password-wrapper {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
}

.reset-password-container {
  display: flex;
  height: 100%;
  width: 100%;
  background-color: white;
}

.form-section {
  width: 55%;
  max-width: none;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: white;
}

.logo-container {
  position: absolute;
  top: 0;
  left: 0;
  padding: 20px 0 0 20px;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  width: 55%;
}

.language-switcher-container {
  position: absolute;
  top: 20px;
  right: 20px;
}

.logo {
  width: 200px;
  height: auto;
}

.form-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 40px;
  width: 55%;
}

/* Estados del componente */
.success-state, .error-state {
  text-align: center;
}

.success-icon, .error-icon {
  margin-bottom: 20px;
}

.form-state {
  text-align: left;
}

h1 {
  font-size: 32px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #2A1905;
  text-align: left;
}

.success-state h1, .error-state h1 {
  text-align: center;
}

p {
  text-align: left;
  margin-bottom: 32px;
  color: #000;
  font-size: 16px;
}

.success-state p, .error-state p {
  text-align: center;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  text-align: left;
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

/* Estilos para los inputs */
:deep(.app-input) {
  border: 1px solid #ddd !important;
  border-radius: 6px !important;
  padding: 14px !important;
  font-size: 16px !important;
  color: #333 !important;
  background-color: white !important;
  height: 40px !important;
}

:deep(.app-input:focus) {
  border-color: #FF5F01 !important;
  box-shadow: 0 0 0 2px rgba(255, 95, 1, 0.1) !important;
}

:deep(.app-input:disabled) {
  background-color: #f9fafb !important;
  opacity: 0.6 !important;
}

.submit-button, .action-button {
  font-size: 16px !important;
  border-radius: 6px !important;
  display: flex;
  background-color: #FF5F01;
  border: none;
  font-style: normal;
  font-weight: 500 !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

.submit-button:disabled {
  background-color: #9ca3af !important;
  cursor: not-allowed !important;
}

.back-to-login {
  text-align: center;
  margin-top: 24px;
}

.back-link {
  color: #FF5F01;
  text-decoration: none;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
}

.back-link:hover {
  text-decoration: underline;
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

.submit-error {
  color: #f44336;
  font-size: 0.875rem;
  margin-bottom: 15px;
  background-color: rgba(244, 67, 54, 0.1);
  padding: 10px 12px;
  border-radius: 4px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  border-left: 3px solid #f44336;
}

.error-message {
  color: #f44336;
  font-size: 0.75rem;
  margin-top: 1px;
  font-weight: 700;
  display: block;
  padding-left: 2px;
}

.image-section {
  flex: 1;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.image-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url('../../assets/contruction-image.svg');
  background-size: cover;
  background-position: center;
}

/* Responsividad */
@media (max-width: 992px) {
  .form-section {
    width: 60%;
  }

  .logo-container {
    width: 60%;
  }
}

@media (max-width: 768px) {
  .reset-password-container {
    flex-direction: column;
  }

  .form-section {
    width: 100%;
    height: auto;
    padding: 40px 20px;
    max-width: none;
  }

  .form-content {
    padding: 0;
    max-width: 100%;
  }

  .logo-container {
    position: relative;
    padding: 20px 0;
    display: flex;
    justify-content: space-between;
    width: 100%;
  }

  .language-switcher-container {
    position: relative;
    top: 0;
    right: 10px;
  }

  .image-section {
    display: none;
  }
}
</style>
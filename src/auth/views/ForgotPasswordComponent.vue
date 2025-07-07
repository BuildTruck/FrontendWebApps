<script>
import AppInput from '../../core/components/AppInput.vue'
import AppButton from '../../core/components/AppButton.vue'
import { AuthService } from '../services/auth-api.service'
import LanguageSwitcher from "../../core/components/language-switcher.component.vue"
import { useThemeStore} from "../../core/stores/theme.js";
import { useLogo } from "../../core/composables/useLogo.js";

export default {
  name: 'ForgotPasswordComponent',
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
      email: '',
      emailError: '',
      submitError: '',
      isSubmitting: false,
      emailSent: false
    }
  },
  mounted() {
    // Limpiar almacenamiento por si acaso
    AuthService.clearAllStorages();

    // Inicializar tema para forgot password
    this.themeStore.initializeForLogin();
  },
  methods: {
    async handleForgotPassword() {
      // Reiniciar errores
      this.emailError = '';
      this.submitError = '';
      this.isSubmitting = true;

      // Validación
      if (!this.email || this.email.trim() === '') {
        this.emailError = this.$t('password.emailRequired');
        this.isSubmitting = false;
        return;
      }

      // Validación básica de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.email)) {
        this.emailError = this.$t('password.emailInvalid');
        this.isSubmitting = false;
        return;
      }

      try {
        // Llamar al servicio
        const result = await AuthService.forgotPassword(this.email);

        if (result.success) {
          this.emailSent = true;
        } else {
          this.submitError = this.$t('password.resetError');
        }
      } catch (error) {
        console.error('Error en forgot password:', error);
        this.submitError = this.$t('password.resetError');
      } finally {
        this.isSubmitting = false;
      }
    },

    goToLogin() {
      this.$router.push('/login');
    }
  }
}
</script>

<template>
  <div class="forgot-password-wrapper">
    <div class="forgot-password-container">
      <div class="form-section">
        <div class="logo-container">
          <img :src="logoSrc" alt="Logo" class="logo" />
          <div class="language-switcher-container">
            <language-switcher />
          </div>
        </div>

        <div class="form-content">
          <!-- Estado: Email enviado exitosamente -->
          <div v-if="emailSent" class="success-state">
            <div class="success-icon">
              <i class="pi pi-check-circle" style="font-size: 48px; color: #10b981;"></i>
            </div>
            <h1>{{ $t('password.emailSent') }}</h1>
            <p>{{ $t('password.emailSentDescription') }}</p>

            <div class="success-message">
              <i class="pi pi-info-circle" style="margin-right: 8px;"></i>
              {{ $t('password.checkInbox') }}
            </div>

            <AppButton
                :label="$t('password.backToLogin')"
                variant="primary"
                fullWidth
                @click="goToLogin"
                class="back-button"
            />
          </div>

          <!-- Estado: Formulario para introducir email -->
          <div v-else class="form-state">
            <h1>{{ $t('password.forgotPassword') }}</h1>
            <p>{{ $t('password.forgotPasswordDescription') }}</p>

            <div class="forgot-form">
              <div class="form-group">
                <label>{{ $t('auth.email') }}</label>
                <AppInput
                    v-model="email"
                    type="email"
                    :placeholder="$t('auth.emailPlaceholder')"
                    fullWidth
                    :disabled="isSubmitting"
                />
                <div v-if="emailError" class="error-message">{{ emailError }}</div>
              </div>

              <!-- Mensaje de error general -->
              <div v-if="submitError" class="submit-error">
                <i class="pi pi-exclamation-triangle" style="margin-right: 8px;"></i>
                {{ submitError }}
              </div>

              <AppButton
                  :label="isSubmitting ? $t('password.sending') : $t('password.sendResetLink')"
                  variant="primary"
                  fullWidth
                  @click="handleForgotPassword"
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
.forgot-password-wrapper {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
}

.forgot-password-container {
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
.success-state {
  text-align: center;
}

.success-icon {
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

.success-state h1 {
  text-align: center;
}

p {
  text-align: left;
  margin-bottom: 32px;
  color: #000;
  font-size: 16px;
}

.success-state p {
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

.submit-button, .back-button {
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

.success-message {
  color: #10b981;
  font-size: 0.875rem;
  margin-bottom: 24px;
  background-color: rgba(16, 185, 129, 0.1);
  padding: 12px;
  border-radius: 6px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  border-left: 3px solid #10b981;
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
  .forgot-password-container {
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
<script>
import AppInput from '../../core/components/AppInput.vue'
import AppButton from '../../core/components/AppButton.vue'
import { AuthService } from '../services/auth-api.service'
import LanguageSwitcher from "../../core/components/language-switcher.component.vue"
import { useThemeStore} from "../../core/stores/theme.js";
import { useLogo } from "../../core/composables/useLogo.js";

import { Manager } from '../../context/manager/models/manager.entity.js'
import { Supervisor } from '../../context/supervisor/models/supervisor.entity.js'
import { Admin} from "../../core/admin/models/admin.entity.js";

export default {
  name: 'LoginComponent',
  components: {
    AppInput,
    AppButton,
    LanguageSwitcher,
  },
  setup() {
    const themeStore = useThemeStore()
    const { logoSrc } = useLogo() // 🆕 USAR COMPOSABLE
    return { themeStore, logoSrc }
  },
  data() {
    return {
      email: '',
      password: '',
      rememberMe: false,
      emailError: '',
      passwordError: '',
      authError: ''
    }
  },
  mounted() {
    AuthService.clearAllStorages();

    // INICIALIZAR TEMA PARA LOGIN (solo detección del sistema)
    this.themeStore.initializeForLogin();

    const isOpera = (!!window.opr && !!opr.addons) ||
        !!window.opera ||
        navigator.userAgent.indexOf(' OPR/') >= 0;

    if (isOpera) {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('fresh')) {
        const url = new URL(window.location.href);
        url.searchParams.delete('fresh');
        window.history.replaceState({}, document.title, url.toString());
      }
    }
  },
  methods: {
    async handleLogin() {
      // Reiniciar errores
      this.emailError = '';
      this.passwordError = '';
      this.authError = '';

      // Validación
      let isValid = true;

      if (!this.email || this.email.trim() === '') {
        this.emailError = 'El email es obligatorio';
        isValid = false;
      }

      if (!this.password || this.password.trim() === '') {
        this.passwordError = 'La contraseña es obligatoria';
        isValid = false;
      }

      if (!isValid) {
        return;
      }

      try {
        // Limpiar cualquier sesión anterior
        AuthService.clearAllStorages();

        // Autenticar
        const rawUser = await AuthService.login(this.email, this.password);

        if (!rawUser) {
          this.authError = 'Correo o contraseña incorrectos';
          return;
        }

        // Procesar usuario según rol
        let user;
        switch (rawUser.role) {
          case 'Manager':
            user = new Manager(rawUser);
            break;
          case 'Supervisor':
            user = new Supervisor(rawUser);
            break;
          case 'Admin':
            user = new Admin(rawUser);
            break;
          default:
            throw new Error(`Rol desconocido: ${rawUser.role}`);
        }

        // Guardar en sessionStorage
        sessionStorage.setItem('token', rawUser.token || AuthService.getToken());
        sessionStorage.setItem('user', JSON.stringify(user.toJSON()));

        await this.themeStore.initializeFromLogin(user.id);

        // Detectar Opera para redirección
        const isOpera = (!!window.opr && !!opr.addons) ||
            !!window.opera ||
            navigator.userAgent.indexOf(' OPR/') >= 0;

        // Redireccionar según rol
        if (user.role === 'Manager') {
          if (isOpera) {
            window.location.href = '/proyectos';
          } else {
            this.$router.push('/proyectos');
          }
        }
        else if (user.role === 'Supervisor') {
          try {
            const project = await AuthService.getAssignedProject(user.id);

            if (project) {
              if (isOpera) {
                window.location.href = `/supervisor/${project.id}`;
              } else {
                this.$router.push(`/supervisor/${project.id}`);
              }
            } else {
              this.authError = 'Aún no tienes un proyecto asignado. Contacta con tu manager para más información.';
              AuthService.clearAllStorages();
              return;
            }
          } catch (projectError) {
            this.authError = 'Error al verificar tu proyecto asignado. Intenta nuevamente.';
            AuthService.clearAllStorages();
            return;
          }
        }
        else if (user.role === 'Admin') {
          if (isOpera) {
            window.location.href = '/admin';
          } else {
            this.$router.push('/admin');
          }
        }
      } catch (error) {
        console.error('Error de autenticación:', error);
        this.authError = 'Correo o contraseña incorrectos';
      }
    }
  }
}
</script>

<template>
  <div class="login-wrapper">
    <div class="login-container">
      <div class="form-section">
        <div class="logo-container">
          <!-- 🆕 LOGO REACTIVO -->
          <img :src="logoSrc" alt="Logo" class="logo" />
          <div class="language-switcher-container">
            <language-switcher />
          </div>
        </div>

        <div class="form-content">
          <h1>{{ $t('auth.welcomeBack') }}</h1>
          <p>{{ $t('auth.enterCredentials') }}</p>

          <!-- Cambiado de form a div para evitar comportamientos automáticos -->
          <div class="login-form">
            <div class="form-group">
              <label>{{ $t('auth.email') }}</label>
              <AppInput
                  v-model="email"
                  type="email"
                  :placeholder="$t('auth.emailPlaceholder')"
                  fullWidth
              />
              <div v-if="emailError" class="error-message">{{ emailError }}</div>
            </div>

            <div class="form-group">
              <div class="password-header">
                <label>{{ $t('auth.password') }}</label>
                <router-link to="/forgot-password" class="forgot-link">
                  {{ $t('auth.forgotPassword') }}
                </router-link>
              </div>
              <AppInput
                  v-model="password"
                  type="password"
                  :placeholder="$t('auth.passwordPlaceholder')"
                  fullWidth
              />
              <div v-if="passwordError" class="error-message">{{ passwordError }}</div>
            </div>

            <!-- Mensaje de error de autenticación -->
            <div v-if="authError" class="auth-error">
              <i class="pi pi-exclamation-triangle" style="margin-right: 8px;"></i>
              {{ authError }}
            </div>

            <div class="remember-option">
              <label class="checkbox-container">
                <input type="checkbox" v-model="rememberMe" />
                <span class="checkbox-text">{{ $t('auth.rememberMe') }}</span>
              </label>
            </div>

            <!-- Botón normal en lugar de type submit -->
            <AppButton
                :label="$t('auth.signIn')"
                variant="primary"
                fullWidth
                @click="handleLogin"
                class="login-button"
            />
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
.login-wrapper {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
}

.login-container {
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

h1 {
  font-size: 32px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #2A1905;
  text-align: left;
}

p {
  text-align: left;
  margin-bottom: 32px;
  color: #000;
  font-size: 16px;
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

input[type="email"],
input[type="password"],
.login-button {
  width: 100%;
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

.password-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.forgot-link {
  color: #FF5F01;
  text-decoration: none;
  font-size: 14px;
}

.forgot-link:hover {
  text-decoration: underline;
}

.remember-option {
  display: flex;
  margin-bottom: 32px;
}

.checkbox-container {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.checkbox-text {
  margin-left: 8px;
  font-size: 14px;
  color: #666;
}

.login-button {
  font-size: 16px !important;
  border-radius: 6px !important;
  display: flex;
  background-color: #FF5F01;
  border: none;
  font-style: normal;
  font-weight: 500 !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
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

.auth-error {
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
  .login-container {
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
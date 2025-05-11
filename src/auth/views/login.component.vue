<script>
import AppInput from '../../core/components/AppInput.vue'
import AppButton from '../../core/components/AppButton.vue'

export default {
  name: 'LoginComponent',
  components: {
    AppInput,
    AppButton
  },
  data() {
    return {
      email: '',
      password: '',
      rememberMe: false
    }
  },
  methods: {
    async login() {
      try {
        // Simulación de respuesta desde tu servicio real
        const response = {
          token: 'token_fake',
          user: {
            name: 'So',
            role: 'manager', // o 'supervisor'
            projectId: 'p001'
          }
        }

        const { token, user } = response

        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))

        if (user.role === 'manager') {
          this.$router.push(`/proyecto/${user.projectId}`)
        } else if (user.role === 'supervisor') {
          this.$router.push(`/supervisor/${user.projectId}`)
        } else {
          this.$router.push('/')
        }
      } catch (e) {
        alert('Error al iniciar sesión')
      }
    }
  }
}
</script>

<template>
  <div class="login-container">
    <div class="form-section">
      <img src="../../assets/buildtruck-logo.svg" alt="Logo" class="logo" />

      <h1>Bienvenido</h1>
      <p>Introduce tus datos para acceder a tu cuenta</p>

      <form @submit.prevent="login">
        <AppInput
            v-model="email"
            type="email"
            placeholder="Ingresa tu email"
            fullWidth
            required
        />
        <AppInput
            v-model="password"
            type="password"
            placeholder="Ingresa tu contraseña"
            fullWidth
            required
        />

        <div class="options">
          <label>
            <input type="checkbox" v-model="rememberMe" />
            Recordar durante 30 días
          </label>
          <a href="#">¿Olvidaste tu contraseña?</a>
        </div>

        <AppButton
            type="submit"
            label="Iniciar sesión"
            variant="primary"
            fullWidth
        />
      </form>
    </div>

    <div class="image-section"></div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background-color: white;
}

.form-section {
  flex: 1;
  min-width: 360px;
  max-width: 500px;
  padding: 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background-color: white;
  z-index: 2;
}

.logo {
  width: 140px;
  margin-bottom: 30px;
}

h1 {
  font-size: 2rem;
  margin-bottom: 10px;
  color: #222;
}

p {
  margin-bottom: 20px;
  color: #555;
}

form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  color: #444;
}

.options a {
  color: #FF5F01;
  text-decoration: none;
}

.options a:hover {
  text-decoration: underline;
}

.image-section {
  flex: 1.5;
  background-image: url('../../assets/contruction-image.svg');
  background-size: cover;
  background-position: center;
}
</style>

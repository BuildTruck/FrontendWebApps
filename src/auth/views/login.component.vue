<script>
import AppInput from '../../core/components/AppInput.vue'
import AppButton from '../../core/components/AppButton.vue'
import { AuthService } from '../services/auth-api.service'

// Importa los modelos
import { Manager } from '../../context/manager/models/manager.entity.js'
import { Supervisor } from '../../context/supervisor/models/supervisor.entity.js'

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
        const rawUser = await AuthService.login(this.email, this.password)

        // Convertimos en modelo según el rol
        const user = rawUser.role === 'manager'
            ? new Manager(rawUser)
            : new Supervisor(rawUser)

        // CAMBIO: Usar sessionStorage en lugar de localStorage
        sessionStorage.setItem('token', 'fake-token')
        sessionStorage.setItem('user', JSON.stringify(user.toJSON()))

        console.log('Autenticado:', user)

        // Redirección según el rol
        if (user.role === 'manager') {
          this.$router.push('/proyectos') // Mostrar listado de proyectos primero
        } else if (user.role === 'supervisor') {
          this.$router.push(`/supervisor/${user.projectId}`)
        }
      } catch (e) {
        alert('Correo o contraseña inválidos')
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
            label="Iniciar sesión"
            variant="primary"
            fullWidth
            @click="login"
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

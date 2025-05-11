<template>
  <div class="not-found">
    <h1>404</h1>
    <p>Página no encontrada</p>
    <AppButton
        label="Volver al inicio"
        icon="pi pi-home"
        variant="primary"
        @click="$router.push('/')"
    />
  </div>
</template>

<script>
import AppButton from '../core/components/AppButton.vue'

export default {
  name: 'PageNotFound',
  components: {
    AppButton
  }
}
</script>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  text-align: center;
  background-color: #f9f9f9;
  color: #333;
  padding: 20px;
}

h1 {
  font-size: 6rem;
  margin-bottom: 1rem;
  color: #FF5F01;
}

p {
  font-size: 1.5rem;
  margin-bottom: 2rem;
}
</style>

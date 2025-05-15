<template>
  <div class="error-page">
    <canvas id="noise-canvas" ref="noiseCanvas"></canvas>
    <div class="center">
      <h1>404</h1>
      <p>Error</p>
      <AppButton
          icon="pi pi-home"
          variant="primary"
          @click="$router.push('/')"
          class="home-button"
      />
    </div>
  </div>
</template>

<script>
import AppButton from '../core/components/AppButton.vue'

export default {
  name: 'PageNotFound',
  components: {
    AppButton
  },
  data() {
    return {
      animationFrameId: null
    }
  },
  mounted() {
    this.initNoiseEffect()
  },
  beforeUnmount() {
    // Limpiar el animation frame cuando el componente se destruye
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }
  },
  methods: {
    initNoiseEffect() {
      const canvas = this.$refs.noiseCanvas
      const context = canvas.getContext('2d')

      // Configurar el tamaño del canvas
      canvas.width = 256
      canvas.height = 256

      const generateNoise = () => {
        this.animationFrameId = requestAnimationFrame(generateNoise)

        const imageData = context.createImageData(canvas.width, canvas.height)
        const data = imageData.data

        for (let i = 0; i < data.length; i += 4) {
          // Generar un valor aleatorio para simular ruido de TV
          const value = Math.floor(Math.random() * 255)

          // Para un efecto naranja, ajustamos los canales RGB
          // Rojo más alto, verde medio, azul bajo
          data[i] = value;                        // R: Rojo completo
          data[i + 1] = Math.floor(value * 0.6);  // G: Verde parcial
          data[i + 2] = Math.floor(value * 0.1);  // B: Azul mínimo

          // Establecer la opacidad (alpha)
          data[i + 3] = 255
        }

        context.putImageData(imageData, 0, 0)
      }

      // Iniciar la animación
      generateNoise()
    }
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css?family=Oswald:400,700');

.error-page {
  height: 100vh;
  width: 100vw;
  margin: 0;
  padding: 0;
  background: #f57c00; /* Fondo naranja en lugar de negro */
  font-family: 'Oswald', sans-serif;
  position: relative;
  overflow: hidden;
}

.error-page::before, .error-page::after {
  content: '';
  display: block;
  position: absolute;
  left: 0;
  right: 0;
  top: -4px;
  height: 4px;
  animation: scanline 8s linear infinite;
  opacity: 0.33;
  background: linear-gradient(to bottom,
  rgba(255, 255, 255, 0),
  rgba(255, 255, 255, 0.5) 90%,
  rgba(255, 255, 255, 0));
  z-index: 2;
}

.error-page::before {
  animation-delay: 4s;
}

#noise-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.1;
}

.center {
  height: 400px;
  width: 500px;
  position: absolute;
  top: calc(50% - 200px);
  left: calc(50% - 250px);
  text-align: center;
  z-index: 2;
}

.center::after {
  content: '';
  background: transparent; /* Gradiente naranja */
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  z-index: -1;
}

h1, p {
  margin: 0;
  padding: 0;
  animation: funnytext 4s ease-in-out infinite;
}

h1 {
  font-size: 16rem;
  color: rgba(255, 255, 255, 0.3);
  filter: blur(3px);
}

p {
  font-size: 2rem;
  color: transparent;
  margin-bottom: 30px;
}

.home-button {
  margin-top: 20px;
  position: relative;
  z-index: 3;
  background-color: transparent !important; /* Botón blanco */
  color: #f57c00 !important; /* Texto naranja en el botón */
  border: transparent !important;
}

.home-button:hover {
  background-color: transparent !important;
  color: #e65100 !important;
}

@keyframes scanline {
  0% {
    top: -5px;
  }
  100% {
    top: 100%;
  }
}

@keyframes funnytext {
  0% {
    color: rgba(255, 255, 255, 0.3);
    filter: blur(3px);
  }
  30% {
    color: rgba(255, 255, 255, 0.5);
    filter: blur(1px);
  }
  65% {
    color: rgba(255, 255, 255, 0.2);
    filter: blur(5px);
  }
  100% {
    color: rgba(255, 255, 255, 0.3);
    filter: blur(3px);
  }
}
</style>
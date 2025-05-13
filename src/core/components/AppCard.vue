<script>
import AppButton from "./AppButton.vue";

export default {
  name: 'AppCard',
  components: {
    AppButton
  },
  props: {
    title: { type: String, default: '' },
    image: { type: String, default: '' },
    description: { type: String, default: '' },
    footer: {
      type: Object,
      default: () => ({
        location: '',
        supervisor: '',
        extra: ''
      })
    },
    customClass: { type: String, default: '' },
    redirectLink: { type: String, default: '' },
    variant: { type: String, default: 'project' } // 'project' o 'post'
  },
  methods: {
    handleClick() {
      if (this.redirectLink) {
        this.$router.push(this.redirectLink);
      }
    },
    close(event) {
      // Prevenir que el evento se propague al card cuando se hace clic en el botón
      if (event) {
        event.stopPropagation();
      }
      // Emitir evento o ejecutar acción al hacer clic en "Ingresar"
      this.$emit('click');
      this.handleClick();
    },
    handleImageError(event) {
      // Reemplazar con una imagen de placeholder
      event.target.src = 'https://via.placeholder.com/800x600.png?text=Imagen+No+Disponible';
    }
  }
};
</script>

<template>
  <div
      :class="['app-card', variant, customClass]"
      @click="handleClick"
  >
    <!-- VARIANTE: PROYECTO -->
    <template v-if="variant === 'project'">
      <div class="project-card">
        <img :src="image" class="card-image" v-if="image" />
        <div class="project-content">
          <h4>{{ title }}</h4>
          <p v-if="description">{{ description }}</p>

          <app-button
              label="Ingresar"
              variant="primary"
              size="large"
              @click="close($event)"
          />
        </div>
      </div>
    </template>

    <!-- VARIANTE: POST (Fotos de obra - estilo Instagram) -->
    <template v-else-if="variant === 'post'">
      <!-- Cabecera del post -->
      <div class="post-header" v-if="title">
        <h3 class="post-title">{{ title }}</h3>
      </div>

      <!-- Imagen del post -->
      <div class="post-image-container">
        <img
            :src="image"
            class="post-image"
            v-if="image"
            @error="handleImageError"
            :alt="title || 'Imagen de documentación'"
        />
      </div>

      <!-- Contenido del post -->
      <div class="post-content">
        <p class="post-description">{{ description }}</p>

        <!-- Pie del post con fecha y metadata -->
        <div class="post-footer">
          <p class="post-date" v-if="footer && footer.extra">
            <i class="pi pi-calendar"></i> {{ footer.extra }}
          </p>
          <p class="post-location" v-if="footer && footer.location">
            <i class="pi pi-map-marker"></i> {{ footer.location }}
          </p>
          <p class="post-supervisor" v-if="footer && footer.supervisor">
            <i class="pi pi-user"></i> {{ footer.supervisor }}
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* Estilos generales del card */
.app-card {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: 0.2s;
  overflow: hidden;
  margin-bottom: 20px;
}

.app-card:hover {
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

/* VARIANTE: PROJECT */
.app-card.project {
  display: block;
  width: 100%;
  border: 1px solid #eaeaea;
  cursor: pointer;
}

.project-card {
  display: flex;
  gap: 16px;
  width: 100%;
  padding: 16px;
  align-items: flex-start;
}

.project-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  justify-content: flex-start;
  align-items: flex-start;
  text-align: left;
}

.project-content h4 {
  margin: 0 0 8px;
  font-weight: 600;
  color: #333;
  font-size: 2.3rem;
  text-align: left;
  width: 100%;
}

.project-content p {
  margin: 0 0 16px;
  color: #666;
  font-size: 1.0rem;
  line-height: 1.4;
  flex-grow: 1;
  text-align: left;
  width: 100%;
}

.card-image {
  width: 260px;
  height: 220px;
  object-fit: cover;
  border-radius: 4px;
}

/* VARIANTE: POST (Estilo Instagram) */
.app-card.post {
  width: 100%;
  border: 1px solid #eaeaea;
  display: flex;
  flex-direction: column;
}

.post-header {
  padding: 12px 16px;
  border-bottom: 1px solid #f5f5f5;
}

.post-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
}

.post-image-container {
  position: relative;
  width: 100%;
  height: 240px;
  overflow: hidden;
  background-color: #f8f8f8;
}

.post-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.app-card.post:hover .post-image {
  transform: scale(1.03);
}

.post-content {
  padding: 16px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.post-description {
  font-size: 0.95rem;
  margin: 0 0 14px;
  color: #333;
  line-height: 1.5;
  flex-grow: 1;
}

.post-footer {
  margin-top: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 0.85rem;
  color: #777;
  border-top: 1px solid #f5f5f5;
  padding-top: 12px;
}

.post-date, .post-location, .post-supervisor {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 0;
}

.post-date i, .post-location i, .post-supervisor i {
  font-size: 0.9rem;
  color: #FF5F01;
}

/* Media queries para responsividad */
@media (max-width: 768px) {
  .project-card {
    flex-direction: column;
  }

  .card-image {
    width: 100%;
    height: 160px;
    margin-bottom: 12px;
  }

  .post-image-container {
    height: 200px;
  }
}
</style>
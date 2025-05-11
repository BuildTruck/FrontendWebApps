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

    <!-- VARIANTE: POST (Fotos de obra) -->
    <template v-else-if="variant === 'post'">
      <img :src="image" class="post-image" v-if="image" />
      <div class="post-content">
        <p class="post-description">{{ description }}</p>
        <p class="post-date" v-if="footer && footer.extra">{{ footer.extra }}</p>
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
  margin-bottom: 16px;
}

.app-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
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
}

.project-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  justify-content: flex-start;
  align-items: flex-start;
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

/* VARIANTE: POST */
.app-card.post {
  width: 100%;
  border: 1px solid #eaeaea;
  display: flex;
  flex-direction: column;
}

.post-image {
  width: 100%;
  height: 180px;
  object-fit: cover;
}

.post-content {
  padding: 12px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.post-description {
  font-size: 1.0rem;
  margin: 0 0 8px;
  color: #333;
  line-height: 1.4;
  flex-grow: 1;
}

.post-date {
  font-size: 0.85rem;
  text-align: right;
  margin: 0;
  color: #777;
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
}
</style>
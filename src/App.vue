<script>
import AppCard from './core/components/AppCard.vue';

export default {
  name: 'App',
  components: {
    AppCard
  },
  data() {
    return {
      projects: [
        {
          id: 1,
          title: 'Residencial Las Palmeras',
          description: 'Proyecto habitacional de 6 torres de departamentos en Lurín. Incluye supervisión de estructuras, acabados y control de materiales en tiempo real.',
          image: '/img/residencial-palmeras.jpg',
          redirectLink: '/proyecto/residencial-las-palmeras'
        },
        {
          id: 2,
          title: 'Edificio Corporativo EcoTower',
          description: 'Edificio de oficinas de 10 pisos con sistema de eficiencia energética. Seguimiento detallado de personal técnico, cronograma y gestión de insumos.',
          image: '/img/ecotower.jpg',
          redirectLink: '/proyecto/ecotower'
        },
        {
          id: 3,
          title: 'Construcción del Edificio Monteverde',
          description: 'Edificio de 12 pisos. Supervisión de avances y control de materiales.',
          image: '/img/monteverde.jpg',
          redirectLink: '/proyecto/monteverde'
        }
      ],
      documentItems: [
        {
          id: 1,
          image: '/img/escalera-fierro.jpg',
          description: 'Armado de fierro para escalera principal. Aún no se realiza el vaciado de concreto.',
          date: 'Fecha: 07/04/2023'
        },
        {
          id: 2,
          image: '/img/muro-ladrillo.jpg',
          description: 'Muro de ladrillo en pintura terminado. Se aplicó sellador.',
          date: 'Fecha: 10/04/2023'
        },
        {
          id: 3,
          image: '/img/escalera-concreto.jpg',
          description: 'Escalera principal con concreto pulido. Se terminó en primera planta.',
          date: 'Fecha: 11/04/2023'
        }
      ]
    };
  },
  methods: {
    navigateToProject(project) {
      console.log('Navegando a:', project.redirectLink);
      // this.$router.push(project.redirectLink);
    },
    viewDocumentDetail(doc) {
      console.log('Ver detalle de documento:', doc.id);
      // this.$router.push(`/obra/documento/${doc.id}`);
    }
  }
};
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <h1>BuildTruck</h1>
      <h2>Vista previa de componentes</h2>
    </header>

    <main>
      <section class="demo-section">
        <h3>Sección 1: Cards de Proyectos</h3>
        <div class="projects-container">
          <AppCard
              v-for="project in projects"
              :key="project.id"
              :title="project.title"
              :description="project.description"
              :image="project.image"
              :redirect-link="project.redirectLink"
              variant="project"
              @click="navigateToProject(project)"
          />
        </div>
      </section>

      <section class="demo-section">
        <h3>Sección 2: Cards de Documentación</h3>
        <div class="docs-container">
          <AppCard
              v-for="doc in documentItems"
              :key="doc.id"
              :image="doc.image"
              :description="doc.description"
              :footer="{ extra: doc.date }"
              variant="post"
              @click="viewDocumentDetail(doc)"
          />
        </div>
      </section>

      <!-- Ejemplo explícito de cada tipo -->
      <section class="demo-section">
        <h3>Ejemplos Específicos</h3>

        <h4>Ejemplo de Proyecto (Las Palmeras)</h4>
        <AppCard
            title="Residencial Las Palmeras"
            description="Proyecto habitacional de 6 torres de departamentos en Lurín. Incluye supervisión de estructuras, acabados y control de materiales en tiempo real."
            image="/img/residencial-palmeras.jpg"
            redirect-link="/proyecto/las-palmeras"
            variant="project"
        />

        <h4 style="margin-top: 24px;">Ejemplo de Documentación (Escalera)</h4>
        <div style="max-width: 400px;">
          <AppCard
              image="/img/escalera-fierro.jpg"
              description="Armado de fierro para escalera principal. Aún no se realiza el vaciado de concreto."
              :footer="{ extra: 'Fecha: 07/04/2023' }"
              variant="post"
          />
        </div>
      </section>
    </main>
  </div>
</template>

<style>
/* Variables globales */
:root {
  --primary-color: #FF5F01;
  --primary-color-hover: #E04E00;
  --secondary-color: #2E4058;
  --text-color: #333333;
  --bg-color: #f8f9fa;
  --border-color: #e9ecef;
}

/* Estilos globales */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Arial', sans-serif;
  background-color: var(--bg-color);
  color: var(--text-color);
}

.app-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.app-header {
  text-align: center;
  margin-bottom: 40px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
}

.app-header h1 {
  color: var(--primary-color);
  margin-bottom: 8px;
}

.app-header h2 {
  font-weight: normal;
  font-size: 1.2rem;
  color: #666;
}

.demo-section {
  margin-bottom: 40px;
}

.demo-section h3 {
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
  color: var(--secondary-color);
}

.demo-section h4 {
  margin-bottom: 16px;
  color: #444;
}

.projects-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.docs-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

/* Responsive */
@media (max-width: 768px) {
  .app-container {
    padding: 15px;
  }

  .docs-container {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }
}

@media (max-width: 480px) {
  .docs-container {
    grid-template-columns: 1fr;
  }
}
</style>
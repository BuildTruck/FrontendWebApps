<script>
export default {
  name: "documentation-manager.component",
  props: {
    projectId: {
      type: String,
      required: true
    },
    projectName: {
      type: String,
      default: 'Proyecto'
    }
  },
  data() {
    return {
      documents: [
        {
          id: 1,
          title: 'Armado de fierro para escalera principal',
          description: 'Aún no se realiza el vaciado de concreto.',
          date: '07/04/2025',
          image: '/images/docs/escalera-fierro.jpg'
        },
        {
          id: 2,
          title: 'Muro de ladrillo en primera planta terminado',
          description: 'Se verifica alineación y nivelación.',
          date: '10/04/2025',
          image: '/images/docs/muro-ladrillo.jpg'
        },
        {
          id: 3,
          title: 'Escalera principal con concreto recién vaciado',
          description: 'Se encuentra en proceso de fraguado.',
          date: '12/04/2025',
          image: '/images/docs/escalera-concreto.jpg'
        },
        {
          id: 4,
          title: 'Vista panorámica del proyecto con columnas y techos de primer piso culminados',
          description: '',
          date: '14/04/2025',
          image: '/images/docs/vista-panoramica.jpg'
        }
      ],
      loading: false
    }
  },
  methods: {
    viewDocumentDetails(docId) {
      console.log(`Ver detalles del documento ID: ${docId}`);
    },
    addNewDocument() {
      console.log('Añadir nuevo documento');
    }
  }
}
</script>

<template>
  <div class="documentation-container">
    <!-- Documentos en formato de tarjetas -->
    <div class="docs-grid">
      <div
          v-for="doc in documents"
          :key="doc.id"
          class="doc-card"
          @click="viewDocumentDetails(doc.id)"
      >
        <div class="doc-image-container">
          <img :src="doc.image" :alt="doc.title" class="doc-image" />
        </div>
        <div class="doc-content">
          <p class="doc-title">{{ doc.title }}</p>
          <p class="doc-description">{{ doc.description }}</p>
          <p class="doc-date">Fecha: {{ doc.date }}</p>
        </div>
      </div>
    </div>

    <!-- Vista panorámica a ancho completo -->

  </div>
</template>

<style scoped>
.documentation-container {
  width: 100%;
  max-width: 100%;
}

.docs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.doc-card {
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.doc-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}

.doc-image-container {
  height: 200px;
  overflow: hidden;
}

.doc-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.doc-card:hover .doc-image {
  transform: scale(1.05);
}

.doc-content {
  padding: 15px;
}

.doc-title {
  font-weight: 600;
  font-size: 1rem;
  color: #333;
  margin-bottom: 8px;
}

.doc-description {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 12px;
}

.doc-date {
  font-size: 0.8rem;
  color: #888;
  text-align: right;
}

.panoramic-view {
  width: 100%;
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  margin-top: 30px;
}

.panoramic-image {
  width: 100%;
  max-height: 400px;
  object-fit: contain;
}

.panoramic-caption {
  padding: 15px;
  color: #666;
  font-size: 0.9rem;
  text-align: center;
}

/* Estilos responsivos */
@media (max-width: 768px) {
  .docs-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }
}
</style>
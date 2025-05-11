<script>
import AppButton from "./AppButton.vue";

export default {
  name: 'AppInput',
  components: {
    AppButton
  },
  props: {
    modelValue: {
      type: [String, Number, Date, File, Object, Array],
      default: ''
    },
    label: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      default: 'text',
      validator: (value) => [
        'text', 'number', 'email', 'password', 'date',
        'tel', 'url', 'search', 'textarea', 'select', 'file', 'photo'
      ].includes(value)
    },
    required: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: ''
    },
    options: {
      type: Array,
      default: () => []
    },
    fullWidth: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue', 'change', 'input', 'focus', 'blur'],
  data() {
    return {
      photoPreviewUrl: '',
      selectedFile: null
    }
  },
  mounted() {
    // Si ya hay una imagen seleccionada, crear URL de vista previa
    if (this.type === 'photo' && this.modelValue instanceof File) {
      this.photoPreviewUrl = URL.createObjectURL(this.modelValue);
    }
  },
  methods: {
    updateValue(value) {
      this.$emit('update:modelValue', value);
    },
    handleChange(event) {
      this.$emit('change', event);
    },
    handleFocus(event) {
      this.$emit('focus', event);
    },
    handleBlur(event) {
      this.$emit('blur', event);
    },
    handleFileSelect(event) {
      // Obtener el archivo del evento según el formato del evento
      let file = null;

      if (event.files && event.files[0]) {
        // Formato de PrimeVue FileUpload
        file = event.files[0];
      } else if (event.target && event.target.files && event.target.files[0]) {
        // Formato de input nativo
        file = event.target.files[0];
      }

      if (file) {
        this.selectedFile = file;
        this.$emit('update:modelValue', file);

        // Si es una foto, crear URL de vista previa
        if (this.type === 'photo') {
          this.photoPreviewUrl = URL.createObjectURL(file);
        }
      }
    },
    triggerFileInput() {
      if (this.$refs.fileInput) {
        this.$refs.fileInput.click();
      }
    }
  }
}
</script>

<template>
  <div :class="['app-input-container', { 'full-width': fullWidth }]">
    <label v-if="label" class="app-input-label">
      {{ label }}
      <span v-if="required" class="required-mark">*</span>
    </label>

    <!-- Inputs básicos: text, number, email, password, date, tel, url, search -->
    <input
        v-if="type !== 'textarea' && type !== 'select' && type !== 'file' && type !== 'photo'"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :class="[{ 'p-invalid': error }, 'app-input']"
        :type="type"
        @input="updateValue($event.target.value)"
        @change="handleChange"
        @focus="handleFocus"
        @blur="handleBlur"
    />

    <!-- Textarea -->
    <textarea
        v-else-if="type === 'textarea'"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :class="[{ 'p-invalid': error }, 'app-textarea']"
        @input="updateValue($event.target.value)"
        @change="handleChange"
        @focus="handleFocus"
        @blur="handleBlur"
    ></textarea>

    <!-- Select/Dropdown -->
    <select
        v-else-if="type === 'select'"
        :value="modelValue"
        :disabled="disabled"
        :class="[{ 'p-invalid': error }, 'app-select']"
        @input="updateValue($event.target.value)"
        @change="handleChange"
        @focus="handleFocus"
        @blur="handleBlur"
    >
      <option value="" disabled selected>{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>

    <!-- File upload -->
    <div v-else-if="type === 'file'" class="app-file-container">
      <app-button
          label="Seleccionar archivo"
          icon="pi pi-upload"
          variant="primary"
          size="normal"
          :disabled="disabled"
          @click="triggerFileInput"
      />

      <input
          ref="fileInput"
          type="file"
          class="hidden-uploader"
          :disabled="disabled"
          @change="handleFileSelect"
      />

      <div v-if="selectedFile" class="selected-file">
        {{ selectedFile.name }}
      </div>
    </div>

    <!-- Photo upload (estilo circular) -->
    <div v-else-if="type === 'photo'" class="app-photo-upload">
      <div
          class="app-photo-circle"
          :class="{ 'has-error': error, 'has-preview': photoPreviewUrl }"
          @click="triggerFileInput"
      >
        <img v-if="photoPreviewUrl" :src="photoPreviewUrl" alt="Vista previa" class="photo-preview" />
        <i v-else class="pi pi-pencil"></i>
      </div>

      <input
          ref="fileInput"
          type="file"
          accept="image/*"
          class="hidden-uploader"
          :disabled="disabled"
          @change="handleFileSelect"
      />
    </div>

    <small v-if="error" class="p-error app-input-error">{{ error }}</small>
  </div>
</template>

<style>
.app-input-container {
  margin-bottom: 1rem;
  display: inline-block;
  position: relative;
}

.full-width {
  width: 100%;
}

.app-input-label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: #333;
  font-weight: 500;
}

.required-mark {
  color: #FF5F01;
  margin-left: 2px;
}

/* Estilo base para todos los inputs */
.app-input,
.app-textarea,
.app-select {
  width: 100%;
  color: #333;
  font-family: inherit;
  font-size: 1rem;
  padding: 0.5rem 0.75rem;
  border: 2px solid #666;
  border-radius: 4px;
  background-color: #fff;
  box-sizing: border-box;
}

.app-input:hover,
.app-textarea:hover,
.app-select:hover {
  border-color: #444;
}

.app-input:focus,
.app-textarea:focus,
.app-select:focus {
  outline: 0 none;
  border-color: #FF5F01;
  box-shadow: 0 0 0 2px rgba(255, 95, 1, 0.2);
}

.app-input::placeholder,
.app-textarea::placeholder {
  color: #999;
}

/* Estilos específicos para textarea */
.app-textarea {
  min-height: 5rem;
  resize: vertical;
}

/* Estilos específicos para dropdown/select */
.app-select {
  width: 100%;
  appearance: auto;
}

/* Estilos para el uploader de archivos */
.app-file-container {
  display: inline-block;
}

.app-file-button {
  display: inline-flex;
  align-items: center;
  background-color: #FF5F01;
  border: 1px solid #FF5F01;
  color: #FFFFFF;
  border-radius: 4px;
  font-weight: 500;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-family: inherit;
  font-size: 1rem;
}

.app-file-button:hover {
  background-color: #e55600;
  border-color: #e55600;
}

.app-file-button i {
  margin-right: 0.5rem;
}

.selected-file {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #666;
}

.hidden-uploader {
  display: none !important;
}

/* Estilos para photo upload circular */
.app-photo-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.app-photo-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: #D3D3D3;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
  position: relative;
  border: 2px solid #ccc;
}

.app-photo-circle:hover {
  background-color: #c0c0c0;
}

.app-photo-circle i {
  font-size: 1.5rem;
  color: #333;
}

.app-photo-circle.has-preview {
  border: 2px solid #FF5F01;
}

.photo-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Estilos de error */
.app-input.p-invalid,
.app-textarea.p-invalid,
.app-select.p-invalid {
  border-color: #f44336;
}

.app-input-error {
  font-size: 0.75rem;
  color: #f44336;
  margin-top: 0.25rem;
  display: block;
}

/* Estado disabled */
.app-input:disabled,
.app-textarea:disabled,
.app-select:disabled,
.app-file-button:disabled {
  opacity: 0.6;
  background-color: #f5f5f5;
  cursor: not-allowed;
}
</style>
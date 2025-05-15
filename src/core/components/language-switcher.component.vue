<script>
export default {
  name: "language-switcher",
  data() {
    return {
      languages: [
        { code: "es", name: "Español", country: "Perú" },
        { code: "en", name: "English", country: "USA" }
      ]
    }
  },
  computed: {
    currentLocale: {
      get() {
        return this.$i18n.locale;
      },
      set(value) {
        this.$i18n.locale = value;
      }
    }
  },
  methods: {
    changeLanguage(langCode) {
      this.currentLocale = langCode;
      localStorage.setItem('userLanguage', langCode);
    }
  },
  mounted() {
    const savedLanguage = localStorage.getItem('userLanguage');
    if (savedLanguage && this.languages.some(lang => lang.code === savedLanguage)) {
      this.currentLocale = savedLanguage;
    }
  }
}
</script>

<template>
  <div class="language-selector">
    <div class="flags">
      <a
          href="#"
          v-for="lang in languages"
          :key="lang.code"
          :title="lang.name"
          @click.prevent="changeLanguage(lang.code)"
      >
        <span
            :class="['flag', lang.code, { active: currentLocale === lang.code }]"
        ></span>
      </a>
    </div>
  </div>
</template>

<style scoped>
.language-selector {
  display: inline-block;
  margin: 0 15px;
}

.flags {
  font-size: 1.8em;
  line-height: 1;
  margin: 0;
  display: flex;
  gap: 10px;
}

.flag {
  box-sizing: content-box;
  display: inline-block;
  position: relative;
  width: 1em;
  height: 1em;
  margin: 0;
  background: #fff;
  border-radius: 50%;
  border: solid #eee;
  overflow: hidden;
  box-shadow: 0;
  opacity: .5;
  transition: 1s;
  cursor: pointer;
}

.flag:hover, .flag.active {
  border-radius: 50%;
  box-shadow: 0 0 .2em #666;
  opacity: 1;
  transform: rotate(-360deg);
}

/* USA (en) - Mejorada */
.en {
  background: #EEF1EF;
  position: relative;
}

.en:before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 40%;
  height: 40%;
  background: darkblue;
  z-index: 1;
}

.en:after {
  content: "";
  position: absolute;
  display: block;
  height: 7.5%;
  width: 100%;
  background: white;
  top: 20%;
  z-index: 0;
  box-shadow:
      0 0.15em 0 0 red,
      0 0.3em 0 0 red,
      0 0.45em 0 0 red,
      0 0.6em 0 0 red,
      0 0.75em 0 0 red;
}

/* Perú (es) - Corregida como rojo-blanco-rojo */
.es {
  position: relative;
  background: #EEF1EF;
}

.es:before {
  content: "";
  display: block;
  position: absolute;
  width: 33.33%;
  height: 100%;
  background: red;
  left: 0;
}

.es:after {
  content: "";
  display: block;
  position: absolute;
  width: 33.33%;
  height: 100%;
  background: red;
  right: 0;
}

/* Estado activo */
.flag.active {
  border-color: #F2AF29;
  opacity: 1;
  transform: rotate(-360deg);
  box-shadow: 0 0 0.3em #FF5F00;
}

/* Ajuste responsivo */
@media (max-width: 768px) {
  .flags {
    font-size: 1.5em;
  }
}

@media (max-width: 480px) {
  .flags {
    font-size: 1.2em;
  }
}
</style>
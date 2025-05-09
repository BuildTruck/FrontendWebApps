import {createApp} from 'vue'
import './style.css'
import App from './App.vue'
import PrimeVue from 'primevue/config'
import {Avatar, Button, Card, Drawer, Image, Menu, Menubar, SelectButton, Toolbar, Tooltip} from 'primevue'
import Aura from '@primevue/themes/aura'
import i18n from "./i18n.js";
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';

const app = createApp(App)
app
    .use(PrimeVue, { ripple: true, theme: { preset: Aura }})
    .component('pv-button', Button)
    .component('pv-card',Card)
    .component('pv-select-button', SelectButton)
    .component('pv-drawer', Drawer)
    .component('pv-avatar', Avatar)
    .component('pv-menu', Menu)
    .component('pv-menubar', Menubar)
    .component('pv-toolbar', Toolbar)
    .component('pv-tooltip', Tooltip)
    .component('pv-image', Image)
    .use(i18n)
    .mount('#app')

import { createApp } from 'vue'
import './style.css'
import './dark-mode.css'
import App from './App.vue'
import PrimeVue from 'primevue/config'

import i18n from "./i18n.js"
import router from './router'
import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx';
import { createPinia } from 'pinia'

import { AuthService } from './auth/services/auth-api.service.js'
import { useThemeStore } from './core/stores/theme.js'
import { configurationService } from './context/configuration/services/configuration-api.service.js'

// PrimeVue Styles
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';

// ... todos tus imports de componentes PrimeVue igual ...
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import InputMask from 'primevue/inputmask'
import Textarea from 'primevue/textarea'
import MultiSelect from 'primevue/multiselect'
import Checkbox from 'primevue/checkbox'
import RadioButton from 'primevue/radiobutton'
import Rating from 'primevue/rating'
import ColorPicker from 'primevue/colorpicker'
import ToggleButton from 'primevue/togglebutton'
import Slider from 'primevue/slider'
import FileUpload from 'primevue/fileupload'
import Password from 'primevue/password'
import AutoComplete from 'primevue/autocomplete'
import SelectButton from 'primevue/selectbutton'
import Button from 'primevue/button'
import SplitButton from 'primevue/splitbutton'
import SpeedDial from 'primevue/speeddial'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ColumnGroup from 'primevue/columngroup'
import Row from 'primevue/row'
import Paginator from 'primevue/paginator'
import TreeTable from 'primevue/treetable'
import Timeline from 'primevue/timeline'
import DataView from 'primevue/dataview'
import OrderList from 'primevue/orderlist'
import Tree from 'primevue/tree'
import Panel from 'primevue/panel'
import Fieldset from 'primevue/fieldset'
import Card from 'primevue/card'
import Divider from 'primevue/divider'
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import ScrollPanel from 'primevue/scrollpanel'
import TabPanel from 'primevue/tabpanel'
import Accordion from 'primevue/accordion'
import Dialog from 'primevue/dialog'
import ConfirmDialog from 'primevue/confirmdialog'
import ConfirmPopup from 'primevue/confirmpopup'
import Tooltip from 'primevue/tooltip'
import ConfirmationService from 'primevue/confirmationservice'
import ToastService from 'primevue/toastservice'
import Toast from 'primevue/toast'
import Drawer from 'primevue/drawer'
import Menu from 'primevue/menu'
import Menubar from 'primevue/menubar'
import ContextMenu from 'primevue/contextmenu'
import TieredMenu from 'primevue/tieredmenu'
import Breadcrumb from 'primevue/breadcrumb'
import Chart from 'primevue/chart'
import Image from 'primevue/image'
import Carousel from 'primevue/carousel'
import Galleria from 'primevue/galleria'
import Avatar from 'primevue/avatar'
import AvatarGroup from 'primevue/avatargroup'
import Badge from 'primevue/badge'
import Tag from 'primevue/tag'
import Chip from 'primevue/chip'
import ProgressBar from 'primevue/progressbar'
import ProgressSpinner from 'primevue/progressspinner'
import Skeleton from 'primevue/skeleton'
import Toolbar from 'primevue/toolbar'
import Inplace from 'primevue/inplace'
import ScrollTop from 'primevue/scrolltop'
import BlockUI from 'primevue/blockui'
import Terminal from 'primevue/terminal'
import Message from 'primevue/message'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(PrimeVue)
app.use(i18n)
app.use(ToastService)
app.use(ConfirmationService)
window.jsPDF = jsPDF
window.XLSX = XLSX;


app.component('pv-input-text', InputText)
app.component('pv-input-number', InputNumber)
app.component('pv-input-mask', InputMask)
app.component('pv-textarea', Textarea)
app.component('pv-multi-select', MultiSelect)
app.component('pv-checkbox', Checkbox)
app.component('pv-radio-button', RadioButton)
app.component('pv-rating', Rating)
app.component('pv-color-picker', ColorPicker)
app.component('pv-toggle-button', ToggleButton)
app.component('pv-slider', Slider)
app.component('pv-file-upload', FileUpload)
app.component('pv-password', Password)
app.component('pv-auto-complete', AutoComplete)
app.component('pv-select-button', SelectButton)
app.component('pv-button', Button)
app.component('pv-split-button', SplitButton)
app.component('pv-speed-dial', SpeedDial)
app.component('pv-data-table', DataTable)
app.component('pv-column', Column)
app.component('pv-column-group', ColumnGroup)
app.component('pv-row', Row)
app.component('pv-paginator', Paginator)
app.component('pv-tree-table', TreeTable)
app.component('pv-timeline', Timeline)
app.component('pv-data-view', DataView)
app.component('pv-order-list', OrderList)
app.component('pv-tree', Tree)
app.component('pv-panel', Panel)
app.component('pv-fieldset', Fieldset)
app.component('pv-card', Card)
app.component('pv-divider', Divider)
app.component('pv-splitter', Splitter)
app.component('pv-splitter-panel', SplitterPanel)
app.component('pv-scroll-panel', ScrollPanel)
app.component('pv-tab-panel', TabPanel)
app.component('pv-accordion', Accordion)
app.component('pv-dialog', Dialog)
app.component('pv-confirm-dialog', ConfirmDialog)
app.component('pv-confirm-popup', ConfirmPopup)
app.component('pv-toast', Toast)
app.component('pv-drawer', Drawer)
app.component('pv-menu', Menu)
app.component('pv-menubar', Menubar)
app.component('pv-context-menu', ContextMenu)
app.component('pv-tiered-menu', TieredMenu)
app.component('pv-breadcrumb', Breadcrumb)
app.component('pv-chart', Chart)
app.component('pv-image', Image)
app.component('pv-carousel', Carousel)
app.component('pv-galleria', Galleria)
app.component('pv-avatar', Avatar)
app.component('pv-avatar-group', AvatarGroup)
app.component('pv-badge', Badge)
app.component('pv-tag', Tag)
app.component('pv-chip', Chip)
app.component('pv-progress-bar', ProgressBar)
app.component('pv-progress-spinner', ProgressSpinner)
app.component('pv-skeleton', Skeleton)
app.component('pv-toolbar', Toolbar)
app.component('pv-inplace', Inplace)
app.component('pv-scroll-top', ScrollTop)
app.component('pv-block-ui', BlockUI)
app.component('pv-terminal', Terminal)
app.component('pv-message', Message)

// Directives
app.directive('tooltip', Tooltip)

if (process.env.NODE_ENV !== 'production') {
    // Almacenar las imágenes subidas en memoria
    window._uploadedImages = {};

    // Interceptar las solicitudes de imágenes
    const originalImageSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    const originalImageSrcSetter = originalImageSrcDescriptor.set;

    Object.defineProperty(HTMLImageElement.prototype, 'src', {
        set: function(url) {
            if (url && typeof url === 'string' && url.startsWith('/uploads/') && window._uploadedImages[url]) {
                originalImageSrcSetter.call(this, window._uploadedImages[url]);
            } else {
                originalImageSrcSetter.call(this, url);
            }
        },
        get: originalImageSrcDescriptor.get
    });
}

// 🆕 NUEVO: Función para inicializar datos de usuario al recargar
const initializeUserDataOnReload = async () => {
    const user = AuthService.getCurrentUser()

    // ✅ Solo ejecutar si hay usuario autenticado
    if (!user) {
        console.log('❌ No hay usuario autenticado')
        return
    }

    // ✅ Verificar si ya tiene datos completos en sessionStorage
    if (user.settings && user.settings.tutorialsCompleted) {
        console.log('✅ Usuario ya tiene datos completos en sessionStorage')

        // Solo aplicar el tema
        const themeStore = useThemeStore()
        themeStore.currentTheme = user.settings.theme || 'auto'
        themeStore.applyThemeToBody()
        return
    }

    // ✅ Cargar datos desde backend solo si no los tiene
    try {
        console.log('🔄 Cargando datos de usuario desde backend...')
        const configuration = await configurationService.loadCurrentUserSettings()

        // ✅ Actualizar sessionStorage con datos completos
        const updatedUser = {
            ...user,
            settings: configuration.toJSON() // Incluye theme + tutorials
        }
        sessionStorage.setItem('user', JSON.stringify(updatedUser))

        // ✅ Aplicar tema SIN guardar
        const themeStore = useThemeStore()
        themeStore.currentTheme = configuration.theme
        themeStore.applyThemeToBody()

        console.log('✅ Datos de usuario cargados correctamente')
        console.log('🎯 Tutoriales completados:', configuration.getTutorials())

    } catch (error) {
        console.error('❌ Error cargando datos de usuario:', error)

        // ✅ En caso de error, aplicar tema por defecto
        const themeStore = useThemeStore()
        themeStore.currentTheme = 'auto'
        themeStore.applyThemeToBody()
    }
}

// 🆕 NUEVO: Ejecutar después de montar la app
app.mount('#app')

// ✅ Esperar un poco para que todo esté listo y luego inicializar
setTimeout(() => {
    initializeUserDataOnReload()
}, 100)
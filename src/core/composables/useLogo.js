import { computed } from 'vue'
import { useThemeStore} from "../stores/theme.js";

export const useLogo = () => {
    const themeStore = useThemeStore()

    const logoSrc = computed(() => {
        return themeStore.effectiveTheme === 'dark'
            ? '/src/assets/buildtruck-logo-darktheme.svg'
            : '/src/assets/buildtruck-logo.svg'
    })

    return { logoSrc }
}
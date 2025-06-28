import { computed } from 'vue'
import { useThemeStore } from "../stores/theme.js"

import logoLight from '../../assets/buildtruck-logo.svg'
import logoDark from '../../assets/buildtruck-logo-darktheme.svg'

export const useLogo = () => {
    const themeStore = useThemeStore()

    const logoSrc = computed(() => {
        return themeStore.effectiveTheme === 'dark' ? logoDark : logoLight
    })

    return { logoSrc }
}
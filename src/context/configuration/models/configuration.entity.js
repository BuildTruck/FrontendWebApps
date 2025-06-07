// src/models/configuration.entity.js
export class Configuration {
    user_id;
    theme;
    plan;
    notifications_enable;
    email_notifications;

    constructor(data = {}) {
        this.user_id = data.user_id || '';

        // Validar tema con las 3 opciones
        const validThemes = ['light', 'dark', 'auto'];
        this.theme = validThemes.includes(data.theme) ? data.theme : 'auto';

        this.plan = data.plan || 'basic';

        // FRONTEND: Mantener como strings para AppInput
        this.notifications_enable = this.parseToString(data.notifications_enable, 'true');
        this.email_notifications = this.parseToString(data.email_notifications, 'false');
    }

    // Convertir cualquier valor a string para el frontend
    parseToString(value, defaultValue) {
        if (typeof value === 'boolean') {
            return value ? 'true' : 'false';
        }
        if (typeof value === 'string') {
            return value;
        }
        return defaultValue;
    }

    // Convertir strings a booleanos para el backend
    parseToBoolean(value) {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
            return value.toLowerCase() === 'true';
        }
        return false;
    }

    // Obtener opciones de tema para el selector
    static getThemeOptions() {
        return [
            { value: 'light', label: 'Claro', icon: 'pi pi-sun' },
            { value: 'dark', label: 'Oscuro', icon: 'pi pi-moon' },
            { value: 'auto', label: 'Automático', icon: 'pi pi-desktop' }
        ];
    }

    // Para el frontend (AppInput necesita strings)
    toJSON() {
        return {
            user_id: this.user_id,
            theme: this.theme,
            plan: this.plan,
            notifications_enable: this.notifications_enable,  // String para AppInput
            email_notifications: this.email_notifications     // String para AppInput
        };
    }

    // Para el backend (API necesita booleanos)
    toAPIFormat() {
        return {
            user_id: this.user_id,
            theme: this.theme,  // El tema se mantiene como string
            plan: this.plan,
            notifications_enable: this.parseToBoolean(this.notifications_enable),  // Boolean para API
            email_notifications: this.parseToBoolean(this.email_notifications)     // Boolean para API
        };
    }

    // Validar configuración
    isValid() {
        const validThemes = ['light', 'dark', 'auto'];
        return validThemes.includes(this.theme);
    }

    // Obtener nombre del tema para mostrar
    getThemeDisplayName() {
        const themeNames = {
            'light': 'Claro',
            'dark': 'Oscuro',
            'auto': 'Automático'
        };
        return themeNames[this.theme] || 'Automático';
    }
}
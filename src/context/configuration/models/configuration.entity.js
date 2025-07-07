export class Configuration {
    constructor(data = {}) {
        this.id = data.id || null;
        this.userId = data.userId || data.user_id || null;

        // Validar tema con las 3 opciones (backend usa Light/Dark/Auto)
        const validThemes = ['light', 'dark', 'auto'];
        this.theme = validThemes.includes(data.theme?.toLowerCase()) ? data.theme.toLowerCase() : 'auto';

        // Plan (backend usa Basic/Business/Enterprise)
        const validPlans = ['basic', 'business', 'enterprise'];
        this.plan = validPlans.includes(data.plan?.toLowerCase()) ? data.plan.toLowerCase() : 'basic';

        // FRONTEND: Mantener como strings para AppInput
        this.notifications_enable = this.parseToString(data.notificationsEnable || data.notifications_enable, 'true');
        this.email_notifications = this.parseToString(data.emailNotifications || data.email_notifications, 'false');
        // AGREGAR esta línea después de email_notifications:
        this.tutorialsCompleted = this.parseTutorialsCompleted(
            data.tutorialsCompleted || data.tutorials_completed || "{}"
        );
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

    // Para el frontend (mantener formato actual)
    toJSON() {
        return {
            id: this.id,
            userId: this.userId,
            theme: this.theme,
            plan: this.plan,
            notifications_enable: this.notifications_enable,
            email_notifications: this.email_notifications,
            tutorialsCompleted: this.tutorialsCompleted
        };
    }
    parseTutorialsCompleted(value) {
        if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value);
        }

        if (typeof value === 'string') {
            try {
                // Validar que sea JSON válido
                JSON.parse(value);
                return value;
            } catch (error) {
                console.warn('Invalid tutorials JSON, resetting:', value);
                return "{}";
            }
        }

        return "{}";
    }
    // Para enviar al backend (mapear a formato esperado)
    toAPIFormat() {
        return {
            userId: this.userId,
            theme: this.capitalizeFirst(this.theme),
            plan: this.capitalizeFirst(this.plan),
            notificationsEnable: this.notifications_enable,
            emailNotifications: this.email_notifications,
            tutorialsCompleted: this.sanitizeTutorialsForAPI()
        };
    }
    sanitizeTutorialsForAPI() {
        try {
            const tutorials = this.getTutorials();
            return JSON.stringify(tutorials);
        } catch (error) {
            console.error('Error sanitizing tutorials for API:', error);
            return "{}";
        }
    }
    // Mapear desde API al frontend
    static fromAPI(apiData) {
        return new Configuration({
            id: apiData.id,
            userId: apiData.userId,
            theme: apiData.theme?.toLowerCase(), // API devuelve Light -> light
            plan: apiData.plan?.toLowerCase(),   // API devuelve Basic -> basic
            notificationsEnable: apiData.notificationsEnables || apiData.notificationsEnable, // Typo en backend
            emailNotifications: apiData.emailNotification || apiData.emailNotifications,      // Typo en backend
            tutorialsCompleted: apiData.tutorialsCompleted || "{}"
        });
    }

    capitalizeFirst(str) {
        if (!str) return str;
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    // Obtener opciones de tema para el selector
    static getThemeOptions() {
        return [
            { value: 'light', label: 'Claro', icon: 'pi pi-sun' },
            { value: 'dark', label: 'Oscuro', icon: 'pi pi-moon' },
            { value: 'auto', label: 'Automático', icon: 'pi pi-desktop' }
        ];
    }

    // Validar configuración
    isValid() {
        const validThemes = ['light', 'dark', 'auto'];
        const validPlans = ['basic', 'business', 'enterprise'];
        return validThemes.includes(this.theme) && validPlans.includes(this.plan);
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
    getTutorials() {
        try {
            console.log('🔍 [CONFIG] Raw tutorialsCompleted:', this.tutorialsCompleted);
            const parsed = JSON.parse(this.tutorialsCompleted || "{}");
            console.log('🔍 [CONFIG] Parsed tutorials:', parsed);
            return parsed;
        } catch (error) {
            console.error('Error parsing tutorials:', error);
            return {};
        }
    }

// Verificar si un tutorial está completado
    isTutorialCompleted(tutorialId) {
        const tutorials = this.getTutorials();
        return tutorials[tutorialId] === true;
    }

// Marcar tutorial como completado
    markTutorialCompleted(tutorialId) {
        const tutorials = this.getTutorials();
        tutorials[tutorialId] = true;
        this.tutorialsCompleted = JSON.stringify(tutorials);
        console.log('🔍 [CONFIG] Tutorial marcado:', tutorialId, this.tutorialsCompleted);
    }

// Resetear tutorial específico
    resetTutorial(tutorialId) {
        const tutorials = this.getTutorials();
        tutorials[tutorialId] = false;
        this.tutorialsCompleted = JSON.stringify(tutorials);
    }

// Resetear todos los tutoriales
    resetAllTutorials() {
        this.tutorialsCompleted = "{}";
    }

// Obtener lista de tutoriales completados
    getCompletedTutorials() {
        const tutorials = this.getTutorials();
        return Object.keys(tutorials).filter(key => tutorials[key] === true);
    }
}
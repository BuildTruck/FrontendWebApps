// auth-api.service.js
import http from '../../core/services/http.service'

export const AuthService = {
    async login(email, password) {
        const res = await http.get(`/users?email=${email}&password=${password}`)
        if (res.data.length === 0) {
            throw new Error('Credenciales inválidas')
        }

        // Activar el auto-logout (para pruebas: 10 segundos)
        this.setupAutoLogout(1/6);

        return res.data[0] // El usuario encontrado
    },

    /**
     * Configura un temporizador para cerrar la sesión automáticamente
     * @param {number} timeoutMinutes - Tiempo en minutos antes de cerrar sesión
     */
    setupAutoLogout(timeoutMinutes = 60) {
        // Eliminar cualquier temporizador existente
        if (window.autoLogoutTimer) {
            clearTimeout(window.autoLogoutTimer);
        }

        // Convertir minutos a milisegundos
        const timeoutMs = timeoutMinutes * 60 * 1000;

        console.log(`Auto-logout configurado para activarse en ${timeoutMinutes} minutos (${timeoutMs} ms)`);

        // Establecer el temporizador
        window.autoLogoutTimer = setTimeout(() => {
            console.log(`Sesión cerrada automáticamente después de ${timeoutMinutes} minutos`);
            this.logout();
        }, timeoutMs);

        // Función para reiniciar el temporizador
        const resetTimer = () => {
            this.setupAutoLogout(timeoutMinutes);
        };

        // Guardar referencia global para poder limpiar después
        window.resetTimerFunction = resetTimer;

        // Eliminar event listeners anteriores (para evitar duplicados)
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.removeEventListener(event, window.resetTimerFunction);
        });

        // Añadir event listeners
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, window.resetTimerFunction, { passive: true });
        });
    },

    /**
     * Cierra la sesión del usuario
     */
    logout() {
        console.log('Ejecutando logout...');

        // Limpiar datos de sesión - CAMBIO: Usar sessionStorage en lugar de localStorage
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');

        // Limpiar temporizador si existe
        if (window.autoLogoutTimer) {
            clearTimeout(window.autoLogoutTimer);
        }

        // Limpiar event listeners si existen
        if (window.resetTimerFunction) {
            ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
                document.removeEventListener(event, window.resetTimerFunction);
            });
        }

        // Para pruebas, mostrar alerta antes de redirigir
        alert('Tu sesión ha expirado. Serás redirigido a la página de login.');

        // Redirección (usando window.location para asegurar que funcione)
        window.location.href = '/login';
    },

    /**
     * Verifica si el usuario está autenticado
     * @returns {boolean} - True si está autenticado
     */
    isAuthenticated() {
        return sessionStorage.getItem('token') !== null;
    },

    /**
     * Obtiene los datos del usuario actual
     * @returns {Object|null} - Datos del usuario o null si no está autenticado
     */
    getCurrentUser() {
        const userData = sessionStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    }
}
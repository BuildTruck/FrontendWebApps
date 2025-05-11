import http from '../../core/services/http.service'

export const AuthService = {
    async login(email, password) {
        const res = await http.get(`/users?email=${email}&password=${password}`)
        if (res.data.length === 0) {
            throw new Error('Credenciales inválidas')
        }
        return res.data[0] // El usuario encontrado
    }
}
export class User {
    constructor({
                    id,
                    email,
                    password,
                    personalEmail = null,
                    name,
                    lastName,
                    phone = null,
                    role,
                    photo = null,
                    createdAt = null
                }) {
        this.id = id
        this.email = email
        this.password = password
        this.personalEmail = personalEmail
        this.name = name
        this.lastName = lastName
        this.phone = phone
        this.role = role
        this.photo = photo
        this.createdAt = createdAt
    }

    get initials() {
        const nameInitial = this.name ? this.name[0] : ''
        const lastNameInitial = this.lastName ? this.lastName[0] : ''
        return (nameInitial + lastNameInitial).toUpperCase()
    }

    get fullName() {
        return `${this.name} ${this.lastName}`.trim()
    }

    toJSON() {
        return {
            id: this.id,
            email: this.email,
            password: this.password,
            personalEmail: this.personalEmail,
            name: this.name,
            lastName: this.lastName,
            phone: this.phone,
            role: this.role,
            photo: this.photo,
            createdAt: this.createdAt
        }
    }
}
import { User} from "../../models/user.entity.js";

export class Admin extends User {
    constructor(data) {
        super(data)
        this.lastLogin = data.lastLogin || null
        this.permissions = data.permissions || []
    }

    toJSON() {
        return {
            ...super.toJSON(),
            lastLogin: this.lastLogin,
            permissions: this.permissions
        }
    }
}
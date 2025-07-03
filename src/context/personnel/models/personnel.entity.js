export class Personnel {
    constructor(data = {}) {
        // Basic fields
        this.id = data.id || null;
        this.projectId = data.projectId || null;
        this.name = data.name || '';
        this.lastname = data.lastname || '';
        this.documentNumber = data.documentNumber || '';
        this.position = data.position || '';
        this.department = data.department || '';
        this.personnelType = data.personnelType || null;

        // Financial fields
        this.monthlyAmount = data.monthlyAmount || 0;
        this.totalAmount = data.totalAmount || 0;
        this.discount = data.discount || 0;
        this.bank = data.bank || '';
        this.accountNumber = data.accountNumber || '';

        // Contract and date fields
        this.startDate = data.startDate || null;
        this.endDate = data.endDate || null;
        this.status = data.status || null;

        // Monthly attendance fields (calculated)
        this.workedDays = data.workedDays || 0;
        this.compensatoryDays = data.compensatoryDays || 0;
        this.unpaidLeave = data.unpaidLeave || 0;
        this.absences = data.absences || 0;
        this.sundays = data.sundays || 0;
        this.totalDays = data.totalDays || 0;

        // Monthly attendance as string by month
        this.monthlyAttendance = data.monthlyAttendance || {};

        // Contact fields
        this.phone = data.phone || '';
        this.email = data.email || '';

        // Image fields - manejar tanto avatar como avatarUrl
        this.avatar = data.avatar || data.avatarUrl || null;
        this.avatarUrl = data.avatarUrl || data.avatar || null;

        // Image handling fields (para formulario)
        this.imageFile = data.imageFile || null;
        this.removeImage = data.removeImage || false;

        // Audit fields
        this.createdAt = data.createdAt ? new Date(data.createdAt) : this.getCurrentPeruDate();
        this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : this.getCurrentPeruDate();

        // Migrate old dailyAttendance if exists
        if (data.dailyAttendance && Object.keys(data.dailyAttendance).length > 0) {
            this.migrateFromDailyAttendance(data.dailyAttendance);
        }
    }

    validate() {
        const errors = [];

        if (!this.projectId) {
            errors.push('Project is required');
        }

        if (!this.name || this.name.trim().length < 2) {
            errors.push('Name must have at least 2 characters');
        }

        if (!this.lastname || this.lastname.trim().length < 2) {
            errors.push('Last name must have at least 2 characters');
        }

        if (!this.documentNumber || this.documentNumber.trim().length === 0) {
            errors.push('Document number is required');
        }

        if (!this.position || this.position.trim() === '') {
            errors.push('Position is required');
        }

        if (!this.department || this.department.trim() === '') {
            errors.push('Department is required');
        }

        if (!this.personnelType) {
            errors.push('Personnel type is required');
        }

        if (!this.status) {
            errors.push('Status is required');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    toJSON() {
        return {
            id: this.id,
            projectId: this.projectId,
            name: this.name ? this.name.trim() : '',
            lastname: this.lastname ? this.lastname.trim() : '',
            documentNumber: this.documentNumber ? this.documentNumber.trim() : '',
            position: this.position ? this.position.trim() : '',
            department: this.department ? this.department.trim() : '',
            personnelType: this.personnelType,
            monthlyAmount: this.monthlyAmount ? parseFloat(this.monthlyAmount) : 0,
            totalAmount: this.totalAmount ? parseFloat(this.totalAmount) : 0,
            discount: this.discount ? parseFloat(this.discount) : 0,
            bank: this.bank ? this.bank.trim() : '',
            accountNumber: this.accountNumber ? this.accountNumber.trim() : '',
            startDate: this.formatDateForAPI(this.startDate),
            endDate: this.formatDateForAPI(this.endDate),
            status: this.status,
            workedDays: parseInt(this.workedDays) || 0,
            compensatoryDays: parseInt(this.compensatoryDays) || 0,
            unpaidLeave: parseInt(this.unpaidLeave) || 0,
            absences: parseInt(this.absences) || 0,
            sundays: parseInt(this.sundays) || 0,
            totalDays: parseInt(this.totalDays) || 0,
            monthlyAttendance: this.monthlyAttendance || {},
            phone: this.phone ? this.phone.trim() : '',
            email: this.email ? this.email.trim() : '',
            avatarUrl: this.avatarUrl || this.avatar || null,
            avatar: this.avatarUrl || this.avatar || null,

            // Image handling fields (for form submission)
            imageFile: this.imageFile || null,
            removeImage: this.removeImage || false,

            createdAt: this.createdAt,
            updatedAt: this.getCurrentPeruDate()
        };
    }

    toCreateJson() {
        const data = this.toJSON();
        const now = this.getCurrentPeruDate();
        data.createdAt = now;
        data.updatedAt = now;
        return data;
    }

    toUpdateJson() {
        const data = this.toJSON();
        data.updatedAt = this.getCurrentPeruDate();
        return data;
    }

    static fromAPI(apiData) {
        // 🆕 PRIORITIZAR monthlyAttendanceData del backend
        let monthlyAttendance = apiData.monthlyAttendanceData || apiData.monthlyAttendance || {};

        // Si está vacío pero hay totales, generar un monthlyAttendance básico
        if (Object.keys(monthlyAttendance).length === 0 &&
            (apiData.workedDays > 0 || apiData.compensatoryDays > 0 || apiData.absences > 0 || apiData.sundays > 0)) {

            // Crear estructura básica vacía para el mes actual
            const currentDate = new Date();
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
            const daysInMonth = new Date(year, month, 0).getDate();

            // Crear array vacío con el número correcto de días
            const emptyAttendance = new Array(daysInMonth).fill('');
            monthlyAttendance[monthKey] = emptyAttendance.join('|');
        }

        return new Personnel({
            id: apiData.id,
            projectId: apiData.projectId || apiData.project_id,
            name: apiData.name || apiData.nombre || '',
            lastname: apiData.lastname || apiData.apellido || '',
            documentNumber: apiData.documentNumber || apiData.dni || '',
            position: apiData.position || apiData.cargo || apiData.role || '',
            department: apiData.department || apiData.area || '',
            personnelType: apiData.personnelType || apiData.tipoPersonal || null,
            monthlyAmount: parseFloat(apiData.monthlyAmount || apiData.montoMensual || 0),
            totalAmount: parseFloat(apiData.totalAmount || apiData.montoTotal || 0),
            discount: parseFloat(apiData.discount || apiData.descuento || 0),
            bank: apiData.bank || apiData.banco || '',
            accountNumber: apiData.accountNumber || apiData.numeroCuenta || '',
            startDate: Personnel.parseAPIDate(apiData.startDate || apiData.fechaIngreso),
            endDate: Personnel.parseAPIDate(apiData.endDate || apiData.fechaFin),
            status: apiData.status || apiData.estado || null,
            workedDays: parseInt(apiData.workedDays || apiData.diasLaborados || 0),
            compensatoryDays: parseInt(apiData.compensatoryDays || apiData.diasCompensatorios || 0),
            unpaidLeave: parseInt(apiData.unpaidLeave || apiData.permisoConDescuento || 0),
            absences: parseInt(apiData.absences || apiData.faltas || 0),
            sundays: parseInt(apiData.sundays || apiData.domingos || 0),
            totalDays: parseInt(apiData.totalDays || apiData.totalDias || 0),

            // 🆕 USAR monthlyAttendanceData del backend
            monthlyAttendance: monthlyAttendance,

            phone: apiData.phone || apiData.telefono || '',
            email: apiData.email || apiData.correo || '',
            avatar: apiData.avatarUrl || apiData.avatar || apiData.profileImage || null,
            avatarUrl: apiData.avatarUrl || apiData.avatar || apiData.profileImage || null,
            createdAt: Personnel.parseAPIDate(apiData.createdAt),
            updatedAt: Personnel.parseAPIDate(apiData.updatedAt),
            dailyAttendance: apiData.dailyAttendance || apiData.asistenciaDiaria || null
        });
    }

    static fromJsonArray(jsonArray) {
        if (!Array.isArray(jsonArray)) {
            return [];
        }
        return jsonArray.map(item => Personnel.fromAPI(item));
    }

    static filterByProject(personnelArray, projectId) {
        if (!projectId || !Array.isArray(personnelArray)) {
            return [];
        }

        return personnelArray.filter(person => {
            const personProjectId = person.projectId || person.project_id;
            return personProjectId && personProjectId.toString() === projectId.toString();
        });
    }

    clone() {
        return new Personnel({
            id: this.id,
            projectId: this.projectId,
            name: this.name,
            lastname: this.lastname,
            documentNumber: this.documentNumber,
            position: this.position,
            department: this.department,
            personnelType: this.personnelType,
            monthlyAmount: this.monthlyAmount,
            totalAmount: this.totalAmount,
            discount: this.discount,
            bank: this.bank,
            accountNumber: this.accountNumber,
            startDate: this.startDate,
            endDate: this.endDate,
            status: this.status,
            workedDays: this.workedDays,
            compensatoryDays: this.compensatoryDays,
            unpaidLeave: this.unpaidLeave,
            absences: this.absences,
            sundays: this.sundays,
            totalDays: this.totalDays,
            monthlyAttendance: { ...this.monthlyAttendance },
            phone: this.phone,
            email: this.email,
            avatar: this.avatar,
            avatarUrl: this.avatarUrl,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        });
    }

    // Image methods
    getAvatarUrl() {
        return this.avatarUrl || this.avatar || null;
    }

    hasAvatar() {
        return !!(this.avatarUrl || this.avatar);
    }

    // Date methods
    getCurrentPeruDate() {
        return new Date(new Date().toLocaleString("en-US", {timeZone: "America/Lima"}));
    }

    static getCurrentPeruDate() {
        return new Date(new Date().toLocaleString("en-US", {timeZone: "America/Lima"}));
    }

    static parseAPIDate(dateValue) {
        if (!dateValue) return null;

        try {
            const date = new Date(dateValue);
            return !isNaN(date.getTime()) ? date : null;
        } catch (error) {
            return null;
        }
    }

    formatDateForAPI(date) {
        if (!date) return null;

        try {
            if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                return date;
            }

            if (date instanceof Date) {
                return date.toISOString().split('T')[0];
            }

            const parsedDate = new Date(date);
            if (!isNaN(parsedDate.getTime())) {
                return parsedDate.toISOString().split('T')[0];
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    belongsToProject(projectId) {
        if (!projectId || !this.projectId) return false;
        return this.projectId.toString() === projectId.toString();
    }

    // MONTHLY ATTENDANCE METHODS - FIXED VERSION

    /**
     * Get month key in YYYY-MM format
     */
    static getMonthKey(year, month) {
        const monthStr = month.toString().padStart(2, '0');
        return `${year}-${monthStr}`;
    }

    /**
     * Get days in month
     */
    static getDaysInMonth(year, month) {
        return new Date(year, month, 0).getDate();
    }

    /**
     * Initialize attendance string for a month with separators
     */
    initializeMonthAttendance(year, month) {
        const monthKey = Personnel.getMonthKey(year, month);
        const daysInMonth = Personnel.getDaysInMonth(year, month);

        if (!this.monthlyAttendance[monthKey]) {
            // Initialize with pipe-separated values for each day
            const attendanceArray = [];

            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month - 1, day);
                const dayOfWeek = date.getDay();

                // NO marcar domingos automáticamente aquí - dejar vacío
                attendanceArray.push('');
            }

            // Join with pipe separator: "X|F|P||DD|X|..."
            this.monthlyAttendance[monthKey] = attendanceArray.join('|');
        }

        return this.monthlyAttendance[monthKey];
    }

    /**
     * Set attendance for a specific day
     */
    setDayAttendance(year, month, day, status) {
        const monthKey = Personnel.getMonthKey(year, month);
        const daysInMonth = Personnel.getDaysInMonth(year, month);

        if (day < 1 || day > daysInMonth) {
            throw new Error(`Invalid day: ${day} for month ${month}/${year}`);
        }

        // Initialize month if not exists
        this.initializeMonthAttendance(year, month);

        // Convert string to array, modify, and convert back
        let attendanceArray = this.monthlyAttendance[monthKey].split('|');

        // Ensure array has correct length
        while (attendanceArray.length < daysInMonth) {
            attendanceArray.push('');
        }

        // Set the status for the specific day (day-1 because array is 0-indexed)
        attendanceArray[day - 1] = status || '';

        // Convert back to string
        this.monthlyAttendance[monthKey] = attendanceArray.join('|');

        // Recalculate monthly totals
        this.calculateMonthlyTotals(year, month);
    }

    /**
     * Get attendance for a specific day
     */
    getDayAttendance(year, month, day) {
        const monthKey = Personnel.getMonthKey(year, month);
        const attendanceString = this.monthlyAttendance[monthKey];

        if (!attendanceString || day < 1) {
            // Si es domingo y no hay dato, retornar DD automáticamente
            const date = new Date(year, month - 1, day);
            const dayOfWeek = date.getDay();
            if (dayOfWeek === 0) {
                return 'DD';
            }
            return '';
        }

        const attendanceArray = attendanceString.split('|');
        const status = attendanceArray[day - 1] || '';

        // Si está vacío y es domingo, retornar DD automáticamente
        if (!status) {
            const date = new Date(year, month - 1, day);
            const dayOfWeek = date.getDay();
            if (dayOfWeek === 0) {
                return 'DD';
            }
        }

        return status;
    }

    /**
     * Calculate monthly totals from attendance string
     */
    calculateMonthlyTotals(year, month) {
        const monthKey = Personnel.getMonthKey(year, month);
        const attendanceString = this.monthlyAttendance[monthKey] || '';
        const daysInMonth = Personnel.getDaysInMonth(year, month);

        // Reset counters
        this.workedDays = 0;
        this.compensatoryDays = 0;
        this.unpaidLeave = 0;
        this.absences = 0;
        this.sundays = 0;

        // Split by pipe and count each status
        const attendanceArray = attendanceString.split('|');

        for (let day = 1; day <= daysInMonth; day++) {
            const status = attendanceArray[day - 1] || '';

            // Si está vacío, verificar si es domingo
            if (!status) {
                const date = new Date(year, month - 1, day);
                const dayOfWeek = date.getDay();
                if (dayOfWeek === 0) {
                    this.sundays++;
                }
            } else {
                // Contar según el estado
                switch (status) {
                    case 'X':
                        this.workedDays++;
                        break;
                    case 'P':
                        this.compensatoryDays++;
                        break;
                    case 'PD':
                        this.unpaidLeave++;
                        break;
                    case 'F':
                        this.absences++;
                        break;
                    case 'DD':
                        this.sundays++;
                        break;
                }
            }
        }

        this.calculateTotalDays();
        this.calculateTotalAmount();

        return {
            workedDays: this.workedDays,
            compensatoryDays: this.compensatoryDays,
            unpaidLeave: this.unpaidLeave,
            absences: this.absences,
            sundays: this.sundays,
            totalDays: this.totalDays,
            totalAmount: this.totalAmount
        };
    }

    /**
     * Migrate from old string format (without separators) to new format
     */
    migrateAttendanceFormat(year, month) {
        const monthKey = Personnel.getMonthKey(year, month);
        const attendanceString = this.monthlyAttendance[monthKey];

        if (!attendanceString) return;

        // Check if already in new format (has pipes)
        if (attendanceString.includes('|')) return;

        // Convert old format to new format
        const daysInMonth = Personnel.getDaysInMonth(year, month);
        const attendanceArray = [];

        let i = 0;
        let charIndex = 0;

        while (i < daysInMonth && charIndex < attendanceString.length) {
            const char = attendanceString[charIndex];

            // Check for multi-character statuses
            if (char === 'D' && charIndex + 1 < attendanceString.length && attendanceString[charIndex + 1] === 'D') {
                attendanceArray.push('DD');
                charIndex += 2;
            } else if (char === 'P' && charIndex + 1 < attendanceString.length && attendanceString[charIndex + 1] === 'D') {
                attendanceArray.push('PD');
                charIndex += 2;
            } else if (char && char !== ' ') {
                attendanceArray.push(char);
                charIndex += 1;
            } else {
                attendanceArray.push('');
                charIndex += 1;
            }

            i++;
        }

        // Fill remaining days
        while (attendanceArray.length < daysInMonth) {
            attendanceArray.push('');
        }

        // Save in new format
        this.monthlyAttendance[monthKey] = attendanceArray.join('|');
    }

    /**
     * Migrate from old dailyAttendance format
     */
    migrateFromDailyAttendance(dailyAttendance) {
        if (!dailyAttendance || typeof dailyAttendance !== 'object') {
            return;
        }

        Object.keys(dailyAttendance).forEach(dateStr => {
            try {
                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) {
                    const year = date.getFullYear();
                    const month = date.getMonth() + 1;
                    const day = date.getDate();
                    const status = dailyAttendance[dateStr];

                    // Migrate old format first
                    this.migrateAttendanceFormat(year, month);
                    this.setDayAttendance(year, month, day, status);
                }
            } catch (error) {
                console.error('Error migrating date:', dateStr, error);
            }
        });
    }

    calculateTotalAmount() {
        if (!this.monthlyAmount) return 0;

        const paidDays = this.workedDays + this.compensatoryDays;
        const discountedDays = this.absences + this.unpaidLeave;

        const dailyRate = this.monthlyAmount / 30;
        this.totalAmount = (dailyRate * paidDays) - (dailyRate * discountedDays) - this.discount;

        this.totalAmount = Math.max(this.totalAmount, 0);
        return this.totalAmount;
    }

    calculateTotalDays() {
        this.totalDays = this.workedDays + this.compensatoryDays + this.unpaidLeave + this.absences + this.sundays;
        return this.totalDays;
    }

    static generateMonthDays(year, month) {
        const daysInMonth = new Date(year, month, 0).getDate();
        const days = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            const dateString = date.toISOString().split('T')[0];
            const dayOfWeek = date.getDay();

            days.push({
                day: day,
                date: dateString,
                dayOfWeek: dayOfWeek,
                isSunday: dayOfWeek === 0,
                dayName: ['D', 'L', 'M', 'M', 'J', 'V', 'S'][dayOfWeek] // Español: Domingo, Lunes, Martes, Miércoles, Jueves, Viernes, Sábado
            });
        }

        return days;
    }

    // Static constants
    static get PERSONNEL_TYPES() {
        return [
            { value: 'TECHNICAL', label: 'Technical' },
            { value: 'SPECIALIST', label: 'Specialist' },
            { value: 'ADMINISTRATIVE', label: 'Administrative' },
            { value: 'RENTED_OPERATOR', label: 'Rented Machine Operator' },
            { value: 'LABORER', label: 'Laborer' }
        ];
    }

    static get STATUSES() {
        return [
            { value: 'ACTIVE', label: 'Active' },
            { value: 'INACTIVE', label: 'Inactive' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'SUSPENDED', label: 'Suspended' },
            { value: 'FINISHED', label: 'Finished' }
        ];
    }

    static get BANKS() {
        return [
            { value: 'BCP', label: 'Banco de Crédito del Perú' },
            { value: 'BBVA', label: 'BBVA Continental' },
            { value: 'SCOTIABANK', label: 'Scotiabank Perú' },
            { value: 'INTERBANK', label: 'Interbank' },
            { value: 'BIF', label: 'Banco Interamericano de Finanzas' },
            { value: 'PICHINCHA', label: 'Banco Pichincha' },
            { value: 'NACION', label: 'Banco de la Nación' },
            { value: 'FALABELLA', label: 'Banco Falabella' },
            { value: 'RIPLEY', label: 'Banco Ripley' },
            { value: 'SANTANDER', label: 'Banco Santander' },
            { value: 'CITIBANK', label: 'Citibank' },
            { value: 'OTHER', label: 'Other' }
        ];
    }

    static get ATTENDANCE_STATUSES() {
        return [
            { value: 'X', label: 'Worked', color: '#22c55e', description: 'Normal work day' },
            { value: 'F', label: 'Absence', color: '#ef4444', description: 'Day of absence' },
            { value: 'P', label: 'Leave', color: '#3b82f6', description: 'Compensatory leave' },
            { value: 'DD', label: 'Sunday', color: '#6b7280', description: 'Sunday' },
            { value: 'PD', label: 'Unpaid Leave', color: '#f97316', description: 'Leave with discount' }
        ];
    }

    getStatusColor() {
        if (!this.status) return 'info';

        switch (this.status.toLowerCase()) {
            case 'active':
                return 'success';
            case 'inactive':
            case 'suspended':
                return 'danger';
            case 'pending':
                return 'warning';
            case 'finished':
                return 'info';
            default:
                return 'info';
        }
    }

    isActive() {
        return this.status && this.status.toLowerCase() === 'active';
    }

    getDisplayName() {
        return `${this.name} ${this.lastname}`.trim();
    }

    getInitials() {
        const nameInitial = this.name ? this.name.charAt(0) : '';
        const lastnameInitial = this.lastname ? this.lastname.charAt(0) : '';
        return `${nameInitial}${lastnameInitial}`.toUpperCase();
    }

    getPersonnelTypeLabel() {
        const type = this.PERSONNEL_TYPES.find(t => t.value === this.personnelType);
        return type ? type.label : this.personnelType;
    }

    getBankLabel() {
        const bank = this.BANKS.find(b => b.value === this.bank);
        return bank ? bank.label : this.bank;
    }

    // Instance property getters
    get PERSONNEL_TYPES() {
        return Personnel.PERSONNEL_TYPES;
    }

    get STATUSES() {
        return Personnel.STATUSES;
    }

    get BANKS() {
        return Personnel.BANKS;
    }

    get ATTENDANCE_STATUSES() {
        return Personnel.ATTENDANCE_STATUSES;
    }

    getAttendanceStatusInfo(status) {
        return this.ATTENDANCE_STATUSES.find(s => s.value === status);
    }
}
import { BaseService } from "../../../core/services/base.service.js";
import { Personnel } from '../models/personnel.entity.js';
import http from "../../../core/services/http.service.js";

export class PersonnelApiService extends BaseService {
    constructor() {
        super('/personnel');
    }

    // Basic CRUD methods
    async getAll(params = {}) {
        try {
            const response = await super.getAll(params);
            return Personnel.fromJsonArray(response.data || []);
        } catch (error) {
            console.error('Error fetching personnel:', error);
            return [];
        }
    }

    async getById(id) {
        try {
            const response = await super.getById(id);
            return Personnel.fromAPI(response.data);
        } catch (error) {
            console.error(`Error fetching employee ${id}:`, error);
            throw error;
        }
    }

    async getByProject(projectId, includeAttendance = false, year = null, month = null) {
        if (!projectId) return [];

        try {
            const params = { projectId };

            if (includeAttendance && year && month) {
                params.year = year;
                params.month = month;
                params.includeAttendance = true;
            }

            const response = await super.getAll(params);
            return Personnel.fromJsonArray(response.data || []);
        } catch (error) {
            console.error(`Error getting personnel for project ${projectId}:`, error);
            return [];
        }
    }

    async getCurrentProjectId() {
        try {
            const route = window.$router?.currentRoute?.value;
            if (route?.params?.projectId) return route.params.projectId;

            const pathMatch = window.location.pathname.match(/\/proyecto\/(\d+)|\/supervisor\/(\d+)/);
            if (pathMatch) return pathMatch[1] || pathMatch[2];

            return localStorage.getItem('currentProjectId');
        } catch (error) {
            console.error('Error getting projectId:', error);
            return null;
        }
    }

    async create(personnelData) {
        try {
            let personnel = personnelData instanceof Personnel ? personnelData : new Personnel(personnelData);

            if (!personnel.projectId) {
                const currentProjectId = await this.getCurrentProjectId();
                if (!currentProjectId) throw new Error('Could not determine current project');
                personnel.projectId = currentProjectId;
            }

            const validation = personnel.validate();
            if (!validation.isValid) {
                throw new Error(`Invalid data: ${validation.errors.join(', ')}`);
            }

            const formData = this.createFormData(personnel);

            // Usar http directamente como UserService
            const response = await http.post('/personnel', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            return Personnel.fromAPI(response.data);
        } catch (error) {
            console.error('Error creating personnel:', error);
            throw error;
        }
    }

    async update(id, personnelData) {
        try {
            console.log('🔄 UPDATE - ID:', id);
            console.log('🔄 UPDATE - Data:', personnelData);

            let personnel = personnelData instanceof Personnel ? personnelData : new Personnel(personnelData);

            const validation = personnel.validate();
            if (!validation.isValid) {
                console.error('❌ Validation failed:', validation.errors);
                throw new Error(`Invalid data: ${validation.errors.join(', ')}`);
            }

            const formData = this.createFormData(personnel, true);

            console.log('📋 UPDATE FormData contents:');
            for (let [key, value] of formData.entries()) {
                console.log(`  ${key}: ${value}`);
            }

            // Usar http directamente como UserService
            const response = await http.put(`/personnel/${id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            return Personnel.fromAPI(response.data);
        } catch (error) {
            console.error('❌ UPDATE Error details:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });
            throw error;
        }
    }

    createFormData(personnel, isUpdate = false) {

        const formData = new FormData();

        // Required fields for creation only
        if (!isUpdate) {
            formData.append('ProjectId', personnel.projectId);
            formData.append('DocumentNumber', personnel.documentNumber);
        }

        // Always required fields
        formData.append('Name', personnel.name);
        formData.append('Lastname', personnel.lastname);
        formData.append('Position', personnel.position);
        formData.append('Department', personnel.department);
        formData.append('PersonnelType', personnel.personnelType);
        formData.append('Status', personnel.status);
        if (personnel.monthlyAmount !== null && personnel.monthlyAmount !== undefined && personnel.monthlyAmount !== '') {
            formData.append('MonthlyAmount', personnel.monthlyAmount);
        }
        if (personnel.discount !== null && personnel.discount !== undefined && personnel.discount !== '') {
            formData.append('Discount', personnel.discount);
        }
        if (personnel.bank && personnel.bank.trim()) {
            formData.append('Bank', personnel.bank);
        }
        if (personnel.accountNumber && personnel.accountNumber.trim()) {
            formData.append('AccountNumber', personnel.accountNumber);
        }
        if (personnel.startDate) {
            const startDate = this.formatDateForAPI(personnel.startDate);
            if (startDate) {
                formData.append('StartDate', startDate);
            }
        }
        if (personnel.endDate) {
            const endDate = this.formatDateForAPI(personnel.endDate);
            if (endDate) {
                formData.append('EndDate', endDate);
            }
        }
        if (personnel.phone && personnel.phone.trim()) {
            formData.append('Phone', personnel.phone);
        }
        if (personnel.email && personnel.email.trim()) {
            formData.append('Email', personnel.email);
        }
        if (isUpdate) {
            // Handle image file if provided
            if (personnel.imageFile && personnel.imageFile instanceof File) {
                formData.append('ImageFile', personnel.imageFile);
                console.log('📸 Adding image file:', personnel.imageFile.name);
            }
            if (personnel.removeImage === true) {
                formData.append('RemoveImage', 'true');
                console.log('🗑️ Marking image for removal');
            } else {
                formData.append('RemoveImage', 'false');
            }
        } else {
            if (personnel.imageFile && personnel.imageFile instanceof File) {
                formData.append('ImageFile', personnel.imageFile);
                console.log('📸 Adding image file for creation:', personnel.imageFile.name);
            }
        }

        return formData;
    }


    formatDateForAPI(date) {
        if (!date) return null;

        try {
            // If it's already a string in the correct format, return it
            if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
                return date;
            }

            // If it's a simple date string (YYYY-MM-DD), convert to datetime
            if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                return `${date}T00:00:00Z`;
            }

            // If it's a Date object, convert to ISO string
            if (date instanceof Date) {
                return date.toISOString();
            }

            // Try to parse as Date
            const parsedDate = new Date(date);
            if (!isNaN(parsedDate.getTime())) {
                return parsedDate.toISOString();
            }

            return null;
        } catch (error) {
            console.error('Error formatting date:', error);
            return null;
        }
    }

    async delete(id) {
        try {
            await super.delete(id);
            return true;
        } catch (error) {
            console.error(`Error deleting personnel ${id}:`, error);
            throw error;
        }
    }

    async deleteMultiple(ids) {
        try {
            const deletePromises = ids.map(id => this.delete(id));
            await Promise.all(deletePromises);
            return true;
        } catch (error) {
            console.error('Error deleting multiple personnel:', error);
            throw error;
        }
    }

    async validateDocumentNumber(documentNumber, projectId, excludeId = null) {
        try {
            const personnel = await this.getByProject(projectId);
            return personnel.some(p => p.documentNumber === documentNumber && p.id !== excludeId);
        } catch (error) {
            console.error(`Error validating document number:`, error);
            return false;
        }
    }


    async updateMonthlyAttendance(personnelId, year, month, attendanceData) {
        try {
            const payload = {
                personnelAttendances: [{
                    personnelId: parseInt(personnelId),
                    year: parseInt(year),
                    month: parseInt(month),
                    dailyAttendance: attendanceData
                }]
            };

            const response = await http.put('/personnel/attendance', payload);
            return response.data;
        } catch (error) {
            console.error('❌ Error updating attendance:', error);
            throw error;
        }
    }

// En PersonnelApiService - REEMPLAZAR el método exportToExcel

    async exportToExcel(projectId, fileName = 'personal', filters = {}) {
        try {
            if (!projectId) throw new Error('Project ID required for export');

            // Usar el nuevo endpoint universal
            const params = new URLSearchParams({
                projectId: projectId.toString(),
                format: 'excel'
            });

            // Agregar filtros si existen
            if (filters && Object.keys(filters).length > 0) {
                Object.keys(filters).forEach(key => {
                    params.append(`filters[${key}]`, filters[key]);
                });
            }

            // Llamar al endpoint universal - CAMBIO AQUÍ
            const response = await http.get(`/exports/personnel?${params.toString()}`, {
                responseType: 'blob'
            });

            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`;

            document.body.appendChild(link);
            link.click();

            window.URL.revokeObjectURL(url);
            document.body.removeChild(link);

            return true;
        } catch (error) {
            console.error('Error exporting:', error);
            throw error;
        }
    }

// AGREGAR también método para exportar asistencia
    async exportAttendanceToExcel(projectId, year, month, fileName = 'asistencia') {
        try {
            if (!projectId) throw new Error('Project ID required for export');

            const params = new URLSearchParams({
                projectId: projectId.toString(),
                format: 'excel',
                'filters[year]': year.toString(),
                'filters[month]': month.toString(),
                'filters[includeAttendance]': 'true'
            });

            const response = await http.get(`/exports/personnel?${params.toString()}`, {
                responseType: 'blob'
            });

            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${fileName}_${year}_${month.toString().padStart(2, '0')}.xlsx`;

            document.body.appendChild(link);
            link.click();

            window.URL.revokeObjectURL(url);
            document.body.removeChild(link);

            return true;
        } catch (error) {
            console.error('Error exporting attendance:', error);
            throw error;
        }
    }
    // Auxiliary data
    getBanks() {
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
            { value: 'OTROS', label: 'Otros' }
        ];
    }

    async getDepartments(projectId = null) {
        try {
            const personnel = projectId ? await this.getByProject(projectId) : await this.getAll();
            return [...new Set(personnel.map(p => p.department).filter(Boolean))].sort();
        } catch (error) {
            console.error('Error getting departments:', error);
            return [];
        }
    }

    async addDepartmentToProject(projectId, departmentName) {
        try {
            if (!departmentName?.trim()) return false;

            const storageKey = `departments_project_${projectId}`;
            const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const clean = departmentName.trim();

            if (!stored.includes(clean)) {
                stored.push(clean);
                localStorage.setItem(storageKey, JSON.stringify(stored));
            }
            return true;
        } catch (error) {
            console.error('Error adding department:', error);
            return false;
        }
    }

    async getDepartmentsWithStored(projectId) {
        try {
            const used = await this.getDepartments(projectId);
            const storageKey = `departments_project_${projectId}`;
            const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
            return [...new Set([...used, ...stored])].sort();
        } catch (error) {
            console.error('Error getting departments:', error);
            return [];
        }
    }
}

export const personnelService = new PersonnelApiService();
import { BaseService } from "../../../core/services/base.service.js";
import { Personnel } from '../models/personnel.entity.js';

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

    async getByProject(projectId) {
        if (!projectId) {
            console.warn('ProjectId not provided in getByProject');
            return [];
        }

        try {
            let personnel = [];
            try {
                const response = await super.getAll({ projectId });
                personnel = Personnel.fromJsonArray(response.data || []);
                personnel = Personnel.filterByProject(personnel, projectId);
            } catch (filterError) {
                const allPersonnel = await this.getAll();
                personnel = Personnel.filterByProject(allPersonnel, projectId);
            }

            console.log(`Found ${personnel.length} personnel for project ${projectId}`);
            return personnel;

        } catch (error) {
            console.error(`Error fetching project personnel ${projectId}:`, error);
            return [];
        }
    }

    async getCurrentProjectId() {
        try {
            const route = this.$route || window.$router?.currentRoute?.value;
            if (route && route.params && route.params.projectId) {
                return route.params.projectId;
            }

            const pathMatch = window.location.pathname.match(/\/proyecto\/(\d+)|\/supervisor\/(\d+)/);
            if (pathMatch) {
                const projectId = pathMatch[1] || pathMatch[2];
                return projectId;
            }

            const storedProjectId = localStorage.getItem('currentProjectId');
            if (storedProjectId) {
                return storedProjectId;
            }

            console.warn('No projectId found in context');
            return null;
        } catch (error) {
            console.error('Error getting projectId:', error);
            return null;
        }
    }

    getCurrentProjectIdSync() {
        try {
            const app = window.Vue?.getCurrentInstance?.()?.appContext?.app;
            const route = app?.config?.globalProperties?.$route;

            if (route?.params?.projectId) {
                return route.params.projectId;
            }

            const pathMatch = window.location.pathname.match(/\/proyecto\/(\d+)|\/supervisor\/(\d+)/);
            if (pathMatch) {
                return pathMatch[1] || pathMatch[2];
            }

            return null;
        } catch (error) {
            console.error('Error getting projectId sync:', error);
            return null;
        }
    }

    async create(personnelData) {
        try {
            let personnel = personnelData instanceof Personnel
                ? personnelData
                : new Personnel(personnelData);

            if (!personnel.projectId) {
                const currentProjectId = await this.getCurrentProjectId();
                if (currentProjectId) {
                    personnel.projectId = currentProjectId;
                } else {
                    throw new Error('Could not determine current project');
                }
            }

            const validation = personnel.validate();
            if (!validation.isValid) {
                throw new Error(`Invalid data: ${validation.errors.join(', ')}`);
            }

            const cleanData = personnel.toCreateJson();
            const response = await super.create(cleanData);
            return Personnel.fromAPI(response.data);
        } catch (error) {
            console.error('Error creating employee:', error);
            throw error;
        }
    }

    async update(id, personnelData) {
        try {
            let personnel = personnelData instanceof Personnel
                ? personnelData
                : new Personnel(personnelData);

            if (!personnel.projectId) {
                const currentProjectId = await this.getCurrentProjectId();
                if (currentProjectId) {
                    personnel.projectId = currentProjectId;
                }
            }

            const validation = personnel.validate();
            if (!validation.isValid) {
                throw new Error(`Invalid data: ${validation.errors.join(', ')}`);
            }

            const updateData = personnel.toUpdateJson();
            const response = await super.update(id, updateData);
            return Personnel.fromAPI(response.data);
        } catch (error) {
            console.error(`Error updating employee ${id}:`, error);
            throw error;
        }
    }

    async delete(id) {
        try {
            await super.delete(id);
            return true;
        } catch (error) {
            console.error(`Error deleting employee ${id}:`, error);
            throw error;
        }
    }

    async deleteMultiple(ids) {
        try {
            const deletePromises = ids.map(id => this.delete(id));
            await Promise.all(deletePromises);
            return true;
        } catch (error) {
            console.error('Error deleting employees:', error);
            throw error;
        }
    }

    // Validations
    async validateDocumentNumber(documentNumber, projectId, excludeId = null) {
        try {
            const personnel = await this.getByProject(projectId);
            const exists = personnel.some(p =>
                p.documentNumber === documentNumber && p.id !== excludeId
            );
            return exists;
        } catch (error) {
            console.error(`Error validating document number ${documentNumber}:`, error);
            return false;
        }
    }

    async verifyPersonnelOwnership(personnelId, projectId) {
        if (!personnelId || !projectId) {
            return false;
        }

        try {
            const personnel = await this.getById(personnelId);
            return personnel && personnel.belongsToProject(projectId);
        } catch (error) {
            console.error('Error verifying personnel ownership:', error);
            return false;
        }
    }

    // NEW: Monthly attendance methods
    async updateMonthlyAttendance(personnelId, year, month, attendanceData) {
        try {
            const personnel = await this.getById(personnelId);

            // Update attendance for each day
            Object.keys(attendanceData).forEach(day => {
                const dayNum = parseInt(day);
                const status = attendanceData[day];

                if (dayNum >= 1 && dayNum <= 31) {
                    personnel.setDayAttendance(year, month, dayNum, status);
                }
            });

            // Save updated personnel
            return await this.update(personnelId, personnel);
        } catch (error) {
            console.error('Error updating monthly attendance:', error);
            throw error;
        }
    }

    async getMonthlyAttendance(projectId, year, month) {
        try {
            const personnel = await this.getByProject(projectId);
            const monthKey = Personnel.getMonthKey(year, month);

            return personnel.map(person => {
                // Ensure month is initialized
                person.initializeMonthAttendance(year, month);
                person.autoMarkSundays(year, month);
                person.calculateMonthlyTotals(year, month);

                return {
                    id: person.id,
                    name: person.getDisplayName(),
                    documentNumber: person.documentNumber,
                    attendanceString: person.monthlyAttendance[monthKey] || '',
                    totals: {
                        workedDays: person.workedDays,
                        compensatoryDays: person.compensatoryDays,
                        unpaidLeave: person.unpaidLeave,
                        absences: person.absences,
                        sundays: person.sundays,
                        totalDays: person.totalDays,
                        totalAmount: person.totalAmount
                    }
                };
            });
        } catch (error) {
            console.error('Error getting monthly attendance:', error);
            return [];
        }
    }

    async saveMonthlyAttendance(personnelList) {
        try {
            const updatePromises = personnelList.map(person =>
                this.update(person.id, person)
            );

            await Promise.all(updatePromises);
            return true;
        } catch (error) {
            console.error('Error saving monthly attendance:', error);
            throw error;
        }
    }

    // Image compression
    async compressImage(file, config = {}) {
        const defaultConfig = {
            maxWidth: 300,
            maxHeight: 300,
            quality: 0.7,
            maxSizeKB: 100,
            format: 'image/webp'
        };

        const finalConfig = { ...defaultConfig, ...config };

        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                try {
                    let { width, height } = img;

                    if (width > height) {
                        if (width > finalConfig.maxWidth) {
                            height = (height * finalConfig.maxWidth) / width;
                            width = finalConfig.maxWidth;
                        }
                    } else {
                        if (height > finalConfig.maxHeight) {
                            width = (width * finalConfig.maxHeight) / height;
                            height = finalConfig.maxHeight;
                        }
                    }

                    const size = Math.min(width, height, 200);
                    canvas.width = size;
                    canvas.height = size;

                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';

                    const offsetX = (width - size) / 2;
                    const offsetY = (height - size) / 2;

                    ctx.drawImage(img, -offsetX, -offsetY, width, height);

                    const qualities = [0.8, 0.6, 0.4, 0.3, 0.2, 0.1];
                    let bestResult = null;

                    for (const quality of qualities) {
                        const compressed = canvas.toDataURL('image/webp', quality);
                        const sizeKB = Math.round(compressed.length * 0.75 / 1024);

                        if (sizeKB <= finalConfig.maxSizeKB) {
                            bestResult = compressed;
                            break;
                        }
                    }

                    if (!bestResult) {
                        bestResult = canvas.toDataURL('image/webp', 0.1);
                    }

                    resolve(bestResult);
                } catch (error) {
                    reject(new Error('Error processing image'));
                }
            };

            img.onerror = () => {
                reject(new Error('Error loading image'));
            };

            img.src = URL.createObjectURL(file);
        });
    }

    async uploadAvatar(file, projectId = null) {
        if (!file) {
            throw new Error('Image file is required');
        }

        try {
            if (!file.type.startsWith('image/')) {
                throw new Error('File must be an image (JPG, PNG, WEBP, etc.)');
            }

            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
                throw new Error('Image is too large. Maximum 5MB allowed.');
            }

            const compressedAvatar = await this.compressImage(file, {
                maxWidth: 200,
                maxHeight: 200,
                maxSizeKB: 50
            });

            return compressedAvatar;
        } catch (error) {
            console.error('Error processing avatar:', error);
            throw error;
        }
    }

    // Export
    async exportToExcel(personnelData, fileName = 'personal') {
        try {
            const exportData = personnelData.map(person => ({
                'Nombre': person.name,
                'Apellido': person.lastname,
                'Documento': person.documentNumber,
                'Cargo': person.position,
                'Departamento': person.department,
                'Tipo Personal': person.getPersonnelTypeLabel(),
                'Monto Mensual': person.monthlyAmount,
                'Estado': person.status,
                'Fecha Inicio': Personnel.formatPeruDate(person.startDate),
                'Teléfono': person.phone,
                'Email': person.email,
                'Banco': person.bank,
                'Cuenta': person.accountNumber,

                // ✅ NUEVAS COLUMNAS DE ASISTENCIA
                'Días Trabajados': person.workedDays || 0,
                'Días Compensatorios': person.compensatoryDays || 0,
                'Permisos con Descuento': person.unpaidLeave || 0,
                'Faltas': person.absences || 0,
                'Domingos': person.sundays || 0,
                'Total Días': person.totalDays || 0,
                'Monto Total': person.totalAmount || 0
            }));

            // Crear workbook y worksheet
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportData);

            // Añadir worksheet al workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Personal');

            // Generar y descargar archivo
            const finalFileName = `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, finalFileName);

            return true;
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            throw error;
        }
    }

    // Statistics
    async getProjectStats(projectId) {
        if (!projectId) {
            throw new Error('Project ID is required');
        }

        try {
            const personnel = await this.getByProject(projectId);

            const stats = {
                totalPersonnel: personnel.length,
                activePersonnel: personnel.filter(p => p.isActive()).length,
                inactivePersonnel: personnel.filter(p => !p.isActive()).length,
                recentPersonnel: personnel.filter(p => {
                    const createdDate = new Date(p.createdAt);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return createdDate >= weekAgo;
                }).length,
                departmentBreakdown: this.getDepartmentBreakdown(personnel),
                typeBreakdown: this.getTypeBreakdown(personnel),
                averageSalary: this.getAverageSalary(personnel)
            };

            return stats;
        } catch (error) {
            console.error(`Error getting project stats ${projectId}:`, error);
            throw error;
        }
    }

    getDepartmentBreakdown(personnel) {
        const departments = {};
        personnel.forEach(p => {
            if (p.department) {
                departments[p.department] = (departments[p.department] || 0) + 1;
            }
        });
        return departments;
    }

    getTypeBreakdown(personnel) {
        const types = {};
        personnel.forEach(p => {
            if (p.personnelType) {
                const label = p.getPersonnelTypeLabel();
                types[label] = (types[label] || 0) + 1;
            }
        });
        return types;
    }

    getAverageSalary(personnel) {
        const activeSalaries = personnel
            .filter(p => p.isActive() && p.monthlyAmount > 0)
            .map(p => p.monthlyAmount);

        if (activeSalaries.length === 0) return 0;

        const total = activeSalaries.reduce((sum, salary) => sum + salary, 0);
        return total / activeSalaries.length;
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
            const personnel = projectId ?
                await this.getByProject(projectId) :
                await this.getAll();

            const usedDepartments = [...new Set(personnel.map(p => p.department).filter(Boolean))];
            return usedDepartments.sort();
        } catch (error) {
            console.error('Error getting departments:', error);
            return [];
        }
    }

    async addDepartmentToProject(projectId, departmentName) {
        try {
            if (!departmentName || !departmentName.trim()) {
                return false;
            }

            const cleanDepartment = departmentName.trim();
            const storageKey = `departments_project_${projectId}`;
            const storedDepartments = JSON.parse(localStorage.getItem(storageKey) || '[]');

            if (!storedDepartments.includes(cleanDepartment)) {
                storedDepartments.push(cleanDepartment);
                localStorage.setItem(storageKey, JSON.stringify(storedDepartments));
            }

            return true;
        } catch (error) {
            console.error('Error adding department:', error);
            return false;
        }
    }

    async getDepartmentsWithStored(projectId) {
        try {
            const usedDepartments = await this.getDepartments(projectId);
            const storageKey = `departments_project_${projectId}`;
            const storedDepartments = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const allDepartments = [...new Set([...usedDepartments, ...storedDepartments])];
            return allDepartments.sort();
        } catch (error) {
            console.error('Error getting departments:', error);
            return [];
        }
    }

    filterPersonnelByDateRange(personnel, startDate, endDate) {
        if (!startDate && !endDate) {
            return personnel;
        }

        return personnel.filter(person => {
            const personDate = new Date(person.startDate || person.createdAt);
            const start = startDate ? new Date(startDate) : new Date('1900-01-01');
            const end = endDate ? new Date(endDate) : new Date('2100-12-31');

            return personDate >= start && personDate <= end;
        });
    }

    async deleteByProjectId(projectId) {
        if (!projectId) {
            throw new Error('Project ID is required');
        }

        try {
            const personnel = await this.getByProject(projectId);
            let deletedCount = 0;

            for (const person of personnel) {
                try {
                    await this.delete(person.id);
                    deletedCount++;
                } catch (error) {
                    console.error(`Error deleting personnel ${person.id}:`, error);
                }
            }

            return deletedCount;
        } catch (error) {
            console.error(`Error deleting project personnel ${projectId}:`, error);
            throw error;
        }
    }
}

export const personnelService = new PersonnelApiService();
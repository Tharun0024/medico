// Mock data for the Hospital Management System

export interface Hospital {
  id: string;
  name: string;
  location: string;
  totalBeds: number;
  availableBeds: number;
  occupiedBeds: number;
  status: 'active' | 'inactive' | 'maintenance';
  lat: number;
  lng: number;
  contactNumber: string;
  emergencyCapacity: number;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  condition: string;
  severity: 'critical' | 'serious' | 'stable' | 'minor';
  bedNumber: string;
  admissionTime: string;
  treatmentType: string;
  doctor: string;
  status: 'admitted' | 'discharged' | 'transferred';
}

export interface Bed {
  id: string;
  number: string;
  ward: string;
  floor: number;
  status: 'available' | 'occupied' | 'cleaning' | 'reserved';
  patientId?: string;
  type: 'general' | 'icu' | 'emergency' | 'pediatric' | 'maternity';
}

export interface Ambulance {
  id: string;
  vehicleNumber: string;
  status: 'available' | 'dispatched' | 'returning' | 'maintenance';
  location: string;
  driver: string;
  lastUpdated: string;
}

export interface WastePickupRequest {
  id: string;
  hospitalId: string;
  hospitalName: string;
  wasteType: 'infectious' | 'hazardous' | 'radioactive' | 'general';
  quantity: number;
  unit: 'kg' | 'liters';
  status: 'pending' | 'collected' | 'disposed';
  requestedAt: string;
  collectedAt?: string;
  disposedAt?: string;
  paymentStatus: 'pending' | 'completed';
  amount: number;
}

export interface DiseaseData {
  month: string;
  dengue: number;
  covid: number;
  malaria: number;
  typhoid: number;
}

export interface WasteAnalytics {
  date: string;
  actual: number;
  predicted: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  read: boolean;
}

// Mock Hospitals
export const hospitals: Hospital[] = [
  { id: 'h1', name: 'City General Hospital', location: 'Downtown District', totalBeds: 500, availableBeds: 125, occupiedBeds: 375, status: 'active', lat: 28.6139, lng: 77.2090, contactNumber: '+91 11 2345 6789', emergencyCapacity: 50 },
  { id: 'h2', name: 'Metro Medical Center', location: 'North Zone', totalBeds: 350, availableBeds: 89, occupiedBeds: 261, status: 'active', lat: 28.6519, lng: 77.2315, contactNumber: '+91 11 3456 7890', emergencyCapacity: 35 },
  { id: 'h3', name: 'Green Valley Hospital', location: 'East District', totalBeds: 200, availableBeds: 45, occupiedBeds: 155, status: 'active', lat: 28.5672, lng: 77.2507, contactNumber: '+91 11 4567 8901', emergencyCapacity: 25 },
  { id: 'h4', name: 'Sunrise Healthcare', location: 'South Zone', totalBeds: 400, availableBeds: 112, occupiedBeds: 288, status: 'active', lat: 28.5245, lng: 77.1855, contactNumber: '+91 11 5678 9012', emergencyCapacity: 40 },
  { id: 'h5', name: 'Unity Medical Institute', location: 'West District', totalBeds: 280, availableBeds: 67, occupiedBeds: 213, status: 'maintenance', lat: 28.6304, lng: 77.1190, contactNumber: '+91 11 6789 0123', emergencyCapacity: 30 },
  { id: 'h6', name: 'Apollo Healthcare', location: 'Central Zone', totalBeds: 450, availableBeds: 98, occupiedBeds: 352, status: 'active', lat: 28.5890, lng: 77.2200, contactNumber: '+91 11 7890 1234', emergencyCapacity: 45 },
  { id: 'h7', name: 'Fortis Memorial', location: 'Suburban Area', totalBeds: 320, availableBeds: 78, occupiedBeds: 242, status: 'active', lat: 28.6800, lng: 77.1500, contactNumber: '+91 11 8901 2345', emergencyCapacity: 32 },
  { id: 'h8', name: 'Max Super Specialty', location: 'Tech Park', totalBeds: 380, availableBeds: 95, occupiedBeds: 285, status: 'active', lat: 28.5500, lng: 77.2700, contactNumber: '+91 11 9012 3456', emergencyCapacity: 38 },
];

// Mock Patients
export const patients: Patient[] = [
  { id: 'p1', name: 'Rajesh Kumar', age: 45, gender: 'male', condition: 'Pneumonia', severity: 'serious', bedNumber: 'ICU-101', admissionTime: '2024-01-15T08:30:00', treatmentType: 'Respiratory Care', doctor: 'Dr. Sharma', status: 'admitted' },
  { id: 'p2', name: 'Priya Singh', age: 32, gender: 'female', condition: 'Appendicitis', severity: 'stable', bedNumber: 'GEN-205', admissionTime: '2024-01-16T14:20:00', treatmentType: 'Post-Surgery', doctor: 'Dr. Patel', status: 'admitted' },
  { id: 'p3', name: 'Amit Verma', age: 58, gender: 'male', condition: 'Cardiac Arrest', severity: 'critical', bedNumber: 'ICU-103', admissionTime: '2024-01-17T02:15:00', treatmentType: 'Cardiac Care', doctor: 'Dr. Gupta', status: 'admitted' },
  { id: 'p4', name: 'Sneha Reddy', age: 28, gender: 'female', condition: 'Fracture', severity: 'minor', bedNumber: 'GEN-112', admissionTime: '2024-01-17T10:45:00', treatmentType: 'Orthopedic', doctor: 'Dr. Reddy', status: 'admitted' },
  { id: 'p5', name: 'Mohammed Ali', age: 62, gender: 'male', condition: 'Diabetes Complications', severity: 'serious', bedNumber: 'GEN-301', admissionTime: '2024-01-14T16:00:00', treatmentType: 'Endocrinology', doctor: 'Dr. Khan', status: 'admitted' },
  { id: 'p6', name: 'Lakshmi Devi', age: 55, gender: 'female', condition: 'Stroke', severity: 'critical', bedNumber: 'ICU-105', admissionTime: '2024-01-17T06:30:00', treatmentType: 'Neurology', doctor: 'Dr. Sharma', status: 'admitted' },
  { id: 'p7', name: 'Suresh Nair', age: 40, gender: 'male', condition: 'COVID-19', severity: 'serious', bedNumber: 'ISO-201', admissionTime: '2024-01-15T20:00:00', treatmentType: 'Infectious Disease', doctor: 'Dr. Nair', status: 'admitted' },
  { id: 'p8', name: 'Kavitha Menon', age: 35, gender: 'female', condition: 'Pregnancy Complications', severity: 'stable', bedNumber: 'MAT-102', admissionTime: '2024-01-16T09:00:00', treatmentType: 'Obstetrics', doctor: 'Dr. Menon', status: 'admitted' },
  { id: 'p9', name: 'Rahul Sharma', age: 8, gender: 'male', condition: 'Dengue', severity: 'serious', bedNumber: 'PED-105', admissionTime: '2024-01-17T11:30:00', treatmentType: 'Pediatric Care', doctor: 'Dr. Joshi', status: 'admitted' },
  { id: 'p10', name: 'Anita Desai', age: 48, gender: 'female', condition: 'Kidney Failure', severity: 'critical', bedNumber: 'ICU-108', admissionTime: '2024-01-13T22:00:00', treatmentType: 'Nephrology', doctor: 'Dr. Desai', status: 'admitted' },
];

// Mock Beds
export const beds: Bed[] = [
  { id: 'b1', number: 'ICU-101', ward: 'ICU', floor: 1, status: 'occupied', patientId: 'p1', type: 'icu' },
  { id: 'b2', number: 'ICU-102', ward: 'ICU', floor: 1, status: 'available', type: 'icu' },
  { id: 'b3', number: 'ICU-103', ward: 'ICU', floor: 1, status: 'occupied', patientId: 'p3', type: 'icu' },
  { id: 'b4', number: 'ICU-104', ward: 'ICU', floor: 1, status: 'cleaning', type: 'icu' },
  { id: 'b5', number: 'ICU-105', ward: 'ICU', floor: 1, status: 'occupied', patientId: 'p6', type: 'icu' },
  { id: 'b6', number: 'GEN-201', ward: 'General', floor: 2, status: 'available', type: 'general' },
  { id: 'b7', number: 'GEN-202', ward: 'General', floor: 2, status: 'reserved', type: 'general' },
  { id: 'b8', number: 'GEN-203', ward: 'General', floor: 2, status: 'available', type: 'general' },
  { id: 'b9', number: 'GEN-204', ward: 'General', floor: 2, status: 'cleaning', type: 'general' },
  { id: 'b10', number: 'GEN-205', ward: 'General', floor: 2, status: 'occupied', patientId: 'p2', type: 'general' },
  { id: 'b11', number: 'GEN-301', ward: 'General', floor: 3, status: 'occupied', patientId: 'p5', type: 'general' },
  { id: 'b12', number: 'GEN-302', ward: 'General', floor: 3, status: 'available', type: 'general' },
  { id: 'b13', number: 'EMR-101', ward: 'Emergency', floor: 1, status: 'available', type: 'emergency' },
  { id: 'b14', number: 'EMR-102', ward: 'Emergency', floor: 1, status: 'occupied', type: 'emergency' },
  { id: 'b15', number: 'EMR-103', ward: 'Emergency', floor: 1, status: 'available', type: 'emergency' },
  { id: 'b16', number: 'PED-101', ward: 'Pediatric', floor: 4, status: 'available', type: 'pediatric' },
  { id: 'b17', number: 'PED-102', ward: 'Pediatric', floor: 4, status: 'cleaning', type: 'pediatric' },
  { id: 'b18', number: 'PED-103', ward: 'Pediatric', floor: 4, status: 'available', type: 'pediatric' },
  { id: 'b19', number: 'MAT-101', ward: 'Maternity', floor: 5, status: 'occupied', type: 'maternity' },
  { id: 'b20', number: 'MAT-102', ward: 'Maternity', floor: 5, status: 'occupied', patientId: 'p8', type: 'maternity' },
];

// Mock Ambulances
export const ambulances: Ambulance[] = [
  { id: 'a1', vehicleNumber: 'DL-01-AB-1234', status: 'available', location: 'City General Hospital', driver: 'Ravi Kumar', lastUpdated: '2024-01-17T14:30:00' },
  { id: 'a2', vehicleNumber: 'DL-02-CD-5678', status: 'dispatched', location: 'En route to North Zone', driver: 'Sunil Sharma', lastUpdated: '2024-01-17T14:25:00' },
  { id: 'a3', vehicleNumber: 'DL-03-EF-9012', status: 'returning', location: 'Green Valley Area', driver: 'Manoj Singh', lastUpdated: '2024-01-17T14:20:00' },
  { id: 'a4', vehicleNumber: 'DL-04-GH-3456', status: 'available', location: 'Metro Medical Center', driver: 'Ajay Patel', lastUpdated: '2024-01-17T14:15:00' },
  { id: 'a5', vehicleNumber: 'DL-05-IJ-7890', status: 'maintenance', location: 'Service Center', driver: 'N/A', lastUpdated: '2024-01-17T10:00:00' },
  { id: 'a6', vehicleNumber: 'DL-06-KL-2345', status: 'dispatched', location: 'South District Emergency', driver: 'Vikram Rao', lastUpdated: '2024-01-17T14:28:00' },
  { id: 'a7', vehicleNumber: 'DL-07-MN-6789', status: 'available', location: 'Apollo Healthcare', driver: 'Deepak Verma', lastUpdated: '2024-01-17T14:10:00' },
  { id: 'a8', vehicleNumber: 'DL-08-OP-0123', status: 'returning', location: 'Highway Junction', driver: 'Sanjay Gupta', lastUpdated: '2024-01-17T14:22:00' },
];

// Mock Disease Data (for outbreak prediction)
export const diseaseData: DiseaseData[] = [
  { month: 'Aug', dengue: 120, covid: 450, malaria: 85, typhoid: 45 },
  { month: 'Sep', dengue: 280, covid: 380, malaria: 120, typhoid: 52 },
  { month: 'Oct', dengue: 450, covid: 320, malaria: 95, typhoid: 48 },
  { month: 'Nov', dengue: 320, covid: 280, malaria: 65, typhoid: 38 },
  { month: 'Dec', dengue: 180, covid: 520, malaria: 45, typhoid: 42 },
  { month: 'Jan', dengue: 95, covid: 680, malaria: 35, typhoid: 55 },
];

// Mock Waste Analytics
export const wasteAnalytics: WasteAnalytics[] = [
  { date: 'Mon', actual: 145, predicted: 150 },
  { date: 'Tue', actual: 162, predicted: 155 },
  { date: 'Wed', actual: 158, predicted: 160 },
  { date: 'Thu', actual: 210, predicted: 165 },
  { date: 'Fri', actual: 175, predicted: 170 },
  { date: 'Sat', actual: 148, predicted: 145 },
  { date: 'Sun', actual: 125, predicted: 130 },
];

// Mock Waste Pickup Requests
export const wastePickupRequests: WastePickupRequest[] = [
  { id: 'w1', hospitalId: 'h1', hospitalName: 'City General Hospital', wasteType: 'infectious', quantity: 85, unit: 'kg', status: 'pending', requestedAt: '2024-01-17T08:00:00', paymentStatus: 'pending', amount: 4250 },
  { id: 'w2', hospitalId: 'h2', hospitalName: 'Metro Medical Center', wasteType: 'hazardous', quantity: 45, unit: 'kg', status: 'collected', requestedAt: '2024-01-16T14:00:00', collectedAt: '2024-01-17T10:00:00', paymentStatus: 'pending', amount: 3600 },
  { id: 'w3', hospitalId: 'h3', hospitalName: 'Green Valley Hospital', wasteType: 'general', quantity: 120, unit: 'kg', status: 'disposed', requestedAt: '2024-01-15T09:00:00', collectedAt: '2024-01-15T15:00:00', disposedAt: '2024-01-16T11:00:00', paymentStatus: 'completed', amount: 2400 },
  { id: 'w4', hospitalId: 'h4', hospitalName: 'Sunrise Healthcare', wasteType: 'infectious', quantity: 65, unit: 'kg', status: 'pending', requestedAt: '2024-01-17T09:30:00', paymentStatus: 'pending', amount: 3250 },
  { id: 'w5', hospitalId: 'h6', hospitalName: 'Apollo Healthcare', wasteType: 'radioactive', quantity: 15, unit: 'kg', status: 'collected', requestedAt: '2024-01-16T16:00:00', collectedAt: '2024-01-17T08:00:00', paymentStatus: 'pending', amount: 7500 },
  { id: 'w6', hospitalId: 'h7', hospitalName: 'Fortis Memorial', wasteType: 'hazardous', quantity: 55, unit: 'kg', status: 'pending', requestedAt: '2024-01-17T11:00:00', paymentStatus: 'pending', amount: 4400 },
  { id: 'w7', hospitalId: 'h1', hospitalName: 'City General Hospital', wasteType: 'general', quantity: 200, unit: 'kg', status: 'disposed', requestedAt: '2024-01-14T08:00:00', collectedAt: '2024-01-14T14:00:00', disposedAt: '2024-01-15T10:00:00', paymentStatus: 'completed', amount: 4000 },
  { id: 'w8', hospitalId: 'h8', hospitalName: 'Max Super Specialty', wasteType: 'infectious', quantity: 78, unit: 'kg', status: 'collected', requestedAt: '2024-01-16T10:00:00', collectedAt: '2024-01-17T09:00:00', paymentStatus: 'pending', amount: 3900 },
];

// Mock Notifications
export const notifications: Notification[] = [
  { id: 'n1', title: 'Critical Alert', message: 'ICU bed availability below 20% at City General Hospital', type: 'error', timestamp: '2024-01-17T14:30:00', read: false },
  { id: 'n2', title: 'Outbreak Warning', message: 'Dengue cases exceeding threshold in North Zone', type: 'warning', timestamp: '2024-01-17T13:45:00', read: false },
  { id: 'n3', title: 'Ambulance Dispatched', message: 'Ambulance DL-02-CD-5678 dispatched to emergency', type: 'info', timestamp: '2024-01-17T14:25:00', read: true },
  { id: 'n4', title: 'Waste Collection Complete', message: 'Medical waste collected from Green Valley Hospital', type: 'success', timestamp: '2024-01-17T12:00:00', read: true },
  { id: 'n5', title: 'System Maintenance', message: 'Scheduled maintenance for Unity Medical Institute systems', type: 'info', timestamp: '2024-01-17T10:00:00', read: true },
];

// Statistics summary
export const globalStats = {
  totalHospitals: hospitals.length,
  totalBeds: hospitals.reduce((acc, h) => acc + h.totalBeds, 0),
  availableBeds: hospitals.reduce((acc, h) => acc + h.availableBeds, 0),
  totalPatients: patients.length,
  criticalPatients: patients.filter(p => p.severity === 'critical').length,
  activeAmbulances: ambulances.filter(a => a.status === 'available').length,
  totalAmbulances: ambulances.length,
  pendingWasteRequests: wastePickupRequests.filter(w => w.status === 'pending').length,
};

// Disease distribution for pie chart
export const diseaseDistribution = [
  { name: 'Respiratory', value: 35, color: 'var(--chart-1)' },
  { name: 'Cardiac', value: 25, color: 'var(--chart-2)' },
  { name: 'Infectious', value: 20, color: 'var(--chart-3)' },
  { name: 'Orthopedic', value: 12, color: 'var(--chart-4)' },
  { name: 'Others', value: 8, color: 'var(--chart-5)' },
];

// Bed usage by type
export const bedUsageByType = [
  { type: 'ICU', total: 50, occupied: 42, available: 8 },
  { type: 'General', total: 200, occupied: 156, available: 44 },
  { type: 'Emergency', total: 30, occupied: 22, available: 8 },
  { type: 'Pediatric', total: 40, occupied: 28, available: 12 },
  { type: 'Maternity', total: 35, occupied: 29, available: 6 },
];

// Waste prediction by treatment type
export const wastePredictionByTreatment: Record<string, number> = {
  'General Checkup': 0.5,
  'Minor Surgery': 2.5,
  'Major Surgery': 8.0,
  'ICU Care': 5.0,
  'Emergency Treatment': 3.5,
  'Dialysis': 4.0,
  'Chemotherapy': 6.0,
  'Maternity Care': 3.0,
  'Pediatric Care': 1.5,
  'Cardiac Care': 4.5,
};

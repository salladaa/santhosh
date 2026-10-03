export type Patient = {
  id: string;
  name: string;
  age: number;
  phone: string;
  email: string;
  medicines: string[];
  reports: string[];
  billAmount: number;
  billStatus: "Pending" | "Paid";
  treatment: string;
  nextCheckup: string;
  appointmentStatus: "Scheduled" | "Completed" | "Cancelled";
  version: number;
  dateOfBirth?: string;
  address?: string;
  emergencyContact?: string;
  allergies?: string;
};
export type PatientInput = Omit<Patient, "id" | "version"> & {
  password?: string;
  version?: number;
};
export type Session = {
  userId: string;
  role: "admin" | "doctor" | "nurse" | "patient";
  patientId: string | null;
  name: string;
};
export type Activity = {
  id: number;
  actor: string;
  action: string;
  subject: string;
  createdAt: string;
};

export type Staff = {
  id: string;
  name: string;
  role: "admin" | "doctor" | "nurse";
  email: string;
  active: number;
  registration: string;
};
export type Appointment = {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  startsAt: string;
  duration: number;
  reason: string;
  status: "Requested" | "Scheduled" | "Checked in" | "Completed" | "Cancelled";
  version: number;
};
export type Medicine = {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions: string;
};
export type Visit = {
  id: string;
  patientId: string;
  doctorName: string;
  registration: string;
  visitDate: string;
  complaint: string;
  diagnosis: string;
  notes: string;
  vitals: string;
  medicines: Medicine[];
  followUp: string;
  createdAt: string;
};
export type Report = {
  id: string;
  patientId: string;
  title: string;
  mime: string;
  size: number;
  createdAt: string;
};
export type Invoice = {
  id: string;
  number: number;
  patientId: string;
  patientName: string;
  items: { description: string; amount: number }[];
  totalPaise: number;
  paidPaise: number;
  createdAt: string;
};
export type CareData = {
  appointments: Appointment[];
  visits: Visit[];
  reports: Report[];
  invoices: Invoice[];
};

export type Bed = { id: string; ward: string; label: string; occupied: number };
export type Admission = {
  id: string;
  patientId: string;
  patientName: string;
  ward: string;
  bed: string;
  doctorName: string;
  reason: string;
  admittedAt: string;
  dischargedAt: string | null;
  dischargeSummary: string;
  version: number;
  notes: {
    id: string;
    author: string;
    observations: string;
    createdAt: string;
  }[];
};

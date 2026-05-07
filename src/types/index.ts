export type JobStatus = 'new' | 'in progress' | 'completed' | 'pending';
export type JobPriority = 'normal' | 'high' | 'urgent';
export type TechStatus = 'active' | 'enroute' | 'offline';

export type JobType =
  | 'Installation'
  | 'Maintenance'
  | 'Repair'
  | 'Inspection'
  | 'Alarm Response'
  | 'CCTV'
  | 'Access Control'
  | 'Electric Fence';

export type TechSpecialisation =
  | 'General Security'
  | 'CCTV Specialist'
  | 'Access Control'
  | 'Electric Fencing'
  | 'Alarm Systems'
  | 'Gate & Automation';

export interface ChecklistItem {
  id?: string;
  t: string;
  done: boolean;
}

export interface GpsLogEntry {
  id?: string;
  time: string;
  loc: string;
}

export interface Job {
  id: string;
  title: string;
  client: string;
  type: JobType;
  priority: JobPriority;
  status: JobStatus;
  tech: string;
  address: string;
  date: string;
  desc: string;
  notes: string;
  checklist: ChecklistItem[];
  photos: string[];
  signature: string | null;
  sigName: string;
  gpsLog: GpsLogEntry[];
  created_at?: string;
}

export interface Technician {
  id?: string;
  name: string;
  role: TechSpecialisation;
  status: TechStatus;
  phone: string;
  lat: number;
  lng: number;
  created_at?: string;
}

export interface NewJobForm {
  title: string;
  client: string;
  type: JobType;
  priority: JobPriority;
  tech: string;
  date: string;
  address: string;
  desc: string;
}

export interface NewTechForm {
  name: string;
  phone: string;
  role: TechSpecialisation;
  status: TechStatus;
}

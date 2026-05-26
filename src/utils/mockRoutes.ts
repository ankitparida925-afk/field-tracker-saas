export interface RoutePoint {
  lat: number;
  lng: number;
  name: string;
  isStop?: boolean;
  stopName?: string;
  durationMinutes?: number;
  clientIndex?: number;
}

export interface EmployeeRoute {
  id: string;
  name: string;
  role: string;
  department: string;
  phone: string;
  avatar: string;
  color: string;
  batteryStart: number;
  baseSpeed: number; // km/h
  email?: string;
  password?: string;
  organizationId?: string;
  points: RoutePoint[];
  geofences: {
    id: string;
    name: string;
    lat: number;
    lng: number;
    radius: number; // meters
    type: 'client' | 'territory' | 'restricted';
  }[];
  employeeCode?: string;
  assignedManagerId?: string;
  isManager?: boolean;
  isActive?: boolean;
}

export const mockEmployees: EmployeeRoute[] = [
  {
    id: 'emp-1',
    name: 'Rahul Sharma',
    role: 'Enterprise Sales Lead',
    department: 'Sales & Marketing',
    phone: '+1 (555) 019-2834',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    color: '#3b82f6', // blue
    batteryStart: 92,
    baseSpeed: 25,
    email: 'rahul@fti.com',
    password: 'rahul123',
    organizationId: 'org-fti',
    employeeCode: 'MGR-1001',
    isManager: true,
    isActive: true,
    geofences: [
      { id: 'geo-1-office', name: 'HQ Office', lat: 37.7749, lng: -122.4194, radius: 100, type: 'territory' },
      { id: 'geo-1-client-a', name: 'Apex Corp (Client A)', lat: 37.7824, lng: -122.4124, radius: 80, type: 'client' },
      { id: 'geo-1-client-b', name: 'Apex Retail (Client B)', lat: 37.7898, lng: -122.4018, radius: 80, type: 'client' },
      { id: 'geo-1-restricted', name: 'Restricted Industrial Zone', lat: 37.7850, lng: -122.3950, radius: 150, type: 'restricted' }
    ],
    points: [
      { lat: 37.7749, lng: -122.4194, name: 'HQ Office - Checking In', isStop: true, stopName: 'HQ Office', durationMinutes: 15 },
      { lat: 37.7765, lng: -122.4175, name: 'Transit on Market St' },
      { lat: 37.7788, lng: -122.4150, name: 'Approaching Apex Corp' },
      { lat: 37.7824, lng: -122.4124, name: 'At Apex Corp (Client A)', isStop: true, stopName: 'Apex Corp', durationMinutes: 45, clientIndex: 1 },
      { lat: 37.7845, lng: -122.4095, name: 'Transit near Union Square' },
      { lat: 37.7870, lng: -122.4060, name: 'Driving down 4th St' },
      { lat: 37.7898, lng: -122.4018, name: 'At Apex Retail (Client B)', isStop: true, stopName: 'Apex Retail', durationMinutes: 60, clientIndex: 2 },
      { lat: 37.7875, lng: -122.3980, name: 'Driving towards SOMA' },
      // Restricted zone entry simulation
      { lat: 37.7850, lng: -122.3950, name: 'Entering Restricted Area', isStop: true, stopName: 'Restricted Industrial Zone', durationMinutes: 10 },
      { lat: 37.7800, lng: -122.4030, name: 'Returning along Folsom St' },
      { lat: 37.7749, lng: -122.4194, name: 'HQ Office - Returning', isStop: true, stopName: 'HQ Office', durationMinutes: 30 }
    ]
  },
  {
    id: 'emp-2',
    name: 'Sarah Jenkins',
    role: 'Medical Device Specialist',
    department: 'Pharmaceuticals',
    phone: '+1 (555) 024-9981',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    color: '#10b981', // green
    batteryStart: 85,
    baseSpeed: 30,
    email: 'sarah@fti.com',
    password: 'sarah123',
    organizationId: 'org-fti',
    employeeCode: 'EMP-2002',
    assignedManagerId: 'emp-1',
    isActive: true,
    geofences: [
      { id: 'geo-2-clinic', name: 'General Hospital', lat: 37.7649, lng: -122.4494, radius: 120, type: 'client' },
      { id: 'geo-2-med-center', name: 'Mission Health Clinic', lat: 37.7594, lng: -122.4354, radius: 90, type: 'client' }
    ],
    points: [
      { lat: 37.7749, lng: -122.4194, name: 'HQ Office - Start Shift', isStop: true, stopName: 'HQ Office', durationMinutes: 10 },
      { lat: 37.7710, lng: -122.4280, name: 'Transit on Duboce Ave' },
      { lat: 37.7680, lng: -122.4390, name: 'Driving up Castro St' },
      { lat: 37.7649, lng: -122.4494, name: 'At General Hospital', isStop: true, stopName: 'General Hospital', durationMinutes: 50, clientIndex: 0 },
      { lat: 37.7620, lng: -122.4420, name: 'Driving through Noe Valley' },
      { lat: 37.7594, lng: -122.4354, name: 'At Mission Health Clinic', isStop: true, stopName: 'Mission Health Clinic', durationMinutes: 35, clientIndex: 1 },
      { lat: 37.7670, lng: -122.4250, name: 'Driving back down Valencia St' },
      { lat: 37.7749, lng: -122.4194, name: 'HQ Office - Completed visits', isStop: true, stopName: 'HQ Office', durationMinutes: 20 }
    ]
  },
  {
    id: 'emp-3',
    name: 'Amit Patel',
    role: 'Senior Delivery Executive',
    department: 'Logistics Operations',
    phone: '+1 (555) 073-1256',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    color: '#f59e0b', // amber
    batteryStart: 78,
    baseSpeed: 35,
    email: 'amit@fti.com',
    password: 'amit123',
    organizationId: 'org-fti',
    employeeCode: 'EMP-2003',
    assignedManagerId: 'emp-1',
    isActive: true,
    geofences: [
      { id: 'geo-3-wharfs', name: 'Pier 39 Logistics Hub', lat: 37.8080, lng: -122.4100, radius: 150, type: 'territory' },
      { id: 'geo-3-drop-a', name: 'Gourmet Foods Inc', lat: 37.8054, lng: -122.4194, radius: 70, type: 'client' },
      { id: 'geo-3-drop-b', name: 'Marina Distribution Ltd', lat: 37.8084, lng: -122.4314, radius: 75, type: 'client' }
    ],
    points: [
      { lat: 37.8080, lng: -122.4100, name: 'Pier 39 Hub - Loading Cargo', isStop: true, stopName: 'Pier 39 Logistics Hub', durationMinutes: 30 },
      { lat: 37.8060, lng: -122.4140, name: 'Driving down Beach St' },
      { lat: 37.8054, lng: -122.4194, name: 'Delivering to Gourmet Foods Inc', isStop: true, stopName: 'Gourmet Foods Inc', durationMinutes: 20, clientIndex: 1 },
      { lat: 37.8070, lng: -122.4250, name: 'Driving near Fort Mason' },
      { lat: 37.8084, lng: -122.4314, name: 'Delivering to Marina Distribution Ltd', isStop: true, stopName: 'Marina Distribution Ltd', durationMinutes: 25, clientIndex: 2 },
      { lat: 37.8010, lng: -122.4280, name: 'Driving south on Fillmore St' },
      { lat: 37.7920, lng: -122.4220, name: 'Transit through Pacific Heights' },
      { lat: 37.7749, lng: -122.4194, name: 'HQ Office - Delivery drop-off complete', isStop: true, stopName: 'HQ Office', durationMinutes: 10 }
    ]
  },
  {
    id: 'emp-4',
    name: 'Carlos Ruiz',
    role: 'Field Service Specialist',
    department: 'Maintenance & Service',
    phone: '+1 (555) 041-3329',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    color: '#8b5cf6', // purple
    batteryStart: 95,
    baseSpeed: 20,
    email: 'carlos@fti.com',
    password: 'carlos123',
    organizationId: 'org-fti',
    employeeCode: 'EMP-2004',
    assignedManagerId: 'emp-1',
    isActive: true,
    geofences: [
      { id: 'geo-4-client-a', name: 'Western Power Grid', lat: 37.7712, lng: -122.4284, radius: 95, type: 'client' }
    ],
    points: [
      { lat: 37.7749, lng: -122.4194, name: 'HQ Office - Start Shift', isStop: true, stopName: 'HQ Office', durationMinutes: 10 },
      { lat: 37.7730, lng: -122.4240, name: 'Driving on Oak St' },
      { lat: 37.7712, lng: -122.4284, name: 'At Western Power Grid', isStop: true, stopName: 'Western Power Grid', durationMinutes: 40, clientIndex: 0 },
      // Spoofing Trigger Spot
      { lat: 37.7725, lng: -122.4320, name: 'Normal Transit near Alamo Square' }
    ]
  }
];

export const spoofingDestinations = [
  { lat: 37.8284, lng: -122.4794, name: 'Golden Gate Bridge (Spoofed!)' },
  { lat: 37.4275, lng: -122.1697, name: 'Stanford University (Spoofed!)' },
  { lat: 40.7128, lng: -74.0060, name: 'Times Square NYC (Impossible Teleport!)' }
];

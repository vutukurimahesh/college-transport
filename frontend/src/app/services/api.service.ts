import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Stop { name: string; time: string; }
export interface Bus {
  id: number; number: string; capacity: number;
  driverName: string; driverPhone: string; status: 'active' | 'maintenance';
}
export interface TransportRoute {
  id: number; name: string; busId: number | null; fare: number; stops: Stop[];
  busNumber: string; capacity: number; seatsLeft: number;
}
export type Status = 'pending' | 'approved' | 'rejected';
export interface Registration {
  id: number; name: string; rollNo: string; department: string; year: number;
  phone: string; email: string; routeId: number; routeName: string;
  stop: string; status: Status; createdAt: string;
}
export interface MyRequest { id: number; name: string; route: string; stop: string; status: Status; createdAt: string; }
export interface Stats { buses: number; routes: number; total: number; pending: number; approved: number; }

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  routes = () => this.http.get<TransportRoute[]>('/api/routes');
  saveRoute = (r: any, id?: number) => id ? this.http.put(`/api/routes/${id}`, r) : this.http.post('/api/routes', r);
  deleteRoute = (id: number) => this.http.delete(`/api/routes/${id}`);

  buses = () => this.http.get<Bus[]>('/api/buses');
  saveBus = (b: any, id?: number) => id ? this.http.put(`/api/buses/${id}`, b) : this.http.post('/api/buses', b);
  deleteBus = (id: number) => this.http.delete(`/api/buses/${id}`);

  register = (r: any) => this.http.post<{ id: number }>('/api/registrations', r);
  myRequests = (roll: string) => this.http.get<MyRequest[]>(`/api/registrations/status/${encodeURIComponent(roll)}`);
  registrations = () => this.http.get<Registration[]>('/api/registrations');
  setStatus = (id: number, status: Status) => this.http.patch(`/api/registrations/${id}`, { status });
  deleteRegistration = (id: number) => this.http.delete(`/api/registrations/${id}`);

  stats = () => this.http.get<Stats>('/api/stats');
}

export const errorText = (e: any) => e?.error?.message ?? 'Could not reach the server. Is the backend running on port 3000?';

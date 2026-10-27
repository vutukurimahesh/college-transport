import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApiService, Bus, Registration, Stats, Status, TransportRoute, errorText } from '../services/api.service';

type Tab = 'requests' | 'buses' | 'routes';
const blankBus = () => ({ number: '', capacity: 40, driverName: '', driverPhone: '', status: 'active' });
const blankRoute = () => ({ name: '', busId: null as number | null, fare: 9000, stopsText: '' });

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <section class="wrap">
      <h1>Transport office</h1>
      @if (stats(); as s) {
        <div class="stats">
          <div><strong>{{ s.pending }}</strong> waiting for a decision</div>
          <div><strong>{{ s.approved }}</strong> approved passes</div>
          <div><strong>{{ s.buses }}</strong> buses</div>
          <div><strong>{{ s.routes }}</strong> routes</div>
        </div>
      }
      <div class="tabs" role="tablist">
        <button [class.on]="tab() === 'requests'" (click)="tab.set('requests')">Requests</button>
        <button [class.on]="tab() === 'buses'" (click)="tab.set('buses')">Buses</button>
        <button [class.on]="tab() === 'routes'" (click)="tab.set('routes')">Routes</button>
      </div>
      @if (error()) { <p class="msg err">{{ error() }}</p> }

      @if (tab() === 'requests') {
        <div class="filters">
          <select [ngModel]="filter()" (ngModelChange)="filter.set($event)" aria-label="Filter by status">
            <option value="all">All requests</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div class="scroll">
          <table>
            <thead><tr><th>Student</th><th>Roll no.</th><th>Route / stop</th><th>Contact</th><th>Sent</th><th>Status</th><th></th></tr></thead>
            <tbody>
              @for (r of visible(); track r.id) {
                <tr>
                  <td>{{ r.name }}<br><span class="muted">{{ r.department }}, year {{ r.year }}</span></td>
                  <td>{{ r.rollNo }}</td>
                  <td>{{ r.routeName }}<br><span class="muted">{{ r.stop }}</span></td>
                  <td>{{ r.phone }}<br><span class="muted">{{ r.email }}</span></td>
                  <td>{{ r.createdAt | date: 'd MMM' }}</td>
                  <td><span class="pill {{ r.status }}">{{ r.status }}</span></td>
                  <td class="acts">
                    @if (r.status !== 'approved') { <button class="sm" (click)="setStatus(r, 'approved')">Approve</button> }
                    @if (r.status !== 'rejected') { <button class="sm ghost" (click)="setStatus(r, 'rejected')">Reject</button> }
                    <button class="sm ghost" (click)="removeReg(r)">Delete</button>
                  </td>
                </tr>
              } @empty { <tr><td colspan="7" class="empty">No requests here yet.</td></tr> }
            </tbody>
          </table>
        </div>
      }

      @if (tab() === 'buses') {
        <form class="form grid" (ngSubmit)="saveBus()">
          <label>Bus number <input name="n" [(ngModel)]="bus.number" required></label>
          <label>Seats <input name="c" type="number" min="1" [(ngModel)]="bus.capacity" required></label>
          <label>Driver <input name="d" [(ngModel)]="bus.driverName" required></label>
          <label>Driver phone <input name="p" [(ngModel)]="bus.driverPhone" required pattern="[0-9]{10}"></label>
          <label>Status
            <select name="s" [(ngModel)]="bus.status">
              <option value="active">Active</option><option value="maintenance">Under maintenance</option>
            </select>
          </label>
          <div class="acts">
            <button class="btn" type="submit">{{ busId() ? 'Save changes' : 'Add bus' }}</button>
            @if (busId()) { <button class="btn ghost" type="button" (click)="resetBus()">Cancel</button> }
          </div>
        </form>
        @for (b of buses(); track b.id) {
          <div class="card">
            <div><strong>{{ b.number }}</strong> · {{ b.capacity }} seats
              <p class="muted">{{ b.driverName }} · {{ b.driverPhone }}</p></div>
            <div class="acts">
              <span class="pill {{ b.status === 'active' ? 'approved' : 'rejected' }}">{{ b.status }}</span>
              <button class="sm" (click)="editBus(b)">Edit</button>
              <button class="sm ghost" (click)="removeBus(b)">Delete</button>
            </div>
          </div>
        }
      }

      @if (tab() === 'routes') {
        <form class="form" (ngSubmit)="saveRoute()">
          <div class="two">
            <label>Route name <input name="rn" [(ngModel)]="route.name" required></label>
            <label>Yearly fare (₹) <input name="rf" type="number" min="0" [(ngModel)]="route.fare" required></label>
          </div>
          <label>Bus
            <select name="rb" [(ngModel)]="route.busId">
              <option [ngValue]="null">No bus yet</option>
              @for (b of buses(); track b.id) { <option [ngValue]="b.id">{{ b.number }} ({{ b.capacity }} seats)</option> }
            </select>
          </label>
          <label>Stops, one per line as "Stop name, HH:MM" (the campus goes last)
            <textarea name="rs" rows="5" [(ngModel)]="route.stopsText" required placeholder="Market Road, 07:25&#10;Main Campus, 08:15"></textarea>
          </label>
          <div class="acts">
            <button class="btn" type="submit">{{ routeId() ? 'Save changes' : 'Add route' }}</button>
            @if (routeId()) { <button class="btn ghost" type="button" (click)="resetRoute()">Cancel</button> }
          </div>
        </form>
        @for (r of routes(); track r.id) {
          <div class="card">
            <div><strong>{{ r.name }}</strong> · ₹{{ r.fare }} · bus {{ r.busNumber }}
              <p class="muted">{{ r.stops.length }} stops · {{ r.seatsLeft }} of {{ r.capacity }} seats left</p></div>
            <div class="acts">
              <button class="sm" (click)="editRoute(r)">Edit</button>
              <button class="sm ghost" (click)="removeRoute(r)">Delete</button>
            </div>
          </div>
        }
      }
    </section>
  `,
})
export class AdminComponent {
  private api = inject(ApiService);
  tab = signal<Tab>('requests');
  error = signal('');
  stats = signal<Stats | null>(null);
  regs = signal<Registration[]>([]);
  buses = signal<Bus[]>([]);
  routes = signal<TransportRoute[]>([]);
  filter = signal('pending');

  bus: any = blankBus();
  busId = signal<number | null>(null);
  route = blankRoute();
  routeId = signal<number | null>(null);

  constructor() { this.load(); }

  visible() {
    return this.filter() === 'all' ? this.regs() : this.regs().filter((r) => r.status === this.filter());
  }

  load() {
    this.api.stats().subscribe((s) => this.stats.set(s));
    this.api.registrations().subscribe((r) => this.regs.set(r));
    this.api.buses().subscribe((b) => this.buses.set(b));
    this.api.routes().subscribe((r) => this.routes.set(r));
  }

  private run(obs: any, after?: () => void) {
    this.error.set('');
    obs.subscribe({
      next: () => { after?.(); this.load(); },
      error: (e: any) => this.error.set(errorText(e)),
    });
  }

  setStatus(r: Registration, status: Status) { this.run(this.api.setStatus(r.id, status)); }
  removeReg(r: Registration) { if (confirm(`Delete ${r.name}'s request?`)) this.run(this.api.deleteRegistration(r.id)); }

  saveBus() { this.run(this.api.saveBus(this.bus, this.busId() ?? undefined), () => this.resetBus()); }
  editBus(b: Bus) { this.busId.set(b.id); this.bus = { ...b }; }
  resetBus() { this.busId.set(null); this.bus = blankBus(); }
  removeBus(b: Bus) { if (confirm(`Delete bus ${b.number}?`)) this.run(this.api.deleteBus(b.id)); }

  saveRoute() {
    const stops = this.route.stopsText.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const i = l.lastIndexOf(',');
      return { name: l.slice(0, i).trim(), time: l.slice(i + 1).trim() };
    });
    const body = { name: this.route.name, busId: this.route.busId, fare: this.route.fare, stops };
    this.run(this.api.saveRoute(body, this.routeId() ?? undefined), () => this.resetRoute());
  }
  editRoute(r: TransportRoute) {
    this.routeId.set(r.id);
    this.route = { name: r.name, busId: r.busId, fare: r.fare, stopsText: r.stops.map((s) => `${s.name}, ${s.time}`).join('\n') };
  }
  resetRoute() { this.routeId.set(null); this.route = blankRoute(); }
  removeRoute(r: TransportRoute) { if (confirm(`Delete ${r.name}?`)) this.run(this.api.deleteRoute(r.id)); }
}

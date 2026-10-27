const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const db = require('./db');

const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'change-this-secret-before-deploying';

const app = express();
app.use(cors());
app.use(express.json());

/* ---------- password helpers (scrypt, no extra dependency) ---------- */
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(pw, salt, 64).toString('hex')}`;
}
function checkPassword(pw, stored) {
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(pw, salt, 64);
  return crypto.timingSafeEqual(test, Buffer.from(hash, 'hex'));
}

// Create the default admin on first run.
if (db.read('users').length === 0) {
  db.write('users', [{ id: 1, username: 'admin', password: hashPassword('admin123') }]);
  console.log('Created default admin  ->  username: admin   password: admin123');
}

/* ---------- auth middleware ---------- */
function requireAdmin(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Please log in as admin.' });
  }
}

/* ---------- helpers ---------- */
const approvedCount = (routeId) =>
  db.read('registrations').filter((r) => r.routeId === routeId && r.status === 'approved').length;

function decorateRoute(route) {
  const bus = db.read('buses').find((b) => b.id === route.busId);
  return {
    ...route,
    busNumber: bus ? bus.number : 'Unassigned',
    capacity: bus ? bus.capacity : 0,
    seatsLeft: bus ? Math.max(bus.capacity - approvedCount(route.id), 0) : 0,
  };
}

function validateStops(stops) {
  return (
    Array.isArray(stops) &&
    stops.length >= 2 &&
    stops.every((s) => s && String(s.name || '').trim() && /^([01]\d|2[0-3]):[0-5]\d$/.test(s.time))
  );
}

/* ---------- auth ---------- */
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = db.read('users').find((u) => u.username === username);
  if (!user || !checkPassword(String(password || ''), user.password)) {
    return res.status(401).json({ message: 'Wrong username or password.' });
  }
  const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: '8h' });
  res.json({ token, username: user.username });
});

/* ---------- routes (public read, admin write) ---------- */
app.get('/api/routes', (_req, res) => res.json(db.read('routes').map(decorateRoute)));

app.post('/api/routes', requireAdmin, (req, res) => {
  const { name, busId, fare, stops } = req.body || {};
  if (!String(name || '').trim() || !validateStops(stops) || !(Number(fare) >= 0)) {
    return res.status(400).json({ message: 'Enter a route name, a fare, and at least two stops with HH:MM times.' });
  }
  const routes = db.read('routes');
  const route = { id: db.nextId(routes), name: name.trim(), busId: Number(busId) || null, fare: Number(fare), stops };
  routes.push(route);
  db.write('routes', routes);
  res.status(201).json(decorateRoute(route));
});

app.put('/api/routes/:id', requireAdmin, (req, res) => {
  const routes = db.read('routes');
  const i = routes.findIndex((r) => r.id === Number(req.params.id));
  if (i < 0) return res.status(404).json({ message: 'Route not found.' });
  const { name, busId, fare, stops } = req.body || {};
  if (!String(name || '').trim() || !validateStops(stops) || !(Number(fare) >= 0)) {
    return res.status(400).json({ message: 'Enter a route name, a fare, and at least two stops with HH:MM times.' });
  }
  routes[i] = { ...routes[i], name: name.trim(), busId: Number(busId) || null, fare: Number(fare), stops };
  db.write('routes', routes);
  res.json(decorateRoute(routes[i]));
});

app.delete('/api/routes/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const inUse = db.read('registrations').some((r) => r.routeId === id && r.status !== 'rejected');
  if (inUse) return res.status(409).json({ message: 'Students are registered on this route. Reject or remove them first.' });
  db.write('routes', db.read('routes').filter((r) => r.id !== id));
  res.status(204).end();
});

/* ---------- buses (admin) ---------- */
app.get('/api/buses', requireAdmin, (_req, res) => res.json(db.read('buses')));

function busFromBody(body) {
  const { number, capacity, driverName, driverPhone, status } = body || {};
  if (!String(number || '').trim() || !(Number(capacity) > 0) || !String(driverName || '').trim()) return null;
  if (!/^\d{10}$/.test(String(driverPhone || ''))) return null;
  return {
    number: number.trim(),
    capacity: Number(capacity),
    driverName: driverName.trim(),
    driverPhone: String(driverPhone),
    status: status === 'maintenance' ? 'maintenance' : 'active',
  };
}

app.post('/api/buses', requireAdmin, (req, res) => {
  const data = busFromBody(req.body);
  if (!data) return res.status(400).json({ message: 'Enter bus number, capacity, driver name and a 10-digit driver phone.' });
  const buses = db.read('buses');
  const bus = { id: db.nextId(buses), ...data };
  buses.push(bus);
  db.write('buses', buses);
  res.status(201).json(bus);
});

app.put('/api/buses/:id', requireAdmin, (req, res) => {
  const buses = db.read('buses');
  const i = buses.findIndex((b) => b.id === Number(req.params.id));
  if (i < 0) return res.status(404).json({ message: 'Bus not found.' });
  const data = busFromBody(req.body);
  if (!data) return res.status(400).json({ message: 'Enter bus number, capacity, driver name and a 10-digit driver phone.' });
  buses[i] = { id: buses[i].id, ...data };
  db.write('buses', buses);
  res.json(buses[i]);
});

app.delete('/api/buses/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (db.read('routes').some((r) => r.busId === id)) {
    return res.status(409).json({ message: 'This bus is assigned to a route. Assign another bus first.' });
  }
  db.write('buses', db.read('buses').filter((b) => b.id !== id));
  res.status(204).end();
});

/* ---------- registrations ---------- */
app.post('/api/registrations', (req, res) => {
  const b = req.body || {};
  const data = {
    name: String(b.name || '').trim(),
    rollNo: String(b.rollNo || '').trim().toUpperCase(),
    department: String(b.department || '').trim(),
    year: Number(b.year),
    phone: String(b.phone || '').trim(),
    email: String(b.email || '').trim(),
    routeId: Number(b.routeId),
    stop: String(b.stop || '').trim(),
  };
  if (!data.name || !data.rollNo || !data.department || !(data.year >= 1 && data.year <= 4)) {
    return res.status(400).json({ message: 'Fill in name, roll number, department and year (1–4).' });
  }
  if (!/^\d{10}$/.test(data.phone)) return res.status(400).json({ message: 'Phone must be 10 digits.' });
  if (!/^\S+@\S+\.\S+$/.test(data.email)) return res.status(400).json({ message: 'Enter a valid email address.' });

  const route = db.read('routes').find((r) => r.id === data.routeId);
  if (!route) return res.status(400).json({ message: 'Choose a route.' });
  if (!route.stops.some((s) => s.name === data.stop)) return res.status(400).json({ message: 'Choose a stop on that route.' });

  const regs = db.read('registrations');
  if (regs.some((r) => r.rollNo === data.rollNo && r.status !== 'rejected')) {
    return res.status(409).json({ message: 'This roll number already has a bus pass request.' });
  }
  const reg = { id: db.nextId(regs), ...data, status: 'pending', createdAt: new Date().toISOString() };
  regs.push(reg);
  db.write('registrations', regs);
  res.status(201).json({ id: reg.id, status: reg.status });
});

// Public: students check their own request by roll number.
app.get('/api/registrations/status/:rollNo', (req, res) => {
  const roll = req.params.rollNo.trim().toUpperCase();
  const routes = db.read('routes');
  const list = db
    .read('registrations')
    .filter((r) => r.rollNo === roll)
    .map((r) => {
      const route = routes.find((x) => x.id === r.routeId);
      return { id: r.id, name: r.name, route: route ? route.name : 'Removed route', stop: r.stop, status: r.status, createdAt: r.createdAt };
    });
  res.json(list);
});

app.get('/api/registrations', requireAdmin, (_req, res) => {
  const routes = db.read('routes');
  const list = db
    .read('registrations')
    .map((r) => ({ ...r, routeName: (routes.find((x) => x.id === r.routeId) || {}).name || 'Removed route' }))
    .reverse();
  res.json(list);
});

app.patch('/api/registrations/:id', requireAdmin, (req, res) => {
  const { status } = req.body || {};
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Status must be pending, approved or rejected.' });
  }
  const regs = db.read('registrations');
  const reg = regs.find((r) => r.id === Number(req.params.id));
  if (!reg) return res.status(404).json({ message: 'Registration not found.' });

  if (status === 'approved' && reg.status !== 'approved') {
    const route = db.read('routes').find((r) => r.id === reg.routeId);
    const bus = route && db.read('buses').find((b) => b.id === route.busId);
    if (!bus) return res.status(409).json({ message: 'This route has no bus assigned.' });
    if (bus.status !== 'active') return res.status(409).json({ message: `Bus ${bus.number} is under maintenance.` });
    if (approvedCount(route.id) >= bus.capacity) return res.status(409).json({ message: `Bus ${bus.number} is full.` });
  }
  reg.status = status;
  db.write('registrations', regs);
  res.json(reg);
});

app.delete('/api/registrations/:id', requireAdmin, (req, res) => {
  db.write('registrations', db.read('registrations').filter((r) => r.id !== Number(req.params.id)));
  res.status(204).end();
});

/* ---------- dashboard numbers ---------- */
app.get('/api/stats', requireAdmin, (_req, res) => {
  const regs = db.read('registrations');
  res.json({
    buses: db.read('buses').length,
    routes: db.read('routes').length,
    total: regs.length,
    pending: regs.filter((r) => r.status === 'pending').length,
    approved: regs.filter((r) => r.status === 'approved').length,
  });
});

/* ---------- optional: serve the built Angular app ---------- */
const dist = path.join(__dirname, '..', 'frontend', 'dist', 'college-transport', 'browser');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use('/api', (_req, res) => res.status(404).json({ message: 'Not found.' }));

app.listen(PORT, () => console.log(`College Transport API running on http://localhost:${PORT}`));

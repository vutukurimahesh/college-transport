import { Routes } from '@angular/router';
import { adminGuard } from './services/auth.service';
import { HomeComponent } from './pages/home.component';
import { RegisterComponent } from './pages/register.component';
import { StatusComponent } from './pages/status.component';
import { LoginComponent } from './pages/login.component';
import { AdminComponent } from './pages/admin.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Bus routes · College Transport' },
  { path: 'register', component: RegisterComponent, title: 'Get a bus pass · College Transport' },
  { path: 'status', component: StatusComponent, title: 'Check request · College Transport' },
  { path: 'login', component: LoginComponent, title: 'Admin login · College Transport' },
  { path: 'admin', component: AdminComponent, canActivate: [adminGuard], title: 'Admin · College Transport' },
  { path: '**', redirectTo: '' },
];

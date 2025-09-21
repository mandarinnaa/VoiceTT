import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  mic, 
  time, 
  settings, 
  text, 
  language, 
  copy, 
  trash,
  stop,
  eye
} from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor() {
    // Registrar todos los iconos que uses en la aplicación
    addIcons({
      mic,
      time, 
      settings, 
      text, 
      language, 
      copy, 
      trash,
      stop,
      eye
    });
  }
}
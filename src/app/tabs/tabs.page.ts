import { Component, EnvironmentInjector, inject } from '@angular/core';
import { IonTabs } from '@ionic/angular/standalone';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: true,
  imports: [IonTabs], // Solo IonTabs, ya que es lo único que usas
})
export class TabsPage {
  public environmentInjector = inject(EnvironmentInjector);

  constructor() {}
}
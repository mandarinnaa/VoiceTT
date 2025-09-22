import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonHeader, IonToolbar, IonTitle,  IonContent, IonCard,IonCardHeader,IonCardTitle,IonCardContent,IonItem,IonLabel,IonSelect,IonSelectOption,IonButton,IonIcon,IonSpinner,IonChip,ToastController} from '@ionic/angular/standalone';
import { SpeechService } from '../services/speech';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [CommonModule,FormsModule,IonHeader,IonToolbar,IonTitle,IonContent,IonCard,IonCardHeader,IonCardTitle,IonCardContent,IonItem,IonLabel,IonSelect,IonSelectOption, IonButton, IonIcon, IonSpinner, IonChip]
})
export class Tab1Page implements OnInit {
  isRecording = false;
  isProcessing = false;
  statusMessage = "Presiona el botón para comenzar a grabar";
  originalText = "";
  translatedText = "";
  selectedLanguage = "en";
  supportedLanguages: any[] = [];
  recordingTime = 0;
  private recordingInterval: any;

  constructor(
    private speechService: SpeechService,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    this.supportedLanguages = await this.speechService.getSupportedLanguages();
    
    const savedLang = await this.speechService.getSavedLanguage();
    if (savedLang) {
      this.selectedLanguage = savedLang;
    }
  }
  
  async toggleRecording() {
    if (this.isRecording) {
      await this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  async startRecording() {
    try {
      this.isRecording = true;
      this.statusMessage = "Grabando... Presiona para detener";
      this.recordingTime = 0;
      
      this.recordingInterval = setInterval(() => {
        this.recordingTime++;
      }, 1000);

      await this.speechService.startRecording();
    } catch (error) {
      this.statusMessage = "Error al acceder al micrófono";
      this.isRecording = false;
      this.showToast("Error al iniciar la grabación");
      clearInterval(this.recordingInterval);
    }
  }
  
  getMicIcon(): string {
  if (this.isProcessing) {
    return 'cog-outline';
  } else if (this.isRecording) {
    return 'stop';
  } else {
    return 'mic';
  }
}

  async stopRecording() {
    this.isRecording = false;
    this.isProcessing = true;
    this.statusMessage = "Procesando audio...";
    
    clearInterval(this.recordingInterval);

    try {
      const audioBlob = await this.speechService.stopRecording();
      
      if (audioBlob) {
        await this.speechService.saveLanguagePreference(this.selectedLanguage);
        
        this.originalText = await this.speechService.speechToText(audioBlob);
        
        this.translatedText = await this.speechService.translateText(
          this.originalText, 
          this.selectedLanguage
        );
        
        await this.speechService.saveToHistory(
          this.originalText, 
          this.translatedText, 
          'es', 
          this.selectedLanguage
        );
        
        this.statusMessage = "¡Traducción completada!";
        this.showToast("Proceso finalizado con éxito");
      } else {
        this.statusMessage = "No se detectó audio";
        this.showToast("No se capturó audio en la grabación");
      }
    } catch (error: any) {
      console.error('Error:', error);
      this.statusMessage = "Error en el procesamiento";
      this.showToast("Error al procesar el audio: " + error.message);
    }
    
    this.isProcessing = false;
  }

  async copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast("Texto copiado al portapapeles");
    } catch (error) {
      console.error('Error copying text:', error);
      this.showToast("Error al copiar el texto");
    }
  }

  clearResults() {
    this.originalText = "";
    this.translatedText = "";
    this.statusMessage = "Presiona el botón para comenzar a grabar";
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }
}
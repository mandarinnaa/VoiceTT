import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Preferences } from '@capacitor/preferences';
import { VoiceRecorder, RecordingData } from 'capacitor-voice-recorder';
import { environment } from '../../environments/environment';
import { AlertController } from '@ionic/angular'; 

@Injectable({
  providedIn: 'root'
})
export class SpeechService {
  private apiKey = environment.googleApiKey;
  private speechToTextUrl = 'https://speech.googleapis.com/v1/speech:recognize';
  private translateUrl = 'https://translation.googleapis.com/language/translate/v2';

  constructor(
    private http: HttpClient,
    private alertController: AlertController 
  ) {
    this.initVoiceRecorder();
  }

  private async initVoiceRecorder() {
    try {
      const { value } = await VoiceRecorder.requestAudioRecordingPermission();
      if (!value) {
        throw new Error('Permisos de micrófono no concedidos');
      }
    } catch (error) {
      console.error('Error inicializando grabadora:', error);
      throw error;
    }
  }
  
  async startRecording(): Promise<boolean> {
    const { value } = await VoiceRecorder.canDeviceVoiceRecord();
    if (!value) throw new Error('El dispositivo no puede grabar audio');
    await VoiceRecorder.startRecording();
    return true;
  }

  async stopRecording(): Promise<Blob> {
    const recordingResult: RecordingData = await VoiceRecorder.stopRecording();
    if (recordingResult.value && recordingResult.value.recordDataBase64) {
      return this.base64ToBlob(recordingResult.value.recordDataBase64, 'audio/wav');
    }
    throw new Error('No se capturó audio en la grabación');
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      byteArrays.push(new Uint8Array(byteNumbers));
    }
    return new Blob(byteArrays, { type: mimeType });
  }

  async speechToText(audioBlob: Blob, languageCode: string = 'es-ES'): Promise<string> {
    if (!this.apiKey) throw new Error('API Key no configurada en environment');
    const audioBase64 = await this.blobToBase64(audioBlob);
    const base64Content = audioBase64.split(',')[1];

    const requestBody = {
      config: {
        encoding: 'FLAC',
        sampleRateHertz: 44100,
        languageCode,
        enableAutomaticPunctuation: true,
        useEnhanced: true,
        model: 'latest_short' 
      },
      audio: { content: base64Content }
    };

    const url = `${this.speechToTextUrl}?key=${this.apiKey}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const response: any = await this.http.post(url, requestBody, { headers }).toPromise();

    if (response.results?.length && response.results[0].alternatives[0].transcript) {
      return response.results[0].alternatives[0].transcript;
    }
    throw new Error('No se pudo transcribir el audio');
  }

  async translateText(text: string, targetLanguage: string = 'en'): Promise<string> {
    if (!this.apiKey) throw new Error('API Key no configurada en environment');
    const requestBody = { q: text, target: targetLanguage, format: 'text' };
    const url = `${this.translateUrl}?key=${this.apiKey}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const response: any = await this.http.post(url, requestBody, { headers }).toPromise();
    return response.data?.translations[0]?.translatedText || 'Error en traducción';
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async getSupportedLanguages(): Promise<any[]> {
    return [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Español' },
      { code: 'fr', name: 'Français' },
      { code: 'pt', name: 'Português' },
      { code: 'de', name: 'Deutsch' },
      { code: 'it', name: 'Italiano' }
    ];
  }

  async saveToHistory(original: string, translated: string, fromLang: string, toLang: string): Promise<void> {
    const { value } = await Preferences.get({ key: 'translationHistory' });
    let history = value ? JSON.parse(value) : [];
    history.unshift({ original, translated, fromLang, toLang, timestamp: new Date().toISOString() });
    history = history.slice(0, 20);
    await Preferences.set({ key: 'translationHistory', value: JSON.stringify(history) });
  }

  async getHistory(): Promise<any[]> {
    const { value } = await Preferences.get({ key: 'translationHistory' });
    return value ? JSON.parse(value) : [];
  }

  async clearHistory(): Promise<void> {
    await Preferences.remove({ key: 'translationHistory' });
  }

  async saveLanguagePreference(languageCode: string): Promise<void> {
    await Preferences.set({ key: 'selectedLanguage', value: languageCode });
  }

  async getSavedLanguage(): Promise<string | null> {
    const { value } = await Preferences.get({ key: 'selectedLanguage' });
    return value;
  }
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Preferences } from '@capacitor/preferences';
import { VoiceRecorder, RecordingData } from 'capacitor-voice-recorder';

@Injectable({
  providedIn: 'root'
})
export class SpeechService {
  private apiKey = 'https://39938732469-ocv6q14j2etlnsr9116t7oeoo085m8p3.apps.googleusercontent.com'; 
  private speechToTextUrl = 'https://speech.googleapis.com/v1/speech:recognize';
  private translateUrl = 'https://translation.googleapis.com/language/translate/v2';

  constructor(private http: HttpClient) {
    this.initVoiceRecorder();
  }

  private async initVoiceRecorder() {
    try {
      await VoiceRecorder.requestAudioRecordingPermission();
    } catch (error) {
      console.error('Error initializing voice recorder:', error);
    }
  }

  async startRecording(): Promise<boolean> {
    try {
      const { value } = await VoiceRecorder.canDeviceVoiceRecord();
      if (!value) {
        throw new Error('El dispositivo no puede grabar audio');
      }

      await VoiceRecorder.startRecording();
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<Blob> {
    try {
      const recordingResult: RecordingData = await VoiceRecorder.stopRecording();
      
      if (recordingResult.value && recordingResult.value.recordDataBase64) {
        const audioBlob = this.base64ToBlob(recordingResult.value.recordDataBase64, 'audio/wav');
        return audioBlob;
      }
      throw new Error('No se encontraron datos de grabación');
    } catch (error) {
      console.error('Error stopping recording:', error);
      throw error;
    }
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
      
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    
    return new Blob(byteArrays, { type: mimeType });
  }

  async speechToText(audioBlob: Blob, languageCode: string = 'es-ES'): Promise<string> {
    try {
      await this.delay(2000); 
      
   
      const audioBase64 = await this.blobToBase64(audioBlob);
      
      const requestBody = {
        config: {
          encoding: 'LINEAR16',
          sampleRateHertz: 44100,
          languageCode: languageCode,
          maxAlternatives: 1
        },
        audio: {
          content: audioBase64.split(',')[1]
        }
      };

      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey
      });

      const response: any = await this.http.post(`${this.speechToTextUrl}?key=${this.apiKey}`, requestBody, { headers }).toPromise();
      
      if (response.results && response.results.length > 0) {
        return response.results[0].alternatives[0].transcript;
      } else {
        throw new Error('No se encontraron resultados de transcripción');
      }
    
    } catch (error) {
      console.error('Error en speech to text:', error);
      throw new Error('Error al transcribir el audio');
    }
  }

  async translateText(text: string, targetLanguage: string = 'en'): Promise<string> {
    try {
      await this.delay(1500); 
    
      const requestBody = {
        q: text,
        target: targetLanguage,
        format: 'text'
      };

      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey
      });

      const response: any = await this.http.post(`${this.translateUrl}?key=${this.apiKey}`, requestBody, { headers }).toPromise();
      
      if (response.data && response.data.translations.length > 0) {
        return response.data.translations[0].translatedText;
      } else {
        throw new Error('No se encontraron resultados de traducción');
      }
    
    } catch (error) {
      console.error('Error en traducción:', error);
      throw new Error('Error al traducir el texto');
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getSupportedLanguages(): Promise<any[]> {
    return [
      { code: 'en', name: 'English', emoji: '🇺🇸' },
      { code: 'es', name: 'Español', emoji: '🇪🇸' },
      { code: 'fr', name: 'Français', emoji: '🇫🇷' },
      { code: 'pt', name: 'Português', emoji: '🇵🇹' },
    ];
  }

  async saveToHistory(original: string, translated: string, fromLang: string, toLang: string): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: 'translationHistory' });
      let history = value ? JSON.parse(value) : [];
      
      history.unshift({
        original,
        translated,
        fromLang,
        toLang,
        timestamp: new Date().toISOString()
      });

      history = history.slice(0, 20);
      
      await Preferences.set({ 
        key: 'translationHistory', 
        value: JSON.stringify(history) 
      });
    } catch (error) {
      console.error('Error saving to history:', error);
    }
  }

  async getHistory(): Promise<any[]> {
    try {
      const { value } = await Preferences.get({ key: 'translationHistory' });
      return value ? JSON.parse(value) : [];
    } catch (error) {
      console.error('Error getting history:', error);
      return [];
    }
  }

  async clearHistory(): Promise<void> {
    try {
      await Preferences.remove({ key: 'translationHistory' });
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  }

  async saveLanguagePreference(languageCode: string): Promise<void> {
    try {
      await Preferences.set({ 
        key: 'selectedLanguage', 
        value: languageCode 
      });
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  }

  async getSavedLanguage(): Promise<string | null> {
    try {
      const { value } = await Preferences.get({ key: 'selectedLanguage' });
      return value;
    } catch (error) {
      console.error('Error getting saved language:', error);
      return null;
    }
  }
}
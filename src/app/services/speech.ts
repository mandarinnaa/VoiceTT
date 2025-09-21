import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Preferences } from '@capacitor/preferences';
import { VoiceRecorder, RecordingData } from 'capacitor-voice-recorder';

@Injectable({
  providedIn: 'root'
})
export class SpeechService {
  private apiKey = 'AIzaSyAIz1AtvAVZqkJvwY1KFt4xN-jMFsVgdrQ';
  private speechToTextUrl = 'https://speech.googleapis.com/v1/speech:recognize';
  private translateUrl = 'https://translation.googleapis.com/language/translate/v2';

  constructor(private http: HttpClient) {
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
    try {
      const { value } = await VoiceRecorder.canDeviceVoiceRecord();
      if (!value) {
        throw new Error('El dispositivo no puede grabar audio');
      }

      await VoiceRecorder.startRecording();
      return true;
    } catch (error) {
      console.error('Error iniciando grabación:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<Blob> {
    try {
      const recordingResult: RecordingData = await VoiceRecorder.stopRecording();
      
      if (recordingResult.value && recordingResult.value.recordDataBase64) {
        const audioBlob = this.base64ToBlob(
          recordingResult.value.recordDataBase64, 
          'audio/wav'
        );
        return audioBlob;
      }
      throw new Error('No se capturó audio en la grabación');
    } catch (error) {
      console.error('Error deteniendo grabación:', error);
      throw error;
    }
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    try {
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
    } catch (error) {
      console.error('Error convirtiendo base64 a Blob:', error);
      throw new Error('Error procesando el audio grabado');
    }
  }

  async speechToText(audioBlob: Blob, languageCode: string = 'es-ES'): Promise<string> {
    try {
      console.log('Enviando audio a Google Speech-to-Text...');
      
      const audioBase64 = await this.blobToBase64(audioBlob);
      
      const requestBody = {
        config: {
          encoding: 'LINEAR16',
          sampleRateHertz: 44100,
          languageCode: languageCode,
          model: 'default',
          enableAutomaticPunctuation: true
        },
        audio: {
          content: audioBase64.split(',')[1]
        }
      };

      const headers = new HttpHeaders({
        'Content-Type': 'application/json'
      });

      const url = `${this.speechToTextUrl}?key=${this.apiKey}`;
      console.log('📡 Enviando solicitud a:', url);
      
      const response: any = await this.http.post(url, requestBody, { headers }).toPromise();
      
      if (response.results && response.results.length > 0 && response.results[0].alternatives[0].transcript) {
        const transcript = response.results[0].alternatives[0].transcript;
        console.log('Transcripción exitosa:', transcript);
        return transcript;
      } else {
        console.warn(' No se encontraron resultados de transcripción:', response);
        throw new Error('No se pudo transcribir el audio');
      }
    } catch (error: any) { 
      console.error('❌ Error en speech to text:', error);
      if (error.error) {
        console.error('Detalles del error:', error.error);
      }
      throw new Error('Error al transcribir el audio. Verifica tu API key');
    }
  }

  async translateText(text: string, targetLanguage: string = 'en'): Promise<string> {
    try {
      console.log(' Traduciendo texto a', targetLanguage);
      
      const requestBody = {
        q: text,
        target: targetLanguage,
        format: 'text'
      };

      const headers = new HttpHeaders({
        'Content-Type': 'application/json'
      });

      const url = `${this.translateUrl}?key=${this.apiKey}`;
      const response: any = await this.http.post(url, requestBody, { headers }).toPromise();
      
      if (response.data && response.data.translations.length > 0) {
        const translation = response.data.translations[0].translatedText;
        console.log(' Traducción exitosa:', translation);
        return translation;
      } else {
        throw new Error('No se encontraron resultados de traducción');
      }
    } catch (error: any) { 
      console.error('❌ Error en traducción:', error);
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

  async getSupportedLanguages(): Promise<any[]> {
    return [
      { code: 'en', name: 'English', emoji: '🇺🇸' },
      { code: 'es', name: 'Español', emoji: '🇪🇸' },
      { code: 'fr', name: 'Français', emoji: '🇫🇷' },
      { code: 'pt', name: 'Português', emoji: '🇵🇹' },
      { code: 'de', name: 'Deutsch', emoji: '🇩🇪' },
      { code: 'it', name: 'Italiano', emoji: '🇮🇹' }
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
      console.error('Error guardando en historial:', error);
    }
  }

  async getHistory(): Promise<any[]> {
    try {
      const { value } = await Preferences.get({ key: 'translationHistory' });
      return value ? JSON.parse(value) : [];
    } catch (error) {
      console.error('Error obteniendo historial:', error);
      return [];
    }
  }

  async clearHistory(): Promise<void> {
    try {
      await Preferences.remove({ key: 'translationHistory' });
    } catch (error) {
      console.error('Error limpiando historial:', error);
    }
  }

  async saveLanguagePreference(languageCode: string): Promise<void> {
    try {
      await Preferences.set({ 
        key: 'selectedLanguage', 
        value: languageCode 
      });
    } catch (error) {
      console.error('Error guardando preferencia de idioma:', error);
    }
  }

  async getSavedLanguage(): Promise<string | null> {
    try {
      const { value } = await Preferences.get({ key: 'selectedLanguage' });
      return value;
    } catch (error) {
      console.error('Error obteniendo idioma guardado:', error);
      return null;
    }
  }
}
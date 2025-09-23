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
        // CAMBIADO: Usar audio/webm en lugar de audio/wav
        const audioBlob = this.base64ToBlob(
          recordingResult.value.recordDataBase64, 
          'audio/webm'  // ← Cambio importante aquí
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
      console.log('📁 Tamaño del audio blob:', audioBlob.size);
      console.log('🎵 Tipo de audio blob:', audioBlob.type);
      console.log('📡 Enviando audio a Google Speech-to-Text...');
      
      if (!this.apiKey) {
        throw new Error('API Key no configurada en environment');
      }

      const audioBase64 = await this.blobToBase64(audioBlob);
      const base64Content = audioBase64.split(',')[1];
      
      console.log('📏 Longitud del base64:', base64Content.length);
      console.log('🔤 Primeros 50 caracteres:', base64Content.substring(0, 50));
      
      // CONFIGURACIÓN CORREGIDA - Esto soluciona el error "bad encoding"
      const requestBody = {
        config: {
          // CAMBIOS PRINCIPALES:
          encoding: 'WEBM_OPUS' as const,    // ← Cambio de LINEAR16 a WEBM_OPUS
          sampleRateHertz: 16000,             // ← Cambio de 48000 a 16000
          audioChannelCount: 1,               // ← Añadido: especifica mono
          languageCode: languageCode,
          enableAutomaticPunctuation: true,
          useEnhanced: true,
          model: 'latest_short',
          // Configuraciones adicionales para mejor reconocimiento
          enableWordTimeOffsets: false,
          enableWordConfidence: true,
          maxAlternatives: 1,
          profanityFilter: false
        },
        audio: {
          content: base64Content
        }
      };

      const headers = new HttpHeaders({
        'Content-Type': 'application/json'
      });

      const url = `${this.speechToTextUrl}?key=${this.apiKey}`;
      console.log('📡 Enviando solicitud a Speech API con configuración corregida');
      console.log('⚙️ Configuración:', JSON.stringify(requestBody.config, null, 2));
      
      const response: any = await this.http.post(url, requestBody, { headers }).toPromise();
      
      if (response.results && response.results.length > 0 && response.results[0].alternatives[0].transcript) {
        const transcript = response.results[0].alternatives[0].transcript;
        const confidence = response.results[0].alternatives[0].confidence || 0;
        console.log('✅ Transcripción exitosa:', transcript);
        console.log('🎯 Confianza:', (confidence * 100).toFixed(1) + '%');
        return transcript;
      } else {
        console.warn('⚠️ No se encontraron resultados de transcripción:', response);
        throw new Error('No se pudo transcribir el audio. Intenta grabar nuevamente con más claridad.');
      }
    } catch (error: any) { 
      console.error('❌ Error en speech to text:', error);
      console.error('📊 Status:', error.status);
      console.error('🔍 Error response:', JSON.stringify(error.error, null, 2));
      
      if (error.error && error.error.error) {
        const errorMessage = error.error.error.message;
        console.error('💬 Mensaje específico:', errorMessage);
        
        // Mensajes de error más específicos
        if (errorMessage.includes('bad encoding')) {
          throw new Error('Error de codificación de audio. Verifica que el micrófono funcione correctamente.');
        } else if (errorMessage.includes('invalid sample rate')) {
          throw new Error('Error de frecuencia de audio. Reinicia la aplicación e intenta nuevamente.');
        } else {
          throw new Error(`Error de API: ${errorMessage}`);
        }
      }
      
      throw new Error('Error al transcribir el audio. Verifica tu conexión a internet y vuelve a intentar.');
    }
  }

  async translateText(text: string, targetLanguage: string = 'en'): Promise<string> {
    try {
      console.log('🌍 Traduciendo texto a', targetLanguage);
      
      if (!this.apiKey) {
        throw new Error('API Key no configurada en environment');
      }
      
      const requestBody = {
        q: text,
        target: targetLanguage,
        format: 'text'
      };

      const headers = new HttpHeaders({
        'Content-Type': 'application/json'
      });

      const url = `${this.translateUrl}?key=${this.apiKey}`;
      console.log('📡 Enviando solicitud a Translation API');
      
      const response: any = await this.http.post(url, requestBody, { headers }).toPromise();
      
      if (response.data && response.data.translations.length > 0) {
        const translation = response.data.translations[0].translatedText;
        console.log('✅ Traducción exitosa:', translation);
        return translation;
      } else {
        throw new Error('No se encontraron resultados de traducción');
      }
    } catch (error: any) { 
      console.error('❌ Error en traducción:', error);
      console.error('📊 Status:', error.status);
      console.error('🔍 Error response:', JSON.stringify(error.error, null, 2));
      
      if (error.error && error.error.error) {
        console.error('💬 Mensaje específico:', error.error.error.message);
        throw new Error(`Error de traducción: ${error.error.error.message}`);
      }
      
      throw new Error('Error al traducir el texto. Verifica la configuración de la API');
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
      
      console.log('💾 Guardado en historial exitosamente');
    } catch (error) {
      console.error('❌ Error guardando en historial:', error);
    }
  }

  async getHistory(): Promise<any[]> {
    try {
      const { value } = await Preferences.get({ key: 'translationHistory' });
      return value ? JSON.parse(value) : [];
    } catch (error) {
      console.error('❌ Error obteniendo historial:', error);
      return [];
    }
  }

  async clearHistory(): Promise<void> {
    try {
      await Preferences.remove({ key: 'translationHistory' });
      console.log('🗑️ Historial limpiado exitosamente');
    } catch (error) {
      console.error('❌ Error limpiando historial:', error);
    }
  }

  async saveLanguagePreference(languageCode: string): Promise<void> {
    try {
      await Preferences.set({ 
        key: 'selectedLanguage', 
        value: languageCode 
      });
      console.log('💾 Preferencia de idioma guardada:', languageCode);
    } catch (error) {
      console.error('❌ Error guardando preferencia de idioma:', error);
    }
  }

  async getSavedLanguage(): Promise<string | null> {
    try {
      const { value } = await Preferences.get({ key: 'selectedLanguage' });
      return value;
    } catch (error) {
      console.error('❌ Error obteniendo idioma guardado:', error);
      return null;
    }
  }
}
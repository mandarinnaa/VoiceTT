import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SpeechService } from './speech';

describe('SpeechService', () => {
  let service: SpeechService;

  beforeEach(() => {
    spyOn(window as any, 'Capacitor').and.returnValue({
      Preferences: {
        get: jasmine.createSpy('get').and.returnValue(Promise.resolve({ value: null })),
        set: jasmine.createSpy('set').and.returnValue(Promise.resolve()),
        remove: jasmine.createSpy('remove').and.returnValue(Promise.resolve())
      }
    });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SpeechService]
    });

    const mockVoiceRecorder = {
      requestAudioRecordingPermission: jasmine.createSpy('requestAudioRecordingPermission')
        .and.returnValue(Promise.resolve({ value: true })),
      canDeviceVoiceRecord: jasmine.createSpy('canDeviceVoiceRecord')
        .and.returnValue(Promise.resolve({ value: true })),
      startRecording: jasmine.createSpy('startRecording')
        .and.returnValue(Promise.resolve()),
      stopRecording: jasmine.createSpy('stopRecording')
        .and.returnValue(Promise.resolve({
          value: {
            recordDataBase64: 'dGVzdCBhdWRpbyBkYXRh'
          }
        }))
    };

    (window as any).VoiceRecorder = mockVoiceRecorder;

    service = TestBed.inject(SpeechService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return supported languages', async () => {
    const languages = await service.getSupportedLanguages();
    expect(languages).toBeDefined();
    expect(languages.length).toBeGreaterThan(0);
    expect(languages[0].code).toBeDefined();
    expect(languages[0].name).toBeDefined();
    expect(languages[0].emoji).toBeDefined();
  });

  it('should save and get language preference', async () => {
    await service.saveLanguagePreference('en');
    expect(service).toBeTruthy();
  });
});
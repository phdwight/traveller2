import { describe, it, expect, beforeEach } from 'vitest';
import { VideoRecordingService } from '../services/VideoRecordingService';

describe('VideoRecordingService', () => {
  let service: VideoRecordingService;

  beforeEach(() => {
    service = new VideoRecordingService();
  });

  describe('constructor', () => {
    it('should create service with recording disabled', () => {
      expect(service.getIsRecording()).toBe(false);
    });
  });

  describe('getIsRecording', () => {
    it('should return false initially', () => {
      expect(service.getIsRecording()).toBe(false);
    });
  });

  describe('downloadVideo', () => {
    it('should create download link with default filename', () => {
      const blob = new Blob(['test'], { type: 'video/webm' });
      
      // Mock DOM methods
      const createElement = document.createElement.bind(document);
      const appendChildSpy = vi.fn();
      const removeChildSpy = vi.fn();
      
      document.createElement = vi.fn((tag) => {
        if (tag === 'a') {
          const element = createElement(tag) as HTMLAnchorElement;
          element.click = vi.fn();
          return element;
        }
        return createElement(tag);
      });
      
      document.body.appendChild = appendChildSpy;
      document.body.removeChild = removeChildSpy;
      
      URL.createObjectURL = vi.fn(() => 'blob:test-url');
      URL.revokeObjectURL = vi.fn();
      
      service.downloadVideo(blob);
      
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    });

    it('should use custom filename when provided', () => {
      const blob = new Blob(['test'], { type: 'video/webm' });
      
      let downloadAttr = '';
      
      document.createElement = vi.fn((tag) => {
        if (tag === 'a') {
          const element = {
            href: '',
            click: vi.fn(),
            set download(value: string) {
              downloadAttr = value;
            },
            get download() {
              return downloadAttr;
            }
          } as unknown as HTMLAnchorElement;
          return element;
        }
        return document.createElement(tag);
      });
      
      document.body.appendChild = vi.fn();
      document.body.removeChild = vi.fn();
      URL.createObjectURL = vi.fn(() => 'blob:test-url');
      URL.revokeObjectURL = vi.fn();
      
      service.downloadVideo(blob, 'custom-video.webm');
      
      expect(downloadAttr).toBe('custom-video.webm');
    });
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { SoundService } from '../services/SoundService';

describe('SoundService', () => {
  let soundService: SoundService;

  beforeEach(() => {
    soundService = new SoundService();
  });

  describe('constructor', () => {
    it('should create service with sound disabled by default', () => {
      expect(soundService.isEnabled()).toBe(false);
    });

    it('should create service with sound enabled if specified', () => {
      const service = new SoundService(true);
      expect(service.isEnabled()).toBe(true);
    });
  });

  describe('setEnabled', () => {
    it('should enable sound', () => {
      soundService.setEnabled(true);
      expect(soundService.isEnabled()).toBe(true);
    });

    it('should disable sound', () => {
      soundService.setEnabled(true);
      soundService.setEnabled(false);
      expect(soundService.isEnabled()).toBe(false);
    });
  });

  describe('isEnabled', () => {
    it('should return current enabled state', () => {
      expect(soundService.isEnabled()).toBe(false);
      
      soundService.setEnabled(true);
      expect(soundService.isEnabled()).toBe(true);
    });
  });

  describe('play', () => {
    it('should not throw when sound is disabled', () => {
      expect(() => soundService.play('start')).not.toThrow();
    });

    it('should accept all sound types', () => {
      expect(() => soundService.play('start')).not.toThrow();
      expect(() => soundService.play('segment')).not.toThrow();
      expect(() => soundService.play('complete')).not.toThrow();
    });
  });
});

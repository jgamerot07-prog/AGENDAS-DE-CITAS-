import { describe, expect, it } from 'vitest';
import { addDays, dateParts, formatDuration, formatPrice, formatTime, todayInColombia } from './format';

describe('utilidades de formato', () => {
  it('formatea precios en pesos colombianos', () => {
    expect(formatPrice(20000).replace(/\s/g, ' ')).toBe('$ 20.000');
  });

  it('formatea duraciones', () => {
    expect(formatDuration(30)).toBe('30 min');
    expect(formatDuration(60)).toBe('1 h');
    expect(formatDuration(90)).toBe('1 h 30 min');
  });

  it('muestra la hora en zona horaria de Colombia', () => {
    // 14:00 UTC son las 9:00 a. m. en Colombia
    expect(formatTime('2026-11-02T14:00:00.000Z')).toMatch(/^9:00/);
  });

  it('calcula la fecha de hoy en Colombia, no en UTC', () => {
    // 2 de noviembre a las 3:00 UTC todavía es 1 de noviembre en Colombia
    expect(todayInColombia(new Date('2026-11-02T03:00:00Z'))).toBe('2026-11-01');
  });

  it('suma días cruzando meses', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
  });

  it('separa las partes de una fecha', () => {
    expect(dateParts('2026-11-02')).toEqual({ weekday: 'lun', day: '2', month: 'nov' });
  });
});

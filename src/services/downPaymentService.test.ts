import { describe, expect, it, vi } from 'vitest';

describe('down payment service in demo mode', () => {
  it('uses browser-safe demo storage for deposits', async () => {
    vi.stubGlobal('__TAURI__', undefined);
    vi.stubGlobal('__TAURI_INTERNALS__', undefined);

    const { downPaymentService } = await import('./downPaymentService');

    const existing = await downPaymentService.getByClientId('demo-client-acme');
    const initialTotal = await downPaymentService.getTotalByClientId('demo-client-acme');

    expect(existing.length).toBeGreaterThan(0);
    expect(initialTotal).toBeGreaterThan(0);

    const created = await downPaymentService.create({
      clientId: 'demo-client-acme',
      projectId: 'demo-project-brand',
      amount: 125,
      paymentDate: '2026-06-02',
      notes: 'Browser-mode deposit',
    });

    await expect(downPaymentService.getById(created.id)).resolves.toEqual(
      expect.objectContaining({ amount: 125 }),
    );

    await downPaymentService.update(created.id, { amount: 175 });
    await expect(downPaymentService.getById(created.id)).resolves.toEqual(
      expect.objectContaining({ amount: 175 }),
    );

    await expect(downPaymentService.delete(created.id)).resolves.toBe(true);
    await expect(downPaymentService.getById(created.id)).resolves.toBeNull();
  });
});

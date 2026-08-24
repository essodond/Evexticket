import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  getCompanyStats: vi.fn(),
  getScheduledTrips: vi.fn(),
  getCompanyTickets: vi.fn(),
  getCities: vi.fn(),
}));

vi.mock('../services/api', () => ({ default: apiMocks }));
vi.mock('./CompanyLayout', () => ({
  useCompanyPortal: () => ({ companyId: '42', company: { name: 'Test Express' } }),
}));
vi.mock('./AddTripModal', () => ({ default: () => null }));
vi.mock('./AgencyPerformance', () => ({ default: () => null }));
vi.mock('./RecentReservations', () => ({ default: () => null }));
vi.mock('./RecentTripsTable', () => ({ default: () => null }));
vi.mock('./SalesAnalytics', () => ({ default: () => null }));
vi.mock('./ui/KPICard', () => ({ default: ({ title }: { title: string }) => <div>{title}</div> }));
vi.mock('./company/CompanyPageShell', () => ({
  default: ({ title, actions, children }: React.PropsWithChildren<{ title: string; actions?: React.ReactNode }>) => (
    <main><h1>{title}</h1>{actions}{children}</main>
  ),
}));

import CompanyDashboard from './CompanyDashboard';

const stats = {
  scheduled_trips: 1,
  total_bookings: 2,
  mobile_bookings: 1,
  guichet_sales: 1,
  total_revenue: 12000,
  mobile_revenue: 6000,
  guichet_revenue: 6000,
  average_occupancy: 0.2,
  active_clients: 2,
  agency_performance: [],
  sales_analytics: [],
  recent_guichet_sales: [],
};

const flushRequests = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('CompanyDashboard realtime refresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.values(apiMocks).forEach((mock) => mock.mockReset());
    apiMocks.getCompanyStats.mockResolvedValue(stats);
    apiMocks.getScheduledTrips.mockResolvedValue([]);
    apiMocks.getCompanyTickets.mockResolvedValue([]);
    apiMocks.getCities.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('polls live sales every 10 seconds without reloading the heavier trip list', async () => {
    const view = render(<MemoryRouter><CompanyDashboard /></MemoryRouter>);
    await flushRequests();

    expect(apiMocks.getCompanyStats).toHaveBeenCalledTimes(1);
    expect(apiMocks.getCompanyTickets).toHaveBeenCalledWith({ limit: 12, valid_sales: true });
    expect(apiMocks.getScheduledTrips).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    await flushRequests();

    expect(apiMocks.getCompanyStats).toHaveBeenCalledTimes(2);
    expect(apiMocks.getCompanyTickets).toHaveBeenCalledTimes(2);
    expect(apiMocks.getScheduledTrips).toHaveBeenCalledTimes(1);

    view.unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    expect(apiMocks.getCompanyStats).toHaveBeenCalledTimes(2);
  });

  it('forces all dashboard blocks to refresh from the manual control', async () => {
    render(<MemoryRouter><CompanyDashboard /></MemoryRouter>);
    await flushRequests();

    fireEvent.click(screen.getByRole('button', { name: /actualiser/i }));
    await flushRequests();

    expect(apiMocks.getCompanyStats).toHaveBeenCalledTimes(2);
    expect(apiMocks.getCompanyTickets).toHaveBeenCalledTimes(2);
    expect(apiMocks.getScheduledTrips).toHaveBeenCalledTimes(2);
  });

  it('uses the custom pull gesture and cancels the browser native pull refresh', async () => {
    const { container } = render(<MemoryRouter><CompanyDashboard /></MemoryRouter>);
    await flushRequests();
    const dashboard = container.firstElementChild as HTMLElement;

    const start = new Event('touchstart', { bubbles: true, cancelable: true });
    Object.defineProperty(start, 'touches', { value: [{ clientX: 40, clientY: 10 }] });
    const move = new Event('touchmove', { bubbles: true, cancelable: true });
    Object.defineProperty(move, 'touches', { value: [{ clientX: 42, clientY: 60 }] });
    await act(async () => {
      dashboard.dispatchEvent(start);
      dashboard.dispatchEvent(move);
    });
    expect(move.defaultPrevented).toBe(true);
    const end = new Event('touchend', { bubbles: true, cancelable: true });
    Object.defineProperty(end, 'changedTouches', { value: [{ clientX: 42, clientY: 100 }] });
    await act(async () => {
      dashboard.dispatchEvent(end);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(apiMocks.getScheduledTrips).toHaveBeenCalledTimes(2);
  });
});

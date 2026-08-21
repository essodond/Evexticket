import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AddTripModal from './AddTripModal';
import apiService from '../services/api';

vi.mock('../services/api', () => ({
  default: {
    createTrip: vi.fn(),
    createScheduledTrip: vi.fn(),
    updateTrip: vi.fn(),
    updateScheduledTrip: vi.fn(),
  },
}));

describe('AddTripModal with CockroachDB IDs', () => {
  const departureId = '1200803787052744701';
  const arrivalId = '1200803787868274703';
  const stopId = '1200803788000000005';
  const companyId = '1200803786000000001';
  const createdTripId = '1200803789000000001';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiService.createTrip).mockResolvedValue({ id: createdTripId } as any);
    vi.mocked(apiService.createScheduledTrip).mockResolvedValue({ id: '1200803790000000001' } as any);
  });

  it('preserves every large ID through trip and scheduled-trip creation', async () => {
    const user = userEvent.setup();

    render(
      <AddTripModal
        isOpen
        onClose={vi.fn()}
        onSave={vi.fn()}
        editingTrip={null}
        companyId={companyId}
        cities={[
          { id: departureId, name: 'Lomé' },
          { id: arrivalId, name: 'Kara' },
          { id: stopId, name: 'Sokodé' },
        ]}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/Ville de départ/), departureId);
    await user.selectOptions(screen.getByLabelText(/Ville d'arrivée/), arrivalId);
    fireEvent.change(screen.getByLabelText(/Heure de départ/), { target: { value: '08:00' } });
    fireEvent.change(screen.getByLabelText(/Heure d'arrivée/), { target: { value: '10:00' } });
    fireEvent.change(screen.getByLabelText(/Date du voyage/), { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByLabelText(/Prix \(FCFA\)/), { target: { value: '7500' } });
    await user.click(screen.getByRole('button', { name: 'Ajouter un arrêt' }));
    await user.selectOptions(screen.getAllByRole('combobox')[3], stopId);
    await user.click(screen.getByRole('button', { name: 'Créer' }));

    await waitFor(() => expect(apiService.createTrip).toHaveBeenCalledOnce());
    expect(apiService.createTrip).toHaveBeenCalledWith(expect.objectContaining({
      company: companyId,
      departure_city: departureId,
      arrival_city: arrivalId,
      stops: [expect.objectContaining({ city: stopId })],
    }));
    await waitFor(() => expect(apiService.createScheduledTrip).toHaveBeenCalledOnce());
    expect(apiService.createScheduledTrip).toHaveBeenCalledWith(expect.objectContaining({
      trip: createdTripId,
    }));
  });
});

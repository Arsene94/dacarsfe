import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import HeroSection from '@/components/HeroSectionClient';
import FleetSection from '@/components/FleetSection';
import ContactSection from '@/components/ContactSection';
import HomePageClient from '@/components/home/HomePageClient';
import { BookingContext, defaultBooking } from '@/context/booking-store';
import { LocaleProvider } from '@/context/LocaleContext';
import type { BookingContextType, BookingData } from '@/types/booking';
import type { ApiCar } from '@/types/car';
import type { WheelOfFortunePeriod } from '@/types/wheel';
import { AVAILABLE_LOCALES, type Locale } from '@/lib/i18n/config';
import { createLocalePathBuilder } from '@/lib/i18n/routing';

const pushMock = vi.fn();
const replaceMock = vi.fn();
let currentSearchParams = new URLSearchParams();

const TEST_LOCALE: Locale = 'ro';
const buildLocaleHref = createLocalePathBuilder({
  locale: TEST_LOCALE,
  availableLocales: AVAILABLE_LOCALES,
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
  useSearchParams: () => currentSearchParams,
  usePathname: () => '/',
}));

type ClientApiMock = {
  getCarCategories: ReturnType<typeof vi.fn>;
  getHomePageCars: ReturnType<typeof vi.fn>;
  getOffers: ReturnType<typeof vi.fn>;
  getWheelOfFortunePeriods: ReturnType<typeof vi.fn>;
  setLanguage: ReturnType<typeof vi.fn>;
};

vi.mock('@/lib/api', () => {
  const mock: ClientApiMock = {
    getCarCategories: vi.fn(),
    getHomePageCars: vi.fn(),
    getOffers: vi.fn(),
    getWheelOfFortunePeriods: vi.fn(),
    setLanguage: vi.fn(),
  };
  (globalThis as { __clientApiMock?: ClientApiMock }).__clientApiMock = mock;
  return {
    __esModule: true,
    apiClient: mock,
    default: mock,
  };
});

vi.mock('@/components/ElfsightWidget', () => ({
  __esModule: true,
  default: () => <div data-testid="elfsight-widget">Elfsight</div>,
}));

vi.mock('@/components/WheelOfFortune', () => ({
  __esModule: true,
  default: ({ onClose }: { onClose?: () => void }) => (
    <div data-testid="wheel-popup">
      <p>Roata norocului este disponibilă</p>
      <button type="button" onClick={onClose}>
        Închide roata
      </button>
    </div>
  ),
}));

vi.mock('@/components/LazyMap', () => ({
  __esModule: true,
  default: () => <div data-testid="lazy-map">Harta locației</div>,
}));

const { __clientApiMock: apiClientMock } = globalThis as typeof globalThis & {
  __clientApiMock: ClientApiMock;
};

const baseCar: ApiCar = {
  id: 101,
  name: 'Dacia Logan',
  type: { id: 1, name: 'Sedan' },
  transmission: { id: 2, name: 'Manuală' },
  fuel: { id: 3, name: 'Benzină' },
  number_of_seats: 5,
  rental_rate: 55,
  rental_rate_casco: 75,
  days: 4,
  deposit: 100,
  total_deposit: 200,
  total_without_deposit: 220,
  image: '/images/test-car.jpg',
  images: ['/images/test-car.jpg'],
  avg_review: 4.7,
  content: 'Autovehicul pentru testare',
};

type RenderOptions = {
  booking?: Partial<BookingData>;
  setBooking?: BookingContextType['setBooking'];
};

const renderWithProviders = (
  ui: React.ReactElement,
  options: RenderOptions = {},
) => {
  const booking: BookingData = {
    ...defaultBooking,
    appliedOffers: [],
    ...options.booking,
  };
  const setBooking = options.setBooking ?? vi.fn();

  return {
    setBooking,
    ...render(
      <LocaleProvider initialLocale={TEST_LOCALE}>
        <BookingContext.Provider value={{ booking, setBooking }}>
          {ui}
        </BookingContext.Provider>
      </LocaleProvider>,
    ),
  };
};

const waitForCarCategories = async () => {
  await waitFor(() => expect(apiClientMock.getCarCategories).toHaveBeenCalled());
};

const waitForHomePageCars = async () => {
  await waitFor(() => expect(apiClientMock.getHomePageCars).toHaveBeenCalled());
};

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

beforeEach(() => {
  pushMock.mockReset();
  replaceMock.mockReset();
  currentSearchParams = new URLSearchParams();

  apiClientMock.getCarCategories.mockReset();
  apiClientMock.getHomePageCars.mockReset();
  apiClientMock.getWheelOfFortunePeriods.mockReset();
  apiClientMock.setLanguage.mockReset();

  apiClientMock.getCarCategories.mockResolvedValue({
    data: [
      { id: 7, name: 'SUV' },
      { id: 9, name: 'Compactă' },
    ],
  });

  apiClientMock.getHomePageCars.mockResolvedValue({
    data: [
      baseCar,
      {
        ...baseCar,
        id: 202,
        name: 'Renault Clio',
        categories: [{ id: 2, name: 'Compactă' }],
        transmission: { id: 3, name: 'Automată' },
      },
    ],
  });

  apiClientMock.getOffers.mockResolvedValue({ data: [] });

  const activePeriod: Partial<WheelOfFortunePeriod> = {
    id: 11,
    name: 'Promotie vară',
    start_at: '2025-01-01',
    end_at: '2025-12-31',
    active: true,
    is_active: true,
    active_months: [6, 7, 8],
  };

  apiClientMock.getWheelOfFortunePeriods.mockResolvedValue({ data: [activePeriod] });
});

afterEach(() => {
  cleanup();
});

describe('HeroSection', () => {
  it('afișează câmpurile formularului și lansează căutarea cu valorile selectate', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HeroSection />);

    await waitForCarCategories();

      const pickupInput = (await screen.findByLabelText(/Data ridicare/i)) as HTMLInputElement;
      const returnInput = (await screen.findByLabelText(/Data returnare/i)) as HTMLInputElement;
      const locationSelect = (await screen.findByLabelText(/Locația/i)) as HTMLSelectElement;
      const carTypeSelect = (await screen.findByLabelText(/Tip mașină/i)) as HTMLSelectElement;

    expect(pickupInput.value).not.toBe('');
    expect(returnInput.value).not.toBe('');

    await user.selectOptions(locationSelect, 'otopeni');
    await user.selectOptions(carTypeSelect, '7');

    await user.click(screen.getByRole('button', { name: /Caută mașini/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
    const destination = pushMock.mock.calls[0]?.[0] as string;
    expect(destination).toContain('start_date=');
    expect(destination).toContain('end_date=');
    expect(destination).toContain('car_type=7');
    expect(destination).toContain('location=otopeni');
  });

  it('sincronizează intervalul selectat în BookingContext', async () => {
    const user = userEvent.setup();
    const setBooking = vi.fn();
    renderWithProviders(<HeroSection />, { setBooking });

    await waitForCarCategories();

      const pickupInput = (await screen.findByLabelText(/Data ridicare/i)) as HTMLInputElement;
      const returnInput = (await screen.findByLabelText(/Data returnare/i)) as HTMLInputElement;

    await user.clear(pickupInput);
    await user.type(pickupInput, '2025-09-01T10:00');
    await user.clear(returnInput);
    await user.type(returnInput, '2025-09-04T09:30');

    await waitFor(() =>
      expect(setBooking).toHaveBeenCalledWith(
        expect.objectContaining({ startDate: '2025-09-01T10:00', endDate: '2025-09-04T09:30' }),
      ),
    );
  });
});

describe('FleetSection', () => {
  it('încarcă flota recomandată și permite navigarea manuală', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FleetSection />);

    await waitForHomePageCars();

    expect(screen.getAllByText('Dacia Logan').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Renault Clio').length).toBeGreaterThan(0);
    expect(apiClientMock.getHomePageCars).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 4, language: 'ro', status: 'available' }),
    );

    const carouselRegion = screen.getByRole('region', { name: /Carousel/i });
    const resolveTrack = () => carouselRegion.querySelector('div.flex') as HTMLElement | null;

    const currentTrack = resolveTrack();
    expect(currentTrack).not.toBeNull();
    expect(currentTrack?.style.transform).toBe('translateX(-0%)');

    const nextButton = screen.getByRole('button', { name: /Mașina următoare/i });
    await user.click(nextButton);

    await waitFor(() => {
      const updatedTrack = resolveTrack();
      expect(updatedTrack?.style.transform).toBe('translateX(-100%)');
    });

    const previousButton = screen.getByRole('button', { name: /Mașina precedentă/i });
    await user.click(previousButton);

    await waitFor(() => {
      const updatedTrack = resolveTrack();
      expect(updatedTrack?.style.transform).toBe('translateX(-0%)');
    });

    const cta = screen.getByRole('link', { name: /Vezi toată flota/i });
    expect(cta).toHaveAttribute('href', buildLocaleHref('/cars'));
  });
});

describe('ContactSection', () => {
  it('afișează canalele de contact cu link-urile corecte', () => {
    renderWithProviders(<ContactSection />);

    expect(screen.getByRole('heading', { name: /Contactează-ne/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sună la \+40 723 817 551/i })).toHaveAttribute(
      'href',
      'tel:+40723817551',
    );
    expect(screen.getByRole('link', { name: /Contactează pe WhatsApp/i })).toHaveAttribute(
      'href',
      'https://wa.me/40723817551',
    );
    expect(screen.getByRole('link', { name: /Trimite email/i })).toHaveAttribute(
      'href',
      'mailto:contact@dacars.ro',
    );
    expect(screen.getByTestId('lazy-map')).toBeInTheDocument();
  });
});

describe('HomePageClient', () => {
  it('deschide popup-ul roții norocului pentru rezervările eligibile și permite închiderea lui', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePageClient />, {
      booking: {
        startDate: '2025-06-10T08:00',
        endDate: '2025-06-15T10:00',
      },
    });

    await waitForHomePageCars();

    expect(screen.getByTestId('elfsight-widget')).toBeInTheDocument();
    expect(apiClientMock.getWheelOfFortunePeriods).not.toHaveBeenCalled();

    window.dispatchEvent(new CustomEvent('booking:dates-adjusted'));

    await waitFor(() => expect(apiClientMock.getWheelOfFortunePeriods).toHaveBeenCalledTimes(1));

    await waitFor(() => expect(screen.getByTestId('wheel-popup')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Închide roata/i }));

    await waitFor(() => expect(screen.queryByTestId('wheel-popup')).not.toBeInTheDocument());
  });
});

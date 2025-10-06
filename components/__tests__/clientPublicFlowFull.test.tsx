import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import HomePageClient from '@/components/home/HomePageClient';
import CarsPageClient from '@/components/cars/CarsPageClient';
import ReservationPage from '@/app/checkout/page';
import { BookingContext, defaultBooking } from '@/context/booking-store';
import { LocaleProvider } from '@/context/LocaleContext';
import type { BookingData } from '@/types/booking';
import type { StoredWheelPrizeEntry } from '@/lib/wheelStorage';

type ApiClientMock = {
  getCarCategories: ReturnType<typeof vi.fn>;
  getHomePageCars: ReturnType<typeof vi.fn>;
  getOffers: ReturnType<typeof vi.fn>;
  getWheelOfFortunePeriods: ReturnType<typeof vi.fn>;
  setLanguage: ReturnType<typeof vi.fn>;
  getCarsByDateCriteria: ReturnType<typeof vi.fn>;
  getServices: ReturnType<typeof vi.fn>;
  checkCarAvailability: ReturnType<typeof vi.fn>;
  getCarForBooking: ReturnType<typeof vi.fn>;
  validateDiscountCode: ReturnType<typeof vi.fn>;
  quotePrice: ReturnType<typeof vi.fn>;
  createBooking: ReturnType<typeof vi.fn>;
};

function createApiClientMock(): ApiClientMock {
  return {
    getCarCategories: vi.fn(),
    getHomePageCars: vi.fn(),
    getOffers: vi.fn(),
    getWheelOfFortunePeriods: vi.fn(),
    setLanguage: vi.fn(),
    getCarsByDateCriteria: vi.fn(),
    getServices: vi.fn(),
    checkCarAvailability: vi.fn(),
    getCarForBooking: vi.fn(),
    validateDiscountCode: vi.fn(),
    quotePrice: vi.fn(),
    createBooking: vi.fn(),
  };
}

const apiClientMock = vi.hoisted(() => createApiClientMock());

const pushMock = vi.fn();
const replaceMock = vi.fn();
let currentSearchParams = new URLSearchParams();
let currentPathname = '/';

vi.mock('next/navigation', () => {
  return {
    useRouter: () => ({
      push: pushMock,
      replace: replaceMock,
    }),
    useSearchParams: () => currentSearchParams,
    usePathname: () => currentPathname,
  };
});

vi.mock('@/lib/api', () => ({
  __esModule: true,
  apiClient: apiClientMock,
  default: apiClientMock,
}));

vi.mock('@/components/ElfsightWidget', () => ({
  __esModule: true,
  default: () => <div data-testid="elfsight-widget">Widget</div>,
}));

vi.mock('@/components/WheelOfFortune', () => ({
  __esModule: true,
  default: ({ onClose }: { onClose?: () => void }) => (
    <div data-testid="wheel-popup">
      <p>Roata norocului disponibilă</p>
      <button type="button" onClick={onClose}>
        Închide roata
      </button>
    </div>
  ),
}));

vi.mock('@/components/LazyMap', () => ({
  __esModule: true,
  default: () => <div data-testid="lazy-map">Harta</div>,
}));

vi.mock('@/components/checkout/SelectedCarGallery', () => ({
  __esModule: true,
  default: () => <div data-testid="selected-car-gallery">Galerie</div>,
}));

const wheelStorageMocks = vi.hoisted(() => {
  const getStoredWheelPrizeMock = vi.fn<[], StoredWheelPrizeEntry | null>();
  const clearStoredWheelPrizeMock = vi.fn();
  const isStoredWheelPrizeActiveMock = vi.fn<[], boolean>();

  return {
    getStoredWheelPrizeMock,
    clearStoredWheelPrizeMock,
    isStoredWheelPrizeActiveMock,
    module: {
      __esModule: true,
      getStoredWheelPrize: (
        ...args: Parameters<typeof getStoredWheelPrizeMock>
      ) => getStoredWheelPrizeMock(...args),
      clearStoredWheelPrize: (
        ...args: Parameters<typeof clearStoredWheelPrizeMock>
      ) => clearStoredWheelPrizeMock(...args),
      isStoredWheelPrizeActive: (
        ...args: Parameters<typeof isStoredWheelPrizeActiveMock>
      ) => isStoredWheelPrizeActiveMock(...args),
    } satisfies Record<string, unknown>,
  };
});

const {
  getStoredWheelPrizeMock,
  clearStoredWheelPrizeMock,
  isStoredWheelPrizeActiveMock,
} = wheelStorageMocks;

vi.mock('@/lib/wheelStorage', () => wheelStorageMocks.module);

const renderWithProviders = (
  ui: React.ReactElement,
  options: { booking?: Partial<BookingData> } = {},
) => {
  const initialBooking: BookingData = {
    ...defaultBooking,
    appliedOffers: [],
    ...options.booking,
  };
  const setBookingSpy = vi.fn<(next: BookingData) => void>();

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [booking, setBooking] = React.useState<BookingData>(initialBooking);

    const handleSetBooking = React.useCallback((next: BookingData) => {
      setBooking(next);
      setBookingSpy(next);
    }, []);

    return (
      <LocaleProvider initialLocale="ro">
        <BookingContext.Provider value={{ booking, setBooking: handleSetBooking }}>
          {children}
        </BookingContext.Provider>
      </LocaleProvider>
    );
  };

  const result = render(ui, { wrapper: Wrapper });

  return { ...result, setBookingSpy };
};

const resetApiClientMock = () => {
  (Object.values(apiClientMock) as Array<ReturnType<typeof vi.fn>>).forEach((mockFn) => {
    mockFn.mockReset();
  });
};

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

beforeEach(() => {
  resetApiClientMock();
  pushMock.mockReset();
  replaceMock.mockReset();
  currentSearchParams = new URLSearchParams();
  currentPathname = '/';
  getStoredWheelPrizeMock.mockReset();
  clearStoredWheelPrizeMock.mockReset();
  isStoredWheelPrizeActiveMock.mockReset();
  window.localStorage.clear();
});

const buildWheelPrize = (): StoredWheelPrizeEntry => ({
  version: 1,
  prize: {
    id: 9,
    period_id: 3,
    title: 'Reducere 15%',
    description: 'Premiu test',
    amount: 15,
    color: '#34d399',
    probability: 100,
    type: 'percentage_discount',
    created_at: null,
    updated_at: null,
  },
  winner: {
    name: 'Ion Pop',
    phone: '+40722123456',
  },
  wheel_of_fortune_id: 4,
  prize_id: 7,
  saved_at: '2030-05-01T00:00:00Z',
  expires_at: '2030-12-31T00:00:00Z',
});

describe('Fluxul complet al clienților DaCars', () => {
  it('gestionează interacțiunile de pe homepage: formular, oferte și roata norocului', async () => {
    const homeCar = {
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

    apiClientMock.getCarCategories.mockResolvedValue({
      data: [
        { id: 7, name: 'SUV' },
      ],
    });
    apiClientMock.getHomePageCars.mockResolvedValue({ data: [homeCar] });
    apiClientMock.getOffers.mockResolvedValue({
      data: [
        {
          id: 44,
          title: 'Reducere 10%',
          description: 'Oferta test',
          discount_label: '-10%',
          offer_type: 'percentage_discount',
          offer_value: '10',
          primary_cta_label: 'Aplică reducerea',
          primary_cta_url: '/checkout',
        },
      ],
    });
    apiClientMock.getWheelOfFortunePeriods.mockResolvedValue({
      data: [
        {
          id: 5,
          name: 'Campanie primăvară',
          starts_at: '2030-01-01',
          ends_at: '2030-12-31',
          active: true,
          is_active: true,
          active_months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        },
      ],
    });

    const initialBooking: BookingData = {
      ...defaultBooking,
      startDate: '2030-06-01T10:00',
      endDate: '2030-06-05T10:00',
      appliedOffers: [],
      withDeposit: false,
      selectedCar: null,
    };

    const user = userEvent.setup();
    const { setBookingSpy } = renderWithProviders(<HomePageClient />, {
      booking: initialBooking,
    });

    await waitFor(() => expect(apiClientMock.setLanguage).toHaveBeenCalledWith('ro'));
    await waitFor(() => expect(apiClientMock.getHomePageCars).toHaveBeenCalled());
    await waitFor(() => expect(apiClientMock.getOffers).toHaveBeenCalled());

    const pickupInput = await screen.findByLabelText('Data ridicare');
    const returnInput = await screen.findByLabelText('Data returnare');
    const locationSelect = await screen.findByLabelText('Locația');
    const carTypeSelect = await screen.findByLabelText('Tip mașină');

    await user.clear(pickupInput);
    await user.type(pickupInput, '2030-06-10T10:30');
    await user.clear(returnInput);
    await user.type(returnInput, '2030-06-15T10:30');
    await user.selectOptions(locationSelect, 'otopeni');
    await user.selectOptions(carTypeSelect, '7');

    await waitFor(() => {
      expect(setBookingSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: '2030-06-10T10:30',
          endDate: '2030-06-15T10:30',
        }),
      );
    });

    await waitFor(() => expect(apiClientMock.getWheelOfFortunePeriods).toHaveBeenCalled());
    const wheelPopup = await screen.findByTestId('wheel-popup');
    expect(wheelPopup).toBeInTheDocument();
    await user.click(within(wheelPopup).getByRole('button', { name: 'Închide roata' }));
    await waitFor(() => expect(screen.queryByTestId('wheel-popup')).not.toBeInTheDocument());

    const offerButton = await screen.findByRole('button', { name: 'Aplică reducerea' });
    await user.click(offerButton);

    await waitFor(() => {
      expect(setBookingSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          appliedOffers: [
            expect.objectContaining({ id: 44, title: 'Reducere 10%' }),
          ],
        }),
      );
    });
    expect(pushMock).toHaveBeenCalledWith('/checkout');

    pushMock.mockClear();
    await user.click(screen.getByRole('button', { name: 'Caută mașini' }));
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledTimes(1);
      const target = pushMock.mock.calls[0][0] as string;
      const url = new URL(target, 'https://dacars.ro');
      expect(url.pathname).toBe('/cars');
      expect(url.searchParams.get('start_date')).toBe('2030-06-10T10:30');
      expect(url.searchParams.get('end_date')).toBe('2030-06-15T10:30');
      expect(url.searchParams.get('car_type')).toBe('7');
      expect(url.searchParams.get('location')).toBe('otopeni');
    });
  });

  it('permite filtrarea flotei, rezervarea fără/cu garanție și sincronizarea parametrilor pe pagina /cars', async () => {
    currentPathname = '/cars';
    currentSearchParams = new URLSearchParams(
      'start_date=2030-07-01T09:00&end_date=2030-07-05T09:00&sort_by=cheapest',
    );
    window.history.replaceState({}, '', `/cars?${currentSearchParams.toString()}`);

    apiClientMock.getCarCategories.mockResolvedValue({ data: [{ id: 12, name: 'SUV' }] });
    apiClientMock.getCarsByDateCriteria.mockResolvedValue({
      data: [
        {
          id: 77,
          name: 'VW Golf',
          type: { id: 4, name: 'Hatchback' },
          transmission: { id: 2, name: 'Manuală' },
          fuel: { id: 1, name: 'Benzină' },
          number_of_seats: 5,
          rental_rate: 45,
          rental_rate_casco: 55,
          days: 4,
          deposit: 150,
          total_deposit: 260,
          total_without_deposit: 220,
          image: '/images/vw-golf.jpg',
          images: ['/images/vw-golf.jpg'],
          avg_review: 4.6,
          content: 'Compactă ideală pentru oraș',
        },
      ],
      meta: {
        total: 1,
        last_page: 1,
      },
    });

    const initialBooking: BookingData = {
      ...defaultBooking,
      startDate: '2030-07-01T09:00',
      endDate: '2030-07-05T09:00',
      withDeposit: false,
      appliedOffers: [],
      selectedCar: null,
    };

    const user = userEvent.setup();
    const { setBookingSpy } = renderWithProviders(<CarsPageClient />, {
      booking: initialBooking,
    });

    await waitFor(() => expect(apiClientMock.getCarsByDateCriteria).toHaveBeenCalled());
    expect(apiClientMock.getCarCategories).toHaveBeenCalledWith({ language: 'ro' });

    const firstPayload = apiClientMock.getCarsByDateCriteria.mock.calls[0][0];
    expect(firstPayload).toMatchObject({
      start_date: '2030-07-01T09:00',
      end_date: '2030-07-05T09:00',
      sort_by: 'cheapest',
    });

    await screen.findByRole('heading', { name: 'VW Golf' });

    const filtersToggle = screen.getByRole('button', { name: 'Comută filtrele' });
    await user.click(filtersToggle);

    const transmissionSelect = await screen.findByLabelText('Transmisie');
    await user.selectOptions(transmissionSelect, '2');
    await waitFor(() => {
      const call = replaceMock.mock.calls.at(-1);
      expect(call?.[0]).toContain('transmission=2');
      expect(call?.[1]).toMatchObject({ scroll: false });
    });

    const searchInput = screen.getByPlaceholderText('Caută mașină...');
    await user.type(searchInput, 'golf');
    await waitFor(() => {
      const call = replaceMock.mock.calls.at(-1);
      expect(call?.[0]).toContain('search=golf');
    });

    const resetButtons = screen.getAllByRole('button', { name: 'Resetează filtrele' });
    await user.click(resetButtons[0]);
    await waitFor(() => {
      const call = replaceMock.mock.calls.at(-1);
      expect(call?.[0]).not.toContain('transmission=');
      expect(call?.[0]).not.toContain('search=');
    });

    await user.click(screen.getByText('Rezervă fără garanție'));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/checkout'));
    await waitFor(() => {
      const lastCall = setBookingSpy.mock.calls.at(-1)?.[0];
      expect(lastCall?.withDeposit).toBe(false);
      expect(lastCall?.selectedCar?.id).toBe(77);
    });

    pushMock.mockClear();
    await user.click(screen.getByText('Rezervă cu garanție'));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/checkout'));
    await waitFor(() => {
      const lastCall = setBookingSpy.mock.calls.at(-1)?.[0];
      expect(lastCall?.withDeposit).toBe(true);
      expect(lastCall?.selectedCar?.id).toBe(77);
    });
  });

  it('parcurge formularul de checkout, validează coduri și trimite rezervarea completă', async () => {
    currentPathname = '/checkout';
    currentSearchParams = new URLSearchParams();
    window.history.replaceState({}, '', '/checkout');

    const storedPrize = buildWheelPrize();
    getStoredWheelPrizeMock.mockReturnValue(storedPrize);
    isStoredWheelPrizeActiveMock.mockReturnValue(true);

    const apiCar = {
      id: 501,
      name: 'Dacia Logan',
      type: { id: 10, name: 'Sedan' },
      transmission: { id: 2, name: 'Manuală' },
      fuel: { id: 1, name: 'Benzină' },
      number_of_seats: 5,
      rental_rate: 45,
      rental_rate_casco: 55,
      days: 4,
      deposit: 200,
      total_deposit: 320,
      total_without_deposit: 260,
      image: '/images/logan.jpg',
      images: ['/images/logan.jpg'],
      avg_review: 4.4,
      content: 'Sedan de încredere',
    };

    apiClientMock.getServices.mockResolvedValue({
      data: [
        { id: 31, name: 'Asigurare completă', price: 25 },
      ],
    });
    apiClientMock.checkCarAvailability.mockResolvedValue({ available: true });
    apiClientMock.getCarForBooking.mockResolvedValue({ data: apiCar, available: true });
    apiClientMock.validateDiscountCode.mockResolvedValue({
      valid: true,
      data: {
        ...apiCar,
        coupon: {
          discount_deposit: '30',
          discount_casco: '20',
          discount_type: 'percent',
        },
      },
    });
    apiClientMock.quotePrice.mockResolvedValue({
      price_per_day: 55,
      base_price: 220,
      sub_total: 260,
      total: 245,
      total_before_wheel_prize: 255,
      total_services: 25,
      offers_discount: 15,
      coupon_amount: 20,
      coupon_type: 'percent',
      wheel_prize_discount: 10,
      deposit_waived: false,
      applied_offers: [
        { id: 44, title: 'Reducere 10%', offer_type: 'percent', offer_value: '10', discount_label: '-10%' },
      ],
      wheel_prize: { eligible: true },
    });
    apiClientMock.createBooking.mockResolvedValue({ data: { booking_number: 'DAC123' } });

    const selectedCar = {
      id: apiCar.id,
      name: apiCar.name,
      type: apiCar.type.name,
      typeId: apiCar.type.id,
      image: '/images/logan.jpg',
      gallery: ['/images/logan.jpg'],
      price: 55,
      rental_rate: String(apiCar.rental_rate),
      rental_rate_casco: String(apiCar.rental_rate_casco),
      days: apiCar.days,
      deposit: apiCar.deposit,
      total_deposit: apiCar.total_deposit,
      total_without_deposit: apiCar.total_without_deposit,
      available: true,
      features: {
        passengers: apiCar.number_of_seats,
        transmission: apiCar.transmission.name,
        transmissionId: apiCar.transmission.id,
        fuel: apiCar.fuel.name,
        fuelId: apiCar.fuel.id,
        doors: 4,
        luggage: 2,
      },
      rating: apiCar.avg_review,
      description: apiCar.content,
      specs: [],
    };

    const initialBooking: BookingData = {
      ...defaultBooking,
      startDate: '2030-08-01T10:00',
      endDate: '2030-08-05T10:00',
      withDeposit: false,
      appliedOffers: [],
      selectedCar,
    };

    const user = userEvent.setup();
    const { setBookingSpy } = renderWithProviders(<ReservationPage />, {
      booking: initialBooking,
    });

    await waitFor(() => expect(apiClientMock.getServices).toHaveBeenCalledWith({ language: 'ro' }));
    await waitFor(() => expect(apiClientMock.getCarForBooking).toHaveBeenCalled());

    const nameInput = await screen.findByLabelText('Nume *');
    const emailInput = screen.getByLabelText('Email *');
    const phoneInput = screen.getByLabelText(/Telefon/);
    const flightInput = screen.getByLabelText('Zbor (opțional)');
    const couponInput = screen.getByPlaceholderText('Ex: WHEEL10');

    await user.clear(nameInput);
    await user.type(nameInput, 'Ion Pop');
    await user.clear(emailInput);
    await user.type(emailInput, 'ion.pop@example.com');
    await user.clear(phoneInput);
    await user.type(phoneInput, '722123123');
    await user.type(flightInput, 'RO123');

    const serviceCheckbox = await screen.findByLabelText('Asigurare completă - 25€');
    await user.click(serviceCheckbox);

    await waitFor(() => {
      const call = apiClientMock.quotePrice.mock.calls.at(-1)?.[0];
      expect(call?.service_ids).toEqual([31]);
      expect(call?.total_services).toBe(25);
    });

    await user.clear(couponInput);
    await user.type(couponInput, 'WHEEL10');
    const validateButton = await screen.findByRole('button', { name: 'Validează codul' });
    await user.click(validateButton);

    await waitFor(() => expect(apiClientMock.validateDiscountCode).toHaveBeenCalled());
    await waitFor(() => {
      const call = apiClientMock.validateDiscountCode.mock.calls.at(-1)?.[0];
      expect(call).toMatchObject({
        code: 'WHEEL10',
        car_id: 501,
      });
      expect(Number(call?.price)).toBe(45);
      expect(Number(call?.price_casco)).toBe(55);
    });

    await waitFor(() => {
      const call = apiClientMock.quotePrice.mock.calls.at(-1)?.[0];
      expect(call?.coupon_code).toBe('WHEEL10');
      expect(call?.wheel_prize_discount).toBeGreaterThan(0);
    });

    await user.click(screen.getByLabelText('Cu garanție'));
    await waitFor(() => {
      const lastCall = setBookingSpy.mock.calls.at(-1)?.[0];
      expect(lastCall?.withDeposit).toBe(true);
    });

    const submitButton = screen.getByRole('button', { name: 'Finalizează rezervarea' });
    await waitFor(() => expect(submitButton).toBeEnabled());
    await user.click(submitButton);

    await waitFor(() => expect(apiClientMock.createBooking).toHaveBeenCalled());
    const bookingPayload = apiClientMock.createBooking.mock.calls[0][0];
    expect(bookingPayload).toMatchObject({
      customer_name: 'Ion Pop',
      customer_email: 'ion.pop@example.com',
      customer_phone: '+40722123123',
      flight_number: 'RO123',
      service_ids: [31],
      coupon_code: 'WHEEL10',
      wheel_prize_discount: 10,
      wheel_prize: expect.objectContaining({ eligible: true }),
      car_id: 501,
    });

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/success'));
    expect(clearStoredWheelPrizeMock).toHaveBeenCalled();

    const storedReservation = window.localStorage.getItem('reservationData');
    expect(storedReservation).toBeTruthy();
  });
});


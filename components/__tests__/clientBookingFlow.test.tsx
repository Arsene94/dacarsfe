import React from 'react';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ReservationPage from '@/app/form/page';
import HeroSection from '@/components/HeroSectionClient';
import CarsPageClient from '@/components/cars/CarsPageClient';
import { BookingContext, defaultBooking } from '@/context/booking-store';
import { LocaleProvider } from '@/context/LocaleContext';
import type { BookingData } from '@/types/booking';
import type { ApiCar, Car } from '@/types/car';

const pushMock = vi.fn();
const replaceMock = vi.fn();
let searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
  usePathname: () => '/cars',
  useSearchParams: () => searchParams,
}));
type ApiClientMock = {
  getCarCategories: ReturnType<typeof vi.fn>;
  getCarsByDateCriteria: ReturnType<typeof vi.fn>;
  setLanguage: ReturnType<typeof vi.fn>;
  getServices: ReturnType<typeof vi.fn>;
  checkCarAvailability: ReturnType<typeof vi.fn>;
  getCarForBooking: ReturnType<typeof vi.fn>;
  validateDiscountCode: ReturnType<typeof vi.fn>;
  quotePrice: ReturnType<typeof vi.fn>;
  createBooking: ReturnType<typeof vi.fn>;
};

vi.mock('@/lib/api', () => {
  const mock: ApiClientMock = {
    getCarCategories: vi.fn(),
    getCarsByDateCriteria: vi.fn(),
    setLanguage: vi.fn(),
    getServices: vi.fn(),
    checkCarAvailability: vi.fn(),
    getCarForBooking: vi.fn(),
    validateDiscountCode: vi.fn(),
    quotePrice: vi.fn(),
    createBooking: vi.fn(),
  };
  (globalThis as { __apiClientMock?: ApiClientMock }).__apiClientMock = mock;
  return {
    apiClient: mock,
    default: mock,
  };
});

type WheelStorageMock = {
  getStoredWheelPrize: ReturnType<typeof vi.fn>;
  isStoredWheelPrizeActive: ReturnType<typeof vi.fn>;
  clearStoredWheelPrize: ReturnType<typeof vi.fn>;
  storeWheelPrize: ReturnType<typeof vi.fn>;
};

vi.mock('@/lib/wheelStorage', () => {
  const mock: WheelStorageMock = {
    getStoredWheelPrize: vi.fn(() => null),
    isStoredWheelPrizeActive: vi.fn(() => false),
    clearStoredWheelPrize: vi.fn(),
    storeWheelPrize: vi.fn(),
  };
  (globalThis as { __wheelStorageMock?: WheelStorageMock }).__wheelStorageMock = mock;
  return mock;
});

const apiClientMock = (globalThis as { __apiClientMock: ApiClientMock }).__apiClientMock;
const wheelStorageMock = (globalThis as { __wheelStorageMock: WheelStorageMock }).__wheelStorageMock;

const mockApiCar: ApiCar = {
  id: 101,
  name: 'Dacia Logan',
  type: { id: 5, name: 'Sedan' },
  transmission: { id: 2, name: 'Manuală' },
  fuel: { id: 1, name: 'Benzină' },
  number_of_seats: 5,
  rental_rate: 55,
  rental_rate_casco: 70,
  days: 4,
  deposit: 100,
  total_deposit: 220,
  total_without_deposit: 280,
  image: '/images/test-car.jpg',
  images: ['/images/test-car.jpg'],
  avg_review: 4.8,
  content: 'Autovehicul pentru test',
};

const mappedCar: Car = {
  id: mockApiCar.id,
  name: mockApiCar.name ?? 'Autovehicul',
  type: mockApiCar.type?.name ?? 'Sedan',
  typeId: mockApiCar.type?.id ?? null,
  image: '/images/test-car.jpg',
  gallery: ['/images/test-car.jpg'],
  price: 55,
  rental_rate: String(mockApiCar.rental_rate ?? 55),
  rental_rate_casco: String(mockApiCar.rental_rate_casco ?? 70),
  days: Number(mockApiCar.days ?? 4),
  deposit: Number(mockApiCar.deposit ?? 0),
  total_deposit: String(mockApiCar.total_deposit ?? 0),
  total_without_deposit: String(mockApiCar.total_without_deposit ?? 0),
  available: true,
  features: {
    passengers: 5,
    transmission: mockApiCar.transmission && typeof mockApiCar.transmission === 'object'
      ? mockApiCar.transmission.name ?? 'Manuală'
      : 'Manuală',
    transmissionId: mockApiCar.transmission && typeof mockApiCar.transmission === 'object'
      ? mockApiCar.transmission.id ?? null
      : null,
    fuel: mockApiCar.fuel && typeof mockApiCar.fuel === 'object'
      ? mockApiCar.fuel.name ?? 'Benzină'
      : 'Benzină',
    fuelId: mockApiCar.fuel && typeof mockApiCar.fuel === 'object'
      ? mockApiCar.fuel.id ?? null
      : null,
    doors: 4,
    luggage: 2,
  },
  rating: Number(mockApiCar.avg_review ?? 0),
  description: mockApiCar.content ?? '',
  specs: [],
};

type RenderOptions = {
  booking?: Partial<BookingData>;
  setBooking?: ReturnType<typeof vi.fn>;
};

const renderWithProviders = (
  ui: React.ReactElement,
  options: RenderOptions = {},
) => {
  const bookingData: BookingData = {
    ...defaultBooking,
    appliedOffers: [],
    ...options.booking,
  };
  const setBooking = options.setBooking ?? vi.fn();
  return {
    setBooking,
    ...render(
      <LocaleProvider initialLocale="ro">
        <BookingContext.Provider value={{ booking: bookingData, setBooking }}>
          {ui}
        </BookingContext.Provider>
      </LocaleProvider>,
    ),
  };
};

beforeEach(() => {
  pushMock.mockReset();
  replaceMock.mockReset();
  searchParams = new URLSearchParams();
  window.history.replaceState({}, '', '/');
  window.scrollTo = vi.fn();

  Object.values(apiClientMock).forEach((fn) => fn.mockReset());
  wheelStorageMock.getStoredWheelPrize.mockReturnValue(null);
  wheelStorageMock.isStoredWheelPrizeActive.mockReturnValue(false);
  wheelStorageMock.clearStoredWheelPrize.mockReset();

  apiClientMock.getCarCategories.mockResolvedValue({ data: [{ id: 1, name: 'SUV' }] });
  apiClientMock.getCarsByDateCriteria.mockResolvedValue({
    data: [mockApiCar],
    meta: { total: 1, last_page: 1 },
  });
  apiClientMock.getServices.mockResolvedValue({ data: [] });
  apiClientMock.checkCarAvailability.mockResolvedValue({ available: true });
  apiClientMock.getCarForBooking.mockResolvedValue({ data: mockApiCar, available: true });
  apiClientMock.validateDiscountCode.mockResolvedValue({ valid: true, data: null });
  apiClientMock.quotePrice.mockResolvedValue({
    price_per_day: 70,
    base_price: 70,
    sub_total: 280,
    total: 280,
    total_services: 0,
    offers_discount: 0,
    coupon_amount: 0,
    total_before_wheel_prize: 280,
    wheel_prize_discount: 0,
    applied_offers: [],
  });
  apiClientMock.createBooking.mockResolvedValue({ data: { id: 1 } });
});

afterEach(() => {
  cleanup();
});

describe('Fluxul de închiriere pentru clienți', () => {
  it('permite completarea formularului principal și navigarea spre lista de mașini', async () => {
    const user = userEvent.setup();
    const setBooking = vi.fn();
    renderWithProviders(<HeroSection />, { setBooking });

    await waitFor(() => expect(apiClientMock.getCarCategories).toHaveBeenCalled());

    const pickupInput = screen.getByLabelText(/Data ridicare/i);
    const returnInput = screen.getByLabelText(/Data returnare/i);
    const carTypeSelect = screen.getByLabelText(/Tip mașină/i);
    const submitButton = screen.getByRole('button', { name: /Caută mașini/i });
    const form = submitButton.closest('form');
    if (!form) {
      throw new Error('Nu am găsit formularul de căutare');
    }

    await user.clear(pickupInput);
    await user.type(pickupInput, '2025-06-10T10:00');
    await user.clear(returnInput);
    await user.type(returnInput, '2025-06-12T10:00');
    await user.selectOptions(carTypeSelect, '1');

    fireEvent.submit(form);

    await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
    const destination = pushMock.mock.calls[0][0] as string;
    expect(destination).toContain('/cars?');
    const params = new URLSearchParams(destination.split('?')[1]);
    expect(params.get('start_date')).toBe('2025-06-10T10:00');
    expect(params.get('end_date')).toBe('2025-06-12T10:00');
    expect(params.get('car_type')).toBe('1');
    expect(params.get('location')).toBe('otopeni');
  });

  it('permite selectarea unei mașini și continuarea către checkout', async () => {
    const user = userEvent.setup();
    const setBooking = vi.fn();
    const query = new URLSearchParams({
      start_date: '2025-07-01T08:00',
      end_date: '2025-07-05T10:00',
    });
    searchParams = new URLSearchParams(query.toString());
    window.history.replaceState({}, '', `/cars?${query.toString()}`);

    renderWithProviders(<CarsPageClient />, { setBooking });

    await waitFor(() => expect(apiClientMock.getCarsByDateCriteria).toHaveBeenCalled());

    await screen.findByText(mockApiCar.name ?? 'Dacia Logan', undefined, {
      timeout: 8000,
    });

    const reserveNoDeposit = await screen.findByText(
      /Rezervă fără garanție/i,
      { selector: 'button' },
    );

    await user.click(reserveNoDeposit);

    expect(setBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: '2025-07-01T08:00',
        endDate: '2025-07-05T10:00',
        withDeposit: false,
        selectedCar: expect.objectContaining({ id: mockApiCar.id, name: mockApiCar.name }),
      }),
    );
    expect(pushMock).toHaveBeenCalledWith('/form');

    pushMock.mockClear();

    const reserveWithDeposit = screen.getByText(/Rezervă cu garanție/i, {
      selector: 'button',
    });
    await user.click(reserveWithDeposit);

    expect(setBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        withDeposit: true,
        selectedCar: expect.objectContaining({ id: mockApiCar.id }),
      }),
    );
    expect(pushMock).toHaveBeenCalledWith('/form');
  }, 15000);

  it('afișează mesajul de selectare a perioadei atunci când lipsește intervalul', async () => {
    const user = userEvent.setup();

    const { setBooking } = renderWithProviders(<CarsPageClient />);

    await waitFor(() => expect(apiClientMock.getCarsByDateCriteria).toHaveBeenCalled());

    const reserveNoDeposit = await screen.findByText(/Rezervă fără garanție/i, {
      selector: 'button',
    });

    await user.click(reserveNoDeposit);

    expect(setBooking).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();

    expect(
      await screen.findByText(/Selectează perioada de ridicare și returnare pentru a continua/i),
    ).toBeInTheDocument();
  });

  it('anunță indisponibilitatea mașinii pentru perioada selectată', async () => {
    const user = userEvent.setup();
    const setBooking = vi.fn();

    const query = new URLSearchParams({
      start_date: '2025-09-01T09:00',
      end_date: '2025-09-05T09:00',
    });
    searchParams = new URLSearchParams(query.toString());
    window.history.replaceState({}, '', `/cars?${query.toString()}`);

    apiClientMock.getCarsByDateCriteria.mockResolvedValueOnce({
      data: [{ ...mockApiCar, available: false }],
      meta: { total: 1, last_page: 1 },
    });

    renderWithProviders(<CarsPageClient />, { setBooking });

    await waitFor(() => expect(apiClientMock.getCarsByDateCriteria).toHaveBeenCalled());
    await screen.findByText(mockApiCar.name ?? 'Dacia Logan');

    const reserveNoDeposit = await screen.findByText(/Rezervă fără garanție/i, {
      selector: 'button',
    });

    await user.click(reserveNoDeposit);

    expect(setBooking).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();

    expect(
      await screen.findByText(/Mașina nu este disponibilă pentru perioada selectată/i),
    ).toBeInTheDocument();
  });

  it('păstrează opțiunile din checkout și permite schimbarea garanției', async () => {
    const user = userEvent.setup();
    const setBooking = vi.fn();
    localStorage.clear();

    renderWithProviders(<ReservationPage />, {
      setBooking,
      booking: {
        startDate: '2025-08-01T09:00',
        endDate: '2025-08-05T10:00',
        withDeposit: false,
        selectedCar: mappedCar,
      },
    });

    await waitFor(() =>
      expect(screen.getByText(/Rezumatul rezervării/i)).toBeInTheDocument(),
    );

    const depositWithout = screen.getByLabelText(/Fără garanție/i) as HTMLInputElement;
    const depositWith = screen.getByLabelText(/Cu garanție/i);

    expect(depositWithout).toBeChecked();

    await user.click(depositWith);

    await waitFor(() =>
      expect(setBooking).toHaveBeenCalledWith(
        expect.objectContaining({ withDeposit: true }),
      ),
    );
  });
});

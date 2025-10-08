export type PaginationSegment = number | "ellipsis";

const clampPage = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(Math.trunc(value), min), max);
};

/**
 * Construiește o secvență de pagini cu marcaje de tip "ellipsis" care se deplasează
 * odată cu pagina curentă. Se păstrează primele și ultimele pagini, vecinii
 * apropiați și se inserează automat numerele lipsă atunci când diferența este de
 * o singură pagină.
 */
export const generatePaginationSequence = (
  currentPage: number,
  lastPage: number,
): PaginationSegment[] => {
  const totalPages = clampPage(lastPage, 1, Number.MAX_SAFE_INTEGER);
  const activePage = clampPage(currentPage, 1, totalPages);

  if (totalPages <= 8) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const seeds = [
    1,
    2,
    3,
    totalPages,
    totalPages - 1,
    totalPages - 2,
    activePage - 1,
    activePage,
    activePage + 1,
  ];

  const uniquePages = Array.from(
    new Set(
      seeds.filter(
        (page) => Number.isFinite(page) && page >= 1 && page <= totalPages,
      ),
    ),
  ).sort((a, b) => a - b);

  const segments: PaginationSegment[] = [];
  let previousPage: number | null = null;

  uniquePages.forEach((page) => {
    if (previousPage != null) {
      const gap = page - previousPage;
      if (gap === 2) {
        segments.push(previousPage + 1);
      } else if (gap > 2) {
        segments.push("ellipsis");
      }
    }

    segments.push(page);
    previousPage = page;
  });

  return segments;
};

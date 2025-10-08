import { describe, expect, it } from "vitest";

import { generatePaginationSequence } from "../pagination";

describe("generatePaginationSequence", () => {
  it("returnează toate paginile când numărul total este mic", () => {
    expect(generatePaginationSequence(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(generatePaginationSequence(3, 8)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("deplasează fereastra de pagini odată cu pagina curentă", () => {
    expect(generatePaginationSequence(1, 12)).toEqual([
      1,
      2,
      3,
      "ellipsis",
      10,
      11,
      12,
    ]);

    expect(generatePaginationSequence(3, 12)).toEqual([
      1,
      2,
      3,
      4,
      "ellipsis",
      10,
      11,
      12,
    ]);

    expect(generatePaginationSequence(6, 12)).toEqual([
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      "ellipsis",
      10,
      11,
      12,
    ]);

    expect(generatePaginationSequence(10, 12)).toEqual([
      1,
      2,
      3,
      "ellipsis",
      9,
      10,
      11,
      12,
    ]);
  });

  it("tratează valorile out-of-range corect", () => {
    expect(generatePaginationSequence(-5, 3)).toEqual([1, 2, 3]);
    expect(generatePaginationSequence(100, 2)).toEqual([1, 2]);
  });
});

export interface Country {
  code: string;
  name: string;
  dialCode: string;
}

let cache: Country[] | null = null;

export const loadCountries = async (): Promise<Country[]> => {
  if (cache) return cache;
  const res = await fetch(
    "https://restcountries.com/v3.1/all?fields=cca2,name,idd",
  );
  if (!res.ok) {
    throw new Error("failed to load countries");
  }
  const data = await res.json();
  cache = (data as any[])
    .filter((c) => c.cca2 && c.idd && c.idd.root)
    .map((c) => ({
      code: c.cca2 as string,
      name: c.name.common as string,
      dialCode: `${c.idd.root}${(c.idd.suffixes && c.idd.suffixes[0]) || ""}`,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return cache;
};


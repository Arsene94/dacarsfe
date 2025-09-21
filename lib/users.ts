export type DisplayNameSource = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  username?: string | null;
  id?: number | null;
};

export const getUserDisplayName = (source: DisplayNameSource): string => {
  const first = typeof source.first_name === "string" ? source.first_name.trim() : "";
  const last = typeof source.last_name === "string" ? source.last_name.trim() : "";
  const hasFirst = first.length > 0;
  const hasLast = last.length > 0;

  if (hasFirst || hasLast) {
    return [first, last].filter((part) => part.length > 0).join(" ");
  }

  const username = typeof source.username === "string" ? source.username.trim() : "";
  if (username.length > 0) {
    return username;
  }

  const email = typeof source.email === "string" ? source.email.trim() : "";
  if (email.length > 0) {
    return email;
  }

  if (typeof source.id === "number" && Number.isFinite(source.id)) {
    return `Utilizator #${source.id}`;
  }

  return "Echipa DaCars";
};

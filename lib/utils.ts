export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export const getStatusText = (status: string) => {
    switch (status) {
        case "reserved":
            return "Rezervat";
        case "pending":
            return "În așteptare";
        case "cancelled":
            return "Anulat";
        case "completed":
            return "Finalizat";
        case "no_answer":
            return "Fără răspuns";
        case "waiting_advance_payment":
            return "Așteaptă avans";
        default:
            return status;
    }
};

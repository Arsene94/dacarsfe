import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import UsersAdminPage from "@/app/admin/users/page";
import type { User } from "@/types/auth";

const getUsersMock = vi.hoisted(() => vi.fn());
const createUserMock = vi.hoisted(() => vi.fn());
const updateUserMock = vi.hoisted(() => vi.fn());
const deleteUserMock = vi.hoisted(() => vi.fn());
const makeUserSuperMock = vi.hoisted(() => vi.fn());
const removeUserSuperMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({
  __esModule: true,
  default: {
    getUsers: (...args: unknown[]) => getUsersMock(...args),
    createUser: (...args: unknown[]) => createUserMock(...args),
    updateUser: (...args: unknown[]) => updateUserMock(...args),
    deleteUser: (...args: unknown[]) => deleteUserMock(...args),
    makeUserSuper: (...args: unknown[]) => makeUserSuperMock(...args),
    removeUserSuper: (...args: unknown[]) => removeUserSuperMock(...args),
  },
}));

const baseUser: User = {
  id: 1,
  first_name: "Ana",
  last_name: "Pop",
  email: "ana@example.com",
  username: "ana",
  avatar: null,
  super_user: false,
  manage_supers: false,
  roles: ["admin"],
  permissions: [],
  last_login: "2024-10-12T10:00:00Z",
  created_at: "2024-10-01T08:00:00Z",
  updated_at: "2024-10-20T09:00:00Z",
};

const renderPage = async (users: User[] = [baseUser]) => {
  getUsersMock.mockResolvedValue({ data: users });
  render(<UsersAdminPage />);
  await waitFor(() => {
    expect(getUsersMock).toHaveBeenCalled();
  });
};

describe("UsersAdminPage", () => {
  beforeEach(() => {
    getUsersMock.mockReset();
    createUserMock.mockReset();
    updateUserMock.mockReset();
    deleteUserMock.mockReset();
    makeUserSuperMock.mockReset();
    removeUserSuperMock.mockReset();
  });

  it("loads and renders the users list, supporting manual refresh", async () => {
    await renderPage();

    expect(await screen.findByText("Ana Pop")).toBeInTheDocument();
    expect(screen.getByText("ID: 1")).toBeInTheDocument();
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
    expect(screen.getByText("ana")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();

    getUsersMock.mockClear();
    const user = userEvent.setup();
    const [refreshButton] = screen.getAllByRole("button", {
      name: "Reîmprospătează",
    });
    await user.click(refreshButton);

    await waitFor(() => {
      expect(getUsersMock).toHaveBeenCalledTimes(1);
      expect(getUsersMock).toHaveBeenCalledWith({
        search: undefined,
        limit: 100,
        includeRoles: true,
        sort: "-id",
      });
    });
  });

  it("filters users based on the search form and supports reset", async () => {
    await renderPage();

    const user = userEvent.setup();
    getUsersMock.mockClear();

    const [searchInput] = screen.getAllByRole("textbox", {
      name: "Caută utilizatori",
    });
    await user.type(searchInput, "Manager");
    const [searchButton] = screen.getAllByRole("button", { name: "Caută" });
    await user.click(searchButton);

    await waitFor(() => {
      expect(getUsersMock).toHaveBeenCalledWith({
        search: "Manager",
        limit: 100,
        includeRoles: true,
        sort: "-id",
      });
    });

    getUsersMock.mockClear();
    const [resetButton] = screen.getAllByRole("button", { name: "Resetare" });
    await user.click(resetButton);

    await waitFor(() => {
      expect(searchInput).toHaveValue("");
      expect(getUsersMock).toHaveBeenCalledWith({
        search: undefined,
        limit: 100,
        includeRoles: true,
        sort: "-id",
      });
    });
  });

  it("validates the add user form and sends the correct payload", async () => {
    await renderPage();

    const user = userEvent.setup();
    const [openModalButton] = screen.getAllByRole("button", {
      name: /Adaugă utilizator/,
    });
    await user.click(openModalButton);

    const submitButton = screen
      .getAllByRole("button", { name: /Adaugă utilizator/ })
      .find((button) => button.getAttribute("type") === "submit");
    expect(submitButton).toBeDefined();

    await user.click(submitButton!);
    expect(
      screen.getByText("Introdu cel puțin un email sau un nume de utilizator."),
    ).toBeInTheDocument();

    const emailField = screen.getByLabelText("Email");
    const usernameField = screen.getByLabelText("Nume utilizator");
    await user.type(emailField, "new.user@example.com");
    await user.type(usernameField, "newuser");

    const passwordField = screen.getByLabelText("Parolă");
    await user.type(passwordField, "short");
    await user.click(submitButton!);
    expect(
      screen.getByText("Parola trebuie să aibă cel puțin 8 caractere."),
    ).toBeInTheDocument();

    await user.clear(passwordField);
    await user.type(passwordField, "supersecure8");
    await user.type(screen.getByLabelText("Prenume"), "Maria");
    await user.type(screen.getByLabelText("Nume"), "Ionescu");
    await user.type(screen.getByLabelText("Roluri"), "admin, manager");

    const superCheckbox = screen.getByRole("checkbox", {
      name: "Super utilizator",
    });
    const manageCheckbox = screen.getByRole("checkbox", {
      name: "Poate gestiona super utilizatorii",
    });
    await user.click(superCheckbox);
    await user.click(manageCheckbox);

    createUserMock.mockResolvedValue({ data: { id: 2 } });
    getUsersMock.mockResolvedValueOnce({ data: [baseUser] });

    await user.click(submitButton!);

    await waitFor(() => {
      expect(createUserMock).toHaveBeenCalledTimes(1);
      expect(createUserMock).toHaveBeenCalledWith({
        first_name: "Maria",
        last_name: "Ionescu",
        email: "new.user@example.com",
        username: "newuser",
        password: "supersecure8",
        super_user: true,
        manage_supers: true,
        roles: ["admin", "manager"],
      });
    });

    await waitFor(() => {
      expect(screen.queryByText(/Completează datele de bază/)).not.toBeInTheDocument();
    });
  });

  it("prefills and submits the edit user form", async () => {
    const editableUser: User = {
      ...baseUser,
      id: 3,
      first_name: "Ioana",
      last_name: "Georgescu",
      super_user: true,
      manage_supers: true,
      roles: ["admin", "support"],
    };
    await renderPage([editableUser]);

    const user = userEvent.setup();
    const [editButton] = screen.getAllByRole("button", {
      name: `Editează ${editableUser.first_name} ${editableUser.last_name}`,
    });
    await user.click(editButton);

    const firstNameField = screen.getByLabelText("Prenume");
    const lastNameField = screen.getByLabelText("Nume");
    const rolesField = screen.getByLabelText("Roluri");
    const superCheckbox = screen.getByRole("checkbox", {
      name: "Super utilizator",
    });
    const manageCheckbox = screen.getByRole("checkbox", {
      name: "Poate gestiona super utilizatorii",
    });

    expect(firstNameField).toHaveValue("Ioana");
    expect(lastNameField).toHaveValue("Georgescu");
    expect(screen.getByLabelText("Email")).toHaveValue("ana@example.com");
    expect(screen.getByLabelText("Nume utilizator")).toHaveValue("ana");
    expect(rolesField).toHaveValue("admin, support");
    expect(superCheckbox).toBeChecked();
    expect(manageCheckbox).toBeChecked();

    await user.clear(firstNameField);
    await user.type(firstNameField, "Ioana-Maria");
    await user.clear(lastNameField);
    await user.type(lastNameField, "Popescu");
    await user.clear(rolesField);
    await user.type(rolesField, "support");
    await user.click(superCheckbox);
    await user.click(manageCheckbox);

    const [saveButton] = screen.getAllByRole("button", {
      name: "Salvează modificările",
    });

    updateUserMock.mockResolvedValue({ data: { id: editableUser.id } });
    getUsersMock.mockResolvedValueOnce({ data: [editableUser] });

    await user.click(saveButton);

    await waitFor(() => {
      expect(updateUserMock).toHaveBeenCalledTimes(1);
      expect(updateUserMock).toHaveBeenCalledWith(editableUser.id, {
        first_name: "Ioana-Maria",
        last_name: "Popescu",
        email: "ana@example.com",
        username: "ana",
        super_user: false,
        manage_supers: false,
        roles: ["support"],
      });
    });

    await waitFor(() => {
      expect(screen.queryByText(/Completează datele de bază/)).not.toBeInTheDocument();
    });
  });

  it("confirms and deletes a user", async () => {
    await renderPage();

    const user = userEvent.setup();
    const rows = screen.getAllByRole("row");
    const targetRow = rows.find((row) =>
      within(row).queryByText("Ana Pop"),
    );
    expect(targetRow).toBeDefined();
    const deleteButton = within(targetRow!).getByRole("button", {
      name: "Șterge Ana Pop",
    });
    await user.click(deleteButton);

    const [confirmationMessage] = screen.getAllByText(
      /Ești sigur că vrei să ștergi contul/i,
    );
    expect(confirmationMessage).toBeInTheDocument();

    deleteUserMock.mockResolvedValue({ message: "Deleted" });
    getUsersMock.mockResolvedValueOnce({ data: [] });

    const [confirmDeleteButton] = screen.getAllByRole("button", {
      name: "Șterge utilizator",
    });
    await user.click(confirmDeleteButton);

    await waitFor(() => {
      expect(deleteUserMock).toHaveBeenCalledTimes(1);
      expect(deleteUserMock).toHaveBeenCalledWith(1);
    });
  });

  it("toggles the super user switch on and off", async () => {
    const users: User[] = [
      { ...baseUser, id: 10, first_name: "Paul", super_user: false },
      { ...baseUser, id: 11, first_name: "Laura", super_user: true },
    ];
    await renderPage(users);

    const user = userEvent.setup();

    makeUserSuperMock.mockResolvedValue({ message: "ok" });
    removeUserSuperMock.mockResolvedValue({ message: "ok" });

    const activateSwitch = screen.getByRole("switch", {
      name: "Activează statutul de super utilizator pentru Paul Pop",
    });
    await user.click(activateSwitch);

    await waitFor(() => {
      expect(makeUserSuperMock).toHaveBeenCalledWith(10);
      expect(activateSwitch).toHaveAttribute("aria-checked", "true");
    });

    const deactivateSwitch = screen.getByRole("switch", {
      name: "Dezactivează statutul de super utilizator pentru Laura Pop",
    });
    await user.click(deactivateSwitch);

    await waitFor(() => {
      expect(removeUserSuperMock).toHaveBeenCalledWith(11);
      expect(deactivateSwitch).toHaveAttribute("aria-checked", "false");
    });
  });
});

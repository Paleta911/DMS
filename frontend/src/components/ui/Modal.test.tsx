import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Modal } from "./Modal";

// Focus-management tests ensure dialog accessibility (trap + restore focus).
describe("Modal accessibility", () => {
  it("atrapa el foco dentro del modal al ciclar con tabulación", async () => {
    const { rerender } = render(
      <div>
        <button type="button">Abrir desde aquí</button>
        <Modal open={false} title="Modal de prueba" onClose={() => {}}>
          <button type="button">Primero</button>
          <button type="button">Último</button>
        </Modal>
      </div>,
    );

    const opener = screen.getByRole("button", { name: "Abrir desde aquí" });
    opener.focus();

    rerender(
      <div>
        <button type="button">Abrir desde aquí</button>
        <Modal open title="Modal de prueba" onClose={() => {}}>
          <button type="button">Primero</button>
          <button type="button">Último</button>
        </Modal>
      </div>,
    );

    const dialog = await screen.findByRole("dialog", {
      name: "Modal de prueba",
    });
    await waitFor(() => expect(dialog).toHaveFocus());

    const closeButton = within(dialog).getByRole("button", { name: "Cerrar" });
    const lastButton = within(dialog).getByRole("button", { name: "Último" });

    lastButton.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(closeButton).toHaveFocus();

    closeButton.focus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(lastButton).toHaveFocus();
  });

  it("restaura el foco al cerrar el modal", async () => {
    const handleClose = () => {};
    const { rerender } = render(
      <div>
        <button type="button">Volver aquí</button>
        <Modal open={false} title="Modal de cierre" onClose={handleClose}>
          <button type="button">Aceptar</button>
        </Modal>
      </div>,
    );

    const opener = screen.getByRole("button", { name: "Volver aquí" });
    opener.focus();

    rerender(
      <div>
        <button type="button">Volver aquí</button>
        <Modal open title="Modal de cierre" onClose={handleClose}>
          <button type="button">Aceptar</button>
        </Modal>
      </div>,
    );

    await screen.findByRole("dialog", { name: "Modal de cierre" });

    rerender(
      <div>
        <button type="button">Volver aquí</button>
        <Modal open={false} title="Modal de cierre" onClose={handleClose}>
          <button type="button">Aceptar</button>
        </Modal>
      </div>,
    );

    await waitFor(() => expect(opener).toHaveFocus());
  });
});

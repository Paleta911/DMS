import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../test/test-utils";
import { ResponsiveTable } from "./ResponsiveTable";

// Verifies responsive table keeps accessible labeling in desktop and mobile render modes.
describe("ResponsiveTable", () => {
  const items = [
    { id: 1, nombre: "Documento A" },
    { id: 2, nombre: "Documento B" },
  ];

  it("usa caption como etiqueta accesible en escritorio", () => {
    renderWithProviders(
      <ResponsiveTable
        caption="Listado de documentos"
        columns={[
          {
            header: "Nombre",
            cell: (item) => item.nombre,
          },
        ]}
        items={items}
        getRowKey={(item) => item.id}
        renderMobileCard={(item) => <div>{item.nombre}</div>}
      />,
    );

    expect(
      screen.getByRole("table", { name: "Listado de documentos" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Listado de documentos")).toHaveClass("sr-only");
  });

  it("usa ariaLabel explícita para la lista móvil", () => {
    renderWithProviders(
      <ResponsiveTable
        ariaLabel="Solicitudes pendientes"
        columns={[
          {
            header: "Nombre",
            cell: (item) => item.nombre,
          },
        ]}
        items={items}
        getRowKey={(item) => item.id}
        renderMobileCard={(item) => <div>{item.nombre}</div>}
      />,
    );

    const mobileList = screen.getByRole("list", {
      name: "Solicitudes pendientes",
    });
    const renderedItems = within(mobileList).getAllByRole("listitem");
    expect(renderedItems).toHaveLength(2);
  });
});

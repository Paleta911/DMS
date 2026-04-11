import { expect, test } from '@playwright/test';
import { closeDb, deleteUsersByEmails, ensureSuperAdminUser, setVerificationCode } from './helpers/db';
import { loginThroughUi, waitForAuthenticatedUi, waitForToast } from './helpers/ui';

const adminEmail = 'admin@local.com';
const adminPassword = 'Admin12345A';
const verificationCode = '123456';
const runId = `e2e-reg-${Date.now()}`;
const userEmail = `${runId}@bsm.com.mx`;
const userPassword = 'Usuario123A';

test.describe.serial('registro, aprobacion y solicitudes', () => {
  test.beforeAll(async () => {
    await ensureSuperAdminUser(adminEmail, adminPassword);
    await deleteUsersByEmails([userEmail]);
  });

  test.afterAll(async () => {
    await deleteUsersByEmails([userEmail]);
    await closeDb();
  });

  test('registro publico, verificacion, aprobacion admin y solicitud de permisos', async ({ browser }) => {
    const registrationContext = await browser.newContext();
    const registrationPage = await registrationContext.newPage();
    const requestedAreaName = `Area manual ${runId}`;

    await registrationPage.goto('/register');
    await registrationPage.getByLabel('Nombre(s)').fill('E2E');
    await registrationPage.getByLabel('Primer apellido').fill('Registro');
    await registrationPage.getByLabel('Segundo apellido').fill('Browser');
    await registrationPage.getByLabel('Teléfono/extensión').fill('5551234567');
    await registrationPage.getByLabel('Correo').fill(userEmail);
    await registrationPage.getByLabel('Fecha de nacimiento').fill('1998-02-10');
    await registrationPage.getByLabel(/^Contraseña$/).fill(userPassword);
    await registrationPage.getByLabel('Confirmar contraseña').fill(userPassword);
    await registrationPage.getByLabel('Mi área no está en la lista').check();
    await registrationPage.getByLabel('Escribe tu área').fill(requestedAreaName);
    await registrationPage.getByRole('button', { name: 'Crear cuenta' }).click();
    await registrationPage
      .getByRole('dialog', { name: 'Área enviada para revisión' })
      .getByRole('button', { name: 'OK' })
      .click();

    await expect(registrationPage).toHaveURL(/\/verify-email$/);
    await setVerificationCode(userEmail, verificationCode);
    for (const [index, digit] of verificationCode.split('').entries()) {
      await registrationPage.getByLabel(`Dígito ${index + 1} del código`).fill(digit);
    }
    await registrationPage.getByRole('button', { name: 'Verificar' }).click();
    await expect(registrationPage).toHaveURL(/\/login$/);

    await loginThroughUi(registrationPage, userEmail, userPassword);
    await waitForToast(registrationPage, /Cuenta pendiente de aprobación/i);
    await expect(registrationPage).toHaveURL(/\/login$/);
    await registrationContext.close();

    const adminApprovalContext = await browser.newContext();
    const adminApprovalPage = await adminApprovalContext.newPage();
    await loginThroughUi(adminApprovalPage, adminEmail, adminPassword);
    await waitForAuthenticatedUi(adminApprovalPage);
    await adminApprovalPage.goto('/admin/users');
    await adminApprovalPage.getByLabel('Buscar').fill(userEmail);

    const registrationsTable = adminApprovalPage.getByRole('table', {
      name: 'Registros de usuarios pendientes y atendidos',
    });
    const registrationRow = registrationsTable
      .locator('tbody tr')
      .filter({ hasText: userEmail })
      .first();
    await expect(registrationRow).toBeVisible();
    await registrationRow.getByRole('button', { name: 'Aprobar' }).click();
    await waitForToast(adminApprovalPage, 'Registro aprobado');
    await adminApprovalContext.close();

    const userRequestContext = await browser.newContext();
    const userRequestPage = await userRequestContext.newPage();
    await loginThroughUi(userRequestPage, userEmail, userPassword);
    await waitForAuthenticatedUi(userRequestPage);
    await userRequestPage.goto('/permissions/request');
    await expect(userRequestPage).toHaveURL(/\/permissions\/request$/);

    await userRequestPage.getByLabel('Subir documentos').check();
    await userRequestPage
      .getByLabel('Comentario')
      .first()
      .fill('Necesito cargar evidencias de prueba');
    await userRequestPage.getByRole('button', { name: /^Enviar solicitud$/ }).click();
    await waitForToast(userRequestPage, 'Solicitud enviada');

    await userRequestContext.close();

    const adminRequestsContext = await browser.newContext();
    const adminRequestsPage = await adminRequestsContext.newPage();
    await loginThroughUi(adminRequestsPage, adminEmail, adminPassword);
    await waitForAuthenticatedUi(adminRequestsPage);
    await adminRequestsPage.goto('/admin/permission-requests');
    await expect(adminRequestsPage).toHaveURL(/\/admin\/permission-requests$/);
    await adminRequestsPage.getByPlaceholder('Correo del usuario').fill(userEmail);

    const permissionRow = adminRequestsPage
      .locator('table tbody tr')
      .filter({ hasText: userEmail })
      .filter({ hasText: 'Permisos' })
      .first();
    await expect(permissionRow).toBeVisible();
    await permissionRow.getByRole('button', { name: 'Aprobar' }).click();
    await waitForToast(adminRequestsPage, 'Solicitud aprobada');

    await adminRequestsContext.close();

    const userVerificationContext = await browser.newContext();
    const userVerificationPage = await userVerificationContext.newPage();
    await loginThroughUi(userVerificationPage, userEmail, userPassword);
    await waitForAuthenticatedUi(userVerificationPage);
    await userVerificationPage.goto('/permissions/request');
    await expect(userVerificationPage.getByText('Subir documentos (ya activo)')).toBeVisible();
    await expect(userVerificationPage.getByRole('cell', { name: 'UPLOAD' })).toBeVisible();
    await userVerificationContext.close();
  });
});

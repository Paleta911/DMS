import { expect, test } from '@playwright/test';
import {
  closeDb,
  deleteDocumentsByNamePrefix,
  deleteUsersByEmails,
  ensureApprovedUser,
  ensureSuperAdminUser,
  getLatestVersionIdByDocumentId,
  waitForAuditAction,
  waitForDocumentIdByName,
  waitForDocumentStatus,
} from './helpers/db';
import { createPdfFixture } from './helpers/pdf';
import {
  loginThroughUi,
  selectUserFromLookup,
  waitForAuthenticatedUi,
  waitForToast,
} from './helpers/ui';

// Full workflow e2e: upload -> assign reviewers -> submit -> review -> final approve -> audited download.
const adminEmail = 'admin@local.com';
const adminPassword = 'Admin12345A';
const runId = `e2e-doc-${Date.now()}`;
const documentPrefix = `${runId}-doc`;
const documentName = `${documentPrefix}-workflow`;
const creatorEmail = `${runId}-creator@local.com`;
const reviewerEmail = `${runId}-reviewer@local.com`;
const approverEmail = `${runId}-approver@local.com`;
const userPassword = 'Usuario123A';

test.describe.serial('workflow documental completo', () => {
  test.beforeAll(async () => {
    // Prepare clean users/documents and provision role-specific permissions.
    await ensureSuperAdminUser(adminEmail, adminPassword);
    await deleteDocumentsByNamePrefix(documentPrefix);
    await deleteUsersByEmails([creatorEmail, reviewerEmail, approverEmail]);

    await ensureApprovedUser({
      email: creatorEmail,
      password: userPassword,
      nombre: 'Creador',
      primerApellido: 'E2E',
      telefono: '5550001000',
      areaCodes: ['RC'],
      permissions: {
        canAccess: true,
        canRead: true,
        canUpload: true,
      },
    });

    await ensureApprovedUser({
      email: reviewerEmail,
      password: userPassword,
      nombre: 'Revisor',
      primerApellido: 'E2E',
      telefono: '5550002000',
      areaCodes: ['RC'],
      permissions: {
        canAccess: true,
        canRead: true,
        canReview: true,
      },
    });

    await ensureApprovedUser({
      email: approverEmail,
      password: userPassword,
      nombre: 'Aprobador',
      primerApellido: 'E2E',
      telefono: '5550003000',
      areaCodes: ['RC'],
      permissions: {
        canAccess: true,
        canRead: true,
        canApprove: true,
      },
    });
  });

  test.afterAll(async () => {
    await deleteDocumentsByNamePrefix(documentPrefix);
    await deleteUsersByEmails([creatorEmail, reviewerEmail, approverEmail]);
    await closeDb();
  });

  test('carga, asignacion, revision, aprobacion y descarga auditada', async ({
    browser,
  }) => {
    const pdfPath = await createPdfFixture(
      `${runId}.pdf`,
      `Documento ${documentName}`,
    );

    // 1) Creator uploads initial document version.
    const creatorUploadContext = await browser.newContext();
    const creatorUploadPage = await creatorUploadContext.newPage();
    await loginThroughUi(creatorUploadPage, creatorEmail, userPassword);
    await waitForAuthenticatedUi(creatorUploadPage);

    await creatorUploadPage
      .getByRole('button', { name: 'Subir documento' })
      .click();
    const uploadDialog = creatorUploadPage.getByRole('dialog', {
      name: 'Nuevo documento',
    });
    await uploadDialog.getByLabel('Nombre documento').fill(documentName);
    await uploadDialog.getByLabel('Archivo').setInputFiles(pdfPath);
    await uploadDialog.getByLabel('Tipo').selectOption('PRO');
    await uploadDialog.getByLabel('Área').selectOption('RC');
    await uploadDialog.getByRole('button', { name: 'Guardar' }).click();
    await waitForToast(creatorUploadPage, 'Documento cargado');

    const documentId = await waitForDocumentIdByName(documentName);
    await creatorUploadContext.close();

    // 2) Admin assigns review and approval users.
    const adminAssignContext = await browser.newContext();
    const adminAssignPage = await adminAssignContext.newPage();
    await loginThroughUi(adminAssignPage, adminEmail, adminPassword);
    await waitForAuthenticatedUi(adminAssignPage);
    await adminAssignPage.goto(`/documents/${documentId}`);
    await expect(adminAssignPage).toHaveURL(
      new RegExp(`/documents/${documentId}$`),
    );
    await adminAssignPage
      .getByRole('button', { name: 'Asignar revisión/aprobación' })
      .click();
    await selectUserFromLookup(
      adminAssignPage,
      'Revisión (correo o nombre)',
      'Revisor',
      reviewerEmail,
    );
    await selectUserFromLookup(
      adminAssignPage,
      'Aprobación (correo o nombre)',
      'Aprobador',
      approverEmail,
    );
    await adminAssignPage
      .getByRole('dialog', { name: 'Asignar revisión / aprobación' })
      .getByRole('button', { name: 'Guardar' })
      .click();
    await waitForToast(adminAssignPage, 'Flujo actualizado');
    await adminAssignContext.close();

    // 3) Creator submits document to review stage.
    const creatorSubmitContext = await browser.newContext();
    const creatorSubmitPage = await creatorSubmitContext.newPage();
    await loginThroughUi(creatorSubmitPage, creatorEmail, userPassword);
    await waitForAuthenticatedUi(creatorSubmitPage);
    await creatorSubmitPage.goto(`/documents/${documentId}`);
    await creatorSubmitPage
      .getByRole('button', { name: 'Enviar a revisión' })
      .click();
    await creatorSubmitPage.getByRole('button', { name: 'Confirmar' }).click();
    await waitForToast(creatorSubmitPage, 'Enviado a revisión');
    await waitForDocumentStatus(documentId, 'IN_REVIEW');
    await creatorSubmitContext.close();

    // 4) Reviewer performs intermediate decision.
    const reviewerContext = await browser.newContext();
    const reviewerPage = await reviewerContext.newPage();
    await loginThroughUi(reviewerPage, reviewerEmail, userPassword);
    await waitForAuthenticatedUi(reviewerPage);
    await reviewerPage.goto(`/documents/${documentId}`);
    await reviewerPage.getByRole('button', { name: 'Aprobar' }).click();
    await reviewerPage.getByRole('button', { name: 'Confirmar' }).click();
    await waitForToast(reviewerPage, 'Decisión registrada');
    await reviewerContext.close();

    // 5) Approver performs final decision and validates download audit log.
    const approverContext = await browser.newContext();
    const approverPage = await approverContext.newPage();
    await loginThroughUi(approverPage, approverEmail, userPassword);
    await waitForAuthenticatedUi(approverPage);
    await approverPage.goto(`/documents/${documentId}`);
    await approverPage.getByRole('button', { name: 'Aprobar final' }).click();
    await approverPage.getByRole('button', { name: 'Confirmar' }).click();
    await waitForToast(approverPage, 'Decisión registrada');
    await waitForDocumentStatus(documentId, 'APPROVED');
    await expect(
      approverPage.getByRole('button', { name: 'Descargar' }).first(),
    ).toBeVisible();

    const latestVersionId = await getLatestVersionIdByDocumentId(documentId);
    if (!latestVersionId) {
      throw new Error(`No se encontro version para el documento ${documentId}`);
    }

    const auditPromise = waitForAuditAction({
      action: 'VERSION_DOWNLOAD',
      resourceType: 'version',
      resourceId: latestVersionId,
      timeoutMs: 10000,
    });
    await approverPage.getByRole('button', { name: 'Descargar' }).click();
    await auditPromise;
    await approverContext.close();
  });
});

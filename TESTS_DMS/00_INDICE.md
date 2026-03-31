# TESTS_DMS

## Backend

- `backend/jest.config.cjs`
- `backend/app/`
- `backend/auth/`
- `backend/common/`
- `backend/controllers/`
- `backend/documents/`
- `backend/dto/`
- `backend/email/`
- `backend/facades/`
- `backend/permissions/`
- `backend/platform/`
- `backend/search/`
- `backend/users/`
- `backend/versions/`

### Ejecutar

```powershell
cd backend
npx jest -c ..\TESTS_DMS\backend\jest.config.cjs --runInBand
```

## Frontend

- `frontend/setup.ts`
- `frontend/api/`
- `frontend/app/`
- `frontend/auth/`
- `frontend/components/`
- `frontend/pages/`
- `frontend/utils/`

### Ejecutar

```powershell
cd frontend
npx vitest --config vite.tests-dms.config.ts run
```

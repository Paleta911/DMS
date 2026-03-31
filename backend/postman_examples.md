# Postman Examples

Base URL: `http://localhost:3000`

## Login
POST `/auth/login`
```json
{
  "email": "admin@local.com",
  "password": "Admin123"
}
```

## Bootstrap admin
POST `/auth/bootstrap-admin`
```json
{
  "email": "admin@local.com",
  "password": "Admin123"
}
```

## Crear categoria (admin)
POST `/categories`
Headers:
- `Authorization: Bearer <TOKEN>`
```json
{
  "nombre": "Contratos"
}
```

## Upload documento
POST `/documents/upload`
Headers:
- `Authorization: Bearer <TOKEN>`
Form-data:
- `file`: (archivo)
- `nombreDocumento`: "Contrato Q1"
- `comentario`: "Primera version"
- `categoryId`: 1
- `documentTypeCode`: "PRO"
- `areaCode`: "RC"

## List documents
GET `/documents?page=1&limit=20`
Headers:
- `Authorization: Bearer <TOKEN>`

## Download version
GET `/versions/1/download`
Headers:
- `Authorization: Bearer <TOKEN>`

## Buscar
GET `/search?q=PRO&documentTypeCode=PRO&areaCode=RC`
Headers:
- `Authorization: Bearer <TOKEN>`

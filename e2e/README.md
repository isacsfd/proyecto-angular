# E2E local con Playwright

Estas pruebas no despliegan ni usan Neon/Render. Requieren que estén activos:

- FastAPI local en `127.0.0.1:8000` con un usuario de prueba.
- Express local en `127.0.0.1:4000` con `biblioteca_iub_compras_test`.
- Angular local en `127.0.0.1:4200`.

Variables opcionales:

```powershell
$env:E2E_IDENTIFICACION = '900001'
$env:E2E_PASSWORD = '<credencial-temporal>'
npm install
npx playwright install chromium
npm test
```

La prueba valida login, CORS, creación de proveedor y compra, creación de
detalle y actualización del detalle desde Angular usando Express.

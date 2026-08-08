# Ejecutar ALFRED correctamente en Windows

El error:

```text
npm error path C:\Windows\System32\package.json
ENOENT Could not read package.json
```

ocurre porque el comando se ejecutó desde `C:\Windows\System32`, no desde la carpeta del proyecto.

## Opción recomendada: Git Bash / terminal Hermes

```bash
cd "$HOME/Desktop/alfred"
npm run lint && npm run build && npm run test
npm run dev
```

## PowerShell moderno

En PowerShell 7, `&&` funciona. En Windows PowerShell antiguo puede fallar. Use punto y coma:

```powershell
cd "C:\Users\Asus  Zenbook pro\Desktop\alfred"
npm run lint; npm run build; npm run test
npm run dev
```

## PowerShell con parada si falla

```powershell
cd "C:\Users\Asus  Zenbook pro\Desktop\alfred"
npm run lint
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
```

## No usar

```powershell
C:\Windows\System32> npm run lint
```

`npm` busca `package.json` en la carpeta actual. ALFRED tiene su `package.json` en:

```text
C:\Users\Asus  Zenbook pro\Desktop\alfred\package.json
```

# Calculadora de corte y canteado (ag5corte) · reglas de entorno

## 1. Validar antes de cada commit

Node y gh están instalados en este Mac, en `/opt/homebrew/bin`. Esa carpeta
puede no estar en el PATH de los comandos de Claude: antepón
`export PATH="/opt/homebrew/bin:$PATH";` o usa rutas absolutas.

Antes de cualquier commit, valida siempre los `<script>` inline de
`index.html` con `node --check` (el script `check_js.py` de la skill
`ag5-apps` lo hace y traduce los números de línea). No se hace commit si la
validación falla.

## 2. Push con git, credenciales de gh

Las credenciales de GitHub están configuradas con `gh` (cuenta
`alvaroperez97-lgtm`). Haz push directamente con git; **no uses el conector
de GitHub para escribir** (solo para leer).

El `credential.helper` global de git es `osxkeychain`, que no tiene las
credenciales de GitHub, así que haz push usando gh como helper:

```bash
git -c credential.helper= -c credential.helper='!/opt/homebrew/bin/gh auth git-credential' push origin main
```

## 3. Explicar en lenguaje claro y confirmar antes del push

El usuario no programa. Explica cada cambio en lenguaje claro (qué cambia en
la app y qué debe probar), sin jerga técnica innecesaria. **Pide
confirmación antes de hacer push a `main`**: `main` se despliega solo en
Netlify (producción) en 1-2 minutos.

## 4. Subir APP_BUILD en cambios funcionales

En cualquier cambio funcional, sube `APP_BUILD` en `index.html` (formato
`AAAA-MM-DD.N`, N reinicia cada día; `bump_build.py` de la skill `ag5-apps`)
para que la app instalada detecte la actualización. Los cambios sin efecto
funcional (comentarios, documentación como este archivo) no lo suben.

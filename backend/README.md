# TrustLink — Backend Web (Spring Boot)

Marketplace con escrow y reputación on-chain (SBT) en Arbitrum, con
crédito progresivo simple. Backend Spring Boot + Thymeleaf + MySQL +
Web3j, conectado a los contratos reales de `../contracts`.

## Estado del proyecto (léanlo antes de nada)

Este backend se escribió completo en un entorno sin acceso a Maven
Central (el repositorio central de dependencias Java), así que **no se
pudo compilar ni correr aquí para verificarlo** — a diferencia de los
smart contracts (`../contracts`), que sí se compilaron y probaron de
extremo a extremo con 11 tests pasando.

Esto significa: la lógica, estructura, y flujo de todo el código son
correctos según las reglas de Spring Boot 3 / Java 21, pero **es posible
que aparezcan 1-2 errores menores de compilación** (un import faltante,
un tipo mal casteado) la primera vez que alguien del equipo lo compile
con Maven de verdad. Si eso pasa: el error de Maven/`javac` dice
exactamente el archivo y la línea — son ajustes rápidos, no hay que
reescribir nada. No dejen esto para el último día.

## Requisitos

- Java 21
- Maven 3.9+
- MySQL 8+ (o usar el perfil H2 para probar sin instalar nada — ver abajo)
- Los contratos ya desplegados en Arbitrum Sepolia (ver `../contracts/README.md`)

## Pasos para correr el proyecto

### 1. Compilar

```bash
cd backend
mvn clean install
```

### 2. Configurar la base de datos

**Opción A — MySQL (recomendada para la demo real):**
Crear la base de datos vacía (Spring la llena solo):
```sql
CREATE DATABASE trustlink CHARACTER SET utf8mb4;
```
Ajustar usuario/contraseña en `src/main/resources/application.properties`
si no usan `root` sin contraseña.

**Opción B — H2 (para probar rápido sin instalar MySQL):**
```bash
mvn spring-boot:run -Dspring-boot.run.profiles=h2
```

### 3. Configurar las variables de blockchain

Después de desplegar los contratos (`../contracts/deploy_arbitrum_sepolia.js`),
copiar del archivo `deployed_addresses.json` generado:

En `application.properties`:
```properties
trustlink.contracts.escrow-address=<direccion de TrustLinkEscrow>
trustlink.contracts.reputation-address=<direccion de TrustLinkReputation>
trustlink.web3.backend-private-key=<la MISMA clave privada usada para desplegar>
```

La wallet del backend debe ser la misma que desplegó los contratos,
porque es la `owner()` autorizada para llamar funciones administrativas
(`actualizarScore`, `resolverDisputa`).

### 4. Configurar la clave de cifrado de wallets

```bash
openssl rand -base64 32
```
Copiar el resultado en `trustlink.wallet.master-key` de
`application.properties`. **No usen el valor de ejemplo en la demo real.**

### 4.1. (Opcional) Traductor de jerga cripto con IA

El detalle de cada orden (`/marketplace/orden/{id}`) muestra una frase en
lenguaje simple explicando el estado del escrow (p. ej. "Tu pago de S/150
está guardado de forma segura..."). Por defecto esa frase se genera con
plantillas locales (`TraductorCriptoService`), sin depender de ningún
servicio externo.

Para que esa frase la redacte Gemini (más natural, mismo contenido) agregar
en `application.properties`:
```properties
trustlink.ai.enabled=true
trustlink.ai.gemini-api-key=<tu API key de Google AI Studio>
trustlink.ai.gemini-model=gemini-1.5-flash
```
Si `trustlink.ai.enabled` es `false` (default), no hay API key configurada,
o la llamada a Gemini falla o tarda demasiado, se usa automáticamente el
texto de plantilla local — el flujo de compra nunca depende de esto.

### 5. Correr

```bash
mvn spring-boot:run
```

La app queda en `http://localhost:8080`.

## Cuentas de acceso

**Superadmin** (creado automáticamente al primer arranque, ver
`DataSeeder.java`):
- Email: `superadmin@trustlink.com`
- Contraseña: `trust2026`

Cualquier otra cuenta se crea desde `/auth/registro`.

## Qué hace cada rol

- **Usuario normal:** puede comprar y publicar productos para vender
  (no hay cuentas separadas de comprador/vendedor).
- **Superadmin:** panel en `/admin` — ver métricas, banear/desbanear
  usuarios, resolver disputas de escrow manualmente (llama al contrato
  on-chain de verdad).

## Recuperación de contraseña sin SMTP

Si no configuran `spring.mail.*` en `application.properties`, el flujo
de recuperación de contraseña sigue funcionando: el enlace se muestra
directamente en la pantalla de "recuperar contraseña" en vez de
enviarse por correo real (ver alerta azul en esa pantalla). Esto es
intencional, para que la demo funcione sin depender de configurar SMTP.

Para correo real, completar en `application.properties`:
```properties
spring.mail.username=tu_correo@gmail.com
spring.mail.password=tu_contraseña_de_aplicación
```

## Estructura del proyecto

```
backend/
├── src/main/java/com/trustlink/backend/
│   ├── config/         # Seguridad, seeder del superadmin
│   ├── controller/      # Endpoints web (Thymeleaf)
│   ├── dto/              # Formularios de entrada
│   ├── entity/           # Tablas JPA
│   ├── repository/       # Acceso a datos
│   ├── security/         # UserDetails, rate limiter, cifrado AES
│   ├── service/          # Lógica de negocio
│   └── web3/             # Integración real con Arbitrum (Web3j)
├── src/main/resources/
│   ├── templates/         # Vistas Thymeleaf (paleta rojo/blanco)
│   ├── static/css/        # Estilos
│   ├── contracts/          # ABIs de los contratos
│   └── db/schema_referencia.sql
```

## Notas de seguridad implementadas

- Contraseñas: BCrypt factor 12, nunca texto plano.
- Recuperación de contraseña: token de un solo uso, expira en 30
  minutos, se guarda como hash SHA-256 (nunca en texto plano).
- Rate limiting en memoria: máx. 5 intentos de login fallidos por
  correo en 15 minutos; máx. 3 solicitudes de recuperación por hora.
- Claves privadas de wallets embebidas: cifradas con AES-256-GCM antes
  de guardarse en la base de datos.
- Usuario baneado: no puede iniciar sesión aunque su contraseña sea
  correcta (bloqueo a nivel de `UserDetails.isEnabled()`).

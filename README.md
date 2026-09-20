# Construction

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.1.4.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Docker deployment

The Docker image is a multi-stage build: Node is used only to build the Angular application, while the final image contains nginx and the generated static files only. It listens on port `8080` and exposes `GET /healthz` for health checks.

The API base URL is configured at container startup through `API_URL`. This lets one image run in either environment; it does not affect the local `npm start` / `ng serve` workflow.

Build and run the development image:

```bash
docker build --build-arg API_URL=https://api.dev.iconic.neurocodejo.com -t iconic-frontend:dev .
docker run --rm -p 8080:8080 -e API_URL=https://api.dev.iconic.neurocodejo.com iconic-frontend:dev
```

Build and run the production image:

```bash
docker build --build-arg API_URL=https://api.iconic.neurocodejo.com -t iconic-frontend:prod .
docker run --rm -p 8080:8080 -e API_URL=https://api.iconic.neurocodejo.com iconic-frontend:prod
```

For VPS deployment, create a `.env` file next to `docker-compose.yml` for each branch/environment:

```dotenv
API_URL=https://api.dev.iconic.neurocodejo.com
FRONTEND_PORT=8081
```

Use `https://api.iconic.neurocodejo.com` and a different `FRONTEND_PORT` (for example `8082`) in the production checkout. Then deploy with:

```bash
git pull
docker compose up -d --build
```

The compose port is bound to `127.0.0.1` only; the host nginx should terminate TLS and reverse-proxy the public domain to that local port. Deep links are handled by nginx's SPA fallback.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

# Changelog

## [0.2.7](https://github.com/pabloqr/sportying-backend/compare/v0.2.6...v0.2.7) (2026-04-19)


### CI/CD

* remove unnecessary job dependencies from CD Development workflow ([8f5ecd5](https://github.com/pabloqr/sportying-backend/commit/8f5ecd5c3338095b41128135d669cb9498c34e0d))
* update CI and CD workflows for improved deployment and consolidation of Dependabot updates ([6f8b9e2](https://github.com/pabloqr/sportying-backend/commit/6f8b9e259591d2cfd3e633838126dc61c337e45a))
* update CI and CD workflows for improved deployment and consolidation of Dependabot updates ([291f91f](https://github.com/pabloqr/sportying-backend/commit/291f91f7c4c16a7706c84f463703427774d0a030))

## [0.2.6](https://github.com/pabloqr/sportying-backend/compare/v0.2.5...v0.2.6) (2026-04-19)


### CI/CD

* update GitHub Actions to use latest versions of actions ([2f63788](https://github.com/pabloqr/sportying-backend/commit/2f637882f6304b7a3a6d78b9fde66137081a3a24))

## [0.2.5](https://github.com/pabloqr/sportying-backend/compare/v0.2.4...v0.2.5) (2026-04-19)


### CI/CD

* add back-merge workflow to automate merging main into dev after releases ([0654861](https://github.com/pabloqr/sportying-backend/commit/065486133152efd6566e8659a02113d8512067e8))
* add back-merge workflow to automate merging main into dev after releases ([e31b7f9](https://github.com/pabloqr/sportying-backend/commit/e31b7f903ca7d7ea723b769fe809eb929199947d))

## [0.2.4](https://github.com/pabloqr/sportying-backend/compare/v0.2.3...v0.2.4) (2026-04-12)


### CI/CD

* refactor JWT secret handling to use dummy environment variables i… ([038d088](https://github.com/pabloqr/sportying-backend/commit/038d08815aea78f58e84a303349877b098eb36d8))
* refactor JWT secret handling to use dummy environment variables in workflows ([898fca9](https://github.com/pabloqr/sportying-backend/commit/898fca91dd452fd79f583744801eb321af77c2b1))

## [0.2.3](https://github.com/pabloqr/sportying-backend/compare/v0.2.2...v0.2.3) (2026-04-12)


### CI/CD

* split production CI and CD into separate workflows ([4471ca6](https://github.com/pabloqr/sportying-backend/commit/4471ca67bc32dbbf1edf0e648bd87aa0bd8ac1f3))
* split production CI and CD into separate workflows ([1dc5d24](https://github.com/pabloqr/sportying-backend/commit/1dc5d24d0e0c0858f3885b9d9987bb389b306ef3))

## [0.2.2](https://github.com/pabloqr/sportying-backend/compare/v0.2.1...v0.2.2) (2026-04-12)


### Refactors

* add database migration step and streamline Dockerfile for p… ([22d3191](https://github.com/pabloqr/sportying-backend/commit/22d3191c30294e6beeab636a26a9c70f6e4cd140))
* add database migration step and streamline Dockerfile for production ([03c951c](https://github.com/pabloqr/sportying-backend/commit/03c951c80fccbd3820b879ed7950935d5ae13c20))


### Tests

* **auth:** replace ForbiddenException with UnauthorizedException in signin tests ([5148dd3](https://github.com/pabloqr/sportying-backend/commit/5148dd3e2ef1e5b10affed93606910ab17b5414e))


### CI/CD

* add build step for Docker image before running migrations ([1447441](https://github.com/pabloqr/sportying-backend/commit/1447441608516aed154d30611f64c87488d80a40))
* add build step for Docker image before running migrations ([94a557d](https://github.com/pabloqr/sportying-backend/commit/94a557d86654e3c624fcb2af037ec2b79ef1326d))
* add Dependabot configuration ([2b249e1](https://github.com/pabloqr/sportying-backend/commit/2b249e1d5e8de79f6f1e822971c57efe86cc7ea6))
* add prodution workflow ([f4df207](https://github.com/pabloqr/sportying-backend/commit/f4df207c86235e22fdc3deccabba9c0a30b51e09))
* add release-please workflow and configuration ([920b22b](https://github.com/pabloqr/sportying-backend/commit/920b22b7cecc7f106c810cbc220f509da6c6602c))
* add smoke tests to production workflow ([94ace22](https://github.com/pabloqr/sportying-backend/commit/94ace22f89c7796067228632fa1301e397e160ec))
* add snyk container tests and codeql integration ([51fbf43](https://github.com/pabloqr/sportying-backend/commit/51fbf4333403fbb8a66d0b639f69152fd85aea47))
* add snyk ignore paths ([1dac2af](https://github.com/pabloqr/sportying-backend/commit/1dac2afc1797f6dd74c59da79c898abd598464a0))
* add snyk security scanning job ([d131522](https://github.com/pabloqr/sportying-backend/commit/d131522bb0fef917fac72145f60f39faf97ca3b3))
* add trigger on pull request ([69da950](https://github.com/pabloqr/sportying-backend/commit/69da950337f91bf7e848dc367ce705df19fb0d0b))
* copy prisma.config.ts to runtime image in Dockerfile ([a45fb5b](https://github.com/pabloqr/sportying-backend/commit/a45fb5be0ca7c416520d64b0b50c4b16988ee1a4))
* copy prisma.config.ts to runtime image in Dockerfile ([6c56797](https://github.com/pabloqr/sportying-backend/commit/6c56797f59dda90d8e9b370a90407ffd6567e53e))
* fix version tag format in release-please config ([7c7580e](https://github.com/pabloqr/sportying-backend/commit/7c7580e27d6ef689553f1625841ad8ce5c56e3c0))
* fix version tag format in release-please config ([0a36954](https://github.com/pabloqr/sportying-backend/commit/0a369541e273795ec8b8f4997d91515836990da3))
* incorrect snyk output file name ([29d6235](https://github.com/pabloqr/sportying-backend/commit/29d6235b52cb01d86bd8fb10d82b189bd978f52f))
* remove snyk container scan ([a392986](https://github.com/pabloqr/sportying-backend/commit/a3929861957dfaf07436ecb23fc73d644b321539))
* trigger deploy on version tags only ([920b22b](https://github.com/pabloqr/sportying-backend/commit/920b22b7cecc7f106c810cbc220f509da6c6602c))
* update codeql-action/upload-sarif to v4 ([fde093b](https://github.com/pabloqr/sportying-backend/commit/fde093b5e8474fcd234557c13b0d26c5f2c5195e))
* update prisma directory copy in Dockerfile ([f8dda8d](https://github.com/pabloqr/sportying-backend/commit/f8dda8d9a22af628b4edf3058dc48676098db41b))
* update prisma directory copy in Dockerfile ([3977794](https://github.com/pabloqr/sportying-backend/commit/3977794a509901ad3a94cb294b3fa42d518e84a5))
* update production dockerfile to reduce deployment time ([e6231a7](https://github.com/pabloqr/sportying-backend/commit/e6231a737a33dc38a00fb48b3513a7e4a9496cf0))

## [0.2.1](https://github.com/pabloqr/sportying-backend/compare/sportying-v0.2.0...sportying-v0.2.1) (2026-04-12)


### Refactors

* add database migration step and streamline Dockerfile for p… ([22d3191](https://github.com/pabloqr/sportying-backend/commit/22d3191c30294e6beeab636a26a9c70f6e4cd140))
* add database migration step and streamline Dockerfile for production ([03c951c](https://github.com/pabloqr/sportying-backend/commit/03c951c80fccbd3820b879ed7950935d5ae13c20))


### Tests

* **auth:** replace ForbiddenException with UnauthorizedException in signin tests ([5148dd3](https://github.com/pabloqr/sportying-backend/commit/5148dd3e2ef1e5b10affed93606910ab17b5414e))


### CI/CD

* add build step for Docker image before running migrations ([1447441](https://github.com/pabloqr/sportying-backend/commit/1447441608516aed154d30611f64c87488d80a40))
* add build step for Docker image before running migrations ([94a557d](https://github.com/pabloqr/sportying-backend/commit/94a557d86654e3c624fcb2af037ec2b79ef1326d))
* add Dependabot configuration ([2b249e1](https://github.com/pabloqr/sportying-backend/commit/2b249e1d5e8de79f6f1e822971c57efe86cc7ea6))
* add prodution workflow ([f4df207](https://github.com/pabloqr/sportying-backend/commit/f4df207c86235e22fdc3deccabba9c0a30b51e09))
* add release-please workflow and configuration ([920b22b](https://github.com/pabloqr/sportying-backend/commit/920b22b7cecc7f106c810cbc220f509da6c6602c))
* add smoke tests to production workflow ([94ace22](https://github.com/pabloqr/sportying-backend/commit/94ace22f89c7796067228632fa1301e397e160ec))
* add snyk container tests and codeql integration ([51fbf43](https://github.com/pabloqr/sportying-backend/commit/51fbf4333403fbb8a66d0b639f69152fd85aea47))
* add snyk ignore paths ([1dac2af](https://github.com/pabloqr/sportying-backend/commit/1dac2afc1797f6dd74c59da79c898abd598464a0))
* add snyk security scanning job ([d131522](https://github.com/pabloqr/sportying-backend/commit/d131522bb0fef917fac72145f60f39faf97ca3b3))
* add trigger on pull request ([69da950](https://github.com/pabloqr/sportying-backend/commit/69da950337f91bf7e848dc367ce705df19fb0d0b))
* copy prisma.config.ts to runtime image in Dockerfile ([a45fb5b](https://github.com/pabloqr/sportying-backend/commit/a45fb5be0ca7c416520d64b0b50c4b16988ee1a4))
* copy prisma.config.ts to runtime image in Dockerfile ([6c56797](https://github.com/pabloqr/sportying-backend/commit/6c56797f59dda90d8e9b370a90407ffd6567e53e))
* incorrect snyk output file name ([29d6235](https://github.com/pabloqr/sportying-backend/commit/29d6235b52cb01d86bd8fb10d82b189bd978f52f))
* remove snyk container scan ([a392986](https://github.com/pabloqr/sportying-backend/commit/a3929861957dfaf07436ecb23fc73d644b321539))
* trigger deploy on version tags only ([920b22b](https://github.com/pabloqr/sportying-backend/commit/920b22b7cecc7f106c810cbc220f509da6c6602c))
* update codeql-action/upload-sarif to v4 ([fde093b](https://github.com/pabloqr/sportying-backend/commit/fde093b5e8474fcd234557c13b0d26c5f2c5195e))
* update prisma directory copy in Dockerfile ([f8dda8d](https://github.com/pabloqr/sportying-backend/commit/f8dda8d9a22af628b4edf3058dc48676098db41b))
* update prisma directory copy in Dockerfile ([3977794](https://github.com/pabloqr/sportying-backend/commit/3977794a509901ad3a94cb294b3fa42d518e84a5))
* update production dockerfile to reduce deployment time ([e6231a7](https://github.com/pabloqr/sportying-backend/commit/e6231a737a33dc38a00fb48b3513a7e4a9496cf0))

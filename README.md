# Master's Thesis Project (Backend): Sports Facilities Management System

## Introduction

This project implements a complete system to facilitate and automate the process of booking a sport facility and its underlying management, through the use of the telemetry data obtained from physical devices installed at those facilities. This result is achieved by means of a layered architecture implemented with a **NestJS** backend, a **PostgreSQL** database, and a cross-platform frontend developed in **Flutter**. The system provides secure, role-based management: *Clients*, *Administrators*, and *Superusers* via **JWT**, and *IoT* devices via **API Keys**; covering key functionalities such as reservation management, court status monitoring, and notifications.

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v20 or higher)
- [npm](https://www.npmjs.com/)
- [PostgreSQL](https://www.postgresql.org/) (v17)

### Installation
1. Clone the repository:
```bash
git clone [repository-URL]
cd [repository-folder]
```
2. Install dependencies:
```bash
npm install
```
3. Set up the environment variables file (See Section 3).

### Running the Application
1. **Development Mode (Hot Reload):**
```bash
npm run start:dev
```
2. **Production Mode (Build & Start):**
```bash
npm run build
npm run start:prod
```

### Running tests
```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

---

## Configuration and Security

### Environment Variables (`.env`)
The project requires a `.env` file in the root with essential configuration variables:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection URL | `postgresql://<user>:<password>@<host>:<port>/<database>?schema=public` |
| `JWT_SECRET` | Secret key for access token signing | `super-secret-jwt-key` |
| `JWT_REFRESH_SECRET` | Secret key for refresh token signing | `super-secret-jwt-refresh-key` |

### Authentication Mechanisms
* **Users (Clients/Admins/Superusers):** Authentication via **JWT** (JSON Web Tokens) with defined roles (`CLIENT`, `ADMIN`, `SUPERUSER`) for granular access control.
* **IoT Devices:** Restricted access to telemetry *endpoints* secured using a predefined **API Keys**.

---

## Database (PostgreSQL)

* **Technology:** Uses `Prisma ORM` for interaction.

---

## Key API Endpoints

A quick reference for core functionalities:

| Route | Description | Required Roles |
| :--- | :--- | :--- |
| `POST /auth/login` | User authentication and JWT retrieval. | ALL Users |
| `GET /complexes` | Retrieve the list of available sports complexes. | ALL Users |
| `POST /complexes/:id/reservations` | Create a new facility reservation. | ADMIN, CLIENT |
| `POST /devices/:id/telemetry` | Endpoint for IoT devices to send telemetry data. | API Key (Device) |

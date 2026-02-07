# Tea Leaf System

The Tea Leaf System is a comprehensive mobile solution designed to streamline the management of tea leaf collection and transportation. This monorepo contains the source code for three distinct Expo (React Native) applications tailored for different roles in the ecosystem: Administrators, Drivers, and Users (Suppliers).

## Project Structure

The repository is organized into three main application directories:

- **`tea-admin/`**: The administrative dashboard app.
  - Allows admins to manage alerts, track lorries, and oversee the system.
  - Features: Alert management, Lorry tracking, Profile management.

- **`tea-driver/`**: The application for lorry drivers.
  - Helps drivers navigate, receive alerts, and communicate with the admin.
  - Features: Live map tracking, Quick alerts, Inbox for messages, Settings.

- **`tea-user/`**: The application for tea leaf suppliers.
  - Enables suppliers to verify collections, check alerts, and communicate.
  - Features: Dashboard, Alert notifications, Chat functionality, Profile management.

## Tech Stack

- **Framework**: [Expo](https://expo.dev/) (~54.0.33)
- **Core**: [React Native](https://reactnative.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/)
- **Backend/Database**: [Firebase](https://firebase.google.com/)
- **Maps**: [React Native Maps](https://github.com/react-native-maps/react-native-maps)
- **Storage**: @react-native-async-storage/async-storage

## Getting Started

### Prerequisites

- Node.js installed on your machine.
- Expo Go app installed on your Android/iOS device (optional, for physical device testing).

### Installation & Running

Each application operates independently. To run a specific app, navigate to its directory and install the dependencies.

#### 1. Tea Admin App

```bash
cd tea-admin
npm install
npx expo start
```

#### 2. Tea Driver App

```bash
cd tea-driver
npm install
npx expo start
```

#### 3. Tea User App

```bash
cd tea-user
npm install
npx expo start
```

Run these commands in separate terminal instances to start all applications simultaneously.

## Features

- **Real-time Updates**: Powered by Firebase for instant data synchronization across all three apps.
- **Geolocation**: Integrated mapping for tracking drivers and locations.
- **Authentication**: Secure login/signup flows for all user types.
# tea-leaf-system

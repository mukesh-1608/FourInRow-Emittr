# Four-in-Row Game Platform

## Project Overview

Four-in-Row is a full-stack, real-time multiplayer web application designed to demonstrate scalable software architecture and event-driven design patterns. The system allows users to compete against one another or challenge a heuristic-based CPU opponent.

Beyond standard gameplay, the application integrates an analytics pipeline using Apache Kafka to stream game events, facilitating data-driven insights. The infrastructure is fully containerized to ensure consistent deployment environments.

**Live Deployment:** https://fourinrow-emittr.onrender.com

---

## System Architecture

The solution is architected as a cohesive distributed system comprising the following core components:

* **Frontend Client:** A Single Page Application (SPA) built with React and TypeScript. It utilizes WebSockets for low-latency state synchronization and provides a responsive user interface styled with Tailwind CSS and Radix UI.
* **Game Server:** Developed in Go (Golang), this component acts as the central orchestrator. It manages WebSocket connections, validates game logic, enforces rules, and serves static assets.
* **Event Bus:** Apache Kafka is employed as the message broker. The server acts as a producer, emitting granular events (e.g., `GameStart`, `MoveMade`, `GameEnd`) to the `game-events` topic.
* **Infrastructure:** The entire stack, including Zookeeper and Kafka, is orchestrated via Docker Compose to simulate a production-ready environment.

---

## Technical Stack

### Backend
* **Language:** Go (1.22+)
* **Transport Protocols:** WebSocket (Real-time communication), HTTP (REST API)
* **Message Broker:** Apache Kafka (via IBM/Sarama library)
* **Architecture:** Hexagonal/Port-and-Adapter style separating core logic from transport layers.

### Frontend
* **Framework:** React 18
* **Build Tool:** Vite
* **Language:** TypeScript
* **State Management:** React Query (Tanstack)
* **Styling:** Tailwind CSS

### DevOps & Infrastructure
* **Containerization:** Docker
* **Orchestration:** Docker Compose
* **Cloud Compatibility:** Environment-variable driven configuration for platforms like Render or Heroku.

---

## Key Features

1.  **Real-Time Multiplayer Synchronization**
    The application utilizes persistent WebSocket connections to synchronize game state instantly between clients, ensuring a seamless user experience without polling overhead.

2.  **Heuristic Bot Engine**
    The single-player mode features a server-side CPU opponent. The bot logic evaluates the board using a priority-based heuristic algorithm:
    * **Victory Detection:** Takes immediate winning moves.
    * **Threat Blocking:** Identifies and blocks imminent player victories.
    * **Strategic Placement:** Prioritizes center columns to maximize future opportunities.

3.  **Fault-Tolerant Analytics**
    The system implements a resilient analytics module. It attempts to connect to a Kafka broker for event streaming. If the broker is unreachable (e.g., during local development without Docker), the system automatically degrades to a "Stub Producer" that logs events to standard output, preventing application failure.

4.  **SPA Routing in Go**
    The backend implements a custom file server handler to support client-side routing. This ensures that deep links work correctly by serving the `index.html` entry point for unknown routes while still serving static assets efficiently.

---

## Installation and Setup

### Prerequisites
* Docker and Docker Compose (Recommended)
* Go 1.22 or higher (For local backend development)
* Node.js and npm (For local frontend development)

### Option 1: Docker Compose (Recommended)
This method provisions the Game Server, Apache Kafka, and Zookeeper in isolated containers.

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd fourinrow-emittr
    ```

2.  Start the services:
    ```bash
    docker-compose up --build
    ```

3.  Access the application:
    Navigate to `http://localhost:5000` in your web browser.

### Option 2: Manual Local Execution
If you wish to run the services independently:

1.  **Start Infrastructure:**
    Launch Kafka and Zookeeper (or ensure a local instance is running):
    ```bash
    docker-compose up -d zookeeper kafka
    ```

2.  **Build Frontend:**
    ```bash
    cd client
    npm install
    npm run build
    cd ..
    ```

3.  **Start Backend:**
    ```bash
    # Point to the local Kafka broker
    export KAFKA_BROKER=localhost:9092
    go run main.go
    ```

---

## Configuration

The application behavior can be customized using the following environment variables:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `5000` | The HTTP port on which the server listens. |
| `KAFKA_BROKER` | `localhost:9092` | The address of the Kafka broker for analytics events. |

---

## Project Structure

* `analytics/`: Contains the Kafka producer implementation and event schema definitions.
* `client/`: Source code for the React frontend application.
* `game/`: Encapsulates core game logic, state management models, and the bot algorithm.
* `server/`: Handles HTTP routing, WebSocket upgrades, and API endpoints.
* `db/`: Manages database connections and repository interfaces.
* `cmd/`: Entry points for auxiliary services or consumers.
* `main.go`: The primary entry point for the application.

---

## License

This project is licensed under the MIT License.

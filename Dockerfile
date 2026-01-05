# Stage 1: Build the React Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/client
# Copy package files and install dependencies
COPY client/package*.json ./
RUN npm install
# Copy the rest of the frontend code and build
COPY client/ ./
RUN npm run build

# Stage 2: Build the Go Backend
FROM golang:1.22-alpine AS backend-builder
WORKDIR /app
# Copy Go module files and download dependencies
COPY go.mod go.sum ./
RUN go mod download
# Copy the rest of the backend code
COPY . .
# Copy the built frontend from Stage 1 to the backend folder
COPY --from=frontend-builder /app/client/dist ./client/dist
# Build the Go binary
RUN go build -o main .

# Stage 3: Final Production Image
FROM alpine:latest
WORKDIR /root/
# Copy the binary and the static files
COPY --from=backend-builder /app/main .
COPY --from=backend-builder /app/client/dist ./client/dist

# Expose the port (Render will override this, but good for documentation)
EXPOSE 5000

# Run the app
CMD ["./main"]
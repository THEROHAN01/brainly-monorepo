# TODO: Set Up Local MongoDB with Docker

This document outlines the steps to run a MongoDB server locally using Docker. This is a convenient method for development, allowing you to work offline without relying on a cloud-hosted database.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) must be installed and running on your system.

## Steps

1.  **Run the MongoDB Docker Container:**

    Open your terminal and execute the following command:

    ```bash
    docker run -d -p 27017:27017 --name my-local-mongo mongo
    ```

    **Command Breakdown:**

    -   `docker run`: Starts a new Docker container.
    -   `-d`: Detached mode. Runs the container in the background.
    -   `-p 27017:27017`: Port mapping. It maps port `27017` on your local machine to port `27017` inside the container, which is the default port for MongoDB.
    -   `--name my-local-mongo`: Assigns a friendly name to the container for easy reference.
    -   `mongo`: The official Docker image for MongoDB, which will be downloaded if you don't have it locally.

2.  **Get the Local Connection String (URI):**

    Once the container is running, you can connect to it using the following connection string:

    ```
    mongodb://localhost:27017/my-brainly-db
    ```

    -   You can replace `my-brainly-db` with any name you prefer for your local database. MongoDB will create it automatically when the application first connects.

3.  **Use the Connection String:**

    -   **In your application:** Update the `MONGO_URI` in your `.env` file or `mongoose.connect()` call with this local connection string.
    -   **In MongoDB Compass:** Use this string to create a new connection to your local database instance.

## Managing the Container

-   **To stop the container:**

    ```bash
    docker stop my-local-mongo
    ```

-   **To start the container again:**

    ```bash
    docker start my-local-mongo
    ```

-   **To remove the container (deletes all data inside it):**

    ```bash
    docker rm -f my-local-mongo
    ```

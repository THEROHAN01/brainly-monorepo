# TODO: Implement Swagger UI

This document outlines the steps to add Swagger UI to the project for API documentation.

## Steps

1.  **Install Dependencies**:
    ```bash
    npm install swagger-ui-express swagger-jsdoc
    npm install -D @types/swagger-ui-express @types/swagger-jsdoc
    ```

2.  **Create Swagger Configuration**:
    - Create a new file `src/swagger.ts` to configure `swagger-jsdoc`.

3.  **Integrate with Express**:
    - Modify `src/index.ts` to serve the Swagger UI on the `/api-docs` route.

4.  **Add JSDoc Annotations**:
    - Add JSDoc comments to all the API routes in `src/index.ts` to describe the endpoints, parameters, and responses.

5.  **Test**:
    - Run the application and navigate to `http://localhost:3000/api-docs` to verify that the Swagger UI is working correctly.

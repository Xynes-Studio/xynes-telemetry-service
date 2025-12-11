import { Hono } from 'hono';
import { loggerMiddleware, setupErrorHandler } from './middleware';
import { healthRoute, telemetryActionsRoute } from './routes';
import { registerAllActions } from './actions';

// Register all action handlers
registerAllActions();

const app = new Hono();

// Apply middleware
app.use('*', loggerMiddleware);

// Setup error handler
setupErrorHandler(app);

// Mount routes
app.route('/', healthRoute);
app.route('/', telemetryActionsRoute);

export { app };

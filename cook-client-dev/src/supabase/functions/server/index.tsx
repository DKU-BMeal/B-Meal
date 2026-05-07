import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { authRoutes, profileRoutes, ingredientsRoutes, savedRecipesRoutes } from './routes.tsx';
import { aiVoiceRoutes } from './ai-routes.tsx';

const app = new Hono();

// Middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));
app.use('*', logger());

// Register routes
app.route('/make-server-50b891bd', authRoutes());
app.route('/make-server-50b891bd/profile', profileRoutes());
app.route('/make-server-50b891bd/ingredients', ingredientsRoutes());
app.route('/make-server-50b891bd/saved-recipes', savedRecipesRoutes());
app.route('/make-server-50b891bd/ai/voice', aiVoiceRoutes());

// Health check
app.get('/make-server-50b891bd/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (c) => {
  return c.json({ 
    message: 'Cooking Assistant API',
    version: '1.0.0',
    status: 'running'
  });
});

Deno.serve(app.fetch);
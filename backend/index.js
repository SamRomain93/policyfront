require('dotenv').config();
const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const { createClient } = require('@supabase/supabase-js');

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

// Register CORS
fastify.register(cors, {
  origin: true
});

// Health check
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Topics routes
fastify.get('/api/topics', async (request, reply) => {
  const { data, error } = await supabase
    .from('topics')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) return reply.code(500).send({ error: error.message });
  return data;
});

fastify.post('/api/topics', async (request, reply) => {
  const { name, type, state, keywords, bill_ids } = request.body;
  
  const { data, error } = await supabase
    .from('topics')
    .insert([
      {
        name,
        type,
        state,
        keywords: keywords || [],
        bill_ids: bill_ids || []
      }
    ])
    .select()
    .single();
  
  if (error) return reply.code(500).send({ error: error.message });
  return data;
});

// Mentions routes
fastify.get('/api/mentions', async (request, reply) => {
  const { topic_id } = request.query;
  
  let query = supabase
    .from('mentions')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(50);
  
  if (topic_id) {
    query = query.eq('topic_id', topic_id);
  }
  
  const { data, error } = await query;
  
  if (error) return reply.code(500).send({ error: error.message });
  return data;
});

fastify.post('/api/mentions', async (request, reply) => {
  const mention = request.body;
  
  const { data, error } = await supabase
    .from('mentions')
    .insert([mention])
    .select()
    .single();
  
  if (error) {
    // Handle duplicate URL error gracefully
    if (error.code === '23505') {
      return reply.code(409).send({ error: 'Mention already exists' });
    }
    return reply.code(500).send({ error: error.message });
  }
  
  return data;
});

// Start server
const start = async () => {
  try {
    const port = process.env.PORT || 3001;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`PolicyFront API running on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { exec } = require('child_process');
const { promisify } = require('util');

const execPromise = promisify(exec);

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

// Search for mentions using Firecrawl
async function searchFirecrawl(query) {
  try {
    const { stdout } = await execPromise(
      `node /home/ubuntu/clawd/skills/firecrawl/scripts/scrape.mjs "${query}" --formats markdown`
    );
    return JSON.parse(stdout);
  } catch (error) {
    console.error('Firecrawl search error:', error.message);
    return null;
  }
}

// Extract mentions from search results
function extractMentions(results, topicId) {
  if (!results || !results.links) return [];
  
  return results.links.map(link => ({
    topic_id: topicId,
    url: link.url,
    title: link.title || '',
    content: link.description || '',
    excerpt: (link.description || '').substring(0, 300),
    discovered_at: new Date().toISOString(),
    source_type: 'rss'
  }));
}

// Monitor a single topic
async function monitorTopic(topic) {
  console.log(`Monitoring topic: ${topic.name}`);
  
  const keywords = topic.keywords || [];
  if (keywords.length === 0) {
    console.log(`No keywords for topic ${topic.name}, skipping`);
    return;
  }
  
  // Build search query
  const query = keywords.join(' OR ');
  
  // Search for mentions
  const results = await searchFirecrawl(query);
  if (!results) return;
  
  const mentions = extractMentions(results, topic.id);
  console.log(`Found ${mentions.length} potential mentions for ${topic.name}`);
  
  // Save mentions to database
  for (const mention of mentions) {
    try {
      const { data, error } = await supabase
        .from('mentions')
        .insert([mention])
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') {
          console.log(`Duplicate mention skipped: ${mention.url}`);
        } else {
          console.error('Error saving mention:', error.message);
        }
      } else {
        console.log(`New mention saved: ${data.title}`);
        
        // TODO: Send Telegram alert
      }
    } catch (err) {
      console.error('Error processing mention:', err.message);
    }
  }
}

// Monitor all active topics
async function monitorAllTopics() {
  console.log('Starting monitoring cycle...');
  
  const { data: topics, error } = await supabase
    .from('topics')
    .select('*')
    .eq('active', true);
  
  if (error) {
    console.error('Error fetching topics:', error.message);
    return;
  }
  
  console.log(`Found ${topics.length} active topics`);
  
  for (const topic of topics) {
    await monitorTopic(topic);
  }
  
  console.log('Monitoring cycle complete');
}

// Run monitoring
if (require.main === module) {
  monitorAllTopics()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Monitoring failed:', err);
      process.exit(1);
    });
}

module.exports = { monitorAllTopics, monitorTopic };

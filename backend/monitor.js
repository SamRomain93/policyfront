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
  
  // Update topic scan status to scanning
  await supabase
    .from('topics')
    .update({ 
      last_scan_at: new Date().toISOString(),
      last_scan_status: 'scanning'
    })
    .eq('id', topic.id);
  
  const keywords = topic.keywords || [];
  if (keywords.length === 0) {
    console.log(`No keywords for topic ${topic.name}, skipping`);
    await supabase
      .from('topics')
      .update({ last_scan_status: 'success' })
      .eq('id', topic.id);
    return { scanned: true, found: 0 };
  }
  
  // Build search query
  const query = keywords.join(' OR ');
  
  let mentionsFound = 0;
  
  try {
    // Search for mentions
    const results = await searchFirecrawl(query);
    if (!results) {
      await supabase
        .from('topics')
        .update({ last_scan_status: 'success' })
        .eq('id', topic.id);
      return { scanned: true, found: 0 };
    }
    
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
          mentionsFound++;
          
          // TODO: Send Telegram alert
        }
      } catch (err) {
        console.error('Error processing mention:', err.message);
      }
    }
    
    // Mark topic scan as successful
    await supabase
      .from('topics')
      .update({ last_scan_status: 'success' })
      .eq('id', topic.id);
    
    return { scanned: true, found: mentionsFound };
    
  } catch (error) {
    // Mark topic scan as failed
    await supabase
      .from('topics')
      .update({ 
        last_scan_status: 'failed',
        last_scan_error: error.message
      })
      .eq('id', topic.id);
    
    console.error(`Error monitoring topic ${topic.name}:`, error.message);
    return { scanned: true, found: 0, error: error.message };
  }
}

// Monitor all active topics
async function monitorAllTopics() {
  console.log('Starting monitoring cycle...');
  
  // Start scan tracking
  const { data: scanRecord, error: scanError } = await supabase
    .from('scan_status')
    .insert([{
      scan_type: 'mentions',
      status: 'running',
      started_at: new Date().toISOString()
    }])
    .select()
    .single();
  
  if (scanError) {
    console.error('Error starting scan tracking:', scanError.message);
  }
  
  const scanId = scanRecord?.id;
  
  const { data: topics, error } = await supabase
    .from('topics')
    .select('*')
    .eq('active', true);
  
  if (error) {
    console.error('Error fetching topics:', error.message);
    
    if (scanId) {
      await supabase
        .from('scan_status')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error.message
        })
        .eq('id', scanId);
    }
    
    return;
  }
  
  console.log(`Found ${topics.length} active topics`);
  
  let topicsScanned = 0;
  let totalMentionsFound = 0;
  
  for (const topic of topics) {
    const result = await monitorTopic(topic);
    if (result.scanned) {
      topicsScanned++;
      totalMentionsFound += result.found || 0;
    }
  }
  
  console.log('Monitoring cycle complete');
  console.log(`Scanned ${topicsScanned} topics, found ${totalMentionsFound} new mentions`);
  
  // Complete scan tracking
  if (scanId) {
    await supabase
      .from('scan_status')
      .update({
        status: 'success',
        completed_at: new Date().toISOString(),
        topics_scanned: topicsScanned,
        mentions_found: totalMentionsFound
      })
      .eq('id', scanId);
  }
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

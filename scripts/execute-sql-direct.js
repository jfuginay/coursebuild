const https = require('https');

const SUPABASE_URL = 'https://nkqehqwbxkxrgecmgzuq.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rcWVocXdieGt4cmdlY21nenVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTk5NjE4MCwiZXhwIjoyMDY3NTcyMTgwfQ.bWXToInycb2-1gEFKROXNnmYmu_m5GMAb3LPZzgUuRw';

// SQL statements to execute
const sqlStatements = [
  // Create learner_events table
  `CREATE TABLE IF NOT EXISTS learner_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('WATCH', 'QUIZ_WRONG', 'HINT_SHOWN')),
    video_timestamp INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  
  // Create user_hint_cooldowns table
  `CREATE TABLE IF NOT EXISTS user_hint_cooldowns (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    last_hint_timestamp TIMESTAMPTZ,
    hint_count INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, course_id)
  )`,
  
  // Create indexes
  `CREATE INDEX IF NOT EXISTS idx_learner_events_user_course ON learner_events(user_id, course_id)`,
  `CREATE INDEX IF NOT EXISTS idx_learner_events_type ON learner_events(event_type)`,
  `CREATE INDEX IF NOT EXISTS idx_learner_events_created_at ON learner_events(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_learner_events_composite ON learner_events(user_id, course_id, event_type, created_at DESC)`,
  
  // Enable RLS
  `ALTER TABLE learner_events ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE user_hint_cooldowns ENABLE ROW LEVEL SECURITY`,
  
  // Create policies
  `CREATE POLICY "Users can view own events" ON learner_events FOR SELECT USING (auth.uid() = user_id)`,
  `CREATE POLICY "Users can insert own events" ON learner_events FOR INSERT WITH CHECK (auth.uid() = user_id)`,
  `CREATE POLICY "Service role full access to learner_events" ON learner_events FOR ALL USING (auth.role() = 'service_role')`,
  `CREATE POLICY "Users can view own cooldowns" ON user_hint_cooldowns FOR SELECT USING (auth.uid() = user_id)`,
  `CREATE POLICY "Users can insert own cooldowns" ON user_hint_cooldowns FOR INSERT WITH CHECK (auth.uid() = user_id)`,
  `CREATE POLICY "Users can update own cooldowns" ON user_hint_cooldowns FOR UPDATE USING (auth.uid() = user_id)`,
  `CREATE POLICY "Service role full access to cooldowns" ON user_hint_cooldowns FOR ALL USING (auth.role() = 'service_role')`,
  
  // Create functions
  `CREATE OR REPLACE FUNCTION get_wrong_answer_streak(
    p_user_id UUID,
    p_course_id UUID,
    p_time_window INTERVAL DEFAULT '10 minutes'
  )
  RETURNS INTEGER AS $$
  DECLARE
    streak INTEGER := 0;
    last_correct_time TIMESTAMPTZ;
  BEGIN
    SELECT MAX(created_at) INTO last_correct_time
    FROM user_question_responses
    WHERE user_id = p_user_id 
    AND course_id = p_course_id
    AND is_correct = true
    AND created_at > NOW() - p_time_window;

    SELECT COUNT(*) INTO streak
    FROM learner_events
    WHERE user_id = p_user_id
    AND course_id = p_course_id
    AND event_type = 'QUIZ_WRONG'
    AND created_at > COALESCE(last_correct_time, NOW() - p_time_window);

    RETURN streak;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER`,
  
  `CREATE OR REPLACE FUNCTION check_hint_cooldown(
    p_user_id UUID,
    p_course_id UUID,
    p_cooldown_seconds INTEGER
  )
  RETURNS BOOLEAN AS $$
  DECLARE
    last_hint TIMESTAMPTZ;
  BEGIN
    SELECT last_hint_timestamp INTO last_hint
    FROM user_hint_cooldowns
    WHERE user_id = p_user_id AND course_id = p_course_id;

    IF last_hint IS NULL THEN
        RETURN TRUE;
    END IF;

    RETURN (EXTRACT(EPOCH FROM (NOW() - last_hint)) >= p_cooldown_seconds);
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER`,
  
  `CREATE OR REPLACE FUNCTION update_hint_cooldown(
    p_user_id UUID,
    p_course_id UUID
  )
  RETURNS VOID AS $$
  BEGIN
    INSERT INTO user_hint_cooldowns (user_id, course_id, last_hint_timestamp, hint_count)
    VALUES (p_user_id, p_course_id, NOW(), 1)
    ON CONFLICT (user_id, course_id)
    DO UPDATE SET 
        last_hint_timestamp = NOW(),
        hint_count = user_hint_cooldowns.hint_count + 1;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER`,
  
  // Enable realtime
  `ALTER PUBLICATION supabase_realtime ADD TABLE learner_events`
];

async function executeSQLViaHTTP(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      query: sql
    });

    const options = {
      hostname: 'nkqehqwbxkxrgecmgzuq.supabase.co',
      port: 443,
      path: '/rest/v1/rpc',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 204) {
          resolve({ success: true, data: responseData });
        } else {
          resolve({ success: false, error: responseData, status: res.statusCode });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(data);
    req.end();
  });
}

async function runMigration() {
  console.log('🚀 Executing InfoBite SQL migration directly...\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < sqlStatements.length; i++) {
    const sql = sqlStatements[i];
    const preview = sql.replace(/\s+/g, ' ').substring(0, 60) + '...';
    
    console.log(`[${i + 1}/${sqlStatements.length}] Executing: ${preview}`);
    
    try {
      // Try using the pg-meta API endpoint instead
      const postgrestUrl = `${SUPABASE_URL}/rest/v1/`;
      const metaUrl = `${SUPABASE_URL.replace('https://', 'https://meta.')}/query`;
      
      const response = await fetch(metaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-connection-encrypted': SERVICE_ROLE_KEY
        },
        body: JSON.stringify({ query: sql })
      }).catch(() => null);
      
      if (response && response.ok) {
        console.log(`   ✅ Success\n`);
        successCount++;
      } else {
        // Fallback: Try to check if table exists by querying it
        if (sql.includes('CREATE TABLE')) {
          const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
          if (tableName) {
            const checkResponse = await fetch(`${postgrestUrl}${tableName}?limit=1`, {
              headers: {
                'apikey': SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
              }
            });
            
            if (checkResponse.ok || checkResponse.status === 406) {
              console.log(`   ✅ Table ${tableName} exists\n`);
              successCount++;
              continue;
            }
          }
        }
        
        console.log(`   ⚠️  Could not verify (may already exist)\n`);
        errorCount++;
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
      errorCount++;
    }
  }
  
  console.log('===============================================');
  console.log(`📊 Migration Summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ⚠️  Warnings: ${errorCount}`);
  console.log('===============================================\n');
  
  // Now let's verify what actually exists
  console.log('🔍 Verifying database state...\n');
  await verifyTables();
}

async function verifyTables() {
  const tables = ['learner_events', 'user_hint_cooldowns'];
  
  for (const table of tables) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=count&limit=1`, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Prefer': 'count=exact'
        }
      });
      
      if (response.ok || response.status === 406) {
        console.log(`✅ Table ${table} exists and is accessible`);
      } else {
        console.log(`❌ Table ${table} not found (${response.status})`);
      }
    } catch (error) {
      console.log(`❌ Error checking ${table}: ${error.message}`);
    }
  }
}

// Run the migration
runMigration().catch(console.error);
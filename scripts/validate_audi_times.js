#!/usr/bin/env node
/*
  Validate that the times in data/audi.json match the times on the Audi Field website
  Exit code 0: times match
  Exit code 1: times don't match or validation error
*/

const fs = require('fs');
const path = require('path');

async function fetchWebsiteTimes() {
  // Fetch the events page HTML
  const res = await fetch('https://audifield.com/events/', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; AudiFieldValidator/1.0)'
    }
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch website: ${res.status}`);
  }
  
  const html = await res.text();
  
  // Parse events from HTML
  // Look for the time pattern: <span class="tribe-event-date-start">October 4 @ 2:30 pm</span> - <span class="tribe-event-time">4:00 pm</span>
  const events = [];
  
  // Split HTML into event blocks
  const eventBlocks = html.split('<article');
  
  for (const block of eventBlocks) {
    // Extract date and start time
    const dateStartMatch = block.match(/<span class="tribe-event-date-start">([^<]+)<\/span>/);
    // Extract end time
    const endTimeMatch = block.match(/<span class="tribe-event-time">([^<]+)<\/span>/);
    // Extract title
    const titleMatch = block.match(/<h3[^>]*class="tribe-events-calendar-list__event-title[^"]*"[^>]*>\s*<a[^>]*title="([^"]+)"/);
    
    if (dateStartMatch && endTimeMatch && titleMatch) {
      // Parse "October 4 @ 2:30 pm" into date and time
      const dateTimeStr = dateStartMatch[1];
      const match = dateTimeStr.match(/^(.+) @ (.+)$/);
      
      if (match) {
        events.push({
          title: titleMatch[1].trim(),
          date: match[1].trim(),
          startTime: match[2].trim(),
          endTime: endTimeMatch[1].trim()
        });
      }
    }
  }
  
  return events;
}

function parseTimeToMinutes(timeStr) {
  // Convert "2:30 pm" to minutes since midnight
  const match = timeStr.match(/(\d+):(\d+) ([ap]m)/);
  if (!match) return null;
  
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3];
  
  if (period === 'pm' && hours !== 12) {
    hours += 12;
  } else if (period === 'am' && hours === 12) {
    hours = 0;
  }
  
  return hours * 60 + minutes;
}

function convertUTCtoEasternTime(isoString) {
  // Convert ISO string to Eastern Time format
  const date = new Date(isoString);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  const parts = formatter.formatToParts(date);
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  const hour = parts.find(p => p.type === 'hour').value;
  const minute = parts.find(p => p.type === 'minute').value;
  const dayPeriod = parts.find(p => p.type === 'dayPeriod').value.toLowerCase();
  
  return {
    date: `${month} ${day}`,
    time: `${hour}:${minute} ${dayPeriod}`
  };
}

function getEasternDateStr(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'long',
    day: 'numeric'
  });
  const parts = formatter.formatToParts(date);
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  return `${month} ${day}`;
}

async function main() {
  console.log('🔍 Validating Audi Field event times...\n');
  
  // Read audi.json
  const jsonPath = path.join(process.cwd(), 'data', 'audi.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ Error: data/audi.json not found');
    process.exit(1);
  }
  
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  // Fetch website times
  let websiteEvents;
  try {
    websiteEvents = await fetchWebsiteTimes();
  } catch (error) {
    console.error('❌ Error fetching website:', error.message);
    process.exit(1);
  }
  
  console.log(`Found ${websiteEvents.length} events on website`);
  console.log(`Found ${jsonData.eventsToday.length} events in audi.json for today\n`);
  
  // Get today's date in Eastern Time
  const todayStr = getEasternDateStr();
  
  // Filter website events for today
  const todayWebsiteEvents = websiteEvents.filter(e => e.date === todayStr);
  
  console.log('Today\'s events comparison:');
  console.log('─'.repeat(60));
  
  let hasErrors = false;
  
  // Compare today's events
  if (todayWebsiteEvents.length !== jsonData.eventsToday.length) {
    console.log(`⚠️  Event count mismatch:`);
    console.log(`   Website: ${todayWebsiteEvents.length} events`);
    console.log(`   JSON: ${jsonData.eventsToday.length} events`);
    hasErrors = true;
  }
  
  // Check each event in JSON against website
  for (const jsonEvent of jsonData.eventsToday) {
    const jsonStart = convertUTCtoEasternTime(jsonEvent.startISO);
    const jsonEnd = convertUTCtoEasternTime(jsonEvent.endISO);
    
    console.log(`\n📅 ${jsonEvent.title}`);
    console.log(`   JSON: ${jsonStart.time} - ${jsonEnd.time}`);
    
    // Find matching event on website
    const websiteEvent = todayWebsiteEvents.find(e => 
      e.title.toLowerCase().includes(jsonEvent.title.toLowerCase()) ||
      jsonEvent.title.toLowerCase().includes(e.title.toLowerCase())
    );
    
    if (websiteEvent) {
      console.log(`   Web:  ${websiteEvent.startTime} - ${websiteEvent.endTime}`);
      
      // Compare times (allow 1 minute tolerance due to rounding)
      const jsonStartMin = parseTimeToMinutes(jsonStart.time);
      const webStartMin = parseTimeToMinutes(websiteEvent.startTime);
      const jsonEndMin = parseTimeToMinutes(jsonEnd.time);
      const webEndMin = parseTimeToMinutes(websiteEvent.endTime);
      
      if (Math.abs(jsonStartMin - webStartMin) > 1 || Math.abs(jsonEndMin - webEndMin) > 1) {
        console.log('   ❌ TIME MISMATCH!');
        hasErrors = true;
      } else {
        console.log('   ✅ Times match');
      }
    } else {
      console.log('   ⚠️  No matching event found on website');
      hasErrors = true;
    }
  }
  
  console.log('\n' + '─'.repeat(60));
  
  if (hasErrors) {
    console.log('\n❌ VALIDATION FAILED: Mismatches detected');
    console.log('\nRecommendation: Re-run fetch_audi.js to update the data');
    process.exit(1);
  } else {
    console.log('\n✅ VALIDATION PASSED: All times match');
    process.exit(0);
  }
}

main().catch((e) => {
  console.error('❌ Validation error:', e);
  process.exit(1);
});


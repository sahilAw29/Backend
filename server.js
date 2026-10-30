'use strict';

const express  = require('express');
const axios    = require('axios');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');
const multer   = require('multer');
const db       = require('./db');
const analytics  = require('./analytics');
const tgSync   = require('./tg-sync');

const upload = multer({ dest: '/tmp/uploads/' });

const app = express();

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('view', path.join(__dirname, 'view'));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(analytics.middleware);

app.get('/nav.js', (req, res) => {
  res.setHeader('Content-Type','application/javascript');
  res.sendFile(path.join(__dirname,'view','nav.js'));
});

const OWNER = "@sahilxalone";

const removeFields = [
  'owner', 'OWNER', 'channel', 'CHANNEL', 'telegram', 'contact',
  'instagram', 'twitter', 'fb', 'facebook', 'website', 'github',
  'created_by', 'createdBy', 'owner_username', 'owner_channel',
  'credit', 'Credits', 'Credit', 'Source', 'source', 'provider',
  'Provider', 'api_source', 'API_Source', 'developer', 'Developer',
  'dev', 'Dev', 'invalidayushh', 'ftgamerv2', 'ftgamer2',
  '@invalidayushh', '@ftgamerv2', '@ftgamer2', 'InvalidAyush',
  '@InvalidAyush', 'invalidayush', '@invalidayush', 'DM TO BUY ACCESS',
  'xtradeep', 'Kon_Hu_Mai', 'support', '@raxusss', 'raxusss', 'Raxusss',
  'Support', 'help', 'Help', '@CYBERXANMOL', '@AMMOL_ZZ',
  'http_status', 'status_code', 'key_details', 'daily_limit',
  'expires_on', 'used_today', 'valid_days', 'parameters',
  'felix_bhai', '@felix_bhai', '@Cyb3rB4nn3r' ,'@Cyb3rB4nn3r', 'developer'
];

const badSubstrings = [
  '@raxusss', 'raxusss', 'Raxusss',
  'InvalidAyush', '@InvalidAyush', 'invalidayush', '@invalidayush',
  'ftgamerv2', 'ftgamer2', '@ftgamerv2', '@ftgamer2', '@simpleguy444',
  '@CYBERXANMOL', '@AMMOL_ZZ', '@felix_bhai', 'felix_bhai'
];

const removeFieldsLower = new Set(removeFields.map(f => f.toLowerCase()));

function cleanData(obj) {
  try {
    if (!obj || typeof obj !== 'object') {
      if (typeof obj === 'string') {
        let val = obj;
        for (const sub of badSubstrings) {
          val = val.replace(new RegExp(sub, 'gi'), '').trim();
        }
        return val;
      }
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(item => cleanData(item)).filter(item => {
        if (typeof item === 'string' && item === '') return false;
        return true;
      });
    }
    const cleaned = {};
    for (const key of Object.keys(obj)) {
      if (removeFieldsLower.has(key.toLowerCase())) continue;
      const cleanedValue = cleanData(obj[key]);
      if (cleanedValue !== null && cleanedValue !== undefined && cleanedValue !== '') {
        cleaned[key] = cleanedValue;
      } else if (cleanedValue === 0 || cleanedValue === false || cleanedValue === true) {
        cleaned[key] = cleanedValue;
      }
    }
    return cleaned;
  } catch (e) {
    return obj;
  }
}

const APIs = [
  { name: "tg",         url: "https://tele-to-phone.felixrdx.xyz/api/developer/Cyb3rB4nn3r/fast?key=6051223b2f1c424bbf9257b371506d52&username={username}",                                method:"GET", description:"Telegram username to number lookup"    },
  { name: "leakpro",    url: "https://deeposint.felixrdx.xyz/api/developer/Cyb3rB4nn3r/?key=3a2a165a22b94bf6657eb8b491a267b2&query={query}",                                           method:"GET", description:"Leak OSINT query lookup"               },
  { name: "num2",       url: "https://scrape-9vmt.onrender.com/multiapi?key=SAHIL&num={number}",                                                                                        method:"GET", description:"Mobile number intelligence"            },
  { name: "num",        url: "https://ftosint.world/api/number?key=randi-family&num={number}",                                                                                          method:"GET", description:"Database number search"                },
  { name: "num-india",  url: "https://ft-osint-api.duckdns.org/api/number?key=sahil-new&num={number}",                                                                                  method:"GET", description:"India phone number lookup"             },
  { name: "num-pak",    url: "https://ftosint.world/api/pk?key=randi-family&num={number}",                                                                                              method:"GET", description:"Pakistan phone number lookup"          },
  { name: "leak",       url: "https://ftosint.world/api/numleak?key=randi-family&num={number}",                                                                                         method:"GET", description:"Hi-tech number chain"                  },
  { name: "bom",        url: "http://3.25.117.170:6081/bomb?num={number}",                                                                                                              method:"GET", description:"SMS/Call bomber"                       },
  { name: "adhar",      url: "https://ftosint.world/api/aadhar?key=randi-family&num={adhar}",                                                                                           method:"GET", description:"Aadhaar identification lookup"         },
  { name: "family",     url: "https://ftosint.world/api/family?key=randi-family&id={adhar}",                                                                                            method:"GET", description:"Family tree lookup"                    },
  { name: "email",      url: "https://ftosint.world/api/email?key=randi-family&email={email}",                                                                                          method:"GET", description:"Email breach record lookup"            },
  { name: "veh-info",   url: "https://ftosint.world/api/vehicle?key=randi-family&vehicle={vehicle}",                                                                                    method:"GET", description:"Vehicle registration details"          },
  { name: "veh2num",    url: "https://ftosint.world/api/veh2num?key=randi-family&vehicle={vehicle}",                                                                                    method:"GET", description:"Detailed vehicle intelligence"         },
  { name: "rc",         url: "https://vvvin-ng.vercel.app/lookup?rc={vehicle}",                                                                                                         method:"GET", description:"RC registration lookup"                },
  { name: "insta",      url: "https://auraxinfo.up.railway.app/api/insta?key=edb7cdabef7b72a6&username={username}",                                                                     method:"GET", description:"Instagram account intelligence"        },
  { name: "git",        url: "https://ftosint.world/api/git?key=randi-family&username={username}",                                                                                      method:"GET", description:"GitHub profile intelligence"           },
  { name: "bgmi",       url: "https://ft-osint-api.duckdns.org/api/bgmi?key=sahil-new&uid={uid}",                                                                                       method:"GET", description:"BGMI player ID lookup"                 },
  { name: "ff",         url: "https://ft-osint-api.duckdns.org/api/ff?key=sahil-new&uid={uid}",                                                                                         method:"GET", description:"Free Fire player ID lookup"            },
  { name: "ifsc",       url: "https://ftosint.world/api/ifsc?key=randi-family&ifsc={ifsc}",                                                                                             method:"GET", description:"Bank IFSC code lookup"                 },
  { name: "pan",        url: "https://ftosint.world/api/paninfo?key=randi-family&pan={pan}",                                                                                             method:"GET", description:"PAN card intelligence lookup"          },
  { name: "ip",         url: "https://ftosint.world/api/ip?key=randi-family&ip={ip}",                                                                                                   method:"GET", description:"IP geolocation intelligence"           },
  { name: "pin",        url: "https://ftosint.world/api/pincode?key=randi-family&pin={pincode}",                                                                                        method:"GET", description:"Postal pincode lookup"                 },
  { name: "snap",       url: "https://b-c-a-i.vercel.app/profile/{username}",                                                                                                           method:"GET", description:"Snapchat profile intelligence"         },
  { name: "num2veh",    url: "https://api.unknownbatter.online/api/mrcv2?num={number}&key=sk_live_d70af0c9a7678ec9e4122ab8ee4848a70813ef133bff44c9ce8f493f7689ed75",                   method:"GET", description:"Number to vehicle lookup (MRCv2)"      },
  // ── NEW APIs ──────────────────────────────────────────────────────────────
  { name: "upi",        url: "https://ftosint.world/api/upi?key=randi-family&upi={upi}",                                                                                                method:"GET", description:"UPI ID verification"                   },
  { name: "fastag",     url: "https://ftosint.world/api/fastag?key=randi-family&vehicle={vehicle}",                                                                                     method:"GET", description:"FASTag vehicle lookup"                 },
  { name: "challan",    url: "https://ftosint.world/api/challan?key=randi-family&vehicle={vehicle}",                                                                                    method:"GET", description:"Vehicle challan lookup"                },
  { name: "adv",        url: "https://ftosint.world/api/adv?key=randi-family&num={number}",                                                                                             method:"GET", description:"Number to info V2 (advanced)"          },
  { name: "pan-gst",    url: "https://ftosint.world/api/pan?key=randi-family&pan={pan}",                                                                                                method:"GET", description:"PAN to GST lookup"                     },
  { name: "gstin",      url: "https://ftosint.world/api/gstin?key=randi-family&gstin={gstin}",                                                                                          method:"GET", description:"GSTIN to info lookup"                  },
  { name: "name2gstin", url: "https://ftosint.world/api/name2gstin?key=randi-family&name={name}",                                                                                       method:"GET", description:"Name to GSTIN lookup"                  },
  { name: "nametoinfo", url: "https://ftosint.world/api/nametoinfo?key=randi-family&name={name}",                                                                                       method:"GET", description:"Name to info lookup"                   },
  { name: "gstreturns", url: "https://ftosint.world/api/gstreturns?key=randi-family&gstin={gstin}&financial_year=2023-24",                                                              method:"GET", description:"GST returns lookup"                    },
  { name: "gstin2pan",  url: "https://ftosint.world/api/gstin2pan?key=randi-family&gstin={gstin}",                                                                                      method:"GET", description:"GSTIN to PAN lookup"                   },
  { name: "namesearch", url: "https://ftosint.world/api/namesearch?key=randi-family&q={q}&from={from}",                                                                                 method:"GET", description:"Name search by location"               },
];

function exampleValFor(param) {
  if (param.includes('number') || param.includes('num')) return '9876543210';
  if (param.includes('vehicle') || param.includes('registration')) return 'DL01AB1234';
  if (param.includes('email'))    return 'test@example.com';
  if (param.includes('username') || param.includes('user')) return 'john_doe';
  if (param.includes('ifsc'))     return 'SBIN0001234';
  if (param.includes('pan'))      return 'ABCDE1234F';
  if (param.includes('pincode') || param === 'pin') return '110001';
  if (param.includes('adhar') || param.includes('aadhar')) return '123456789012';
  if (param.includes('uid'))      return '123456789';
  if (param.includes('ip'))       return '8.8.8.8';
  if (param.includes('upi'))      return 'elvishrao@okicici';
  if (param.includes('gstin'))    return '07AABCF8078M1Z3';
  if (param === 'name')           return 'RAHUL';
  if (param === 'from')           return 'Delhi';
  if (param === 'q')              return 'Ramesh';
  if (param.includes('quiry') || param.includes('query')) return 'test@example.com';
  return '12345678';
}

const registeredAPIs = [];
const nameSet = new Set();

APIs.forEach(api => {
  const autoName = api.name;
  nameSet.add(autoName);
  const matches = api.url.match(/\{([^}]+)\}/g);
  const required = matches ? matches.map(m => m.replace(/[{}]/g, '')) : [];
  const exampleQuery = required.length > 0
    ? required.map(p => `${p}=${exampleValFor(p)}`).join('&')
    : 'query=test';
  const exampleParam = required[0] || 'query';
  const exampleVal   = exampleValFor(exampleParam);
  const paramExamples = {};
  required.forEach(p => { paramExamples[p] = exampleValFor(p); });
  registeredAPIs.push({
    name: autoName,
    url: api.url,
    upstreamUrl: api.url.replace(/key=[^&}]+/g, 'key=***'),
    method: api.method || 'GET',
    description: api.description || 'API endpoint',
    requiredParams: required,
    exampleParam, exampleVal, exampleQuery, paramExamples
  });
});

function logQuery(endpointName, inputParam, inputValue, statusCode, responseData, errorMsg, ipAddr, execTime) {
  db.run(
    `INSERT INTO queries (endpoint, input_param, input_value, response_status, response_data, error_msg, ip_address, execution_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [endpointName, inputParam, inputValue, statusCode, JSON.stringify(responseData), errorMsg, ipAddr, execTime],
    function(err) { if (err) console.error('DB log failed:', err); }
  );
  db.run(
    `INSERT INTO analytics (endpoint, total_queries, successful, avg_time) VALUES (?, 1, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET
       total_queries = total_queries + 1,
       successful    = successful + ?,
       avg_time      = (avg_time * (total_queries - 1) + ?) / total_queries`,
    [endpointName, statusCode < 400 ? 1 : 0, execTime, statusCode < 400 ? 1 : 0, execTime],
    (err) => { if (err) console.error('Analytics update failed:', err); }
  );
}

app.get('/health', (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get('/analytics/data', (req, res) => res.json(analytics.snapshot()));
app.get('/analytics',      (req, res) => res.sendFile(path.join(__dirname, 'view', 'analytics.html')));
app.get('/db-manager',     (req, res) => res.sendFile(path.join(__dirname, 'view', 'db-manager.html')));

app.get('/meta', (req, res) => {
  res.json({ owner: OWNER, totalEndpoints: registeredAPIs.length });
});

app.get('/db/stats', (req, res) => {
  const DB_PATH = process.env.DB_PATH || '/tmp/osint.db';
  let dbSizeBytes = 0;
  try { dbSizeBytes = fs.statSync(DB_PATH).size; } catch(e) {}
  db.all('SELECT COUNT(*) as total FROM queries', [], (err, r1) => {
    const totalQueries = err ? 0 : (r1[0].total || 0);
    db.all(`SELECT endpoint,
              COUNT(*) as count,
              SUM(CASE WHEN response_status < 400 THEN 1 ELSE 0 END) as success,
              SUM(CASE WHEN response_status >= 400 THEN 1 ELSE 0 END) as errors,
              ROUND(AVG(execution_time),1) as avg_time,
              MIN(created_at) as first_seen,
              MAX(created_at) as last_seen
            FROM queries GROUP BY endpoint ORDER BY count DESC`, [], (err2, endpoints) => {
      db.all('SELECT * FROM queries ORDER BY created_at DESC LIMIT 50', [], (err3, recent) => {
        db.all('SELECT response_status, COUNT(*) as count FROM queries GROUP BY response_status ORDER BY count DESC', [], (err4, statusDist) => {
          db.all('SELECT DATE(created_at) as date, COUNT(*) as count FROM queries GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30', [], (err5, daily) => {
            db.all('SELECT COUNT(DISTINCT input_value) as unique_inputs, COUNT(DISTINCT ip_address) as unique_ips FROM queries', [], (err6, misc) => {
              const miscData = (err6 || !misc.length) ? {} : misc[0];
              res.json({
                dbPath: DB_PATH,
                dbSizeBytes,
                dbSizeKB: (dbSizeBytes/1024).toFixed(2),
                dbSizeMB: (dbSizeBytes/1024/1024).toFixed(3),
                totalQueries,
                uniqueInputs: miscData.unique_inputs || 0,
                uniqueIps:    miscData.unique_ips    || 0,
                endpoints:          err2 ? [] : endpoints,
                recentQueries:      err3 ? [] : recent,
                statusDistribution: err4 ? [] : statusDist,
                dailyStats:         err5 ? [] : daily,
                exportedAt: new Date().toISOString()
              });
            });
          });
        });
      });
    });
  });
});

app.delete('/db/clear', (req, res) => {
  const secret = process.env.ADMIN_KEY || 'sahil_admin';
  if (req.query.key !== secret) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const endpoint = req.query.endpoint;
  if (endpoint) {
    db.run('DELETE FROM queries WHERE endpoint = ?', [endpoint], function(err) {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true, deleted: this.changes });
    });
  } else {
    db.run('DELETE FROM queries', [], function(err) {
      if (err) return res.status(500).json({ success: false, error: err.message });
      db.run('DELETE FROM analytics', [], function() {
        res.json({ success: true, message: 'All cleared' });
      });
    });
  }
});

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>.</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    html,body{width:100%;height:100%;overflow:hidden;background:#000;}
    video{
      position:fixed;top:50%;left:50%;
      transform:translate(-50%,-50%);
      min-width:100%;min-height:100%;
      width:auto;height:auto;object-fit:cover;
    }
  </style>
</head>
<body>
  <video autoplay loop muted playsinline>
    <source src="https://files.catbox.moe/2jv4js.mp4" type="video/mp4"/>
  </video>
</body>
</html>`);
});

app.get('/api-data', (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host     = req.get('host');
  const baseUrl  = `${protocol}://${host}`;
  const formattedApis = registeredAPIs.map(api => ({
    name: api.name, method: api.method, description: api.description,
    publicUrl:      `${baseUrl}/api/${api.name}`,
    requiredParams: api.requiredParams,
    paramExamples:  api.paramExamples,
    exampleQuery:   api.exampleQuery,
    example:        `${baseUrl}/api/${api.name}?${api.exampleQuery}`,
    upstreamUrl:    api.upstreamUrl
  }));
  res.json({ apis: formattedApis, baseUrl, owner: OWNER });
});

// ── /sahil/api — All endpoints UI ────────────────────────────────────────────
app.get('/sahil/api', (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host     = req.get('host');
  const baseUrl  = `${protocol}://${host}`;

  const categoryIcons = {
    number: '📞', phone: '📞', num: '📞', mobile: '📞',
    email: '📧', mail: '📧',
    vehicle: '🚘', veh: '🚘', rc: '🚘', car: '🚘', fastag: '💳', challan: '🧾',
    pan: '🪪', gstin: '🏢', gst: '🏢', tax: '🏢',
    adhar: '🆔', aadhar: '🆔', family: '👨‍👩‍👧',
    insta: '📸', instagram: '📸',
    git: '🐙', github: '🐙',
    ip: '🌐', pin: '📍', pincode: '📍',
    snap: '👻', snapchat: '👻',
    leak: '🔎', leakpro: '🔎',
    tg: '✈️', telegram: '✈️',
    bgmi: '🎮', ff: '🎮', game: '🎮',
    ifsc: '🏦', bank: '🏦', upi: '💳',
    name: '👤', namesearch: '👤',
    bom: '💣'
  };

  function getIcon(name, desc) {
    const n = name.toLowerCase();
    const d = (desc || '').toLowerCase();
    for (const [k, v] of Object.entries(categoryIcons)) {
      if (n.includes(k) || d.includes(k)) return v;
    }
    return '🔍';
  }

  const apiCards = registeredAPIs.map(api => {
    const icon = getIcon(api.name, api.description);
    const exUrl = `${baseUrl}/api/${api.name}?${api.exampleQuery}`;
    const params = api.requiredParams.map(p =>
      `<span class="param-badge">{${p}}</span>`
    ).join(' ');
    return `
    <div class="card">
      <div class="card-header">
        <span class="icon">${icon}</span>
        <div class="card-title">
          <span class="ep-name">/api/${api.name}</span>
          <span class="method-badge">${api.method}</span>
        </div>
      </div>
      <p class="desc">${api.description}</p>
      ${params ? `<div class="params">${params}</div>` : ''}
      <div class="example-box">
        <span class="ex-label">Example</span>
        <a class="ex-url" href="${exUrl}" target="_blank">${exUrl}</a>
      </div>
      <div class="card-actions">
        <button class="btn-copy" onclick="copyUrl('${exUrl}')">📋 Copy</button>
        <a class="btn-test" href="${exUrl}" target="_blank">⚡ Test</a>
      </div>
    </div>`;
  }).join('');

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>OSINT API — All Endpoints</title>
<style>
  :root {
    --bg: #0a0a0f;
    --surface: #111118;
    --card: #16161f;
    --border: #1e1e2e;
    --accent: #7c3aed;
    --accent2: #06b6d4;
    --text: #e2e8f0;
    --muted: #64748b;
    --green: #22c55e;
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:var(--bg); color:var(--text); font-family:'Segoe UI',system-ui,sans-serif; min-height:100vh; }

  /* HEADER */
  .header {
    background: linear-gradient(135deg, #0f0f1a 0%, #1a0a2e 50%, #0a1628 100%);
    border-bottom: 1px solid var(--border);
    padding: 28px 24px 20px;
    text-align: center;
    position: sticky; top: 0; z-index: 100;
    backdrop-filter: blur(12px);
  }
  .header h1 { font-size: 1.6rem; font-weight: 700; letter-spacing: 1px;
    background: linear-gradient(90deg, #a78bfa, #38bdf8);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .header p { color: var(--muted); font-size: 0.82rem; margin-top: 4px; }
  .stats-row { display:flex; justify-content:center; gap:24px; margin-top:14px; flex-wrap:wrap; }
  .stat { background:rgba(124,58,237,0.12); border:1px solid rgba(124,58,237,0.25);
    border-radius:8px; padding:6px 18px; font-size:0.82rem; }
  .stat span { color:#a78bfa; font-weight:700; margin-right:4px; }

  /* SEARCH */
  .search-wrap { padding: 20px 24px 0; max-width:1400px; margin:0 auto; }
  .search-box {
    width:100%; padding:12px 20px; border-radius:12px;
    background:var(--surface); border:1px solid var(--border);
    color:var(--text); font-size:0.95rem; outline:none;
    transition: border-color .2s;
  }
  .search-box:focus { border-color:var(--accent); }
  .search-box::placeholder { color:var(--muted); }

  /* GRID */
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr));
    gap:16px; padding:20px 24px 40px; max-width:1400px; margin:0 auto; }

  /* CARD */
  .card {
    background:var(--card); border:1px solid var(--border); border-radius:14px;
    padding:18px; display:flex; flex-direction:column; gap:10px;
    transition: border-color .2s, transform .2s, box-shadow .2s;
  }
  .card:hover { border-color:var(--accent); transform:translateY(-2px);
    box-shadow: 0 8px 32px rgba(124,58,237,0.15); }

  .card-header { display:flex; align-items:center; gap:12px; }
  .icon { font-size:1.5rem; flex-shrink:0; }
  .card-title { display:flex; flex-direction:column; gap:3px; min-width:0; }
  .ep-name { font-weight:700; font-size:0.9rem; color:#a78bfa;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .method-badge { display:inline-block; background:rgba(6,182,212,0.15);
    color:var(--accent2); border:1px solid rgba(6,182,212,0.3);
    border-radius:4px; padding:1px 8px; font-size:0.7rem; font-weight:700;
    letter-spacing:.5px; width:fit-content; }

  .desc { font-size:0.82rem; color:var(--muted); line-height:1.4; }

  .params { display:flex; flex-wrap:wrap; gap:5px; }
  .param-badge { background:rgba(124,58,237,0.12); border:1px solid rgba(124,58,237,0.25);
    color:#c4b5fd; border-radius:6px; padding:2px 8px; font-size:0.72rem;
    font-family:monospace; }

  .example-box { background:var(--surface); border-radius:8px; padding:8px 12px;
    border:1px solid var(--border); }
  .ex-label { display:block; font-size:0.68rem; color:var(--muted); margin-bottom:3px;
    text-transform:uppercase; letter-spacing:.5px; }
  .ex-url { font-size:0.72rem; color:#38bdf8; word-break:break-all;
    text-decoration:none; font-family:monospace; }
  .ex-url:hover { text-decoration:underline; }

  .card-actions { display:flex; gap:8px; margin-top:2px; }
  .btn-copy, .btn-test {
    flex:1; padding:8px; border-radius:8px; border:none; cursor:pointer;
    font-size:0.78rem; font-weight:600; text-align:center; text-decoration:none;
    transition: opacity .15s;
  }
  .btn-copy { background:rgba(124,58,237,0.18); color:#a78bfa;
    border:1px solid rgba(124,58,237,0.3); }
  .btn-test  { background:rgba(6,182,212,0.15); color:var(--accent2);
    border:1px solid rgba(6,182,212,0.3); display:flex; align-items:center;
    justify-content:center; }
  .btn-copy:hover, .btn-test:hover { opacity:.75; }

  /* TOAST */
  .toast { position:fixed; bottom:24px; right:24px; background:#22c55e; color:#fff;
    padding:10px 20px; border-radius:10px; font-size:0.85rem; font-weight:600;
    transform:translateY(80px); opacity:0; transition:.3s; z-index:999; }
  .toast.show { transform:translateY(0); opacity:1; }

  /* NO RESULTS */
  .no-results { text-align:center; color:var(--muted); padding:60px 20px; font-size:1rem;
    display:none; grid-column:1/-1; }

  /* FOOTER */
  .footer { text-align:center; padding:16px; color:var(--muted); font-size:0.78rem;
    border-top:1px solid var(--border); }
  .footer a { color:#a78bfa; text-decoration:none; }
</style>
</head>
<body>

<div class="header">
  <h1>⚡ OSINT API Hub</h1>
  <p>All available endpoints — ${OWNER}</p>
  <div class="stats-row">
    <div class="stat"><span>${registeredAPIs.length}</span>Endpoints</div>
    <div class="stat"><span id="visibleCount">${registeredAPIs.length}</span>Showing</div>
    <div class="stat"><span>REST</span>Protocol</div>
  </div>
</div>

<div class="search-wrap">
  <input class="search-box" id="searchBox" type="text"
    placeholder="🔍  Search endpoints, descriptions, or params..."
    oninput="filterCards(this.value)" autocomplete="off"/>
</div>

<div class="grid" id="grid">
  ${apiCards}
  <div class="no-results" id="noResults">😕 No endpoints found for your search.</div>
</div>

<div class="footer">
  Powered by <a href="/sahil" target="_blank">${OWNER}</a> &nbsp;|&nbsp;
  <a href="/analytics" target="_blank">Analytics</a> &nbsp;|&nbsp;
  <a href="/api-data" target="_blank">JSON</a>
</div>

<div class="toast" id="toast">✅ Copied!</div>

<script>
  const cards = [...document.querySelectorAll('.card')];
  const noRes = document.getElementById('noResults');
  const countEl = document.getElementById('visibleCount');

  function filterCards(q) {
    q = q.toLowerCase().trim();
    let visible = 0;
    cards.forEach(c => {
      const text = c.innerText.toLowerCase();
      const show = !q || text.includes(q);
      c.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    noRes.style.display = visible === 0 ? 'block' : 'none';
    countEl.textContent = visible;
  }

  function copyUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
      const t = document.getElementById('toast');
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2000);
    });
  }
</script>
</body>
</html>`);
});

app.get('/sahil',   (req, res) => res.sendFile(path.join(__dirname, 'view', 'index.html')));
app.get('/nazriya', (req, res) => res.sendFile(path.join(__dirname, 'view', 'index.html')));

app.get('/sql/stats', (req, res) => {
  db.all(`SELECT endpoint, total_queries, successful, ROUND(avg_time, 2) as avg_time FROM analytics ORDER BY total_queries DESC`, (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, data: rows });
  });
});

app.get('/sql/queries/:endpoint', (req, res) => {
  db.all(`SELECT * FROM queries WHERE endpoint = ? ORDER BY created_at DESC LIMIT 100`, [req.params.endpoint], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, count: rows.length, data: rows });
  });
});

app.get('/sql/search', (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ success: false, error: "Missing query parameter" });
  db.all(`SELECT * FROM queries WHERE input_value LIKE ? OR input_param LIKE ? ORDER BY created_at DESC LIMIT 50`,
    [`%${q}%`, `%${q}%`], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, count: rows.length, data: rows });
  });
});

const PERMANENT_ROUTES = [
  '/api/tg', '/api/leakpro', '/api/num', '/api/numsearch', '/api/num-india', '/api/num-pak',
  '/api/leak', '/api/bom', '/api/adhar', '/api/family', '/api/email', '/api/veh-info',
  '/api/veh', '/api/rc', '/api/insta', '/api/git', '/api/bgmi', '/api/ff', '/api/ifsc',
  '/api/pan', '/api/ip', '/api/pin', '/api/snap', '/api/num2veh',
  '/api/upi', '/api/fastag', '/api/challan', '/api/adv', '/api/pan-gst',
  '/api/gstin', '/api/name2gstin', '/api/nametoinfo', '/api/gstreturns',
  '/api/gstin2pan', '/api/namesearch',
];

PERMANENT_ROUTES.forEach(route => {
  const epName = route.replace('/api/', '');
  app.all(route, (req, res, next) => {
    req.params = req.params || {};
    req.params.endpoint = epName;
    next('route');
  });
});

app.all('/api/:endpoint', async (req, res) => {
  const startTime = Date.now();
  try {
    const endpointName = req.params.endpoint;
    const apiConfig    = registeredAPIs.find(a => a.name === endpointName);
    if (!apiConfig) {
      return res.status(404).json({
        success: false,
        error: "Endpoint not found",
        message: `The endpoint '/api/${endpointName}' does not exist. Visit /sahil/api to see all endpoints.`
      });
    }

    const inputParams = { ...req.query, ...req.body };
    let targetValue = null, usedParam = null;

    for (const param of apiConfig.requiredParams) {
      if (inputParams[param] !== undefined && inputParams[param] !== '') {
        targetValue = inputParams[param]; usedParam = param; break;
      }
    }

    if (!targetValue) {
      const fallbackKeys = [
        'query','q','number','num','adhar','aadhar','email','vehicle',
        'registration_number','username','user','uid','id','ifsc','pan',
        'ip','pincode','pin','term','quiry','upi','gstin','name','from'
      ];
      for (const key of fallbackKeys) {
        if (inputParams[key] !== undefined && inputParams[key] !== '') {
          targetValue = inputParams[key]; usedParam = key; break;
        }
      }
    }

    if (!targetValue) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter",
        required_parameters: apiConfig.requiredParams,
        message: `Please supply a valid parameter (e.g., ?${apiConfig.exampleParam}=VALUE)`
      });
    }

    // ── Multi-param URL build: each param gets its own value from query ──────
    let finalUpstreamUrl = apiConfig.url;
    const encodedVal = encodeURIComponent(targetValue);
    apiConfig.requiredParams.forEach(param => {
      const paramVal = (inputParams[param] !== undefined && inputParams[param] !== '')
        ? encodeURIComponent(inputParams[param])
        : encodedVal;
      finalUpstreamUrl = finalUpstreamUrl.replace(new RegExp(`\\{${param}\\}`, 'g'), paramVal);
    });

    const axiosConfig = {
      method: apiConfig.method,
      url: finalUpstreamUrl,
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json, text/plain, */*'
      },
      validateStatus: status => status < 600
    };

    if (['POST','PUT','PATCH'].includes(axiosConfig.method.toUpperCase())) {
      axiosConfig.data = req.body;
    }

    const response = await axios(axiosConfig);
    const execTime = Date.now() - startTime;

    if (typeof response.data === 'string') {
      try { response.data = JSON.parse(response.data); } catch(e) { /* keep as string */ }
    }

    if (!response.data) {
      logQuery(endpointName, usedParam, targetValue, 500, {}, "No data returned", req.ip, execTime);
      return res.status(500).json({ success: false, error: "API returned no data", owner: OWNER });
    }

    if (typeof response.data === 'string' && response.data.trimStart().startsWith('<!DOCTYPE html>')) {
      logQuery(endpointName, usedParam, targetValue, 500, {}, "HTML error page", req.ip, execTime);
      return res.status(500).json({ success: false, error: "API returned HTML error page", owner: OWNER });
    }

    let cleaned = cleanData(response.data);

    if (!cleaned || (typeof cleaned === 'object' && Object.keys(cleaned).length === 0)) {
      logQuery(endpointName, usedParam, targetValue, 404, cleaned, "Empty response", req.ip, execTime);
      return res.status(404).json({ success: false, error: "No data found", owner: OWNER });
    }

    if (cleaned && typeof cleaned === 'object' && !Array.isArray(cleaned)) {
      cleaned.owner     = OWNER;
      cleaned.timestamp = new Date().toISOString();
    } else {
      cleaned = { data: cleaned, owner: OWNER, timestamp: new Date().toISOString() };
    }

    logQuery(endpointName, usedParam, targetValue, response.status, cleaned, null, req.ip, execTime);
    return res.status(response.status).json(cleaned);

  } catch (error) {
    const execTime = Date.now() - startTime;
    let errorMessage = error.message || "Unexpected error";
    let errorDetails = {};
    if (error.response) {
      errorDetails.status = error.response.status;
      errorMessage = `API returned status ${error.response.status}`;
    } else if (error.request) {
      errorMessage = "No response from API server (timeout)";
    }
    logQuery(req.params.endpoint, null, null, 500, {}, errorMessage, req.ip, execTime);
    return res.status(500).json({
      success: false, error: "Gateway execution error",
      message: errorMessage, details: errorDetails, owner: OWNER
    });
  }
});

app.get('/send-db', async (req, res) => {
  const secret = process.env.ADMIN_KEY || 'sahil_admin';
  if (req.query.key !== secret) return res.status(401).json({ success: false, error: 'Unauthorized' });
  await tgSync.sendDB('manual');
  res.json({ success: true, message: 'DB sent to Telegram' });
});

app.post('/upload-db', upload.single('db'), async (req, res) => {
  const secret = process.env.ADMIN_KEY || 'sahil_admin';
  if (req.query.key !== secret) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  if (!req.file) return res.status(400).json({ success: false, error: 'No file. Use field name "db".' });
  const DB_PATH = process.env.DB_PATH || '/tmp/osint.db';
  try {
    fs.copyFileSync(req.file.path, DB_PATH);
    fs.unlinkSync(req.file.path);
    await tgSync.sendMessage(`✅ <b>DB Uploaded</b>\n📁 <code>${DB_PATH}</code>\n🕒 <code>${new Date().toISOString()}</code>`);
    res.json({ success: true, message: `DB replaced at ${DB_PATH}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, async () => {
    console.log(`API Gateway running on port ${PORT}`);
    console.log(`Owner: ${OWNER}`);
    console.log(`Endpoints: ${registeredAPIs.length}`);
    await tgSync.onBoot();
    tgSync.startInterval();
  });
}

module.exports = app;

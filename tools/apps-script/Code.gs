/**
 * imarket2web - estimator backend
 * =============================================================================
 * One Google Apps Script that does all three jobs:
 *
 *   1. writes every estimate into a Google Sheet
 *   2. emails the estimate to the person who asked for it  (the auto-reply)
 *   3. emails you a notification with the same details
 *
 * No third-party service, no monthly limit worth worrying about, and the mail
 * goes out from your own Gmail address rather than a form vendor's servers.
 *
 * -----------------------------------------------------------------------------
 * SETUP - about five minutes, once
 * -----------------------------------------------------------------------------
 * 1. Open the Sheet - the one owned by imarket2web@gmail.com:
 *      https://docs.google.com/spreadsheets/d/1rQQSdr7Lj_7mefZ7xW31CBGxCdlrwrV9mr-VtntRUMg/edit
 *
 *    There is a second spreadsheet with almost the same name in the
 *    alporokh@gmail.com account. SHEET_ID below pins this script to the
 *    right one, so it no longer matters which Sheet the script is attached
 *    to - but it does matter which one you open to read the leads.
 *
 * 2. Extensions -> Apps Script. Select everything already in Code.gs and
 *    DELETE it, then paste in the CONTENTS of this file - every line,
 *    starting with the comment block you are reading.
 *
 *    Do NOT paste the file's path. If line 1 of the editor reads
 *    "tools/apps-script/Code.gs" then the path went in instead of the file,
 *    and the web app will answer every single request with
 *        ReferenceError: tools is not defined (line 1, file "Code")
 *    Save when the code is in.
 *
 * 3. Run 'setup' once (pick it in the dropdown, press Run). Google will ask
 *    you to authorise it - that is it asking permission to write to your own
 *    Sheet and send mail as you. "Google hasn't verified this app" is normal
 *    for your own scripts: Advanced -> Go to (project name).
 *
 * 4. Telegram, if you want it. The token is a password and this file lives in
 *    a public repository, so it is NOT stored here. In @BotFather run /newbot
 *    and copy the token, then Project Settings -> Script properties:
 *        TELEGRAM_TOKEN     123456:AA...
 *    Open the bot in Telegram and press Start, then run 'telegramWhoAmI' and
 *    paste the id it logs:
 *        TELEGRAM_CHAT_ID   123456789
 *    Skip this and everything still works - notifications just go by email.
 *
 * 5. Deploy -> New deployment -> type "Web app".
 *      Execute as:      Me
 *      Who has access:  Anyone     <-- "Anyone", not "Anyone with a Google account"
 *    Deploy, then copy the Web app URL (it ends in /exec).
 *
 * 6. Run 'selfTest'. It checks both tabs and their headers, writes a real row
 *    and removes it again, sends a Telegram message and an email, and logs
 *    PASS or FAIL for each. Opening the /exec URL in a browser answers the
 *    same question more briefly.
 *
 * The ENDPOINT in assets/estimator.js, assets/brief.js and assets/contact.js
 * must match the /exec URL. It currently does.
 *
 * WHENEVER YOU CHANGE THIS FILE: Deploy -> Manage deployments -> pencil ->
 * Version: New version -> Deploy. Without that the live site keeps running
 * the previous copy, and nothing you just fixed is fixed.
 * -----------------------------------------------------------------------------
 */

// ---- Settings ---------------------------------------------------------------
var NOTIFY_TO   = 'imarket2web@gmail.com';   // where your own copy goes
var FROM_NAME   = 'Olena · imarket2web';     // the name on the auto-reply
var REPLY_TO    = 'imarket2web@gmail.com';
/* Which spreadsheet to write into.

   getActiveSpreadsheet() answers "whichever Sheet this script is attached
   to". That is null in a standalone script project, and it is the wrong file
   if the script was made from a copy - and there are two spreadsheets with
   almost the same name, one per Google account:

     1rQQSdr7...  imarket2web - estimator leads   owned by imarket2web@gmail.com  <- this one
     16svq5Nm...  imarket2web - Estimator leads   owned by alporokh@gmail.com

   Naming the file explicitly is the difference between leads arriving and
   leads arriving somewhere nobody looks. Set it to '' to go back to using
   whatever Sheet the script is attached to. */
var SHEET_ID    = '1rQQSdr7Lj_7mefZ7xW31CBGxCdlrwrV9mr-VtntRUMg';

var SHEET_NAME  = 'Leads';              // SQL: estimates and briefs
var MQL_SHEET   = 'MQL';                // people who only asked to be called

var MQL_HEADERS = ['Received', 'Name', 'Prefer', 'Phone', 'Email',
                   'Message', 'Consent', 'Came from'];

/**
 * Both forms land in this one table. Type says which form it was and Stage
 * says how warm that makes it: someone who ran the numbers and asked for
 * them is further along than someone still describing the problem.
 *
 * Package and Current site are separate columns on purpose. Both forms post
 * a field called "website", but they mean different things by it - the
 * estimator means the package that was chosen, the brief means the site the
 * business already has. Putting them in one column would quietly mix two
 * kinds of value.
 */
var HEADERS = [
  'Received', 'Type', 'Stage', 'Name', 'Email', 'Business',
  'Estimate low', 'Estimate high', 'Monthly', 'Currency',
  'Package', 'Current site', 'Timeline', 'Timing', 'Budget',
  'Goal', 'Languages', 'Fast-track', 'Add-ons',
  'Message', 'Consent', 'Details'
];

/** The spreadsheet every tab lives in. */
function book() {
  var ss = SHEET_ID
    ? SpreadsheetApp.openById(SHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('No spreadsheet found. Either set SHEET_ID at the top of ' +
                    'this file, or create the script from the Sheet itself ' +
                    '(Extensions -> Apps Script) rather than as a standalone project.');
  }
  return ss;
}

/**
 * Writes the header row, or corrects it, and returns the sheet. Used by both
 * tabs so the two cannot drift apart.
 */
function syncHeaders(sh, headers, wideCol) {
  var current = sh.getLastRow() === 0
    ? []
    : sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  if (current.join('|') !== headers.join('|')) {
    if (sh.getLastRow() === 0) {
      sh.appendRow(headers);
    } else {
      // Rows written under the old headings keep their old column order, so
      // say so rather than silently mislabelling them.
      Logger.log('WARNING: headers changed while ' + (sh.getLastRow() - 1) +
                 ' row(s) already exist. Check the older rows still line up.');
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }
  sh.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold').setBackground('#121214').setFontColor('#FFFFFF');
  sh.setFrozenRows(1);
  sh.setColumnWidth(1, 150);
  // Found by name, not by a number that goes stale the moment a column moves.
  var wide = headers.indexOf(wideCol);
  if (wide >= 0) sh.setColumnWidth(wide + 1, 460);
  return sh;
}

/**
 * Run this once by hand after pasting the file in.
 * Creates the Leads tab and writes the header row.
 */
function setup() {
  var ss = book();
  var sh = ss.getSheetByName(SHEET_NAME);

  // If there is no Leads tab yet but the spreadsheet has a single sheet, adopt
  // it rather than adding a second one. A new spreadsheet arrives with one
  // empty "Sheet1", and a CSV import names its tab after the file; either way
  // the result should be one tab called Leads, not two.
  if (!sh) {
    var all = ss.getSheets();
    if (all.length === 1) {
      sh = all[0];
      sh.setName(SHEET_NAME);
    } else {
      sh = ss.insertSheet(SHEET_NAME);
    }
  }

  syncHeaders(sh, HEADERS, 'Details');
  syncHeaders(ss.getSheetByName(MQL_SHEET) || ss.insertSheet(MQL_SHEET),
              MQL_HEADERS, 'Message');
  SpreadsheetApp.flush();
  Logger.log('Ready. Now deploy as a web app (see the notes at the top).');
}

/** The endpoint the website posts to. */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // Honeypot: bots fill hidden fields, humans never see them.
    if (data.botcheck) {
      return json({ success: true, skipped: 'bot' });
    }
    // A contact request may leave a phone instead of an email. The other two
    // forms always have an address, because an estimate and a proposal are
    // things that get sent somewhere.
    if (data.form === 'contact') {
      if (!data.email && !data.phone) {
        return json({ success: false, message: 'A phone number or an email address is required.' });
      }
      if (data.email && !isEmail(data.email)) {
        return json({ success: false, message: 'That email address does not look right.' });
      }
      writeMql(data);
      notify(data);
      if (data.email) sendContactReply(data);
      return json({ success: true, message: 'Sent' });
    }

    if (!data.email || !isEmail(data.email)) {
      return json({ success: false, message: 'A valid email address is required.' });
    }

    // Both forms land in the same table - writeRow tags the row by type. Only
    // the reply differs, because a brief promises a person and an estimate
    // promises a number.
    writeRow(data);
    if (data.form === "brief") sendBriefReply(data);
    else sendAutoReply(data);
    notify(data);

    return json({ success: true, message: 'Sent' });
  } catch (err) {
    // Still try to tell yourself something broke, rather than losing the lead.
    try {
      MailApp.sendEmail(NOTIFY_TO, 'imarket2web estimator ERROR',
        String(err) + '\n\n' + (e && e.postData ? e.postData.contents : '(no body)'));
    } catch (ignored) {}
    return json({ success: false, message: String(err) });
  }
}

/**
 * Open the /exec URL in a browser to see whether this is wired up. Booleans
 * only - no token, no addresses, nothing that should not be public, because
 * this URL is public by definition.
 */
function doGet() {
  var out = { ok: true, service: 'imarket2web forms' };
  try {
    var ss = book();
    out.spreadsheet = ss.getName();
    out.tabs = ss.getSheets().map(function (sh) { return sh.getName(); });
    var leads = ss.getSheetByName(SHEET_NAME);
    out.leadsReady = !!leads && leads.getLastRow() > 0 &&
      leads.getRange(1, 1, 1, HEADERS.length).getValues()[0].join('|') === HEADERS.join('|');
    var mql = ss.getSheetByName(MQL_SHEET);
    out.mqlReady = !!mql && mql.getLastRow() > 0 &&
      mql.getRange(1, 1, 1, MQL_HEADERS.length).getValues()[0].join('|') === MQL_HEADERS.join('|');
  } catch (e) {
    out.sheetError = String(e);
  }
  out.telegramConfigured = !!(tgProp('TELEGRAM_TOKEN') && tgProp('TELEGRAM_CHAT_ID'));
  return json(out);
}

/**
 * Run this by hand to check the whole chain in one go: the tabs and their
 * headers, an actual write (added then removed again), Telegram, and mail.
 * Read the result in the execution log.
 *
 * It is deliberately a separate function from setup() - setup prepares, this
 * one proves, and you want to be able to prove it again later without
 * wondering whether you just changed something.
 */
function selfTest() {
  var L = [];
  function ok(label, pass, detail) {
    L.push((pass ? 'PASS  ' : 'FAIL  ') + label + (detail ? '   - ' + detail : ''));
  }

  var ss = book();
  L.push('Spreadsheet: ' + ss.getName());
  L.push('Id:          ' + ss.getId() + (SHEET_ID ? '  (pinned by SHEET_ID)' : '  (the attached Sheet)'));
  L.push('Tabs: ' + ss.getSheets().map(function (sh) { return sh.getName(); }).join(', '));
  L.push('');

  // 1. the two tabs, with the headers this code actually writes
  [[SHEET_NAME, HEADERS], [MQL_SHEET, MQL_HEADERS]].forEach(function (pair) {
    var sh = ss.getSheetByName(pair[0]);
    if (!sh) { ok('tab "' + pair[0] + '"', false, 'missing - run setup()'); return; }
    var head = sh.getLastRow() ? sh.getRange(1, 1, 1, pair[1].length).getValues()[0] : [];
    ok('tab "' + pair[0] + '" headers', head.join('|') === pair[1].join('|'),
       head.length ? head.length + ' columns' : 'no header row - run setup()');
  });

  // 2. a real write, removed again, so the whole path is exercised
  try {
    var sh = ss.getSheetByName(SHEET_NAME);
    // Without the tab there is nothing to write into, and the reason is
    // already on the line above. Do not repeat it as a stack trace.
    if (!sh) throw new Error('no "' + SHEET_NAME + '" tab yet');
    var before = sh.getLastRow();
    writeRow({ name: 'selfTest', email: 'selftest@example.com', estimate_low: 1,
               estimate_high: 2, consent: true, estimate: 'self test' });
    var after = sh.getLastRow();
    ok('write a row', after === before + 1, 'row ' + after);
    if (after === before + 1) sh.deleteRow(after);
    ok('remove the test row', sh.getLastRow() === before);
  } catch (e) {
    ok('write a row', false, String(e));
  }

  // 3. Telegram
  var hasToken = !!tgProp('TELEGRAM_TOKEN'), hasChat = !!tgProp('TELEGRAM_CHAT_ID');
  ok('TELEGRAM_TOKEN set', hasToken, hasToken ? '' : 'Project Settings -> Script properties');
  ok('TELEGRAM_CHAT_ID set', hasChat, hasChat ? '' : 'run telegramWhoAmI()');
  if (hasToken && hasChat) {
    var sent = sendTelegram('\u2705 <b>imarket2web self-test</b>\n\n' +
      'If you are reading this in Telegram, the bot is wired up correctly.');
    ok('Telegram message delivered', sent, sent ? 'check your chat' : 'see telegramWhoAmI()');
  } else {
    L.push('SKIP  Telegram message - not configured yet (email still works)');
  }

  // 4. mail
  try {
    var quota = MailApp.getRemainingDailyQuota();
    ok('mail quota', quota > 0, quota + ' left today');
    MailApp.sendEmail({
      to: NOTIFY_TO,
      subject: 'imarket2web self-test',
      body: 'This is the self-test from Apps Script.\n\n' + L.join('\n')
    });
    ok('notification email sent', true, NOTIFY_TO);
  } catch (e) {
    ok('notification email', false, String(e));
  }

  var failed = L.filter(function (l) { return l.indexOf('FAIL') === 0; }).length;
  L.push('');
  L.push(failed ? failed + ' check(s) failed - see above.' : 'Everything passed.');
  Logger.log(L.join('\n'));
}

// ---- Pieces -----------------------------------------------------------------

function writeRow(d) {
  var ss = book();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS);

  var isBrief = d.form === 'brief';

  sh.appendRow([
    new Date(),
    isBrief ? 'Brief' : 'Estimate',
    // Everything in this tab is sales-qualified: an estimate means they have
    // priced the work, a brief means they have described the job they want
    // done. The MQL tab holds the people who have only asked to be called.
    'SQL',
    d.name || '',
    d.email || '',
    d.company || '',
    // Everything from here down is filled by one form or the other, never
    // both, so the blanks in a row are information rather than gaps.
    d.estimate_low || '',
    d.estimate_high || '',
    d.monthly || '',
    isBrief ? '' : (d.currency || 'EUR'),
    isBrief ? '' : (d.website || ''),     // the package chosen
    isBrief ? (d.website || '') : '',     // the site they already have
    d.timeline || '',
    d.timing || '',
    d.budget || '',
    d.goal || '',
    d.languages || '',
    isBrief ? '' : (d.rush ? 'yes' : 'no'),
    d.addons || '',
    d.message || '',
    d.consent ? 'yes' : 'no',
    d.estimate || ''
  ]);
}

/** Contact requests are their own tab: a different shape, and a different
    question - these are people to chase, not proposals to send. */
function writeMql(d) {
  var ss = book();
  var sh = ss.getSheetByName(MQL_SHEET) || ss.insertSheet(MQL_SHEET);
  syncHeaders(sh, MQL_HEADERS, 'Message');
  sh.appendRow([
    new Date(), d.name || '', d.prefer || '', d.phone || '', d.email || '',
    d.message || '', d.consent ? 'yes' : 'no', d.page || ''
  ]);
}

/** Short, because they only asked to be contacted. */
function sendContactReply(d) {
  var first = String(d.name || '').trim().split(/\s+/)[0] || 'there';
  MailApp.sendEmail({
    to: d.email,
    subject: 'Got your message - imarket2web',
    name: FROM_NAME,
    replyTo: REPLY_TO,
    body:
      'Hi ' + first + ',\n\n' +
      'Your message reached me and I will come back to you' +
      (d.prefer ? ' by ' + String(d.prefer).toLowerCase() : '') + ', usually\n' +
      'within one working day.\n\n' +
      'If it is urgent, call +48 516 492 854 and you will get me directly.\n\n' +
      'Olena Porokh\n' +
      'imarket2web - Poznan\n' +
      'imarket2web@gmail.com - +48 516 492 854\n\n' +
      '--\n' +
      'You are receiving this because you asked to be contacted on\n' +
      'imarket2web.com. You are not on a mailing list.'
  });
}

// ---- Telegram ---------------------------------------------------------------
/*
 * The bot token is a password - anyone holding it can post as your bot - and
 * this file lives in a public repository, so it is deliberately NOT in here.
 * Put it in Project Settings -> Script properties:
 *
 *   TELEGRAM_TOKEN     123456:AA...   from @BotFather
 *   TELEGRAM_CHAT_ID   123456789      run telegramWhoAmI() to find yours
 *
 * With either missing, sendTelegram does nothing and says so, and the email
 * notification carries on exactly as before. Nothing is ever lost because
 * Telegram is not set up yet.
 */
function tgProp(k) {
  return PropertiesService.getScriptProperties().getProperty(k);
}

function sendTelegram(text) {
  var token = tgProp('TELEGRAM_TOKEN'), chat = tgProp('TELEGRAM_CHAT_ID');
  if (!token || !chat || !text) return false;
  try {
    var res = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'post',
      payload: {
        chat_id: chat,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: 'true'
      },
      muteHttpExceptions: true
    });
    return res.getResponseCode() === 200;
  } catch (e) {
    return false;
  }
}

/**
 * Run this by hand once: message your bot in Telegram (press Start), then
 * pick this function and press Run. It logs the chat id to paste into
 * Script properties.
 */
function telegramWhoAmI() {
  var token = tgProp('TELEGRAM_TOKEN');
  if (!token) {
    Logger.log('Set TELEGRAM_TOKEN in Project Settings -> Script properties first.');
    return;
  }
  var res = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/getUpdates',
                              { muteHttpExceptions: true });
  var data = JSON.parse(res.getContentText());
  if (!data.ok) { Logger.log('Telegram said: ' + res.getContentText()); return; }
  if (!data.result || !data.result.length) {
    Logger.log('No messages yet. Open the bot in Telegram, press Start, then run this again.');
    return;
  }
  var seen = {};
  data.result.forEach(function (u) {
    var m = u.message || u.channel_post;
    if (m && m.chat) seen[m.chat.id] = m.chat.title || m.chat.first_name || m.chat.username || '';
  });
  Object.keys(seen).forEach(function (id) {
    Logger.log('TELEGRAM_CHAT_ID = ' + id + '   (' + seen[id] + ')');
  });
}

/** Telegram's HTML mode only needs these three escaped. */
function tgEsc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** What you read on your phone. Short enough to act on without opening the Sheet. */
function telegramText(d) {
  var L = [];

  if (d.form === 'contact') {
    L.push('\u26aa <b>MQL \u00b7 contact request</b>');
    L.push('');
    L.push('<b>' + tgEsc(d.name || '-') + '</b>');
    L.push('Prefers: ' + tgEsc(d.prefer || '-'));
    if (d.phone) L.push('Phone/handle: ' + tgEsc(d.phone));
    if (d.email) L.push('Email: ' + tgEsc(d.email));
    if (d.page) L.push('Came from: ' + tgEsc(d.page));
    if (d.message) { L.push(''); L.push(tgEsc(d.message)); }
    return L.join('\n');
  }

  if (d.form === 'brief') {
    L.push('🟢 <b>SQL \u00b7 project brief</b> \u2014 wants to work with you');
    L.push('');
    L.push('<b>' + tgEsc(d.name || '-') + '</b>' + (d.company ? ' \u00b7 ' + tgEsc(d.company) : ''));
    if (d.email) L.push(tgEsc(d.email));
    if (d.website) L.push('Site now: ' + tgEsc(d.website));
    L.push('');
    L.push('Timing: <b>' + tgEsc(d.timing || '-') + '</b>');
    L.push('Budget: <b>' + tgEsc(d.budget || '-') + '</b>');
    if (d.message) { L.push(''); L.push(tgEsc(d.message)); }
    return L.join('\n');
  }

  L.push('🔵 <b>SQL \u00b7 estimate</b>');
  L.push('');
  L.push('<b>' + tgEsc(d.name || '-') + '</b>');
  if (d.email) L.push(tgEsc(d.email));
  L.push('');
  L.push('\u2248 <b>\u20ac' + tgEsc(d.estimate_low || '?') + ' \u2013 \u20ac' + tgEsc(d.estimate_high || '?') + '</b>');
  if (d.monthly) L.push('then <b>\u20ac' + tgEsc(d.monthly) + ' / month</b>');
  if (d.timeline) L.push(tgEsc(d.timeline));
  L.push('');
  if (d.website) L.push('Package: ' + tgEsc(d.website));
  if (d.addons) L.push('Layers: ' + tgEsc(d.addons));
  var meta = [];
  if (d.languages) meta.push(d.languages + ' language' + (d.languages > 1 ? 's' : ''));
  if (d.rush) meta.push('fast-track');
  if (d.goal) meta.push(d.goal);
  if (meta.length) L.push(tgEsc(meta.join(' \u00b7 ')));
  if (d.message) { L.push(''); L.push(tgEsc(d.message)); }
  return L.join('\n');
}

/**
 * Telegram for everything, because that is where you actually look.
 * Email as well for an SQL - those are the ones you act on, and you should
 * not need Telegram open to find them later. An MQL only falls back to email
 * when Telegram is not configured, so the inbox stays for real leads.
 */
function notify(d) {
  var onTelegram = sendTelegram(telegramText(d));
  if (d.form !== 'contact' || !onTelegram) sendNotification(d);
}

/** The automated reply to the person who filled the form. */
function sendAutoReply(d) {
  var first = String(d.name || '').trim().split(/\s+/)[0] || 'there';
  var range = d.estimate_low && d.estimate_high
    ? '€' + d.estimate_low + ' – €' + d.estimate_high
    : 'your estimate';

  var body =
    'Hi ' + first + ',\n\n' +
    'Here is the estimate you generated on imarket2web - ' + range +
    (d.timeline ? ', over roughly ' + d.timeline : '') + '.\n\n' +
    'The full breakdown is below so you have it in writing.\n\n' +
    '--------------------------------------------------------\n' +
    (d.estimate || '') + '\n' +
    '--------------------------------------------------------\n\n' +
    'A note on what this number is: it is a ballpark based on what you told the\n' +
    'calculator, not a binding quote. What usually moves it is how competitive\n' +
    'your city is for your service, and how much of your content already exists.\n\n' +
    'I read every one of these myself. If you want to go further, reply to this\n' +
    'email or call +48 516 492 854 and we can talk through the scope - no\n' +
    'obligation, and I will tell you if I think you do not need half of it.\n\n' +
    'Olena Porokh\n' +
    'imarket2web · Poznań\n' +
    'imarket2web@gmail.com · +48 516 492 854\n\n' +
    '--\n' +
    'You are receiving this because you asked for an estimate on imarket2web.\n' +
    'You are not on a mailing list and there is nothing further to unsubscribe\n' +
    'from. To have your data deleted, just reply and ask.';

  MailApp.sendEmail({
    to: d.email,
    subject: 'Your imarket2web estimate' + (d.estimate_low ? ' - ' + range : ''),
    body: body,
    name: FROM_NAME,
    replyTo: REPLY_TO
  });
}

/** Your own copy, so you can act on it without opening the Sheet. */
function sendNotification(d) {
  var isBrief = d.form === 'brief';

  // Only reached for a contact request when Telegram is not configured, but
  // when it is reached it should not pretend to be an estimate.
  if (d.form === 'contact') {
    MailApp.sendEmail({
      to: NOTIFY_TO,
      subject: 'Contact request - ' + (d.name || d.phone || d.email),
      replyTo: d.email || REPLY_TO,
      body:
        'Someone asked to be contacted (MQL).\n\n' +
        'Name:    ' + (d.name || '-') + '\n' +
        'Prefers: ' + (d.prefer || '-') + '\n' +
        'Phone:   ' + (d.phone || '-') + '\n' +
        'Email:   ' + (d.email || '-') + '\n' +
        'Page:    ' + (d.page || '-') + '\n\n' +
        'Message:\n' + (d.message || '(none)')
    });
    return;
  }

  var head = isBrief
    ? 'New project brief (MQL).\n\n' +
      'Name:      ' + (d.name || '-') + '\n' +
      'Email:     ' + (d.email || '-') + '\n' +
      'Business:  ' + (d.company || '-') + '\n' +
      'Site now:  ' + (d.website || '-') + '\n' +
      'Timing:    ' + (d.timing || '-') + '\n' +
      'Budget:    ' + (d.budget || '-') + '\n'
    : 'New estimate request (SQL).\n\n' +
      'Name:      ' + (d.name || '-') + '\n' +
      'Email:     ' + (d.email || '-') + '\n' +
      'Estimate:  €' + (d.estimate_low || '?') + ' – €' + (d.estimate_high || '?') + '\n' +
      (d.monthly ? 'Then:      €' + d.monthly + ' / month\n' : '') +
      'Timeline:  ' + (d.timeline || '-') + '\n' +
      'Goal:      ' + (d.goal || '-') + '\n' +
      'Package:   ' + (d.website || '-') + '\n' +
      'Languages: ' + (d.languages || '-') + '\n' +
      'Add-ons:   ' + (d.addons || '-') + '\n' +
      'Fast-track:' + (d.rush ? ' yes' : ' no') + '\n';

  MailApp.sendEmail({
    to: NOTIFY_TO,
    subject: (isBrief ? 'Project brief - ' : 'Estimate request - ') + (d.name || d.email),
    body: head + '\nMessage:\n' + (d.message || '(none)') + '\n\n' +
          '--------------------------------------------------------\n' +
          (d.estimate || ''),
    replyTo: d.email || REPLY_TO
  });
}

/** A brief deserves a different reply from an estimate: it promises a person. */
function sendBriefReply(d) {
  var first = String(d.name || "").trim().split(/\s+/)[0] || "there";
  var body =
    "Hi " + first + ",\n\n" +
    "Thank you - your brief came through and I have it in front of me.\n\n" +
    "I read these myself, so what happens next is that I go through your\n" +
    "answers and come back with a proposal for the parts that will actually\n" +
    "move things, and a note on anything I would not spend your money on yet.\n\n" +
    "Usually within two working days. If it is urgent, call +48 516 492 854.\n\n" +
    "Here is a copy of what you sent, so you have it:\n\n" +
    "--------------------------------------------------------\n" +
    (d.estimate || "") + "\n" +
    "--------------------------------------------------------\n\n" +
    "Olena Porokh\n" +
    "imarket2web - Poznan\n" +
    "imarket2web@gmail.com - +48 516 492 854\n\n" +
    "--\n" +
    "You are receiving this because you sent a project brief on imarket2web.\n" +
    "You are not on a mailing list. To have your data deleted, just reply and ask.";

  MailApp.sendEmail({
    to: d.email,
    subject: "Your imarket2web project brief",
    body: body,
    name: FROM_NAME,
    replyTo: REPLY_TO
  });
}

// ---- Helpers ----------------------------------------------------------------

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s).trim());
}

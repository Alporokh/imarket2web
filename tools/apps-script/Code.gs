/**
 * imarket2web — estimator backend
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
 * SETUP — about five minutes, once
 * -----------------------------------------------------------------------------
 * 1. Open the Sheet:
 *      https://docs.google.com/spreadsheets/d/1hbBzRPIziBbClbMiWWLShFCCvewQb6drl6oHIAwo4XM/edit
 *
 * 2. Extensions -> Apps Script. Delete whatever is in Code.gs and paste this
 *    whole file in. Save.
 *
 * 3. Run the function `setup` once (pick it in the dropdown, press Run).
 *    Google will ask you to authorise it — that is it asking permission to
 *    write to your own Sheet and send mail as you. Approve it.
 *    You will see "Google hasn't verified this app": choose Advanced ->
 *    Go to (project name). That warning is normal for your own scripts.
 *
 * 4. Deploy -> New deployment -> type "Web app".
 *      Execute as:      Me
 *      Who has access:  Anyone            <-- must be "Anyone", not "Anyone with Google account"
 *    Deploy, then copy the Web app URL. It looks like:
 *      https://script.google.com/macros/s/AKfycb..../exec
 *
 * 5. Paste that URL into ENDPOINT in assets/estimator.js, and set
 *    PROVIDER to 'apps-script'.
 *
 * 6. Test it from the live site. A row should appear in the Sheet and two
 *    emails should arrive.
 *
 * If you ever change this code, you must Deploy -> Manage deployments ->
 * edit -> New version, or the live site keeps running the old copy.
 * -----------------------------------------------------------------------------
 */

// ---- Settings ---------------------------------------------------------------
var NOTIFY_TO   = 'imarket2web@gmail.com';   // where your own copy goes
var FROM_NAME   = 'Olena · imarket2web';     // the name on the auto-reply
var REPLY_TO    = 'imarket2web@gmail.com';
var SHEET_NAME  = 'Leads';

var HEADERS = [
  'Received', 'Name', 'Email', 'Estimate low', 'Estimate high', 'Currency',
  'Timeline', 'Goal', 'Website', 'Languages', 'Fast-track', 'Add-ons',
  'Message', 'Consent', 'Full estimate', 'Source'
];

/**
 * Run this once by hand after pasting the file in.
 * Creates the Leads tab and writes the header row.
 */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
  }
  sh.getRange(1, 1, 1, HEADERS.length)
    .setFontWeight('bold')
    .setBackground('#121214')
    .setFontColor('#FFFFFF');
  sh.setFrozenRows(1);
  sh.setColumnWidth(1, 150);  // Received
  sh.setColumnWidth(15, 420); // Full estimate
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
    if (!data.email || !isEmail(data.email)) {
      return json({ success: false, message: 'A valid email address is required.' });
    }

    writeRow(data);
    sendAutoReply(data);
    sendNotification(data);

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

/** Lets you open the /exec URL in a browser and see that it is alive. */
function doGet() {
  return json({ ok: true, service: 'imarket2web estimator' });
}

// ---- Pieces -----------------------------------------------------------------

function writeRow(d) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS);

  sh.appendRow([
    new Date(),
    d.name || '',
    d.email || '',
    d.estimate_low || '',
    d.estimate_high || '',
    d.currency || 'EUR',
    d.timeline || '',
    d.goal || '',
    d.website || '',
    d.languages || '',
    d.rush ? 'yes' : 'no',
    d.addons || '',
    d.message || '',
    d.consent ? 'yes' : 'no',
    d.estimate || '',
    d.source || 'estimator'
  ]);
}

/** The automated reply to the person who filled the form. */
function sendAutoReply(d) {
  var first = String(d.name || '').trim().split(/\s+/)[0] || 'there';
  var range = d.estimate_low && d.estimate_high
    ? '€' + d.estimate_low + ' – €' + d.estimate_high
    : 'your estimate';

  var body =
    'Hi ' + first + ',\n\n' +
    'Here is the estimate you generated on imarket2web — ' + range +
    (d.timeline ? ', over roughly ' + d.timeline : '') + '.\n\n' +
    'The full breakdown is below so you have it in writing.\n\n' +
    '--------------------------------------------------------\n' +
    (d.estimate || '') + '\n' +
    '--------------------------------------------------------\n\n' +
    'A note on what this number is: it is a ballpark based on what you told the\n' +
    'calculator, not a binding quote. What usually moves it is how competitive\n' +
    'your city is for your service, and how much of your content already exists.\n\n' +
    'I read every one of these myself. If you want to go further, reply to this\n' +
    'email or call +48 516 492 854 and we can talk through the scope — no\n' +
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
    subject: 'Your imarket2web estimate' + (d.estimate_low ? ' — ' + range : ''),
    body: body,
    name: FROM_NAME,
    replyTo: REPLY_TO
  });
}

/** Your own copy, so you can act on it without opening the Sheet. */
function sendNotification(d) {
  var body =
    'New estimate request.\n\n' +
    'Name:      ' + (d.name || '—') + '\n' +
    'Email:     ' + (d.email || '—') + '\n' +
    'Estimate:  €' + (d.estimate_low || '?') + ' – €' + (d.estimate_high || '?') + '\n' +
    'Timeline:  ' + (d.timeline || '—') + '\n' +
    'Goal:      ' + (d.goal || '—') + '\n' +
    'Website:   ' + (d.website || '—') + '\n' +
    'Languages: ' + (d.languages || '—') + '\n' +
    'Add-ons:   ' + (d.addons || '—') + '\n' +
    'Fast-track:' + (d.rush ? ' yes' : ' no') + '\n\n' +
    'Message:\n' + (d.message || '(none)') + '\n\n' +
    '--------------------------------------------------------\n' +
    (d.estimate || '');

  MailApp.sendEmail({
    to: NOTIFY_TO,
    subject: 'Estimate request — ' + (d.name || d.email),
    body: body,
    replyTo: d.email || REPLY_TO
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

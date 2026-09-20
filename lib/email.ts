import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

const FROM = `"AquaPro" <${process.env.EMAIL_USER}>`

export function emailConfigured(): boolean {
  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS)
}

export async function sendEmail(to: string, subject: string, html: string) {
  if (!emailConfigured()) {
    throw new Error('Email is not set up: EMAIL_USER and EMAIL_PASS (Gmail app password) are missing from the server environment')
  }
  await transporter.sendMail({ from: FROM, to, subject, html })
}

export function emailBase(content: string) { return base(content) }

function base(content: string) {
  return `
  <!DOCTYPE html><html><body style="margin:0;padding:0;background:#0a1628;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px">
    <div style="text-align:center;margin-bottom:32px">
      <div style="font-size:28px;font-weight:700;color:#00b4d8;letter-spacing:2px">AQUAPRO</div>
      <div style="font-size:12px;color:#64748b;margin-top:4px">Pool Maintenance Management</div>
    </div>
    <div style="background:#0f1e35;border-radius:12px;padding:32px;border:1px solid #1a2d45">
      ${content}
    </div>
    <div style="text-align:center;margin-top:24px;font-size:11px;color:#334155">
      AquaPro Pool Maintenance Management<br>
      <a href="#" style="color:#00b4d8;text-decoration:none">Unsubscribe</a>
    </div>
  </div>
  </body></html>
  `
}

export function buildWaterAlertEmail(poolName: string, riskLevel: string, flags: string[], testUrl: string) {
  const riskColour = riskLevel === 'red' ? '#d63031' : riskLevel === 'orange' ? '#e17055' : '#fdcb6e'
  const riskLabel = riskLevel === 'red' ? 'CLOSE POOL — CRITICAL' : riskLevel === 'orange' ? 'Action Required' : 'Monitor'

  return base(`
    <h2 style="margin:0 0 16px;color:#ffffff">Water Quality Alert</h2>
    <div style="background:${riskColour}22;border:1px solid ${riskColour};border-radius:8px;padding:16px;margin-bottom:24px">
      <div style="color:${riskColour};font-weight:700;font-size:18px">${riskLabel}</div>
      <div style="color:#cbd5e1;margin-top:4px">${poolName}</div>
    </div>
    <p style="color:#94a3b8;margin:0 0 16px">The following parameters are out of range:</p>
    <ul style="color:#e2e8f0;margin:0 0 24px;padding-left:20px">
      ${flags.map(f => `<li style="margin-bottom:8px">${f}</li>`).join('')}
    </ul>
    <a href="${testUrl}" style="display:inline-block;background:#00b4d8;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
      View Test Details &amp; AI Advice
    </a>
  `)
}

export function buildComplianceDueEmail(poolName: string, eventType: string, dueDate: string, dashboardUrl: string) {
  return base(`
    <h2 style="margin:0 0 16px;color:#ffffff">Compliance Reminder</h2>
    <p style="color:#94a3b8;margin:0 0 24px">The following compliance event is due for <strong style="color:#e2e8f0">${poolName}</strong>:</p>
    <div style="background:#1a2d45;border-radius:8px;padding:20px;margin-bottom:24px">
      <div style="color:#e2e8f0;font-size:18px;font-weight:600">${eventType}</div>
      <div style="color:#fdcb6e;margin-top:8px">Due: ${dueDate}</div>
    </div>
    <a href="${dashboardUrl}" style="display:inline-block;background:#00b4d8;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
      View in Dashboard
    </a>
  `)
}

export function buildShiftReminderEmail(staffName: string, poolName: string, shiftDate: string, shiftType: string) {
  return base(`
    <h2 style="margin:0 0 16px;color:#ffffff">Shift Reminder</h2>
    <p style="color:#94a3b8;margin:0 0 24px">Hi ${staffName},</p>
    <p style="color:#94a3b8;margin:0 0 24px">You have a shift scheduled for tomorrow:</p>
    <div style="background:#1a2d45;border-radius:8px;padding:20px;margin-bottom:24px">
      <div style="color:#00b4d8;font-size:16px;font-weight:600">${poolName}</div>
      <div style="color:#e2e8f0;margin-top:8px">${shiftType}</div>
      <div style="color:#64748b;margin-top:4px">${shiftDate}</div>
    </div>
    <p style="color:#64748b;font-size:13px">Log in to your technician portal for full job details.</p>
  `)
}

export function buildWelcomeEmail(firstName: string, email: string, password: string, loginUrl: string, role: string = 'technician') {
  const isTech = !['admin', 'manager'].includes(role)
  const h = (t: string) => `<p style="margin:28px 0 10px;font-size:13px;font-weight:700;color:#00b4d8;text-transform:uppercase;letter-spacing:0.08em;">${t}</p>`
  const p = (t: string) => `<p style="margin:0 0 12px;font-size:14px;color:#94a3b8;line-height:1.6;">${t}</p>`
  const li = (items: string[]) => `<ol style="margin:0 0 12px;padding-left:20px;color:#cbd5e1;font-size:14px;line-height:1.7;">${items.map(i => `<li style="margin-bottom:6px;">${i}</li>`).join('')}</ol>`
  const strong = (t: string) => `<strong style="color:#e2e8f0;">${t}</strong>`

  const whatItIs = isTech
    ? p(`AquaPro is the app we use to run every site visit. It tells you where you're going today, gives you the tick list for the site, takes your water test readings (and works out combined chlorine and LSI for you), records the stock on site, and sends everything straight to the office — so there's no paperwork and nothing gets lost.`)
    : p(`AquaPro is our pool operations system. The office dashboard shows every site's water quality, what each technician has done, stock at each site, what needs ordering, compliance and incidents. The technician app is what the crew use on site.`)

  const install = h('Put it on your phone') + p(`It works like an app but there is nothing to download from the App Store — it lives in your browser.`) + li([
    `${strong('iPhone:')} open the link below in ${strong('Safari')} (not Chrome). Tap the Share button (the square with the arrow) at the bottom, scroll down and tap ${strong('Add to Home Screen')}, then ${strong('Add')}.`,
    `${strong('Android:')} open the link below in ${strong('Chrome')}. Tap the three dots (top right) and choose ${strong('Add to Home screen')} or ${strong('Install app')}.`,
    `An ${strong('AquaPro')} icon appears on your home screen. Open it from there from now on — it stays logged in.`,
  ])

  const firstLogin = h('Your first login') + li([
    `Tap the AquaPro icon (or the button below) and sign in with the details above.`,
    isTech ? `You'll see ${strong("Today's Jobs")} — every site you're rostered at today. Not rostered, or at a different site? Scroll down to ${strong('Visit any site')} and pick it from the list.` : `Choose ${strong('Office dashboard')} or ${strong('Technician app')} — you can switch between them any time.`,
    `Tap the ${strong('?')} at the top of the technician app for the full "How to use AquaPro" guide — it's written for the job, step by step.`,
  ])

  const onSite = isTech ? h('At each site') + li([
    `Tap the site to open it, then tap ${strong('Start shift')} as you arrive — that starts your hours.`,
    `${strong('Site Tasks')} — work through the tick list in order (Arrival → Water quality → Equipment → Cleaning → Safety → Departure). Tick each one as you do it.`,
    `${strong('Log Water Test')} — type in your readings. Combined chlorine and LSI fill in themselves. Add what the system screen shows, any chemicals you added by hand, and any faults. Then add photos and tap Done.`,
    `${strong('Dose Calculator')} — not sure what to add? Type in your readings and it tells you which chemical and how much for that pool. Nothing is saved, so use it before you dose.`,
    `${strong('Count Stock')} — how many drums / bags of each chemical are on site. Anything low goes on the order list automatically.`,
    `${strong('Plant Room Log')} — at sites with a plant room: backwash, baskets, controller and alarms, pumps, filters, dosing pumps, then photos of gauges or leaks.`,
    `${strong('Finish shift')} as you leave. Your hours are the time between Start and Finish, so don't forget either one.`,
  ]) + p(`${strong('Red result = close the pool and phone Tony.')} Orange = adjust and re-test before you leave.`) : ''
  const contacts = h('Who to call') + li([
    `${strong('Anything about a pool or site')} — out-of-range results, faults, closures, chemicals: ${strong('Tony 0422 470 214')}.`,
    `${strong('Anything admin')} — logins, rosters, the app itself: ${strong('Leonie 0433 414 987')}.`,
  ])
  const changePassword = p(`${strong('Change your password')} the first time you log in: tap ${strong('?')} at the top of the app and scroll to ${strong('Change my password')}.`)

  const help = h('Stuck?') + p(`The ${strong('?')} button in the app has the guide. If the app itself misbehaves, use the bug icon → ${strong('Report an Issue')} and the office gets it straight away. Otherwise ring Leonie.`)

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#060f1e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060f1e;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr>
          <td style="background:#0a1628;border-radius:12px 12px 0 0;padding:28px 32px;border-bottom:1px solid #0e2040;">
            <p style="margin:0;font-size:22px;font-weight:800;color:#00b4d8;letter-spacing:2px;">AQUAPRO</p>
            <p style="margin:4px 0 0;font-size:11px;color:#334155;letter-spacing:0.08em;text-transform:uppercase;">Ace Aquatics · Pool Operations</p>
          </td>
        </tr>
        <tr>
          <td style="background:#0f1e35;padding:32px;border:1px solid #0e2040;border-top:none;">
            <p style="margin:0 0 16px;font-size:22px;font-weight:700;color:#ffffff;">Welcome, ${firstName}</p>
            ${whatItIs}

            <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 8px;background:#070e1c;border:1px solid #0e2040;border-radius:10px;overflow:hidden;">
              <tr><td style="padding:20px 24px;">
                <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:0.08em;">Your Login Details</p>
                <p style="margin:0 0 10px;font-size:13px;color:#64748b;">
                  Email: <strong style="color:#e2e8f0;font-family:monospace;">${email}</strong>
                </p>
                <p style="margin:0;font-size:13px;color:#64748b;">
                  Password: <strong style="color:#e2e8f0;font-family:monospace;letter-spacing:0.05em;">${password}</strong>
                </p>
              </td></tr>
            </table>

            <table cellpadding="0" cellspacing="0" style="margin:16px 0 8px;">
              <tr>
                <td style="background:#00b4d8;border-radius:8px;">
                  <a href="${loginUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">
                    Open AquaPro →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:12px;color:#64748b;">Link: <a href="${loginUrl}" style="color:#00b4d8;">${loginUrl}</a></p>

            ${install}
            ${firstLogin}
            ${changePassword}
            ${onSite}
            ${contacts}
            ${help}

            <p style="margin:28px 0 0;font-size:14px;color:#e2e8f0;line-height:1.6;">
              Welcome aboard,<br>
              <strong>Leonie</strong><br>
              <span style="color:#94a3b8;">Ace Aquatics · 0433 414 987</span>
            </p>

            <p style="margin:24px 0 0;font-size:12px;color:#334155;line-height:1.6;">
              Keep this email — it has your login. If you forget your password, ring Leonie to reset it.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#070e1c;border-radius:0 0 12px 12px;padding:16px 32px;border:1px solid #0e2040;border-top:none;">
            <p style="margin:0;font-size:11px;color:#334155;">AquaPro · Ace Aquatics · <a href="${loginUrl}" style="color:#334155;">${loginUrl}</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendWelcomeEmail(firstName: string, email: string, password: string, loginUrl: string, role: string = 'technician') {
  await sendEmail(email, 'Welcome to AquaPro — your login and how to get started', buildWelcomeEmail(firstName, email, password, loginUrl, role))
}

export function buildStaffFeedbackEmail(
  type: string, title: string, priority: string, submittedBy: string,
  description: string, pageUrl: string | null, aiWorkaround: string | null, dashboardUrl: string
) {
  return base(`
    <h2 style="margin:0 0 16px;color:#ffffff">New ${type} report</h2>
    <div style="background:#1a2d45;border-radius:8px;padding:20px;margin-bottom:20px">
      <div style="color:#e2e8f0;font-size:16px;font-weight:600">${title}</div>
      <div style="color:#64748b;margin-top:6px;font-size:13px">By ${submittedBy} · Priority: ${priority}${pageUrl ? ` · ${pageUrl}` : ''}</div>
      ${description ? `<p style="color:#94a3b8;margin:12px 0 0;font-size:14px">${description}</p>` : ''}
    </div>
    ${aiWorkaround ? `
    <div style="background:#00b89418;border:1px solid #00b89440;border-radius:8px;padding:16px;margin-bottom:24px">
      <div style="color:#00b894;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">AI-suggested workaround</div>
      <div style="color:#e2e8f0;font-size:14px">${aiWorkaround}</div>
    </div>` : ''}
    <a href="${dashboardUrl}" style="display:inline-block;background:#00b4d8;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
      View in Error Log
    </a>
  `)
}

// Brett always gets every report regardless of who's in the staff table, so he's
// never missing the notification he needs to run the next fix-the-queue session.
const DEVELOPER_EMAIL = 'brett@aceperformance.com.au'

export async function sendStaffFeedbackEmail(
  adminEmails: string[], type: string, title: string, priority: string, submittedBy: string,
  description: string, pageUrl: string | null, aiWorkaround: string | null, dashboardUrl: string
) {
  const html = buildStaffFeedbackEmail(type, title, priority, submittedBy, description, pageUrl, aiWorkaround, dashboardUrl)
  const recipients = new Set([...adminEmails, DEVELOPER_EMAIL])
  for (const email of recipients) {
    try { await sendEmail(email, `New ${type}: ${title}`, html) } catch {}
  }
}

export function buildStaffFeedbackDoneEmail(title: string, dashboardUrl: string) {
  return base(`
    <h2 style="margin:0 0 16px;color:#ffffff">Your report has been actioned</h2>
    <p style="color:#94a3b8;margin:0 0 20px">The following item you reported is now marked done:</p>
    <div style="background:#1a2d45;border-radius:8px;padding:20px;margin-bottom:24px">
      <div style="color:#e2e8f0;font-size:16px;font-weight:600">${title}</div>
    </div>
    <a href="${dashboardUrl}" style="display:inline-block;background:#00b4d8;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
      View in Dashboard
    </a>
  `)
}

export async function sendStaffFeedbackDoneEmail(email: string, title: string, dashboardUrl: string) {
  try { await sendEmail(email, `Fixed: ${title}`, buildStaffFeedbackDoneEmail(title, dashboardUrl)) } catch {}
}

// ── Water test results ─────────────────────────────────────────────────────────
// Every logged water test is emailed to the office inbox so there's a record outside
// the app and someone sees each result as it comes in. Override with RESULTS_EMAIL.
export const RESULTS_EMAIL = process.env.RESULTS_EMAIL ?? 'info@aceaquatics.com.au'

const RESULT_FIELDS: [key: string, label: string, unit: string][] = [
  ['free_chlorine', 'Free Chlorine', 'ppm'],
  ['total_chlorine', 'Total Chlorine', 'ppm'],
  ['combined_chlorine', 'Combined Chlorine', 'ppm'],
  ['bromine', 'Bromine', 'ppm'],
  ['ph', 'pH', ''],
  ['total_alkalinity', 'Total Alkalinity', 'ppm'],
  ['calcium_hardness', 'Calcium Hardness', 'ppm'],
  ['cyanuric_acid', 'Cyanuric Acid', 'ppm'],
  ['total_dissolved_solids', 'TDS', 'ppm'],
  ['salt_level', 'Salt', 'ppm'],
  ['phosphates', 'Phosphates', 'ppb'],
  ['temperature_c', 'Temperature', '°C'],
  ['turbidity', 'Turbidity', 'NTU'],
]

export function buildWaterTestResultsEmail(test: Record<string, any>, poolName: string, testedBy: string, testUrl: string) {
  const risk = test.risk_level as string
  const riskColour = risk === 'red' ? '#d63031' : risk === 'orange' ? '#e17055' : risk === 'yellow' ? '#fdcb6e' : '#00b894'
  const riskLabel = risk === 'red' ? 'CLOSE POOL — CRITICAL' : risk === 'orange' ? 'Action Required' : risk === 'yellow' ? 'Monitor' : 'All Good'
  const flags: string[] = test.risk_flags ?? []
  const flagged = (label: string) => flags.some(f => f.toLowerCase().includes(label.toLowerCase()))
  const when = new Date(test.tested_at).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne', dateStyle: 'medium', timeStyle: 'short' })

  const rows = RESULT_FIELDS
    .filter(([key]) => test[key] !== null && test[key] !== undefined)
    .map(([key, label, unit]) => {
      const bad = flagged(label)
      return `<tr>
        <td style="padding:8px 12px;color:#94a3b8;border-bottom:1px solid #1a2d45">${label}</td>
        <td style="padding:8px 12px;text-align:right;font-weight:700;color:${bad ? '#e17055' : '#e2e8f0'};border-bottom:1px solid #1a2d45">${Number(test[key])}${unit ? ' ' + unit : ''}${bad ? ' ⚠' : ''}</td>
      </tr>`
    }).join('')

  const lsi = test.langelier_saturation_index
  const lsiRow = lsi !== null && lsi !== undefined ? `<tr>
        <td style="padding:8px 12px;color:#94a3b8">LSI</td>
        <td style="padding:8px 12px;text-align:right;font-weight:700;color:${Math.abs(Number(lsi)) <= 0.3 ? '#00b894' : '#e17055'}">${Number(lsi) > 0 ? '+' : ''}${Number(lsi).toFixed(2)} · ${Number(lsi) < -0.3 ? 'corrosive' : Number(lsi) > 0.3 ? 'scale-forming' : 'balanced'}</td>
      </tr>` : ''

  const ctrl = (label: string, manual: any, controller: any, calibrated: any) => {
    if (controller === null || controller === undefined) return ''
    const diff = manual !== null && manual !== undefined ? Number(controller) - Number(manual) : null
    return `<tr>
        <td style="padding:8px 12px;color:#94a3b8;border-bottom:1px solid #1a2d45">System screen ${label}</td>
        <td style="padding:8px 12px;text-align:right;color:#e2e8f0;border-bottom:1px solid #1a2d45">${Number(controller)}${diff !== null ? ` <span style="color:${Math.abs(diff) > (label === 'pH' ? 0.2 : 0.5) ? '#e17055' : '#64748b'}">(${diff > 0 ? '+' : ''}${diff.toFixed(2)} vs test)</span>` : ''}${calibrated ? ' · <span style="color:#00b894">calibrated</span>' : ''}</td>
      </tr>`
  }
  const controllerRows = ctrl('pH', test.ph, test.controller_ph, test.calibrate_ph) + ctrl('Free Cl', test.free_chlorine, test.controller_fcl, test.calibrate_fcl)
  const doses: any[] = test.doses ?? []
  const dosesBlock = doses.length ? `<div style="background:#1a2d45;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:14px">
      <span style="color:#64748b;font-size:12px;display:block;margin-bottom:6px">Chemicals added</span>
      ${doses.map(d => `<div style="color:#e2e8f0">${Number(d.quantity)} ${d.chemicals?.dose_unit ?? d.chemicals?.unit ?? ''} ${d.chemicals?.name ?? ''}</div>`).join('')}
    </div>` : ''
  const faultBlock = test.fault_report ? `<div style="background:#d6303122;border:1px solid #d63031;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:14px;color:#e2e8f0">
      <span style="color:#d63031;font-weight:700;font-size:12px;display:block;margin-bottom:4px">FAULT / BREAKDOWN REPORTED</span>${String(test.fault_report).replace(/</g, '&lt;')}
    </div>` : ''

  return base(`
    <h2 style="margin:0 0 4px;color:#ffffff">Water Test — ${poolName}</h2>
    <div style="color:#64748b;font-size:13px;margin-bottom:20px">${when} · tested by ${testedBy}</div>
    <div style="background:${riskColour}22;border:1px solid ${riskColour};border-radius:8px;padding:12px 16px;margin-bottom:20px">
      <div style="color:${riskColour};font-weight:700;font-size:16px">${riskLabel}</div>
      ${flags.length ? `<div style="color:#cbd5e1;font-size:13px;margin-top:4px">${flags.join(' · ')}</div>` : ''}
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1628;border-radius:8px;margin-bottom:20px;font-size:14px">
      ${rows}${controllerRows}${lsiRow}
    </table>
    ${faultBlock}${dosesBlock}
    ${test.notes ? `<div style="background:#1a2d45;border-radius:8px;padding:12px 16px;margin-bottom:20px;color:#e2e8f0;font-size:14px"><span style="color:#64748b;font-size:12px;display:block;margin-bottom:4px">Notes</span>${String(test.notes).replace(/</g, '&lt;')}</div>` : ''}
    <a href="${testUrl}" style="display:inline-block;background:#00b4d8;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
      Open in AquaPro
    </a>
  `)
}

export async function sendWaterTestResultsEmail(test: Record<string, any>, poolName: string, testedBy: string, testUrl: string) {
  const risk = test.risk_level as string
  const prefix = (risk === 'red' ? '🚨 ' : risk === 'orange' ? '⚠️ ' : '') + (test.fault_report ? '🔧 ' : '')
  try {
    await sendEmail(RESULTS_EMAIL, `${prefix}Water test: ${poolName}`, buildWaterTestResultsEmail(test, poolName, testedBy, testUrl))
  } catch (e) {
    console.error('Water test results email failed:', e)
  }
}

"use client"

import { useState, useEffect } from "react"
import { PortalPageHeader, PortalSectionLabel } from "@/components/portal/portal-shared"
import { PortalIcon } from "@/components/portal/portal-icons"

const COLOR = "#6366f1"

const LETTER_TYPES = [
  { key: "offer",        label: "Offer Letter",        icon: "handshake",      color: "#22c55e" },
  { key: "appointment",  label: "Appointment Letter",  icon: "clipboard",      color: "#eab308" },
  { key: "joining",      label: "Joining Letter",      icon: "award",          color: "#3b82f6" },
  { key: "internship",   label: "Internship Letter",   icon: "graduation-cap", color: "#06b6d4" },
  { key: "experience",   label: "Experience Letter",   icon: "star",           color: "#8b5cf6" },
  { key: "relieving",    label: "Relieving Letter",    icon: "log-out",        color: "#94a3b8" },
  { key: "salary",       label: "Salary Increment",    icon: "trending-up",    color: "#f97316" },
  { key: "noc",          label: "No Objection (NOC)",  icon: "file-check",     color: "#14b8a6" },
  { key: "warning",      label: "Warning Letter",      icon: "alert-triangle", color: "#ef4444" },
  { key: "termination",  label: "Termination Letter",  icon: "ban",            color: "#dc2626" },
]

function getTemplate(type: string, data: any): string {
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
  const franchise = data.franchise || "Safawala"
  const ref = `${franchise.toUpperCase().replace(/\s+/g,"-")}-${Date.now().toString().slice(-6)}`
  const pro = data.gender === "female" ? "she" : "he"
  const pro2 = data.gender === "female" ? "her" : "him"
  const pro3 = data.gender === "female" ? "her" : "his"

  const base = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${type.toUpperCase()} — ${franchise}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Arial', sans-serif; max-width: 760px; margin: 0 auto; color: #1e293b; font-size: 13.5px; line-height: 1.75; padding: 40px 48px; }
  .letterhead { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0; padding-bottom: 16px; border-bottom: 3px solid ${COLOR}; }
  .brand-logo { height: 52px; width: auto; display: block; }
  .brand-info { margin-top: 6px; font-size: 10.5px; color: #64748b; line-height: 1.7; }
  .brand-info a { color: ${COLOR}; text-decoration: none; }
  .meta { text-align: right; font-size: 11.5px; color: #64748b; line-height: 1.9; }
  .meta strong { color: #334155; display: block; }
  .doc-title { font-size: 15px; font-weight: 900; text-transform: uppercase; text-align: center; letter-spacing: 2px; color: ${COLOR}; margin: 26px 0 22px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0; }
  .salutation { margin-bottom: 14px; }
  p { margin-bottom: 12px; }
  .info-table { width: 100%; border-collapse: collapse; margin: 18px 0; }
  .info-table td { padding: 9px 14px; font-size: 13px; border: 1px solid #e2e8f0; }
  .info-table td:first-child { width: 38%; background: #f8fafc; font-weight: 700; color: #475569; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.4px; }
  .info-table td:last-child { background: white; font-weight: 600; color: #1e293b; }
  .highlight { background: #f0f4ff; border-left: 4px solid ${COLOR}; padding: 14px 18px; border-radius: 0 8px 8px 0; margin: 18px 0; font-size: 13.5px; }
  .section-head { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin: 22px 0 8px; }
  .conditions ol { padding-left: 20px; }
  .conditions li { margin-bottom: 6px; font-size: 13px; color: #334155; }
  .signature-block { margin-top: 52px; }
  .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 8px; }
  .sig-line { border-top: 1.5px solid #334155; margin-top: 48px; padding-top: 6px; }
  .sig-name { font-weight: 700; font-size: 13px; color: #1e293b; }
  .sig-role { font-size: 11px; color: #64748b; }
  .footer-note { margin-top: 28px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 10.5px; color: #94a3b8; text-align: center; line-height: 1.7; }
  .print-btn { display: block; margin: 32px auto 0; padding: 12px 48px; background: ${COLOR}; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; letter-spacing: 0.3px; }
  @media print { .print-btn { display: none; } body { padding: 28px 36px; } }
</style>
</head>
<body>
<div class="letterhead">
  <div>
    <img src="${typeof window !== 'undefined' ? window.location.origin : ''}/safawalalogo.svg" alt="${franchise}" class="brand-logo" onerror="this.style.display='none';this.nextElementSibling.style.display='block'" />
    <div style="display:none;font-size:26px;font-weight:900;color:${COLOR};letter-spacing:-0.5px">${franchise}</div>
    <div class="brand-info">
      Fashion Rental &amp; Styling &bull; Wedding Turbans &amp; Accessories<br>
      <a href="mailto:info@safawala.com">info@safawala.com</a> &bull; <a href="tel:+919876543210">+91 98765 43210</a><br>
      www.safawala.com &bull; Mumbai, Maharashtra, India
    </div>
  </div>
  <div class="meta">
    <strong>Date:</strong> ${today}
    <strong>Ref No.:</strong> ${ref}
    <strong>Issuing Authority:</strong> Human Resources
  </div>
</div>`

  const footer = `
<div class="signature-block">
  <p style="margin-bottom:0">Yours Sincerely,</p>
  <div class="sig-grid">
    <div class="sig-box">
      <div class="sig-line">
        <div class="sig-name">${data.signatory || "Authorized Signatory"}</div>
        <div class="sig-role">${franchise} — Human Resources</div>
      </div>
    </div>
    <div class="sig-box">
      <div class="sig-line">
        <div class="sig-name">${data.name || "Employee"}</div>
        <div class="sig-role">Employee Signature &amp; Date</div>
      </div>
    </div>
  </div>
</div>
<div class="footer-note">
  <strong>${franchise}</strong> &bull; Fashion Rental &amp; Styling &bull; Wedding Turbans &amp; Accessories<br>
  info@safawala.com &bull; +91 98765 43210 &bull; www.safawala.com &bull; Mumbai, Maharashtra, India<br>
  <span style="color:#cbd5e1">This is a computer-generated document. For queries contact HR &bull; Ref: ${ref} &bull; ${today}</span>
</div>
<button class="print-btn" onclick="window.print()">Print / Download PDF</button>
</body></html>`

  const templates: Record<string, string> = {

    offer: `${base}
<div class="doc-title">Offer Letter</div>
<p class="salutation">Dear <strong>${data.name || "Candidate Name"}</strong>,</p>
<p>We are delighted to inform you that after evaluating your profile and interview performance, <strong>${franchise}</strong> is pleased to extend this formal offer of employment to you. We believe your skills and experience will be a valuable addition to our team.</p>
<p>You are being offered the position of <strong>${data.position || "Staff Member"}</strong> in the <strong>${data.department || "—"}</strong> department, subject to the terms and conditions outlined below.</p>

<div class="section-head">Employment Terms</div>
<table class="info-table">
  <tr><td>Position / Designation</td><td>${data.position || "Staff Member"}</td></tr>
  <tr><td>Department</td><td>${data.department || "—"}</td></tr>
  <tr><td>Date of Joining</td><td>${data.joining_date || "To be mutually confirmed"}</td></tr>
  <tr><td>Gross Monthly Salary</td><td>Rs. ${data.salary || "—"} per month (CTC)</td></tr>
  <tr><td>Probation Period</td><td>${data.probation || "3 (Three) months"}</td></tr>
  <tr><td>Place of Posting</td><td>${data.location || "Head Office / As assigned"}</td></tr>
  <tr><td>Working Hours</td><td>10:00 AM to 7:00 PM, Monday to Saturday</td></tr>
</table>

<div class="section-head">Conditions of Offer</div>
<div class="conditions"><ol>
  <li>This offer is contingent upon satisfactory verification of all original documents submitted by you.</li>
  <li>You will be required to serve a probation period of <strong>${data.probation || "3 months"}</strong>, during which either party may terminate employment with <strong>7 days</strong> written notice.</li>
  <li>Upon successful completion of probation, a notice period of <strong>30 days</strong> shall apply.</li>
  <li>You shall not engage in any other employment, business, or consultancy during the course of employment with ${franchise}.</li>
  <li>You are required to maintain strict confidentiality of all business information, client data, and trade processes.</li>
  <li>This offer will stand cancelled if you fail to report on the agreed date of joining without prior written notice.</li>
</ol></div>

<p>Kindly sign and return the duplicate copy of this letter as your formal acceptance within <strong>3 working days</strong>. We look forward to welcoming you to the ${franchise} family.</p>
${footer}`,

    appointment: `${base}
<div class="doc-title">Appointment Letter</div>
<p class="salutation">Dear <strong>${data.name || "Candidate Name"}</strong>,</p>
<p>With reference to your application for employment and the subsequent selection process conducted by <strong>${franchise}</strong>, we are pleased to confirm your appointment on the following terms and conditions:</p>

<div class="section-head">Appointment Details</div>
<table class="info-table">
  <tr><td>Designation</td><td>${data.position || "Staff Member"}</td></tr>
  <tr><td>Department</td><td>${data.department || "—"}</td></tr>
  <tr><td>Date of Appointment</td><td>${data.joining_date || today}</td></tr>
  <tr><td>Cost to Company (CTC)</td><td>Rs. ${data.salary || "—"} per month</td></tr>
  <tr><td>Probation Period</td><td>${data.probation || "3 (Three) months"}</td></tr>
  <tr><td>Place of Posting</td><td>${data.location || "As assigned by the management"}</td></tr>
  <tr><td>Leave Entitlement</td><td>${data.leaves || "12 Casual Leaves + 12 Earned Leaves per annum"}</td></tr>
</table>

<div class="section-head">Terms and Conditions</div>
<div class="conditions"><ol>
  <li>You will report to the <strong>${data.reporting_to || "Branch Manager / HR Department"}</strong> and carry out all duties and responsibilities as assigned from time to time.</li>
  <li>During the probation period, either party may terminate employment with <strong>7 days</strong> written notice. Post-confirmation, a notice period of <strong>30 days</strong> shall apply on either side.</li>
  <li>You shall abide by all company policies, rules, regulations, and code of conduct as amended from time to time.</li>
  <li>Any misconduct, negligence, insubordination, or breach of trust shall be subject to disciplinary action up to and including termination.</li>
  <li>You shall not disclose any confidential business information to any third party during or after employment.</li>
  <li>All company property, uniform, and equipment issued to you must be returned in good condition upon exit.</li>
</ol></div>

<p>You are requested to report for duty on <strong>${data.joining_date || "the agreed joining date"}</strong> along with the following original documents: Academic certificates, ID proof (Aadhaar/PAN), bank account details, and 2 passport-size photographs.</p>
<p>Please sign the duplicate copy of this letter as an acknowledgement of having read and accepted the above terms.</p>
${footer}`,

    joining: `${base}
<div class="doc-title">Joining Letter</div>
<p class="salutation">Dear <strong>${data.name || "Employee Name"}</strong>,</p>
<p>We are pleased to confirm that you have officially joined <strong>${franchise}</strong> as <strong>${data.position || "Staff Member"}</strong> in the <strong>${data.department || "—"}</strong> department, effective <strong>${data.joining_date || today}</strong>. We warmly welcome you to the team and look forward to your contributions.</p>

<div class="section-head">Employment Details</div>
<table class="info-table">
  <tr><td>Employee Name</td><td>${data.name || "—"}</td></tr>
  <tr><td>Employee ID</td><td>${data.employee_id || "SW-" + Date.now().toString().slice(-4)}</td></tr>
  <tr><td>Designation</td><td>${data.position || "Staff Member"}</td></tr>
  <tr><td>Department</td><td>${data.department || "—"}</td></tr>
  <tr><td>Date of Joining</td><td>${data.joining_date || today}</td></tr>
  <tr><td>Monthly Salary</td><td>Rs. ${data.salary || "—"} per month</td></tr>
  <tr><td>Reporting Authority</td><td>${data.reporting_to || "Branch Manager"}</td></tr>
  <tr><td>Working Hours</td><td>${data.working_hours || "10:00 AM – 7:00 PM, Monday to Saturday"}</td></tr>
</table>

<div class="highlight">
  This letter serves as your official proof of employment with <strong>${franchise}</strong>. Please carry this letter along with your company ID card when visiting client locations or other official premises.
</div>

<div class="section-head">Important Guidelines</div>
<div class="conditions"><ol>
  <li>Please ensure you familiarize yourself with the company's attendance policy, leave policy, and code of conduct within your first week.</li>
  <li>Your salary will be credited to your registered bank account on or before the 7th of each following month.</li>
  <li>Any planned leave must be applied for in advance through the HR portal. Unauthorized absenteeism will be treated as leave without pay.</li>
  <li>You are required to maintain the confidentiality of all client data, booking records, and business processes.</li>
</ol></div>

<p>We wish you a rewarding and successful career with <strong>${franchise}</strong>. Please do not hesitate to reach out to the HR department for any assistance during your initial period.</p>
${footer}`,

    internship: `${base}
<div class="doc-title">Internship Offer Letter</div>
<p class="salutation">Dear <strong>${data.name || "Candidate Name"}</strong>,</p>
<p>We are pleased to offer you an internship at <strong>${franchise}</strong>. Following a review of your profile and interview, we find you to be a suitable candidate for the internship program as detailed below. This internship is designed to provide you with practical, hands-on experience in the fashion rental and styling industry.</p>

<div class="section-head">Internship Details</div>
<table class="info-table">
  <tr><td>Intern Name</td><td>${data.name || "—"}</td></tr>
  <tr><td>Internship Role</td><td>${data.position || "Intern"}</td></tr>
  <tr><td>Department</td><td>${data.department || "—"}</td></tr>
  <tr><td>Commencement Date</td><td>${data.joining_date || today}</td></tr>
  <tr><td>Duration</td><td>${data.duration || "2 (Two) months"}</td></tr>
  <tr><td>Stipend</td><td>Rs. ${data.salary || "—"} per month</td></tr>
  <tr><td>Mentor / Supervisor</td><td>${data.reporting_to || "Department Head"}</td></tr>
  <tr><td>Working Days</td><td>Monday to Saturday, 10:00 AM – 7:00 PM</td></tr>
</table>

<div class="section-head">Scope of Work</div>
<p>During the internship, you will be exposed to and expected to contribute to the following areas:</p>
<div class="conditions"><ol>
  <li>Assisting the <strong>${data.department || "assigned"}</strong> team with day-to-day operations and project deliverables.</li>
  <li>Participating in client coordination, inventory management, or booking processes as directed.</li>
  <li>Preparing reports, summaries, and documentation as assigned by your supervisor.</li>
  <li>Observing and learning best practices in customer service, fashion styling, and event management.</li>
</ol></div>

<div class="section-head">Terms and Conditions</div>
<div class="conditions"><ol>
  <li>This internship does not constitute a permanent employment contract. Conversion to full-time employment is subject to performance and availability of vacancies.</li>
  <li>Either party may terminate this internship with <strong>3 days</strong> written notice.</li>
  <li>The intern shall not share, reproduce, or disclose any confidential or proprietary information of ${franchise}.</li>
  <li>The intern is expected to maintain professional conduct, punctuality, and adherence to the company's dress code and policies.</li>
  <li>A certificate of internship will be issued upon successful completion of the program.</li>
</ol></div>

<p>Please sign and return the duplicate copy of this letter as your acceptance. We look forward to having you on board and hope this experience will be enriching and rewarding for you.</p>
${footer}`,

    experience: `${base}
<div class="doc-title">Experience Certificate</div>
<p class="salutation">To Whom It May Concern,</p>
<p>This is to certify that <strong>${data.name || "Employee Name"}</strong> was associated with <strong>${franchise}</strong> as a full-time employee in the capacity of <strong>${data.position || "Staff Member"}</strong> in the <strong>${data.department || "—"}</strong> department.</p>
<p>${data.gender === "female" ? "She" : "He"} served with us from <strong>${data.from_date || "—"}</strong> to <strong>${data.to_date || today}</strong>, a tenure of approximately <strong>${data.tenure || "—"}</strong>.</p>

<div class="section-head">Performance Summary</div>
<div class="highlight">
  During the course of ${pro3} employment, <strong>${data.name || "the employee"}</strong> demonstrated <strong>${data.performance || "commendable performance, professionalism, and a strong work ethic"}</strong>. ${data.gender === "female" ? "She" : "He"} carried out all duties and responsibilities assigned to ${pro2} with sincerity, dedication, and a positive attitude. ${pro3.charAt(0).toUpperCase() + pro3.slice(1)} conduct was in accordance with the company's standards and values at all times.
</div>

<table class="info-table">
  <tr><td>Full Name</td><td>${data.name || "—"}</td></tr>
  <tr><td>Designation</td><td>${data.position || "Staff Member"}</td></tr>
  <tr><td>Department</td><td>${data.department || "—"}</td></tr>
  <tr><td>Employment Period</td><td>${data.from_date || "—"} to ${data.to_date || today}</td></tr>
</table>

<p>We confirm that at the time of separation, there were no dues pending from either side and all company property was duly returned. ${data.name || "The employee"} left the organization on ${data.leaving_reason || "mutually agreed terms"}.</p>
<p>We wish <strong>${data.name || "the candidate"}</strong> the very best in all future endeavours and have no hesitation in recommending ${pro2} for suitable positions in any reputed organization.</p>
${footer}`,

    relieving: `${base}
<div class="doc-title">Relieving Letter</div>
<p class="salutation">To Whom It May Concern,</p>
<p>This is to certify that <strong>${data.name || "Employee Name"}</strong> has been formally relieved from the services of <strong>${franchise}</strong> with effect from <strong>${data.to_date || today}</strong>. We accept ${pro3} resignation / separation with effect from the aforementioned date.</p>

<div class="section-head">Employment Summary</div>
<table class="info-table">
  <tr><td>Employee Name</td><td>${data.name || "—"}</td></tr>
  <tr><td>Designation</td><td>${data.position || "Staff Member"}</td></tr>
  <tr><td>Department</td><td>${data.department || "—"}</td></tr>
  <tr><td>Date of Joining</td><td>${data.from_date || "—"}</td></tr>
  <tr><td>Last Working Date</td><td>${data.to_date || today}</td></tr>
</table>

<p>${data.name || "The employee"} served as <strong>${data.position || "Staff Member"}</strong> in the <strong>${data.department || "—"}</strong> department from <strong>${data.from_date || "—"}</strong> to <strong>${data.to_date || today}</strong> and has completed all required formalities of separation.</p>

<div class="highlight">
  We hereby confirm that all dues owed to <strong>${data.name || "the employee"}</strong> have been duly settled. All company assets, access credentials, uniforms, and equipment have been returned and accounted for. <strong>${data.name || "The employee"}</strong> is hereby relieved of all duties and obligations towards <strong>${franchise}</strong> as of the last working date mentioned above.
</div>

<p>${data.name || "The employee"} is free to seek and join any other organization with effect from <strong>${data.to_date || today}</strong>. We wish ${pro2} the very best in ${pro3} future professional endeavours.</p>
${footer}`,

    salary: `${base}
<div class="doc-title">Salary Increment Letter</div>
<p class="salutation">Dear <strong>${data.name || "Employee Name"}</strong>,</p>
<p>We are pleased to inform you that the management of <strong>${franchise}</strong> has reviewed your performance and contribution to the organization. In recognition of your hard work, dedication, and the value you bring to the team, we are happy to revise your compensation with effect from <strong>${data.effective_date || today}</strong>.</p>

<div class="section-head">Revised Compensation Details</div>
<table class="info-table">
  <tr><td>Employee Name</td><td>${data.name || "—"}</td></tr>
  <tr><td>Designation</td><td>${data.position || "—"}</td></tr>
  <tr><td>Department</td><td>${data.department || "—"}</td></tr>
  <tr><td>Previous Monthly Salary</td><td>Rs. ${data.old_salary || "—"} per month</td></tr>
  <tr><td>Revised Monthly Salary</td><td>Rs. ${data.new_salary || "—"} per month</td></tr>
  <tr><td>Increment Amount</td><td>Rs. ${data.increment || "—"} per month (${data.percent || "—"}% increase)</td></tr>
  <tr><td>Effective Date</td><td>${data.effective_date || today}</td></tr>
</table>

<div class="highlight">
  Your revised salary of <strong>Rs. ${data.new_salary || "—"} per month</strong> will be reflected in your payslip from the month of ${data.effective_date ? new Date(data.effective_date).toLocaleString("en-IN", { month: "long", year: "numeric" }) : "the next payroll cycle"}.
</div>

<p>This increment is a testament to your consistent efforts and the trust the management places in you. We encourage you to continue upholding the high standards of performance and professionalism that have earned you this recognition.</p>
<p>Please acknowledge receipt of this letter by signing the duplicate copy. We look forward to your continued association and growth with <strong>${franchise}</strong>.</p>
${footer}`,

    noc: `${base}
<div class="doc-title">No Objection Certificate</div>
<p class="salutation">To Whom It May Concern,</p>
<p>This is to certify that <strong>${data.name || "Employee Name"}</strong>, bearing Employee ID <strong>${data.employee_id || "—"}</strong>, is currently employed with <strong>${franchise}</strong> as <strong>${data.position || "Staff Member"}</strong> in the <strong>${data.department || "—"}</strong> department on a full-time, permanent basis.</p>

<div class="section-head">Employee Details</div>
<table class="info-table">
  <tr><td>Employee Name</td><td>${data.name || "—"}</td></tr>
  <tr><td>Employee ID</td><td>${data.employee_id || "—"}</td></tr>
  <tr><td>Designation</td><td>${data.position || "—"}</td></tr>
  <tr><td>Date of Joining</td><td>${data.joining_date || "—"}</td></tr>
  <tr><td>Monthly Salary</td><td>Rs. ${data.salary || "—"} per month</td></tr>
  <tr><td>Purpose of NOC</td><td>${data.purpose || "Visa / Loan / Passport Verification"}</td></tr>
</table>

<div class="highlight">
  <strong>${franchise}</strong> has <strong>no objection</strong> to <strong>${data.name || "the employee"}</strong> applying for <strong>${data.purpose || "the aforementioned purpose"}</strong>. The management confirms that ${pro3} employment status is regular and ${pro} is in good standing with the organization as of the date of this certificate.
</div>

<p>This No Objection Certificate is being issued at the specific written request of the employee for the purpose stated above, and shall not be construed as a guarantee or endorsement by <strong>${franchise}</strong> for any financial or legal obligation.</p>
<p>This certificate is valid for a period of <strong>90 days</strong> from the date of issuance.</p>
${footer}`,

    warning: `${base}
<div class="doc-title">Warning Letter</div>
<p class="salutation">Dear <strong>${data.name || "Employee Name"}</strong>,</p>
<p>This letter is being issued to you as a formal and official warning in connection with <strong>${data.reason || "a serious matter concerning your conduct and/or performance"}</strong> that came to the attention of the management on <strong>${data.incident_date || today}</strong>.</p>

<div class="section-head">Details of the Incident / Non-Compliance</div>
<div class="highlight" style="border-left-color: #ef4444;">
  ${data.details || "You were found to have violated the company's code of conduct / attendance policy / performance standards as specified in your appointment letter. The management had previously communicated the expected standards verbally, which appear to have not been addressed satisfactorily."}
</div>

<div class="section-head">Expected Corrective Action</div>
<div class="conditions"><ol>
  <li>You are required to <strong>${data.improvement || "immediately and substantially improve your conduct, attendance, and performance"}</strong> with effect from the date of this letter.</li>
  <li>You are advised to strictly adhere to all company policies, attendance norms, and code of conduct going forward.</li>
  <li>Any recurrence of such behaviour or non-compliance will result in further disciplinary action, which may include suspension or termination of your employment without further notice.</li>
  <li>You may submit a written explanation or representation within <strong>3 working days</strong> of receipt of this letter to the HR department.</li>
</ol></div>

<p>This warning letter will be placed on your personal file and may be considered during performance reviews or future disciplinary proceedings. We sincerely hope that you will take this warning in the right spirit and demonstrate the improvement expected of you.</p>

<div style="margin-top:36px;display:grid;grid-template-columns:1fr 1fr;gap:40px">
  <div>
    <div style="border-top:1.5px solid #334155;margin-top:48px;padding-top:6px">
      <div style="font-weight:700;font-size:13px">${data.signatory || "Authorized Signatory"}</div>
      <div style="font-size:11px;color:#64748b">HR / Management — ${franchise}</div>
    </div>
  </div>
  <div>
    <div style="border-top:1.5px solid #334155;margin-top:48px;padding-top:6px">
      <div style="font-weight:700;font-size:13px">${data.name || "Employee"}</div>
      <div style="font-size:11px;color:#64748b">Acknowledgement Signature &amp; Date</div>
    </div>
  </div>
</div>
<div class="footer-note" style="margin-top:24px">
  This is a computer-generated document issued by ${franchise}. Ref: ${ref}
</div>
<button class="print-btn" onclick="window.print()">Print / Download PDF</button>
</body></html>`,

    termination: `${base}
<div class="doc-title">Termination Letter</div>
<p class="salutation">Dear <strong>${data.name || "Employee Name"}</strong>,</p>
<p>It is with regret that we inform you that the management of <strong>${franchise}</strong> has taken the decision to terminate your employment with effect from <strong>${data.effective_date || today}</strong>. This decision has been taken after due consideration and in accordance with the company's HR policies and applicable rules.</p>

<div class="section-head">Termination Details</div>
<table class="info-table">
  <tr><td>Employee Name</td><td>${data.name || "—"}</td></tr>
  <tr><td>Designation</td><td>${data.position || "—"}</td></tr>
  <tr><td>Department</td><td>${data.department || "—"}</td></tr>
  <tr><td>Effective Date of Termination</td><td>${data.effective_date || today}</td></tr>
  <tr><td>Last Working Day</td><td>${data.last_day || today}</td></tr>
  <tr><td>Full &amp; Final Settlement</td><td>${data.settlement_date || "To be processed within 30 working days"}</td></tr>
</table>

<div class="section-head">Reason for Termination</div>
<div class="highlight" style="border-left-color: #ef4444;">
  ${data.reason || "As discussed in prior meetings and formal communications, your employment is being terminated due to continued non-compliance with company policies and failure to meet the expected performance standards despite being given adequate opportunity and time for improvement."}
</div>

<div class="section-head">Exit Formalities — Action Required</div>
<div class="conditions"><ol>
  <li>You are required to return all company property including uniforms, access cards, equipment, and any materials belonging to <strong>${franchise}</strong> on or before your last working day.</li>
  <li>You must complete the formal handover of all pending tasks, documentation, and responsibilities to your reporting manager.</li>
  <li>Any outstanding dues from you to the company will be adjusted from your Full &amp; Final Settlement.</li>
  <li>You are reminded that post-employment confidentiality obligations continue to apply. You are strictly prohibited from disclosing any client information, business data, or trade processes to any third party.</li>
  <li>Please complete your exit formalities with the HR department on or before <strong>${data.last_day || today}</strong>.</li>
</ol></div>

<p>Your Full &amp; Final settlement will be processed upon completion of exit formalities and will include all statutory dues. A separate settlement statement will be provided.</p>
${footer}`,
  }

  return templates[type] ?? base + `<p>Letter content</p>${footer}`
}

const FIELD_SETS: Record<string, { key: string; label: string; type?: string; required?: boolean }[]> = {
  offer:       [{ key: "name", label: "Candidate Name", required: true }, { key: "position", label: "Position / Designation" }, { key: "department", label: "Department" }, { key: "joining_date", label: "Date of Joining", type: "date" }, { key: "salary", label: "Gross Salary (₹/month)" }, { key: "probation", label: "Probation Period" }, { key: "location", label: "Work Location" }],
  appointment: [{ key: "name", label: "Candidate Name", required: true }, { key: "position", label: "Designation" }, { key: "department", label: "Department" }, { key: "joining_date", label: "Date of Appointment", type: "date" }, { key: "salary", label: "CTC (₹/month)" }, { key: "probation", label: "Probation Period" }, { key: "reporting_to", label: "Reporting To" }, { key: "location", label: "Work Location" }, { key: "leaves", label: "Leave Entitlement" }],
  joining:     [{ key: "name", label: "Employee Name", required: true }, { key: "position", label: "Designation" }, { key: "department", label: "Department" }, { key: "joining_date", label: "Date of Joining", type: "date" }, { key: "salary", label: "Monthly Salary (₹)" }, { key: "employee_id", label: "Employee ID" }, { key: "reporting_to", label: "Reporting To" }, { key: "working_hours", label: "Working Hours" }],
  internship:  [{ key: "name", label: "Intern Name", required: true }, { key: "position", label: "Internship Role" }, { key: "department", label: "Department" }, { key: "joining_date", label: "Start Date", type: "date" }, { key: "duration", label: "Duration (e.g. 2 months)" }, { key: "salary", label: "Monthly Stipend (₹)" }, { key: "reporting_to", label: "Supervisor / Mentor" }],
  experience:  [{ key: "name", label: "Employee Name", required: true }, { key: "position", label: "Designation" }, { key: "department", label: "Department" }, { key: "from_date", label: "Date of Joining", type: "date" }, { key: "to_date", label: "Last Working Day", type: "date" }, { key: "tenure", label: "Tenure (e.g. 1 year 3 months)" }, { key: "performance", label: "Performance Summary" }, { key: "leaving_reason", label: "Reason for Leaving" }, { key: "gender", label: "Gender (male/female)" }],
  relieving:   [{ key: "name", label: "Employee Name", required: true }, { key: "position", label: "Designation" }, { key: "department", label: "Department" }, { key: "from_date", label: "Date of Joining", type: "date" }, { key: "to_date", label: "Last Working Day", type: "date" }, { key: "gender", label: "Gender (male/female)" }],
  salary:      [{ key: "name", label: "Employee Name", required: true }, { key: "position", label: "Designation" }, { key: "department", label: "Department" }, { key: "old_salary", label: "Previous Salary (₹)" }, { key: "new_salary", label: "Revised Salary (₹)" }, { key: "increment", label: "Increment Amount (₹)" }, { key: "percent", label: "Increment %" }, { key: "effective_date", label: "Effective Date", type: "date" }],
  noc:         [{ key: "name", label: "Employee Name", required: true }, { key: "position", label: "Designation" }, { key: "department", label: "Department" }, { key: "purpose", label: "Purpose (e.g. Visa / Loan / Passport)" }, { key: "employee_id", label: "Employee ID" }, { key: "joining_date", label: "Date of Joining", type: "date" }, { key: "salary", label: "Monthly Salary (₹)" }, { key: "gender", label: "Gender (male/female)" }],
  warning:     [{ key: "name", label: "Employee Name", required: true }, { key: "reason", label: "Reason for Warning" }, { key: "incident_date", label: "Incident Date", type: "date" }, { key: "details", label: "Detailed Description of Incident" }, { key: "improvement", label: "Expected Corrective Action" }],
  termination: [{ key: "name", label: "Employee Name", required: true }, { key: "position", label: "Designation" }, { key: "department", label: "Department" }, { key: "effective_date", label: "Termination Date", type: "date" }, { key: "last_day", label: "Last Working Day", type: "date" }, { key: "reason", label: "Reason for Termination" }, { key: "settlement_date", label: "Settlement Timeline" }],
}

export default function LettersPage() {
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [staffList, setStaffList] = useState<any[]>([])
  const [franchise, setFranchise] = useState("Safawala")

  useEffect(() => {
    fetch("/api/users?limit=100").then(r => r.json()).then(d => setStaffList(d.data ?? []))
    const raw = localStorage.getItem("safawala_user")
    if (raw) {
      try {
        const u = JSON.parse(raw)
        if (u.franchise_name) setFranchise(u.franchise_name)
      } catch {}
    }
  }, [])

  function prefillFromStaff(staffId: string) {
    const s = staffList.find(s => s.id === staffId)
    if (!s) return
    setFields(prev => ({
      ...prev,
      name: s.name ?? prev.name,
      position: s.role ?? prev.position,
      department: s.department ?? prev.department,
      salary: s.base_salary ? String(s.base_salary) : prev.salary,
    }))
  }

  function generate() {
    if (!selectedType) return
    const html = getTemplate(selectedType, { ...fields, franchise })
    const win = window.open("", "_blank")
    if (win) { win.document.write(html); win.document.close() }
  }

  const fieldSet = selectedType ? (FIELD_SETS[selectedType] ?? []) : []
  const selectedMeta = LETTER_TYPES.find(l => l.key === selectedType)

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", paddingBottom: 40 }}>
      <PortalPageHeader title="HR Letters" subtitle="Generate & print professional letters" color={COLOR} backHref="/portal/hr" />

      {/* Letter type grid */}
      {!selectedType && (
        <>
          <PortalSectionLabel label="Select Letter Type" />
          <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {LETTER_TYPES.map(l => (
              <button key={l.key} onClick={() => { setSelectedType(l.key); setFields({}) }}
                style={{ padding: "16px 12px", borderRadius: 18, border: `2px solid ${l.color}20`, background: `${l.color}10`, cursor: "pointer", fontFamily: "inherit", textAlign: "center", color: l.color }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                  <PortalIcon name={l.icon} size={26} />
                </div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: l.color }}>{l.label}</p>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Letter form */}
      {selectedType && selectedMeta && (
        <div style={{ padding: "0 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, padding: "12px 0" }}>
            <button onClick={() => setSelectedType(null)} style={{ width: 36, height: 36, borderRadius: 12, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
              ←
            </button>
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#1e1208", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: selectedMeta.color }}><PortalIcon name={selectedMeta.icon} size={18} /></span>
              {selectedMeta.label}
            </p>
              <p style={{ margin: 0, fontSize: 10, color: "rgba(80,55,30,0.45)", fontWeight: 500 }}>Fill details below to generate</p>
            </div>
          </div>

          {/* Prefill from staff */}
          {staffList.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(80,55,30,0.5)", display: "block", marginBottom: 4 }}>Quick Fill from Staff</label>
              <select onChange={e => prefillFromStaff(e.target.value)} style={{ width: "100%", height: 44, borderRadius: 12, border: "1.5px solid #e2e8f0", padding: "0 14px", fontSize: 13, fontFamily: "inherit", outline: "none", background: "white" }}>
                <option value="">Select existing staff to prefill…</option>
                {staffList.map(s => <option key={s.id} value={s.id}>{s.name} ({s.department})</option>)}
              </select>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {fieldSet.map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(80,55,30,0.5)", display: "block", marginBottom: 4 }}>{f.label}{f.required ? " *" : ""}</label>
                <input type={f.type ?? "text"} value={fields[f.key] ?? ""} onChange={e => setFields(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: "100%", height: 44, borderRadius: 12, border: `1.5px solid ${f.required && !fields[f.key] ? "#fca5a5" : "#e2e8f0"}`, padding: "0 14px", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}

            <div>
              <label style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(80,55,30,0.5)", display: "block", marginBottom: 4 }}>Signatory Name</label>
              <input type="text" value={fields.signatory ?? ""} onChange={e => setFields(p => ({ ...p, signatory: e.target.value }))} placeholder="HR Manager / Branch Manager"
                style={{ width: "100%", height: 44, borderRadius: 12, border: "1.5px solid #e2e8f0", padding: "0 14px", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>

            <button onClick={generate}
              style={{ width: "100%", height: 52, borderRadius: 16, border: "none", background: selectedMeta.color, color: "white", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", marginTop: 8, letterSpacing: 0.3, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <PortalIcon name="printer" size={18} />
              Generate {selectedMeta.label}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

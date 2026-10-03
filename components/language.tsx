"use client";
import { createContext, useContext, useSyncExternalStore } from "react";
const translations: Record<string, string> = {
  "Date of birth": "పుట్టిన తేదీ",
  Address: "చిరునామా",
  "Emergency contact": "అత్యవసర సంప్రదింపు",
  Allergies: "అలెర్జీలు",
  "Add patient": "రోగిని జోడించండి",
  "Reset patient password": "రోగి పాస్‌వర్డ్ మార్చండి",
  "Patient account password": "రోగి ఖాతా పాస్‌వర్డ్",
  Overview: "అవలోకనం",
  Patients: "రోగులు",
  Appointments: "అపాయింట్‌మెంట్లు",
  Billing: "బిల్లులు",
  "Activity log": "కార్యాచరణ చరిత్ర",
  "Inpatient care": "ఇన్‌పేషెంట్ సేవలు",
  Staff: "సిబ్బంది",
  "System status": "సిస్టమ్ స్థితి",
  "My health": "నా ఆరోగ్యం",
  Account: "ఖాతా",
  "Sign out": "లాగ్ అవుట్",
  "Sign in": "లాగిన్",
  "Welcome back": "తిరిగి స్వాగతం",
  "Email address": "ఇమెయిల్ చిరునామా",
  Password: "పాస్‌వర్డ్",
  "Patient information": "రోగి సమాచారం",
  "Personal information": "వ్యక్తిగత సమాచారం",
  "Full name": "పూర్తి పేరు",
  Age: "వయస్సు",
  "Phone number": "ఫోన్ నంబర్",
  "Next checkup": "తదుపరి పరీక్ష",
  "Treatment plan": "చికిత్స ప్రణాళిక",
  "Billing summary": "బిల్లు వివరాలు",
  Medicines: "మందులు",
  Reports: "రిపోర్టులు",
  "Visit history": "వైద్య సందర్శనల చరిత్ర",
  "Appointment history": "అపాయింట్‌మెంట్ చరిత్ర",
  "Report files": "రిపోర్టు ఫైళ్లు",
  Invoices: "ఇన్వాయిస్‌లు",
  "Book appointment": "అపాయింట్‌మెంట్ నమోదు",
  "Request appointment": "అపాయింట్‌మెంట్ కోరండి",
  Patient: "రోగి",
  Doctor: "వైద్యుడు",
  Nurse: "నర్సు",
  "Date and time (IST)": "తేదీ మరియు సమయం (IST)",
  "Duration (minutes)": "వ్యవధి (నిమిషాలు)",
  Reason: "కారణం",
  Save: "సేవ్ చేయండి",
  "Saving…": "సేవ్ చేస్తున్నాము…",
  Cancel: "రద్దు",
  Scheduled: "నిర్ధారించబడింది",
  Requested: "అభ్యర్థించబడింది",
  "Checked in": "రోగి వచ్చారు",
  Completed: "పూర్తయింది",
  Cancelled: "రద్దయింది",
  Pending: "పెండింగ్",
  Paid: "చెల్లించారు",
  Overdue: "గడువు దాటింది",
  Unscheduled: "నమోదు కాలేదు",
  "Add visit": "వైద్య సందర్శన నమోదు",
  Complaint: "రోగి సమస్య",
  Diagnosis: "వ్యాధి నిర్ధారణ",
  Vitals: "ప్రాణాధార కొలతలు",
  "Care notes": "చికిత్స గమనికలు",
  "Follow-up instructions": "తదుపరి సూచనలు",
  Medicine: "మందు",
  Dose: "మోతాదు",
  Frequency: "ఎన్నిసార్లు",
  Duration: "వ్యవధి",
  Instructions: "సూచనలు",
  "Add medicine": "మందు జోడించండి",
  Remove: "తొలగించండి",
  "Record visit": "సందర్శనను సేవ్ చేయండి",
  "Upload report": "రిపోర్టు అప్‌లోడ్",
  "Report title": "రిపోర్టు పేరు",
  "Choose file": "ఫైల్ ఎంచుకోండి",
  Download: "డౌన్‌లోడ్",
  Print: "ముద్రించండి",
  "Create invoice": "ఇన్వాయిస్ సృష్టించండి",
  Description: "వివరణ",
  "Amount (INR)": "మొత్తం (రూపాయలు)",
  "Add item": "అంశం జోడించండి",
  "Record payment": "చెల్లింపు నమోదు",
  "Payment method": "చెల్లింపు విధానం",
  "Transaction reference": "లావాదేవీ సంఖ్య",
  Outstanding: "చెల్లించవలసిన మొత్తం",
  Beds: "పడకలు",
  Ward: "వార్డు",
  "Bed number": "పడక సంఖ్య",
  "Add bed": "పడక జోడించండి",
  "Admit patient": "రోగిని చేర్చండి",
  "Admission history": "ఆసుపత్రి చేరికల చరిత్ర",
  "Nursing notes": "నర్సింగ్ గమనికలు",
  Observations: "పరిశీలనలు",
  "Add nursing note": "నర్సింగ్ గమనిక జోడించండి",
  "Discharge summary": "డిశ్చార్జ్ వివరాలు",
  "Discharge patient": "రోగిని డిశ్చార్జ్ చేయండి",
  Discharged: "డిశ్చార్జ్ అయ్యారు",
  Admitted: "చేరారు",
  Available: "అందుబాటులో ఉంది",
  Occupied: "వినియోగంలో ఉంది",
  "Create staff account": "సిబ్బంది ఖాతా సృష్టించండి",
  "Registration number": "రిజిస్ట్రేషన్ సంఖ్య",
  Role: "పాత్ర",
  Active: "యాక్టివ్",
  Inactive: "నిష్క్రియ",
  Enable: "ప్రారంభించండి",
  Disable: "నిలిపివేయండి",
  "Change password": "పాస్‌వర్డ్ మార్చండి",
  "Current password": "ప్రస్తుత పాస్‌వర్డ్",
  "New password": "కొత్త పాస్‌వర్డ్",
  "Confirm password": "పాస్‌వర్డ్ నిర్ధారించండి",
  "No records yet": "ఇంకా రికార్డులు లేవు",
  "View record": "రికార్డు చూడండి",
  "Search patients": "రోగులను వెతకండి",
  "All statuses": "అన్ని స్థితులు",
  "Hospital workspace": "ఆసుపత్రి కార్యస్థలం",
  "Patient workspace": "రోగి కార్యస్థలం",
};
const LanguageContext = createContext("en");
function subscribe(callback: () => void) {
  window.addEventListener("portal-language", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("portal-language", callback);
    window.removeEventListener("storage", callback);
  };
}
function snapshot() {
  try {
    return localStorage.getItem("portal-language") === "te" ? "te" : "en";
  } catch {
    return "en";
  }
}
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language = useSyncExternalStore(subscribe, snapshot, () => "en");
  return (
    <LanguageContext.Provider value={language}>
      <div lang={language}>{children}</div>
    </LanguageContext.Provider>
  );
}
export function T({ children }: { children: string }) {
  const language = useContext(LanguageContext);
  return (
    <>{language === "te" ? translations[children] || children : children}</>
  );
}
export function LanguageToggle() {
  const language = useContext(LanguageContext);
  return (
    <button
      type="button"
      className="language-toggle"
      aria-label="Switch interface language"
      onClick={() => {
        try {
          localStorage.setItem(
            "portal-language",
            language === "en" ? "te" : "en",
          );
          window.dispatchEvent(new Event("portal-language"));
        } catch {}
      }}
    >
      {language === "en" ? "తెలుగు" : "English"}
    </button>
  );
}

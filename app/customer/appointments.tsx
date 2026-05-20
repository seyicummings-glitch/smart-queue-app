import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import BottomNav from '@/components/BottomNav';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];
type AppStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled';

// ─── Data ─────────────────────────────────────────────────────────────────────

const SERVICE_GROUPS: {
  industry: string;
  icon: IconName;
  color: string;
  services: { id: string; name: string; estimatedTime: number }[];
}[] = [
  {
    industry: 'Banking & Finance', icon: 'account-balance', color: '#2563eb',
    services: [
      { id: 'bnk-1', name: 'Teller Services',    estimatedTime: 15 },
      { id: 'bnk-2', name: 'Loan Consultation',  estimatedTime: 45 },
      { id: 'bnk-3', name: 'Account Opening',    estimatedTime: 30 },
      { id: 'bnk-4', name: 'Card Services',      estimatedTime: 20 },
      { id: 'bnk-5', name: 'Customer Service',   estimatedTime: 10 },
    ],
  },
  {
    industry: 'Healthcare', icon: 'favorite', color: '#e11d48',
    services: [
      { id: 'hlc-1', name: 'General Practitioner', estimatedTime: 30 },
      { id: 'hlc-2', name: 'Pharmacy Pickup',      estimatedTime: 5  },
      { id: 'hlc-3', name: 'Blood Test / Lab',     estimatedTime: 20 },
      { id: 'hlc-4', name: 'Dental',               estimatedTime: 25 },
      { id: 'hlc-5', name: 'Specialist Consult',   estimatedTime: 40 },
    ],
  },
  {
    industry: 'Retail', icon: 'shopping-bag', color: '#d97706',
    services: [
      { id: 'rtl-1', name: 'Returns & Exchanges', estimatedTime: 12 },
      { id: 'rtl-2', name: 'Customer Service',    estimatedTime: 8  },
      { id: 'rtl-3', name: 'Tech Support',        estimatedTime: 25 },
      { id: 'rtl-4', name: 'Click & Collect',     estimatedTime: 5  },
    ],
  },
  {
    industry: 'Government Services', icon: 'gavel', color: '#475569',
    services: [
      { id: 'gov-1', name: 'Document Processing',   estimatedTime: 40 },
      { id: 'gov-2', name: 'Permits & Licenses',    estimatedTime: 35 },
      { id: 'gov-3', name: 'General Inquiries',     estimatedTime: 15 },
      { id: 'gov-4', name: 'ID / Passport Renewal', estimatedTime: 45 },
    ],
  },
  {
    industry: 'Education', icon: 'school', color: '#4f46e5',
    services: [
      { id: 'edu-1', name: 'Admissions',       estimatedTime: 20 },
      { id: 'edu-2', name: 'Registrar',        estimatedTime: 15 },
      { id: 'edu-3', name: 'Financial Aid',    estimatedTime: 30 },
      { id: 'edu-4', name: 'Library Services', estimatedTime: 5  },
    ],
  },
  {
    industry: 'Corporate Office', icon: 'business', color: '#0d9488',
    services: [
      { id: 'crp-1', name: 'Reception',   estimatedTime: 5  },
      { id: 'crp-2', name: 'HR Services', estimatedTime: 20 },
      { id: 'crp-3', name: 'IT Support',  estimatedTime: 15 },
      { id: 'crp-4', name: 'Facilities',  estimatedTime: 10 },
    ],
  },
];

const SERVICES = SERVICE_GROUPS.flatMap(g =>
  g.services.map(s => ({ ...s, industry: g.industry, color: g.color }))
);

const BRANCHES = ['Main Branch', 'Downtown Branch', 'West End Hub', 'Northside Branch'];

// North Cyprus (TRNC) Public Holidays 2026
const HOLIDAYS: string[] = [
  // ── Fixed national holidays ───────────────────────────────────────────────
  '2026-01-01', // New Year's Day                       (Yılbaşı)
  '2026-04-23', // National Sovereignty & Children's Day (Ulusal Egemenlik ve Çocuk Bayramı)
  '2026-05-01', // Labour Day                           (İşçi Bayramı)
  '2026-05-19', // Youth & Sports Day / Atatürk Commemoration
  '2026-07-20', // Peace & Freedom Day                  (Barış ve Özgürlük Bayramı)
  '2026-08-01', // TMT Day                              (TMT Günü)
  '2026-08-30', // Victory Day                          (Zafer Bayramı)
  '2026-10-29', // Turkish Republic Day                 (Cumhuriyet Bayramı)
  '2026-11-15', // TRNC Proclamation Day                (KKTC Kuruluş Yıl Dönümü)

  // ── Islamic holidays 2026 (lunar — approximate) ───────────────────────────
  '2026-03-20', // Eid al-Fitr Day 1  — Ramazan Bayramı 1. Gün
  '2026-03-21', // Eid al-Fitr Day 2  — Ramazan Bayramı 2. Gün
  '2026-03-22', // Eid al-Fitr Day 3  — Ramazan Bayramı 3. Gün
  '2026-05-27', // Eid al-Adha Day 1  — Kurban Bayramı 1. Gün
  '2026-05-28', // Eid al-Adha Day 2  — Kurban Bayramı 2. Gün
  '2026-05-29', // Eid al-Adha Day 3  — Kurban Bayramı 3. Gün
  '2026-05-30', // Eid al-Adha Day 4  — Kurban Bayramı 4. Gün
  '2026-09-04', // Prophet's Birthday — Mevlid-i Nebi
];

type WeekSlot = { day: number; weeks: number[] };
type ServiceSchedule = { slots: WeekSlot[]; timeSlots: string[] };

// day: 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
// weeks: which occurrence in the month [1=first … 4=fourth]
// Reusable slot arrays to avoid repetition
const SL = {
  bnkFull:  ['09:00','09:30','10:00','10:30','11:00','11:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00'],
  bnkExt:   ['08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30'],
  bnkRed:   ['10:00','10:30','11:00','11:30','13:00','13:30','14:00','14:30','15:00'],
  bnkNth:   ['09:00','09:30','10:00','10:30','11:00','13:00','13:30','14:00','14:30','15:00'],
  loan:     ['09:00','10:00','11:00','13:00','14:00','15:00'],
  loanExt:  ['08:30','09:30','10:30','11:30','13:00','14:00','15:00','16:00'],
  loanRed:  ['10:00','11:00','13:00','14:00'],
  loanNth:  ['09:00','10:00','11:00','13:00','14:00'],
  hlcFull:  ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','14:00','14:30','15:00','15:30','16:00'],
  hlcExt:   ['07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30'],
  hlcRed:   ['09:00','09:30','10:00','10:30','11:00','13:00','13:30','14:00','14:30'],
  hlcNth:   ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','13:00','13:30','14:00','14:30','15:00'],
  labFull:  ['07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30'],
  labExt:   ['06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00'],
  labRed:   ['08:00','08:30','09:00','09:30','10:00'],
  labNth:   ['07:00','07:30','08:00','08:30','09:00','09:30'],
  rtlFull:  ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30'],
  rtlExt:   ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00'],
  rtlRed:   ['10:00','10:30','11:00','11:30','12:00','13:00','13:30','14:00','14:30','15:00'],
  rtlNth:   ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','13:00','13:30','14:00','14:30','15:00'],
  govFull:  ['09:00','09:30','10:00','10:30','11:00','14:00','14:30','15:00'],
  govExt:   ['08:30','09:00','09:30','10:00','10:30','11:00','11:30','13:30','14:00','14:30','15:00','15:30'],
  govRed:   ['10:00','10:30','11:00','14:00','14:30'],
  govNth:   ['09:00','09:30','10:00','10:30','11:00','14:00','14:30'],
  eduFull:  ['09:00','10:00','11:00','14:00','15:00','16:00'],
  eduExt:   ['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00'],
  eduRed:   ['10:00','11:00','14:00','15:00'],
  eduNth:   ['09:00','10:00','11:00','14:00','15:00'],
  crpFull:  ['09:00','09:30','10:00','10:30','11:00','11:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30'],
  crpExt:   ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00'],
  crpRed:   ['10:00','10:30','11:00','13:00','13:30','14:00','14:30'],
  crpNth:   ['09:00','09:30','10:00','10:30','11:00','13:00','13:30','14:00','14:30','15:00'],
  genFull:  ['09:00','09:30','10:00','10:30','11:00','11:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00'],
  genExt:   ['08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30'],
  genRed:   ['10:00','10:30','11:00','13:00','13:30','14:00','14:30'],
  genNth:   ['09:00','09:30','10:00','10:30','11:00','13:00','13:30','14:00','14:30'],
};

// WeekSlot presets — day A on weeks [1,3] + day B on week [2] ≈ 3 dates/month
// "Red" variants use weeks [1] + [3] only ≈ 2 dates/month (reduced branches)
const WS: Record<string, WeekSlot[]> = {
  TueThu: [{ day: 2, weeks: [1,3] }, { day: 4, weeks: [2] }],
  MonWed: [{ day: 1, weeks: [1,3] }, { day: 3, weeks: [2] }],
  WedFri: [{ day: 3, weeks: [1,3] }, { day: 5, weeks: [2] }],
  TueFri: [{ day: 2, weeks: [1,3] }, { day: 5, weeks: [2] }],
  MonThu: [{ day: 1, weeks: [1,3] }, { day: 4, weeks: [2] }],
  TueSat: [{ day: 2, weeks: [1,3] }, { day: 6, weeks: [2] }],
  SatSun: [{ day: 6, weeks: [1,3] }, { day: 0, weeks: [2] }],
  SatWed: [{ day: 6, weeks: [1,3] }, { day: 3, weeks: [2] }],
  ThuMon: [{ day: 4, weeks: [1,3] }, { day: 1, weeks: [2] }],
  WedMon: [{ day: 3, weeks: [1,3] }, { day: 1, weeks: [2] }],
  MonFri: [{ day: 1, weeks: [1,3] }, { day: 5, weeks: [2] }],
  ThuFri: [{ day: 4, weeks: [1,3] }, { day: 5, weeks: [2] }],
  // reduced ~2 dates/month
  MonRed: [{ day: 1, weeks: [1] }, { day: 3, weeks: [3] }],
  TueRed: [{ day: 2, weeks: [1] }, { day: 4, weeks: [3] }],
  WedRed: [{ day: 3, weeks: [1] }, { day: 5, weeks: [3] }],
  ThuRed: [{ day: 4, weeks: [1] }, { day: 2, weeks: [3] }],
  SatRed: [{ day: 6, weeks: [1] }, { day: 3, weeks: [3] }],
};

const SERVICE_BRANCH_SCHEDULE: Record<string, Record<string, ServiceSchedule>> = {
  'bnk-1': { // Teller Services
    'Main Branch':      { timeSlots: SL.bnkFull, slots: WS.TueThu },
    'Downtown Branch':  { timeSlots: SL.bnkExt,  slots: WS.MonWed },
    'West End Hub':     { timeSlots: SL.bnkRed,  slots: WS.TueRed },
    'Northside Branch': { timeSlots: SL.bnkNth,  slots: WS.WedFri },
  },
  'bnk-2': { // Loan Consultation
    'Main Branch':      { timeSlots: SL.loan,    slots: WS.MonThu },
    'Downtown Branch':  { timeSlots: SL.loanExt, slots: WS.TueFri },
    'West End Hub':     { timeSlots: SL.loanRed, slots: WS.MonRed },
    'Northside Branch': { timeSlots: SL.loanNth, slots: WS.MonWed },
  },
  'bnk-3': { // Account Opening
    'Main Branch':      { timeSlots: SL.bnkFull, slots: WS.WedFri },
    'Downtown Branch':  { timeSlots: SL.bnkExt,  slots: WS.TueSat },
    'West End Hub':     { timeSlots: SL.bnkRed,  slots: WS.WedRed },
    'Northside Branch': { timeSlots: SL.bnkNth,  slots: WS.TueThu },
  },
  'bnk-4': { // Card Services
    'Main Branch':      { timeSlots: SL.bnkFull, slots: WS.TueFri },
    'Downtown Branch':  { timeSlots: SL.bnkExt,  slots: WS.MonWed },
    'West End Hub':     { timeSlots: SL.bnkRed,  slots: WS.TueRed },
    'Northside Branch': { timeSlots: SL.bnkNth,  slots: WS.TueThu },
  },
  'bnk-5': { // Customer Service
    'Main Branch':      { timeSlots: SL.bnkFull, slots: WS.MonThu },
    'Downtown Branch':  { timeSlots: SL.bnkExt,  slots: WS.TueSat },
    'West End Hub':     { timeSlots: SL.bnkRed,  slots: WS.MonRed },
    'Northside Branch': { timeSlots: SL.bnkNth,  slots: WS.WedFri },
  },
  'hlc-1': { // General Practitioner
    'Main Branch':      { timeSlots: SL.hlcFull, slots: WS.MonWed },
    'Downtown Branch':  { timeSlots: SL.hlcExt,  slots: WS.TueSat },
    'West End Hub':     { timeSlots: SL.hlcRed,  slots: WS.MonRed },
    'Northside Branch': { timeSlots: SL.hlcNth,  slots: WS.TueThu },
  },
  'hlc-2': { // Pharmacy Pickup
    'Main Branch':      { timeSlots: SL.hlcFull, slots: WS.TueSat },
    'Downtown Branch':  { timeSlots: SL.hlcExt,  slots: WS.SatSun },
    'West End Hub':     { timeSlots: SL.hlcRed,  slots: WS.SatRed },
    'Northside Branch': { timeSlots: SL.hlcNth,  slots: WS.TueSat },
  },
  'hlc-3': { // Blood Test / Lab
    'Main Branch':      { timeSlots: SL.labFull, slots: WS.MonThu },
    'Downtown Branch':  { timeSlots: SL.labExt,  slots: WS.TueSat },
    'West End Hub':     { timeSlots: SL.labRed,  slots: WS.TueRed },
    'Northside Branch': { timeSlots: SL.labNth,  slots: WS.MonWed },
  },
  'hlc-4': { // Dental
    'Main Branch':      { timeSlots: SL.hlcFull, slots: WS.TueFri },
    'Downtown Branch':  { timeSlots: SL.hlcExt,  slots: WS.MonWed },
    'West End Hub':     { timeSlots: SL.hlcRed,  slots: WS.TueRed },
    'Northside Branch': { timeSlots: SL.hlcNth,  slots: WS.ThuFri },
  },
  'hlc-5': { // Specialist Consult
    'Main Branch':      { timeSlots: SL.loan,    slots: WS.WedMon },
    'Downtown Branch':  { timeSlots: SL.loanExt, slots: WS.TueThu },
    'West End Hub':     { timeSlots: SL.loanRed, slots: WS.MonRed },
    'Northside Branch': { timeSlots: SL.loanNth, slots: WS.ThuMon },
  },
  'rtl-1': { // Returns & Exchanges
    'Main Branch':      { timeSlots: SL.rtlFull, slots: WS.SatSun },
    'Downtown Branch':  { timeSlots: SL.rtlExt,  slots: WS.SatWed },
    'West End Hub':     { timeSlots: SL.rtlRed,  slots: WS.SatRed },
    'Northside Branch': { timeSlots: SL.rtlNth,  slots: WS.SatSun },
  },
  'rtl-2': { // Customer Service
    'Main Branch':      { timeSlots: SL.rtlFull, slots: WS.SatWed },
    'Downtown Branch':  { timeSlots: SL.rtlExt,  slots: WS.SatSun },
    'West End Hub':     { timeSlots: SL.rtlRed,  slots: WS.SatRed },
    'Northside Branch': { timeSlots: SL.rtlNth,  slots: WS.SatWed },
  },
  'rtl-3': { // Tech Support
    'Main Branch':      { timeSlots: SL.rtlFull, slots: WS.TueThu },
    'Downtown Branch':  { timeSlots: SL.rtlExt,  slots: WS.MonWed },
    'West End Hub':     { timeSlots: SL.loanRed, slots: WS.TueRed },
    'Northside Branch': { timeSlots: SL.rtlNth,  slots: WS.WedFri },
  },
  'rtl-4': { // Click & Collect
    'Main Branch':      { timeSlots: SL.rtlFull, slots: WS.SatSun },
    'Downtown Branch':  { timeSlots: SL.rtlExt,  slots: WS.SatSun },
    'West End Hub':     { timeSlots: SL.rtlRed,  slots: WS.SatRed },
    'Northside Branch': { timeSlots: SL.rtlNth,  slots: WS.SatSun },
  },
  'gov-1': { // Document Processing
    'Main Branch':      { timeSlots: SL.govFull, slots: WS.MonWed },
    'Downtown Branch':  { timeSlots: SL.govExt,  slots: WS.TueThu },
    'West End Hub':     { timeSlots: SL.govRed,  slots: WS.WedRed },
    'Northside Branch': { timeSlots: SL.govNth,  slots: WS.MonThu },
  },
  'gov-2': { // Permits & Licenses
    'Main Branch':      { timeSlots: SL.govFull, slots: WS.TueThu },
    'Downtown Branch':  { timeSlots: SL.govExt,  slots: WS.MonWed },
    'West End Hub':     { timeSlots: SL.govRed,  slots: WS.TueRed },
    'Northside Branch': { timeSlots: SL.govNth,  slots: WS.WedFri },
  },
  'gov-3': { // General Inquiries
    'Main Branch':      { timeSlots: SL.govFull, slots: WS.WedFri },
    'Downtown Branch':  { timeSlots: SL.govExt,  slots: WS.MonThu },
    'West End Hub':     { timeSlots: SL.govRed,  slots: WS.WedRed },
    'Northside Branch': { timeSlots: SL.govNth,  slots: WS.TueThu },
  },
  'gov-4': { // ID / Passport Renewal
    'Main Branch':      { timeSlots: SL.govFull, slots: WS.ThuMon },
    'Downtown Branch':  { timeSlots: SL.govExt,  slots: WS.WedFri },
    'West End Hub':     { timeSlots: SL.govRed,  slots: WS.MonRed },
    'Northside Branch': { timeSlots: SL.govNth,  slots: WS.TueFri },
  },
  'edu-1': { // Admissions
    'Main Branch':      { timeSlots: SL.eduFull, slots: WS.MonThu },
    'Downtown Branch':  { timeSlots: SL.eduExt,  slots: WS.TueFri },
    'West End Hub':     { timeSlots: SL.eduRed,  slots: WS.MonRed },
    'Northside Branch': { timeSlots: SL.eduNth,  slots: WS.WedFri },
  },
  'edu-2': { // Registrar
    'Main Branch':      { timeSlots: SL.govFull, slots: WS.TueFri },
    'Downtown Branch':  { timeSlots: SL.eduExt,  slots: WS.MonWed },
    'West End Hub':     { timeSlots: SL.eduRed,  slots: WS.WedRed },
    'Northside Branch': { timeSlots: SL.eduNth,  slots: WS.TueThu },
  },
  'edu-3': { // Financial Aid
    'Main Branch':      { timeSlots: SL.eduFull, slots: WS.WedMon },
    'Downtown Branch':  { timeSlots: SL.eduExt,  slots: WS.TueFri },
    'West End Hub':     { timeSlots: SL.loanRed, slots: WS.WedRed },
    'Northside Branch': { timeSlots: SL.eduNth,  slots: WS.MonFri },
  },
  'edu-4': { // Library Services
    'Main Branch':      { timeSlots: SL.govFull, slots: WS.MonWed },
    'Downtown Branch':  { timeSlots: SL.eduExt,  slots: WS.TueSat },
    'West End Hub':     { timeSlots: SL.eduRed,  slots: WS.WedRed },
    'Northside Branch': { timeSlots: SL.eduNth,  slots: WS.TueThu },
  },
  'crp-1': { // Reception
    'Main Branch':      { timeSlots: SL.crpFull, slots: WS.MonThu },
    'Downtown Branch':  { timeSlots: SL.crpExt,  slots: WS.TueFri },
    'West End Hub':     { timeSlots: SL.crpRed,  slots: WS.MonRed },
    'Northside Branch': { timeSlots: SL.crpNth,  slots: WS.WedFri },
  },
  'crp-2': { // HR Services
    'Main Branch':      { timeSlots: SL.loan,    slots: WS.TueFri },
    'Downtown Branch':  { timeSlots: SL.loanExt, slots: WS.MonWed },
    'West End Hub':     { timeSlots: SL.loanRed, slots: WS.TueRed },
    'Northside Branch': { timeSlots: SL.loanNth, slots: WS.TueThu },
  },
  'crp-3': { // IT Support
    'Main Branch':      { timeSlots: SL.crpFull, slots: WS.WedMon },
    'Downtown Branch':  { timeSlots: SL.crpExt,  slots: WS.TueThu },
    'West End Hub':     { timeSlots: SL.crpRed,  slots: WS.WedRed },
    'Northside Branch': { timeSlots: SL.crpNth,  slots: WS.MonThu },
  },
  'crp-4': { // Facilities
    'Main Branch':      { timeSlots: SL.crpNth,  slots: WS.ThuMon },
    'Downtown Branch':  { timeSlots: SL.crpFull, slots: WS.WedFri },
    'West End Hub':     { timeSlots: SL.crpRed,  slots: WS.ThuRed },
    'Northside Branch': { timeSlots: SL.crpNth,  slots: WS.TueThu },
  },
  'general': {
    'Main Branch':      { timeSlots: SL.genFull, slots: WS.MonThu },
    'Downtown Branch':  { timeSlots: SL.genExt,  slots: WS.TueFri },
    'West End Hub':     { timeSlots: SL.genRed,  slots: WS.WedRed },
    'Northside Branch': { timeSlots: SL.genNth,  slots: WS.MonWed },
  },
};

const DEFAULT_SCHEDULE: ServiceSchedule = {
  timeSlots: SL.genFull,
  slots: WS.MonWed,
};

const WEEK_ORD = ['', '1st', '2nd', '3rd', '4th'];
const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getSchedule(serviceId: string, branch: string): ServiceSchedule {
  return SERVICE_BRANCH_SCHEDULE[serviceId]?.[branch] ?? DEFAULT_SCHEDULE;
}

function getAvailableDates(year: number, month: number, sched: ServiceSchedule): Set<number> {
  const available = new Set<number>();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const weekday    = new Date(year, month, d).getDay();
    const weekOfMonth = Math.ceil(d / 7);
    if (sched.slots.some(s => s.day === weekday && s.weeks.includes(weekOfMonth))) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (!HOLIDAYS.includes(dateStr)) available.add(d);
    }
  }
  return available;
}

function describeSlots(slots: WeekSlot[]): string {
  return slots
    .map(s => `${s.weeks.map(w => WEEK_ORD[w]).join(' & ')} ${DAY_NAMES_SHORT[s.day]}`)
    .join(' · ');
}

// API response shape from Django
type Appointment = {
  id: number;
  ticket_number: string;
  customer: number;
  customer_name: string;
  service: number | null;
  service_name: string;
  branch: number | null;
  branch_name: string;
  service_name_text: string;
  branch_name_text: string;
  appointment_date: string;
  appointment_time: string;
  status: AppStatus;
  notes: string;
  created_at: string;
  updated_at: string;
};

type BookingForm = {
  customerName: string; serviceId: string; serviceName: string;
  serviceIndustry: string; branch: string; date: string; time: string; notes: string;
};

const EMPTY_FORM: BookingForm = {
  customerName: '', serviceId: '', serviceName: '',
  serviceIndustry: '', branch: '', date: '', time: '', notes: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<AppStatus, { color: string; bg: string; label: string }> = {
  scheduled: { color: '#2563eb', bg: '#eff6ff', label: 'Scheduled' },
  confirmed: { color: '#059669', bg: '#ecfdf5', label: 'Confirmed' },
  completed: { color: '#7c3aed', bg: '#f5f3ff', label: 'Completed' },
  cancelled: { color: '#e11d48', bg: '#fff1f2', label: 'Cancelled' },
};

function displayDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hr}:${String(m).padStart(2, '0')} ${ap}`;
}

// ─── Calendar Picker (full month grid) ───────────────────────────────────────

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CAL_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function CalendarPicker({
  visible, selected, onSelect, onClose, serviceId, branch,
}: {
  visible: boolean;
  selected: string;
  onSelect: (dateStr: string) => void;
  onClose: () => void;
  serviceId: string;
  branch: string;
}) {
  const today = React.useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);

  const [viewYear,  setViewYear]  = React.useState(today.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(today.getMonth());

  const sched   = serviceId && branch ? getSchedule(serviceId, branch) : null;
  const availSet = React.useMemo(() => {
    const set = new Set<number>();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (!HOLIDAYS.includes(dateStr)) set.add(d);
    }
    return set;
  }, [viewYear, viewMonth]);

  // Build Monday-first calendar grid
  const cells = React.useMemo(() => {
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const offset = (firstWeekday + 6) % 7; // Mon=0 … Sun=6
    const days   = new Date(viewYear, viewMonth + 1, 0).getDate();
    const arr: (number | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= days; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [viewYear, viewMonth]);

  const selDay = React.useMemo(() => {
    if (!selected) return null;
    const [y, m, d] = selected.split('-').map(Number);
    return y === viewYear && m - 1 === viewMonth ? d : null;
  }, [selected, viewYear, viewMonth]);

  const todayDay = today.getFullYear() === viewYear && today.getMonth() === viewMonth
    ? today.getDate() : null;

  const canPrev = viewYear > today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth > today.getMonth());

  const goPrev = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const goNext = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={cal.overlay}>
        <View style={cal.sheet}>
          {/* Header */}
          <View style={cal.hdr}>
            <View style={{ flex: 1 }}>
              <Text style={cal.hdrTitle}>Choose Date</Text>
              {sched && <Text style={cal.hdrSub}>{describeSlots(sched.slots)}</Text>}
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Month navigation */}
          <View style={cal.monthNav}>
            <TouchableOpacity
              onPress={canPrev ? goPrev : undefined}
              style={[cal.navBtn, !canPrev && { opacity: 0.3 }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons name="chevron-left" size={22} color="#0f172a" />
            </TouchableOpacity>
            <Text style={cal.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
            <TouchableOpacity
              onPress={goNext}
              style={cal.navBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons name="chevron-right" size={22} color="#0f172a" />
            </TouchableOpacity>
          </View>

          {/* Day-of-week headers */}
          <View style={cal.weekRow}>
            {CAL_HEADERS.map(h => (
              <View key={h} style={cal.weekCell}>
                <Text style={cal.weekHdr}>{h}</Text>
              </View>
            ))}
          </View>

          {/* Date grid */}
          <View style={cal.grid}>
            {cells.map((day, i) => {
              if (day === null) return <View key={`e${i}`} style={cal.dayCell} />;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isPast  = new Date(dateStr + 'T00:00:00') < today;
              const isAvail = availSet.has(day) && !isPast;
              const isSel   = selDay === day;
              const isToday = todayDay === day;
              return (
                <TouchableOpacity
                  key={`d${day}`}
                  style={cal.dayCell}
                  onPress={isAvail ? () => { onSelect(dateStr); onClose(); } : undefined}
                  activeOpacity={isAvail ? 0.7 : 1}
                  disabled={!isAvail}
                >
                  <View style={[
                    cal.dayInner,
                    isAvail && !isSel && cal.dayInnerAvail,
                    isSel && cal.dayInnerSel,
                    isToday && !isSel && cal.dayInnerToday,
                  ]}>
                    <Text style={[
                      cal.dayTxt,
                      isAvail && !isSel && cal.dayTxtAvail,
                      isSel && cal.dayTxtSel,
                      isPast && cal.dayTxtPast,
                    ]}>
                      {day}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend */}
          <View style={cal.legend}>
            {([
              { color: '#eff6ff', border: '#93c5fd', label: 'Available' },
              { color: '#2563eb', border: '#2563eb', label: 'Selected'  },
              { color: '#f1f5f9', border: '#e2e8f0', label: 'Unavailable' },
            ] as { color: string; border: string; label: string }[]).map(l => (
              <View key={l.label} style={cal.legendItem}>
                <View style={[cal.legendDot, { backgroundColor: l.color, borderColor: l.border }]} />
                <Text style={cal.legendTxt}>{l.label}</Text>
              </View>
            ))}
          </View>

          {!!selected && selDay !== null && (
            <View style={cal.selBanner}>
              <MaterialIcons name="event" size={15} color="#2563eb" />
              <Text style={cal.selBannerText}>{displayDate(selected)}</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Appointment card ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AppStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <View style={[st.badge, { backgroundColor: s.bg }]}>
      <Text style={[st.badgeText, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

function AppointmentCard({ appt, isStaff, onCancel, onReschedule, onConfirm, onMarkServed }: {
  appt: Appointment; isStaff: boolean;
  onCancel: (id: number) => void; onReschedule: (a: Appointment) => void;
  onConfirm: (id: number) => void; onMarkServed: (id: number) => void;
}) {
  const svc   = SERVICES.find(s => s.name === appt.service_name);
  const color = svc?.color ?? '#2563eb';
  return (
    <View style={st.apptCard}>
      <View style={[st.apptHdr, { backgroundColor: color }]}>
        <StatusBadge status={appt.status} />
        <Text style={st.apptTicket}>{appt.ticket_number}</Text>
        <Text style={st.apptCustomer}>{appt.customer_name}</Text>
        <Text style={st.apptService}>{appt.service_name}</Text>
        {svc && <Text style={st.apptIndustry}>{svc.industry}</Text>}
      </View>
      <View style={st.apptBody}>
        {[
          { icon: 'event'    as IconName, label: 'Date',     value: displayDate(appt.appointment_date) },
          { icon: 'schedule' as IconName, label: 'Time',     value: formatTime(appt.appointment_time)  },
          { icon: 'place'    as IconName, label: 'Location', value: appt.branch_name                   },
        ].map(row => (
          <View key={row.label} style={st.apptRow}>
            <View style={st.apptRowIcon}>
              <MaterialIcons name={row.icon} size={18} color="#64748b" />
            </View>
            <View>
              <Text style={st.apptRowLabel}>{row.label}</Text>
              <Text style={st.apptRowValue}>{row.value}</Text>
            </View>
          </View>
        ))}

        {isStaff ? (
          <View style={st.actionRow}>
            {appt.status === 'scheduled' && (
              <TouchableOpacity style={[st.actionBtn, { backgroundColor: '#059669' }]} onPress={() => onConfirm(appt.id)}>
                <MaterialIcons name="check" size={14} color="#fff" />
                <Text style={st.actionBtnTxt}>Confirm</Text>
              </TouchableOpacity>
            )}
            {appt.status === 'confirmed' && (
              <TouchableOpacity style={[st.actionBtn, { backgroundColor: '#7c3aed' }]} onPress={() => onMarkServed(appt.id)}>
                <MaterialIcons name="how-to-reg" size={14} color="#fff" />
                <Text style={st.actionBtnTxt}>Mark Served</Text>
              </TouchableOpacity>
            )}
            {(appt.status === 'scheduled' || appt.status === 'confirmed') && (
              <TouchableOpacity style={st.actionBtnOut} onPress={() => onCancel(appt.id)}>
                <Text style={st.actionBtnOutTxt}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          (appt.status === 'scheduled' || appt.status === 'confirmed') ? (
            <View style={st.actionRow}>
              <TouchableOpacity style={st.actionBtnOut} onPress={() => onCancel(appt.id)}>
                <Text style={st.actionBtnOutTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.actionBtn, { flex: 1, backgroundColor: '#2563eb' }]} onPress={() => onReschedule(appt)}>
                <Text style={st.actionBtnTxt}>Reschedule</Text>
              </TouchableOpacity>
            </View>
          ) : null
        )}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AppointmentsScreen() {
  const router = useRouter();
  const { role } = useAppContext();
  const { user } = useAuth();
  const isStaff = role === 'staff' || role === 'admin' || role === 'super_admin' || role === 'superadmin';

  const [appointments,     setAppointments]     = useState<Appointment[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [showBooking,      setShowBooking]       = useState(false);
  const [rescheduleTarget, setRescheduleTarget]  = useState<Appointment | null>(null);
  const [form,             setForm]              = useState<BookingForm>(EMPTY_FORM);
  const [submitting,       setSubmitting]        = useState(false);
  const [selectedService,  setSelectedService]   = useState<string | null>(null);
  const [successMsg,       setSuccessMsg]        = useState('');

  // Pickers
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [showBranchPicker,  setShowBranchPicker]  = useState(false);
  const [showCalendar,      setShowCalendar]      = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await api.get<{ results: Appointment[] } | Appointment[]>('/appointments/');
    if (error) Alert.alert('Error loading appointments', error);
    else {
      const list = Array.isArray(data) ? data : (data as any)?.results ?? [];
      setAppointments(list);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openBooking = (reschedule?: Appointment) => {
    if (reschedule) {
      setRescheduleTarget(reschedule);
      const svc      = SERVICES.find(s => s.name === reschedule.service_name);
      const industry = SERVICE_GROUPS.find(g => g.services.some(s => s.name === reschedule.service_name))?.industry ?? '';
      setForm({
        customerName:    reschedule.customer_name,
        serviceId:       svc?.id ?? 'general',
        serviceName:     reschedule.service_name,
        serviceIndustry: industry,
        branch:          reschedule.branch_name,
        date:            reschedule.appointment_date,
        time:            reschedule.appointment_time.slice(0, 5),
        notes:           reschedule.notes ?? '',
      });
    } else {
      setRescheduleTarget(null);
      setForm({ ...EMPTY_FORM, customerName: user?.full_name ?? '' });
    }
    setShowBooking(true);
  };

  const handleSubmit = async () => {
    if (!form.serviceId) { Alert.alert('Missing', 'Please select a service.'); return; }
    if (!form.branch)    { Alert.alert('Missing', 'Please select a branch.');  return; }
    if (!form.date)      { Alert.alert('Missing', 'Please pick a date.');      return; }
    if (!form.time)      { Alert.alert('Missing', 'Please choose a time slot.'); return; }
    setSubmitting(true);

    if (rescheduleTarget) {
      const { data, error } = await api.patch<Appointment>(`/appointments/${rescheduleTarget.id}/`, {
        service_name_text: form.serviceName,
        branch_name_text:  form.branch,
        appointment_date:  form.date,
        appointment_time:  form.time,
        notes:             form.notes,
        status:            'scheduled',
      });
      if (error) {
        Alert.alert('Error', error);
      } else {
        setShowBooking(false);
        setRescheduleTarget(null);
        setForm(EMPTY_FORM);
        setSuccessMsg(`Rescheduled to ${displayDate(data!.appointment_date)} at ${formatTime(data!.appointment_time.slice(0,5))}`);
        await loadData();
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } else {
      const { data, error } = await api.post<Appointment>('/appointments/', {
        service_name_text: form.serviceName,
        branch_name_text:  form.branch,
        appointment_date:  form.date,
        appointment_time:  form.time,
        notes:             form.notes,
      });
      if (error) {
        Alert.alert('Booking failed', error);
      } else {
        setShowBooking(false);
        setForm(EMPTY_FORM);
        setSuccessMsg(`Appointment booked for ${displayDate(data!.appointment_date)} at ${formatTime(data!.appointment_time.slice(0,5))}`);
        await loadData();
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    }
    setSubmitting(false);
  };

  const handleCancel = (id: number) => {
    Alert.alert('Cancel Appointment', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
        const { data, error } = await api.post<Appointment>(`/appointments/${id}/cancel/`, {});
        if (error) Alert.alert('Error', error);
        else setAppointments(prev => prev.map(a => a.id === id ? data! : a));
      }},
    ]);
  };

  const handleConfirm = async (id: number) => {
    const { data, error } = await api.post<Appointment>(`/appointments/${id}/confirm/`, {});
    if (error) Alert.alert('Error', error);
    else setAppointments(prev => prev.map(a => a.id === id ? data! : a));
  };

  const handleMarkServed = async (id: number) => {
    const { data, error } = await api.post<Appointment>(`/appointments/${id}/complete/`, {});
    if (error) Alert.alert('Error', error);
    else setAppointments(prev => prev.map(a => a.id === id ? data! : a));
  };

  // ── Booking form view ──────────────────────────────────────────────────────
  if (showBooking) {
    return (
      <SafeAreaView style={st.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={st.header}>
          <TouchableOpacity onPress={() => { setShowBooking(false); setRescheduleTarget(null); }} style={st.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
          </TouchableOpacity>
          <Text style={st.headerTitle}>{rescheduleTarget ? 'Reschedule' : 'Book Appointment'}</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={st.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Service */}
          <Text style={st.fieldLabel}>Service</Text>
          <TouchableOpacity style={st.pickerRow} onPress={() => setShowServicePicker(true)}>
            {form.serviceId ? (
              <View style={[st.svcDot, { backgroundColor: (SERVICES.find(s => s.id === form.serviceId)?.color ?? '#2563eb') + '20' }]}>
                <MaterialIcons name="confirmation-number" size={16} color={SERVICES.find(s => s.id === form.serviceId)?.color ?? '#2563eb'} />
              </View>
            ) : (
              <MaterialIcons name="confirmation-number" size={18} color="#94a3b8" />
            )}
            <View style={{ flex: 1 }}>
              <Text style={[st.pickerTxt, !form.serviceId && st.pickerPh]}>
                {form.serviceName || 'Select a service'}
              </Text>
              {!!form.serviceIndustry && (
                <Text style={st.pickerSub}>{form.serviceIndustry}</Text>
              )}
            </View>
            <MaterialIcons name="expand-more" size={20} color="#94a3b8" />
          </TouchableOpacity>
          {!!form.serviceId && (
            <Text style={st.fieldHint}>
              Est. duration: {SERVICES.find(s => s.id === form.serviceId)?.estimatedTime} min
            </Text>
          )}
          {!!form.serviceId && form.serviceId !== 'general' && !!form.branch && (
            <View style={st.availInfo}>
              <MaterialIcons name="info-outline" size={13} color="#7c3aed" />
              <Text style={st.availInfoTxt}>
                {form.branch}: {describeSlots(getSchedule(form.serviceId, form.branch).slots)} · Holidays excluded
              </Text>
            </View>
          )}

          {/* Name */}
          <Text style={[st.fieldLabel, { marginTop: 16 }]}>Your Name</Text>
          <View style={[st.inputRow, { backgroundColor: '#f8fafc' }]}>
            <MaterialIcons name="person" size={18} color="#94a3b8" />
            <TextInput style={[st.textInput, { flex: 1, color: '#94a3b8' }]} value={form.customerName} editable={false} />
          </View>

          {/* Branch */}
          <Text style={[st.fieldLabel, { marginTop: 16 }]}>Branch Location</Text>
          <TouchableOpacity style={st.pickerRow} onPress={() => setShowBranchPicker(true)}>
            <MaterialIcons name="place" size={18} color="#94a3b8" />
            <Text style={[st.pickerTxt, { flex: 1 }, !form.branch && st.pickerPh]}>
              {form.branch || 'Select a branch'}
            </Text>
            <MaterialIcons name="expand-more" size={20} color="#94a3b8" />
          </TouchableOpacity>

          {/* Date — calendar picker */}
          <Text style={[st.fieldLabel, { marginTop: 16 }]}>Date</Text>
          {(!form.serviceId || !form.branch) ? (
            <View style={[st.pickerRow, { opacity: 0.5 }]}>
              <MaterialIcons name="event" size={18} color="#94a3b8" />
              <Text style={[st.pickerTxt, { flex: 1 }, st.pickerPh]}>
                {!form.serviceId ? 'Select service first' : 'Select branch first'}
              </Text>
              <MaterialIcons name="lock-outline" size={16} color="#94a3b8" />
            </View>
          ) : (
            <TouchableOpacity style={st.pickerRow} onPress={() => setShowCalendar(true)}>
              <MaterialIcons name="event" size={18} color={form.date ? '#2563eb' : '#94a3b8'} />
              <View style={{ flex: 1 }}>
                <Text style={[st.pickerTxt, !form.date && st.pickerPh]}>
                  {form.date ? displayDate(form.date) : 'Choose from available dates'}
                </Text>
                <Text style={st.pickerSub}>
                  {describeSlots(getSchedule(form.serviceId, form.branch).slots)}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}

          {/* Time slots */}
          <Text style={[st.fieldLabel, { marginTop: 16 }]}>
            {(form.serviceId && form.branch)
              ? `Available Times — ${form.branch}`
              : 'Time Slot'}
          </Text>
          {(form.serviceId && form.branch) ? (
            <View style={st.timeGrid}>
              {getSchedule(form.serviceId, form.branch).timeSlots.map((slot: string) => (
                <TouchableOpacity
                  key={slot}
                  style={[st.timeSlot, form.time === slot && st.timeSlotActive]}
                  onPress={() => setForm(p => ({ ...p, time: slot }))}
                >
                  <Text style={[st.timeSlotTxt, form.time === slot && st.timeSlotTxtActive]}>
                    {formatTime(slot)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={st.noServiceHint}>
              <MaterialIcons name="schedule" size={18} color="#94a3b8" />
              <Text style={st.noServiceHintTxt}>
                {!form.serviceId ? 'Select a service to see available times' : 'Select a branch to see available times'}
              </Text>
            </View>
          )}

          {/* Notes */}
          <Text style={[st.fieldLabel, { marginTop: 16 }]}>Special Requirements</Text>
          <TextInput
            style={st.notesInput}
            placeholder="Any special requirements…"
            placeholderTextColor="#94a3b8"
            multiline numberOfLines={3}
            value={form.notes}
            onChangeText={v => setForm(p => ({ ...p, notes: v }))}
          />

          {/* Submit */}
          <View style={st.submitRow}>
            <TouchableOpacity style={st.cancelFormBtn} onPress={() => { setShowBooking(false); setRescheduleTarget(null); }}>
              <Text style={st.cancelFormBtnTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.submitBtn} onPress={handleSubmit} disabled={submitting}>
              {submitting
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={st.submitBtnTxt}>{rescheduleTarget ? 'Confirm Reschedule' : 'Confirm Booking'}</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* ── Service picker modal ── */}
        <Modal visible={showServicePicker} transparent animationType="slide">
          <View style={st.modalOverlay}>
            <View style={st.pickerModal}>
              <View style={st.pickerModalHdr}>
                <Text style={st.pickerModalTitle}>Select Service</Text>
                <TouchableOpacity onPress={() => setShowServicePicker(false)}>
                  <MaterialIcons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* No service option */}
                <TouchableOpacity
                  style={st.pickerOpt}
                  onPress={() => { setForm(p => ({ ...p, serviceId: 'general', serviceName: 'General / No Specific Service', serviceIndustry: '', date: '', time: '' })); setShowServicePicker(false); }}
                >
                  <View style={[st.svcGroupDot, { backgroundColor: '#f1f5f9' }]}>
                    <MaterialIcons name="help-outline" size={16} color="#64748b" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.pickerOptName}>General / No Specific Service</Text>
                    <Text style={st.pickerOptSub}>I don't need a specific service</Text>
                  </View>
                  {form.serviceId === 'general' && <MaterialIcons name="check-circle" size={20} color="#2563eb" />}
                </TouchableOpacity>

                {/* Services grouped by industry */}
                {SERVICE_GROUPS.map(group => (
                  <View key={group.industry}>
                    {/* Industry header */}
                    <View style={[st.groupHdr, { borderLeftColor: group.color }]}>
                      <View style={[st.svcGroupDot, { backgroundColor: group.color + '20' }]}>
                        <MaterialIcons name={group.icon} size={14} color={group.color} />
                      </View>
                      <Text style={[st.groupHdrTxt, { color: group.color }]}>{group.industry}</Text>
                    </View>
                    {group.services.map(svc => (
                      <TouchableOpacity
                        key={svc.id}
                        style={st.pickerOpt}
                        onPress={() => { setForm(p => ({ ...p, serviceId: svc.id, serviceName: svc.name, serviceIndustry: group.industry, date: '', time: '' })); setShowServicePicker(false); }}
                      >
                        <View style={{ flex: 1, paddingLeft: 8 }}>
                          <Text style={st.pickerOptName}>{svc.name}</Text>
                          <Text style={st.pickerOptSub}>{svc.estimatedTime} min est.</Text>
                        </View>
                        {form.serviceId === svc.id && <MaterialIcons name="check-circle" size={20} color="#2563eb" />}
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ── Branch picker modal ── */}
        <Modal visible={showBranchPicker} transparent animationType="slide">
          <View style={st.modalOverlay}>
            <View style={st.pickerModal}>
              <View style={st.pickerModalHdr}>
                <Text style={st.pickerModalTitle}>Select Branch</Text>
                <TouchableOpacity onPress={() => setShowBranchPicker(false)}>
                  <MaterialIcons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>
              {BRANCHES.map(branch => (
                <TouchableOpacity
                  key={branch}
                  style={st.pickerOpt}
                  onPress={() => { setForm(p => ({ ...p, branch, date: '', time: '' })); setShowBranchPicker(false); }}
                >
                  <MaterialIcons name="location-on" size={18} color="#64748b" style={{ marginRight: 8 }} />
                  <Text style={[st.pickerOptName, { flex: 1 }]}>{branch}</Text>
                  {form.branch === branch && <MaterialIcons name="check-circle" size={20} color="#2563eb" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        {/* ── Calendar picker modal ── */}
        <CalendarPicker
          visible={showCalendar}
          selected={form.date}
          onSelect={dateStr => setForm(p => ({ ...p, date: dateStr, time: '' }))}
          onClose={() => setShowCalendar(false)}
          serviceId={form.serviceId}
          branch={form.branch}
        />
      </SafeAreaView>
    );
  }

  // ── Staff: service grid ────────────────────────────────────────────────────
  if (isStaff && !selectedService) {
    return (
      <SafeAreaView style={st.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={st.header}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/customer/home' as any)} style={st.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Appointments</Text>
          <TouchableOpacity onPress={() => openBooking()} style={st.addBtn}>
            <MaterialIcons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        {loading ? (
          <View style={st.loadingBox}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
            {SERVICE_GROUPS.map(group => (
              <View key={group.industry}>
                <View style={[st.groupHdr, { borderLeftColor: group.color }]}>
                  <View style={[st.svcGroupDot, { backgroundColor: group.color + '20' }]}>
                    <MaterialIcons name={group.icon} size={14} color={group.color} />
                  </View>
                  <Text style={[st.groupHdrTxt, { color: group.color }]}>{group.industry}</Text>
                </View>
                {group.services.map(svc => {
                  const count = appointments.filter(a => a.service_name === svc.name).length;
                  return (
                    <TouchableOpacity key={svc.id} style={st.serviceCard} onPress={() => setSelectedService(svc.name)} activeOpacity={0.85}>
                      <View style={[st.serviceCardIcon, { backgroundColor: group.color + '15' }]}>
                        <MaterialIcons name="confirmation-number" size={22} color={group.color} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={st.serviceCardName}>{svc.name}</Text>
                        <Text style={st.serviceCardMeta}>{svc.estimatedTime} min · <Text style={[st.serviceCardCount, { color: group.color }]}>{count} appt{count !== 1 ? 's' : ''}</Text></Text>
                      </View>
                      <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        )}
        <BottomNav />
      </SafeAreaView>
    );
  }

  // ── Staff: appointments for service ───────────────────────────────────────
  if (isStaff && selectedService) {
    const staffAppts = appointments.filter(a => a.service_name === selectedService);
    return (
      <SafeAreaView style={st.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={st.header}>
          <TouchableOpacity onPress={() => setSelectedService(null)} style={st.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
          </TouchableOpacity>
          <Text style={st.headerTitle} numberOfLines={1}>{selectedService}</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
          {staffAppts.length === 0 ? (
            <View style={st.emptyBox}>
              <MaterialIcons name="event-busy" size={48} color="#cbd5e1" />
              <Text style={st.emptyTitle}>No Appointments</Text>
              <Text style={st.emptySub}>No appointments for this service yet.</Text>
            </View>
          ) : staffAppts.map(appt => (
            <AppointmentCard key={appt.id} appt={appt} isStaff
              onCancel={handleCancel} onReschedule={openBooking}
              onConfirm={handleConfirm} onMarkServed={handleMarkServed} />
          ))}
        </ScrollView>
        <BottomNav />
      </SafeAreaView>
    );
  }

  // ── Customer view ──────────────────────────────────────────────────────────
  const customerAppts = appointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed');
  const pastAppts     = appointments.filter(a => a.status === 'completed'  || a.status === 'cancelled');

  return (
    <SafeAreaView style={st.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/customer/home' as any)} style={st.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>My Appointments</Text>
        <TouchableOpacity onPress={() => openBooking()} style={st.addBtn}>
          <MaterialIcons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {!!successMsg && (
        <View style={st.successBanner}>
          <MaterialIcons name="check-circle" size={18} color="#059669" />
          <Text style={st.successBannerTxt}>{successMsg}</Text>
        </View>
      )}

      {loading ? (
        <View style={st.loadingBox}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={st.browseRow} onPress={() => router.push('/customer/virtual-queue' as any)} activeOpacity={0.85}>
            <View style={st.browseIcon}>
              <MaterialIcons name="queue" size={20} color="#7c3aed" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.browseTitle}>Walk-in Queue</Text>
              <Text style={st.browseSub}>Join the live queue without booking</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>

          <Text style={st.sectionLabel}>Upcoming Appointments</Text>
          {customerAppts.length === 0 ? (
            <View style={st.emptyBox}>
              <MaterialIcons name="event-available" size={48} color="#cbd5e1" />
              <Text style={st.emptyTitle}>No Upcoming Appointments</Text>
              <Text style={st.emptySub}>You have no appointments scheduled.</Text>
              <TouchableOpacity style={st.bookNowBtn} onPress={() => openBooking()}>
                <Text style={st.bookNowBtnTxt}>Book Your First Appointment</Text>
              </TouchableOpacity>
            </View>
          ) : customerAppts.map(appt => (
            <AppointmentCard key={appt.id} appt={appt} isStaff={false}
              onCancel={handleCancel} onReschedule={openBooking}
              onConfirm={handleConfirm} onMarkServed={handleMarkServed} />
          ))}

          {pastAppts.length > 0 && (
            <>
              <Text style={[st.sectionLabel, { marginTop: 8 }]}>Past Appointments</Text>
              {pastAppts.map(appt => (
                <AppointmentCard key={appt.id} appt={appt} isStaff={false}
                  onCancel={handleCancel} onReschedule={openBooking}
                  onConfirm={handleConfirm} onMarkServed={handleMarkServed} />
              ))}
            </>
          )}
        </ScrollView>
      )}
      <BottomNav />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', flex: 1, textAlign: 'center' },
  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#ecfdf5', borderBottomWidth: 1, borderBottomColor: '#a7f3d0',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  successBannerTxt: { fontSize: 13, fontWeight: '700', color: '#059669', flex: 1 },

  content: { padding: 16, gap: 10, paddingBottom: 40 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },

  browseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  browseIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center' },
  browseTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  browseSub: { fontSize: 12, fontWeight: '500', color: '#64748b', marginTop: 2 },

  // Appointment card
  apptCard: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  apptHdr: { padding: 18, gap: 3 },
  apptTicket: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.65)', fontFamily: 'monospace' },
  apptCustomer: { fontSize: 18, fontWeight: '800', color: '#fff' },
  apptService: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  apptIndustry: { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '600', marginTop: 2 },
  apptBody: { padding: 14, gap: 10 },
  apptRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  apptRowIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  apptRowLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' },
  apptRowValue: { fontSize: 13, color: '#0f172a', fontWeight: '600', marginTop: 1 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, marginBottom: 4 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10 },
  actionBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
  actionBtnOut: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 10, borderWidth: 2, borderColor: '#fecaca' },
  actionBtnOutTxt: { fontSize: 13, fontWeight: '700', color: '#e11d48' },

  // Staff service grid
  serviceCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  serviceCardIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  serviceCardName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  serviceCardMeta: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  serviceCardCount: { fontWeight: '700' },
  groupHdr: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingLeft: 4, borderLeftWidth: 3, paddingHorizontal: 10, marginTop: 8 },
  svcGroupDot: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  groupHdrTxt: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Empty state
  emptyBox: { backgroundColor: '#fff', borderRadius: 20, padding: 40, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginTop: 8 },
  emptySub: { fontSize: 13, color: '#64748b', fontWeight: '500', textAlign: 'center' },
  bookNowBtn: { marginTop: 12, backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  bookNowBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Booking form
  formScroll: { padding: 16, gap: 4, paddingBottom: 40 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 },
  fieldHint: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 4 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  pickerTxt: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  pickerPh: { color: '#94a3b8', fontWeight: '500' },
  pickerSub: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 1 },
  svcDot: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  textInput: { fontSize: 14, color: '#0f172a', fontWeight: '600' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeSlot: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  timeSlotActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  timeSlotTxt: { fontSize: 12, fontWeight: '600', color: '#334155' },
  timeSlotTxtActive: { color: '#fff' },
  noServiceHint: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  noServiceHintTxt: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  availInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f5f3ff', borderRadius: 10, padding: 10, marginTop: 6 },
  availInfoTxt: { fontSize: 11, fontWeight: '600', color: '#7c3aed', flex: 1 },
  notesInput: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 14, color: '#0f172a', fontWeight: '500', textAlignVertical: 'top', minHeight: 80 },
  submitRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelFormBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center' },
  cancelFormBtnTxt: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  submitBtn: { flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: '#2563eb', alignItems: 'center' },
  submitBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Pickers / modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  pickerModal: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '75%' },
  pickerModalHdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  pickerModalTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  pickerOpt: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 10 },
  pickerOptName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  pickerOptSub: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 1 },
});

// ─── Calendar picker styles ───────────────────────────────────────────────────

const cal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:   { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 16 },

  hdr:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  hdrTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  hdrSub:   { fontSize: 12, color: '#7c3aed', fontWeight: '600', marginTop: 3 },

  monthNav:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  navBtn:     { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: 15, fontWeight: '800', color: '#0f172a' },

  weekRow:  { flexDirection: 'row', marginBottom: 4 },
  weekCell: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  weekHdr:  { fontSize: 11, fontWeight: '700', color: '#94a3b8' },

  grid:    { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.285%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },

  dayInner:      { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayInnerAvail: { backgroundColor: '#eff6ff' },
  dayInnerSel:   { backgroundColor: '#2563eb' },
  dayInnerToday: { borderWidth: 2, borderColor: '#2563eb' },

  dayTxt:      { fontSize: 13, fontWeight: '500', color: '#cbd5e1' },
  dayTxtAvail: { fontSize: 13, fontWeight: '700', color: '#1d4ed8' },
  dayTxtSel:   { fontSize: 13, fontWeight: '800', color: '#fff' },
  dayTxtPast:  { fontSize: 13, fontWeight: '400', color: '#e8ecf0' },

  legend:     { flexDirection: 'row', gap: 14, justifyContent: 'center', paddingTop: 10, marginTop: 6, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:  { width: 10, height: 10, borderRadius: 5, borderWidth: 1 },
  legendTxt:  { fontSize: 11, color: '#94a3b8', fontWeight: '600' },

  selBanner:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#eff6ff', borderRadius: 12, padding: 12, marginTop: 10 },
  selBannerText: { fontSize: 13, fontWeight: '600', color: '#1d4ed8', flex: 1 },
});

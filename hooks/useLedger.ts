import { useEffect, useState } from 'react';
import {
  subscribeMembers,
  subscribePartners,
  subscribeWorkLogsByMonth,
} from '@/services/ledger';
import type { Member, Partner, WorkLog } from '@/types';

export function usePartners(): Partner[] {
  const [partners, setPartners] = useState<Partner[]>([]);
  useEffect(() => subscribePartners(setPartners), []);
  return partners;
}

export function useMembers(): Member[] {
  const [members, setMembers] = useState<Member[]>([]);
  useEffect(() => subscribeMembers(setMembers), []);
  return members;
}

// month: 'YYYY-MM'
export function useWorkLogs(month: string): WorkLog[] {
  const [logs, setLogs] = useState<WorkLog[]>([]);
  useEffect(() => subscribeWorkLogsByMonth(month, setLogs), [month]);
  return logs;
}

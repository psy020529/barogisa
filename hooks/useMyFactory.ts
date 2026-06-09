import { useEffect, useState } from 'react';
import { getSupabase, hasSupabaseConfig } from '@/services/supabase';

type MyFactory = {
  factoryId: string | null;
  factoryName: string | null;
  loading: boolean;
};

// 본인이 owner인 factory 행을 찾는다.
// 없으면 자동 생성 (관리자가 공장 측 진입할 때 마찰 0).
export function useMyFactory(userId: string | undefined, userName: string | undefined): MyFactory {
  const [state, setState] = useState<MyFactory>({ factoryId: null, factoryName: null, loading: true });

  useEffect(() => {
    if (!userId || !userName || !hasSupabaseConfig) {
      setState({ factoryId: null, factoryName: null, loading: false });
      return;
    }

    let cancelled = false;
    (async () => {
      const supabase = getSupabase();

      const { data: existing } = await supabase
        .from('factories')
        .select('id, name')
        .eq('owner_user_id', userId)
        .maybeSingle();

      if (cancelled) return;

      if (existing) {
        setState({ factoryId: existing.id, factoryName: existing.name, loading: false });
        return;
      }

      const { data: created, error } = await supabase
        .from('factories')
        .insert({
          name: `${userName}의 공장`,
          owner_user_id: userId,
          contact_phone: '미설정',
        })
        .select('id, name')
        .single();

      if (cancelled) return;

      if (error || !created) {
        console.warn('factory auto-create failed', error);
        setState({ factoryId: null, factoryName: null, loading: false });
        return;
      }

      setState({ factoryId: created.id, factoryName: created.name, loading: false });
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, userName]);

  return state;
}

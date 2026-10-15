import { useSearchParams } from 'react-router';

/** Opens the editor for a line from anywhere (it lives in the layout and follows `?edit=`). */
export function useEditTatari() {
  const [params, setParams] = useSearchParams();
  return (lineId: string | null) => {
    const next = new URLSearchParams(params);
    if (lineId) next.set('edit', lineId);
    else next.delete('edit');
    setParams(next, { replace: !lineId });
  };
}
